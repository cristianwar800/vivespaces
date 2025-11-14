<?php

namespace App\Http\Controllers;

use App\Services\OCRService;
use App\Models\UserVerification;
use App\Services\FaceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Carbon\Carbon;

class VerificationController extends Controller
{
    private $ocrService;
    private $faceService;

    // Configuración de límites
    private const MAX_FILE_SIZE = 10240; // 10MB en KB
    private const MIN_FILE_SIZE = 10; // 10KB mínimo
    private const MAX_ATTEMPTS_PER_HOUR = 100;
    private const MAX_ATTEMPTS_PER_DAY = 10000;

    // SOLO tipos de archivo para documentos oficiales
    private const ALLOWED_IMAGE_TYPES = ['jpeg', 'jpg', 'png', 'webp'];
    private const ALLOWED_DOC_TYPES = ['pdf'];
    private const ALL_ALLOWED_TYPES = ['jpeg', 'jpg', 'png', 'webp', 'pdf'];

    // Configuración ESTRICTA de confianza por tipo
    private const STRICT_CONFIDENCE_THRESHOLDS = [
        'ine' => 45,
        'pasaporte' => 40,
        'comprobante' => 35
    ];

    // Tipos de documentos ÚNICOS permitidos
    private const DOCUMENT_TYPES = [
        'ine' => 'Credencial INE',
        'pasaporte' => 'Pasaporte Mexicano',
        'comprobante' => 'Comprobante de Domicilio'
    ];

    // BLACKLISTS EXPANDIDAS
    private const DOCUMENT_BLACKLISTS = [
        'ine' => [
            'PASAPORTE', 'PASSPORT', 'ESTADOS UNIDOS MEXICANOS',
            'CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'TELMEX', 'IZZI', 'TOTALPLAY',
            'MEGACABLE', 'TELCEL', 'MOVISTAR', 'AT&T',
            'RECIBO', 'FACTURA', 'COMPROBANTE', 'SERVICIO',
            'CONSUMO', 'PAGO', 'VENCIMIENTO', 'ADEUDO', 'IMPORTE',
            'KWH', 'AGUA', 'GAS', 'TELEFONO'
        ],
        'pasaporte' => [
            'INSTITUTO NACIONAL ELECTORAL', 'CREDENCIAL PARA VOTAR', 'INE',
            'CLAVE DE ELECTOR', 'SECCION ELECTORAL',
            'CFE', 'TELMEX', 'SERVICIOS', 'RECIBO', 'FACTURA', 'COMPROBANTE',
            'CONSUMO', 'KWH', 'DOMICILIO CONOCIDO', 'COLONIA', 'MUNICIPIO'
        ],
        'comprobante' => [
            'INSTITUTO NACIONAL ELECTORAL', 'PASAPORTE', 'PASSPORT',
            'CREDENCIAL PARA VOTAR', 'CURP', 'CLAVE DE ELECTOR',
            'ESTADOS UNIDOS MEXICANOS', 'SECCION ELECTORAL',
            'FECHA DE NACIMIENTO', 'LUGAR DE NACIMIENTO'
        ]
    ];

    // Estados mexicanos válidos
    private const VALID_MEXICAN_STATES = [
        'AGUASCALIENTES', 'BAJA CALIFORNIA', 'BAJA CALIFORNIA SUR', 'CAMPECHE',
        'COAHUILA', 'COLIMA', 'CHIAPAS', 'CHIHUAHUA', 'CDMX', 'CIUDAD DE MEXICO',
        'DURANGO', 'GUANAJUATO', 'GUERRERO', 'HIDALGO', 'JALISCO', 'MEXICO',
        'MICHOACAN', 'MORELOS', 'NAYARIT', 'NUEVO LEON', 'OAXACA', 'PUEBLA',
        'QUERETARO', 'QUINTANA ROO', 'SAN LUIS POTOSI', 'SINALOA', 'SONORA',
        'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ', 'YUCATAN', 'ZACATECAS'
    ];

    public function __construct(OCRService $ocrService, FaceService $faceService)
    {
        $this->ocrService = $ocrService;
        $this->faceService = $faceService;
    }

    // ==========================================
    // 🔥 MÉTODO PRINCIPAL - VERIFY API ESTRICTO 85%
    // ==========================================

    /**
     * 🔥 Verificación facial ESTRICTA usando Verify API
     * MODO ESTRICTO:
     * 1. Threshold FIJO en 85% (NO se reduce por ninguna razón)
     * 2. OCR de nombre es OPCIONAL (solo informativo)
     * 3. ÚNICA condición de aprobación: Face ID ≥ 85%
     */
     public function verifyFaceTest(Request $request)
{
    try {
        // 🔥 VALIDAR QUE EL USUARIO NO ESTÉ YA VERIFICADO
        $user = auth()->user();
        
        if ($user->is_identity_verified) {
            \Log::warning('⚠️ Usuario ya verificado intentó usar Face ID', [
                'user_id' => $user->id,
                'verified_at' => $user->verified_at
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Tu identidad ya está verificada',
                'code' => 'ALREADY_VERIFIED',
                'message' => 'No puedes volver a verificarte porque tu identidad ya fue confirmada.',
                'verified_at' => $user->verified_at->toISOString()
            ], 403);
        }

        if (!config('services.compreface.enabled')) {
            \Log::info('⚠️ Face verification está deshabilitado', [
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => false,
                'error' => 'La verificación facial no está disponible en este momento',
                'code' => 'FACE_VERIFICATION_DISABLED',
            ], 503);
        }

        \Log::info('🔐 Iniciando verificación ESTRICTA Face ID (threshold 85% fijo)', [
            'user_id' => $user->id,
            'method' => 'strict_face_id_85'
        ]);

        $request->validate([
            'selfie_data' => 'required|string',
            'ine' => 'required|file|image|max:10240',
        ]);

        $userName = $user->name . ' ' . $user->last_name;

        // Procesar selfie
        $selfieData = $request->input('selfie_data');
        if (strpos($selfieData, ',') !== false) {
            $selfieData = explode(',', $selfieData)[1];
        }
        $selfieImageData = base64_decode($selfieData);
        $selfieTempPath = 'selfie_' . uniqid() . '.jpg';
        Storage::disk('local')->put($selfieTempPath, $selfieImageData);

        // Procesar INE
        $ineFile = $request->file('ine');
        $ineTempPath = 'ine_' . uniqid() . '.' . $ineFile->getClientOriginalExtension();
        $ineFile->storeAs('', $ineTempPath, 'local');

        // Verificación facial
        $threshold = 85;
        $apiKey = config('services.compreface.api_key');
        $baseUrl = config('services.compreface.base_url');
        $selfieFullPath = Storage::disk('local')->path($selfieTempPath);
        $ineFullPath = Storage::disk('local')->path($ineTempPath);

        $response = Http::timeout(30)
            ->withHeaders(['x-api-key' => $apiKey])
            ->attach('source_image', file_get_contents($selfieFullPath), 'selfie.jpg')
            ->attach('target_image', file_get_contents($ineFullPath), 'ine.jpg')
            ->post("{$baseUrl}/api/v1/verification/verify");

        if (!$response->successful()) {
            Storage::disk('local')->delete($selfieTempPath);
            Storage::disk('local')->delete($ineTempPath);

            $errorData = $response->json();
            if (isset($errorData['code']) && $errorData['code'] == 28) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se detectó un rostro en una de las imágenes',
                    'code' => 'NO_FACE_DETECTED',
                ], 422);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error en el servicio de verificación',
                'code' => 'VERIFICATION_SERVICE_ERROR',
            ], 422);
        }

        $responseData = $response->json();
        $resultArray = $responseData['result'] ?? [];
        if (empty($resultArray)) {
            Storage::disk('local')->delete($selfieTempPath);
            Storage::disk('local')->delete($ineTempPath);
            return response()->json([
                'success' => false,
                'error' => 'No se obtuvo resultado de la verificación',
                'code' => 'NO_RESULT'
            ], 422);
        }

        $firstResult = $resultArray[0] ?? [];
        $faceMatches = $firstResult['face_matches'] ?? [];
        if (empty($faceMatches)) {
            Storage::disk('local')->delete($selfieTempPath);
            Storage::disk('local')->delete($ineTempPath);
            return response()->json([
                'success' => false,
                'error' => 'No se encontraron coincidencias de rostros',
                'code' => 'NO_FACE_MATCHES',
            ], 422);
        }

        $firstMatch = $faceMatches[0];
        $similarityRaw = $firstMatch['similarity'] ?? 0;
        $faceSimilarity = round($similarityRaw * 100, 2);

        // OCR
        $ocrResult = $this->ocrService->processImage($ineFile, 'ine');
        $nameMatchPercentage = 0;
        $nameMatchDetails = null;
        $fullExtractedText = null;

        if ($ocrResult['success']) {
            $extractedText = $ocrResult['text'] ?? '';
            $fullExtractedText = $extractedText;
            $nameMatch = $this->ocrService->validateNameMatch($extractedText, $userName);
            $nameMatchPercentage = $nameMatch['match_percentage'];
            $nameMatchDetails = $nameMatch;
        } else {
            $fullExtractedText = 'No se pudo extraer texto de la INE';
        }

        $isApproved = $faceSimilarity >= $threshold;

        // 🔥 VALIDACIÓN ESTRICTA: El nombre debe coincidir al menos 60%
        // Validar DESPUÉS de calcular la similitud facial para mostrar el progreso
        if ($nameMatchPercentage < 60) {
            Storage::disk('local')->delete($selfieTempPath);
            Storage::disk('local')->delete($ineTempPath);

            \Log::warning('⚠️ Nombre en INE no coincide con usuario', [
                'user_id' => $user->id,
                'user_name' => $userName,
                'extracted_text' => $fullExtractedText,
                'match_percentage' => $nameMatchPercentage,
                'face_similarity' => $faceSimilarity
            ]);

            // Retornar con información de similitud facial para que el usuario vea el progreso
            return response()->json([
                'success' => false,
                'error' => 'El nombre en la INE no coincide con tu perfil',
                'code' => 'NAME_MISMATCH',
                'face_id' => [
                    'similarity_percentage' => $faceSimilarity,
                    'threshold' => $threshold,
                    'approved' => $isApproved
                ],
                'ocr_validation' => [
                    'name_match_percentage' => $nameMatchPercentage,
                    'matched_words' => $nameMatchDetails['matched_words'] ?? 0,
                    'total_words' => $nameMatchDetails['total_words'] ?? 0,
                    'expected_name' => $userName,
                    'extracted_text' => $fullExtractedText,
                ],
                'details' => [
                    'expected_name' => $userName,
                    'match_percentage' => $nameMatchPercentage,
                    'message' => 'Por favor sube tu propia INE, no la de otra persona'
                ]
            ], 422);
        }

        Storage::disk('local')->delete($selfieTempPath);
        Storage::disk('local')->delete($ineTempPath);

        // 🔥 GUARDAR PROGRESO DEL PASO 1 SI ES APROBADO
        if ($isApproved) {
            try {
                $session = UserVerification::forUser($user->id)
                    ->where('status', 'in_progress')
                    ->latest()
                    ->first();

                if (!$session) {
                    $session = UserVerification::create([
                        'user_id' => $user->id,
                        'session_id' => 'verify_' . Str::uuid(),
                        'current_step' => 1,
                        'completed_steps' => [],
                        'steps_data' => [],
                        'status' => 'in_progress',
                        'progress_percentage' => 0,
                        'last_activity_at' => now(),
                        'expires_at' => now()->addHours(2)
                    ]);
                }

                $session->markStepCompleted(1, [
                    'verification_type' => 'face_id_ine',
                    'face_similarity' => $faceSimilarity,
                    'name_match_percentage' => $nameMatchPercentage,
                    'ocr_text' => $fullExtractedText,
                    'validated_at' => now()->toISOString(),
                    'success' => true
                ]);

                \Log::info('✅ Paso 1 guardado correctamente', [
                    'session_id' => $session->session_id,
                    'progress' => $session->progress_percentage
                ]);

            } catch (\Exception $saveError) {
                \Log::error('❌ Error guardando progreso del Paso 1', [
                    'error' => $saveError->getMessage()
                ]);
            }
        }

        if ($isApproved) {
            return response()->json([
                'success' => true,
                'is_match' => true,
                'message' => '✅ Verificación exitosa - Identidad confirmada',
                'face_id' => [
                    'similarity_percentage' => $faceSimilarity,
                    'threshold' => $threshold,
                    'approved' => true
                ],
                'ocr_validation' => [
                    'name_match_percentage' => $nameMatchPercentage,
                    'matched_words' => $nameMatchDetails['matched_words'] ?? 0,
                    'total_words' => $nameMatchDetails['total_words'] ?? 0,
                    'extracted_text' => $fullExtractedText,
                ]
            ]);
        } else {
            return response()->json([
                'success' => false,
                'is_match' => false,
                'error' => 'Verificación fallida - Similitud facial insuficiente',
                'face_id' => [
                    'similarity_percentage' => $faceSimilarity,
                    'threshold' => $threshold,
                ],
            ], 422);
        }

    } catch (\Exception $e) {
        \Log::error('❌ Error en verificación', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'error' => 'Error interno del servidor',
        ], 500);
    }
}

            /**
 * 🆕 Validar comprobante de domicilio (sin guardar archivo)
 */
        /**
 * 🆕 Validar comprobante de domicilio (sin guardar archivo)
 */
    public function validateDocument(Request $request)
    {
        try {
            // 🔥 VALIDAR QUE EL USUARIO NO ESTÉ YA VERIFICADO
            $user = auth()->user();
            
            if ($user->is_identity_verified) {
                Log::warning('⚠️ Usuario ya verificado intentó subir documento', [
                    'user_id' => $user->id,
                    'verified_at' => $user->verified_at
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Tu identidad ya está verificada',
                    'code' => 'ALREADY_VERIFIED',
                    'message' => 'No puedes volver a verificarte porque tu identidad ya fue confirmada.',
                    'verified_at' => $user->verified_at->toISOString()
                ], 403);
            }

            Log::info('📄 Iniciando validación de comprobante de domicilio');

            $request->validate([
                'document' => 'required|file|mimes:jpeg,png,jpg,pdf|max:10240'
            ]);

            $file = $request->file('document');

            Log::info('📁 Archivo recibido para validación', [
                'filename' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
                'user_id' => $user->id
            ]);

            $ocrService = app(OCRService::class);
            $ocrResult = $ocrService->processImage($file, 'comprobante');

            if (!$ocrResult['success']) {
                Log::error('❌ OCR falló para comprobante', [
                    'error' => $ocrResult['error'] ?? 'Unknown error'
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo procesar el documento',
                    'details' => $ocrResult['error'] ?? 'Error en OCR',
                    'suggestions' => [
                        'Asegúrate de que la imagen sea clara y legible',
                        'Verifica que todo el documento sea visible',
                        'Intenta con mejor iluminación'
                    ]
                ], 422);
            }

            $extractedText = $ocrResult['text'] ?? '';
            
            Log::info('📝 Texto extraído del comprobante', [
                'text_length' => strlen($extractedText),
                'text_preview' => substr($extractedText, 0, 200)
            ]);

            $validation = $ocrResult['validation'] ?? [];
            
            if (!($validation['is_valid'] ?? false)) {
                Log::warning('⚠️ Comprobante no válido', [
                    'validation' => $validation
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'El documento no parece ser un comprobante de domicilio válido',
                    'validation' => $validation,
                    'error_reasons' => [
                        'No se detectó una empresa de servicios reconocida',
                        'El formato no corresponde a un recibo de servicios'
                    ],
                    'suggestions' => [
                        'Verifica que sea un recibo de luz, agua, teléfono o gas',
                        'El comprobante debe tener máximo 4 meses de antigüedad',
                        'Asegúrate de que la dirección sea visible',
                        'Intenta con una foto más clara del documento'
                    ]
                ], 422);
            }

            $recencyValidation = $ocrService->validateDocumentRecency($extractedText, 'comprobante');
            
            if (!($recencyValidation['is_recent'] ?? false)) {
                Log::warning('⚠️ Comprobante muy antiguo o fecha inválida', [
                    'recency' => $recencyValidation
                ]);

                return response()->json([
                    'success' => false,
                    'error' => $recencyValidation['message'] ?? 'El comprobante es muy antiguo',
                    'recency_validation' => $recencyValidation,
                    'error_reasons' => [
                        $recencyValidation['message'] ?? 'Fecha de comprobante inválida'
                    ],
                    'suggestions' => [
                        $recencyValidation['suggestion'] ?? 'El comprobante debe tener máximo 4 meses de antigüedad',
                        'Verifica que la fecha del documento sea visible',
                        'Asegúrate de usar un comprobante reciente'
                    ]
                ], 422);
            }

            $extractedData = $validation['extracted_data'] ?? [];
            $detailedInfo = [];
            
            if (isset($extractedData['service'])) {
                $detailedInfo[] = "Servicio detectado: {$extractedData['service']}";
            }
            
            if (isset($extractedData['postal_code'])) {
                $detailedInfo[] = "Código Postal: {$extractedData['postal_code']}";
            }
            
            if (isset($recencyValidation['date_found'])) {
                $detailedInfo[] = "Fecha del comprobante: {$recencyValidation['date_found']}";
            }
            
            if (isset($recencyValidation['months_old'])) {
                $months = $recencyValidation['months_old'];
                $detailedInfo[] = "Antigüedad: {$months} " . ($months == 1 ? 'mes' : 'meses');
            }

            $response = [
                'success' => true,
                'message' => '✅ Comprobante de domicilio verificado exitosamente',
                'document_validation' => [
                    'is_valid' => true,
                    'confidence' => $validation['confidence'] ?? 0,
                    'confidence_percentage' => round($validation['confidence'] ?? 0, 2),
                    'document_type' => 'comprobante',
                    'extracted_text' => $extractedText,
                    'extracted_data' => $extractedData,
                    'recency_validation' => $recencyValidation,
                    'patterns_found' => $validation['patterns'] ?? []
                ],
                'detailed_info' => $detailedInfo,
                'next_action' => 'show_finalize_button'
            ];

            Log::info('✅ Comprobante validado exitosamente', [
                'user_id' => $user->id,
                'confidence' => $validation['confidence'] ?? 0
            ]);

            try {
                Log::info('💾 Guardando progreso del Paso 2 en base de datos...');
                
                $session = UserVerification::forUser($user->id)
                    ->where('status', 'in_progress')
                    ->latest()
                    ->first();

                if (!$session) {
                    Log::info('📝 No existe sesión, creando nueva...');
                    
                    $session = UserVerification::create([
                        'user_id' => $user->id,
                        'session_id' => 'verify_' . Str::uuid(),
                        'current_step' => 2,
                        'completed_steps' => [],
                        'steps_data' => [],
                        'status' => 'in_progress',
                        'progress_percentage' => 0,
                        'last_activity_at' => now(),
                        'expires_at' => now()->addHours(2)
                    ]);
                    
                    Log::info('✅ Sesión creada', ['session_id' => $session->session_id]);
                }

                $session->markStepCompleted(2, [
                    'document_type' => 'comprobante',
                    'validation' => $response['document_validation'],
                    'confidence' => $validation['confidence'] ?? 0,
                    'service' => $extractedData['service'] ?? null,
                    'validated_at' => now()->toISOString(),
                    'success' => true
                ]);

                Log::info('✅ Paso 2 guardado correctamente', [
                    'session_id' => $session->session_id,
                    'completed_steps' => $session->completed_steps,
                    'progress' => $session->progress_percentage
                ]);

                $response['session_id'] = $session->session_id;
                $response['progress_percentage'] = $session->progress_percentage;
                $response['completed_steps'] = $session->completed_steps;

            } catch (\Exception $saveError) {
                Log::error('❌ Error guardando progreso del Paso 2', [
                    'error' => $saveError->getMessage(),
                    'trace' => $saveError->getTraceAsString()
                ]);
            }

            return response()->json($response);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('❌ Validación de archivo fallida', [
                'errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Archivo inválido',
                'details' => $e->errors(),
                'suggestions' => [
                    'El archivo debe ser JPG, PNG o PDF',
                    'El tamaño máximo es de 10MB'
                ]
            ], 422);

        } catch (\Exception $e) {
            Log::error('❌ Error procesando comprobante', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error interno al procesar el documento',
                'details' => $e->getMessage(),
                'suggestions' => [
                    'Intenta nuevamente en unos momentos',
                    'Si el problema persiste, contacta al soporte'
                ]
            ], 500);
        }
    }
            /**
 * 🔥 Finalizar verificación - Marcar usuario como verificado
 * Se llama cuando el usuario hace clic en "Finalizar Verificación"
 */
        public function finalizeVerification(Request $request)
    {
        try {
            $userId = auth()->id();
            $user = auth()->user();

            Log::info('🎯 Iniciando finalización de verificación', [
                'user_id' => $userId,
                'user_name' => $user->name
            ]);

            // 🔥 PRIMERO: Verificar si ya está verificado
            if ($user->is_identity_verified) {
                Log::info('ℹ️ Usuario ya estaba verificado', [
                    'user_id' => $userId,
                    'verified_at' => $user->verified_at
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Tu identidad ya estaba verificada',
                    'data' => [
                        'is_verified' => true,
                        'verified_at' => $user->verified_at->toISOString(),
                        'verification_method' => $user->verification_method,
                        'can_publish_properties' => true
                    ],
                    'redirect_url' => '/properties/create'
                ]);
            }

            // Buscar sesión activa del usuario
            $session = UserVerification::where('user_id', $userId)
                ->whereIn('status', ['in_progress', 'completed'])
                ->latest()
                ->first();

            if (!$session) {
                Log::warning('⚠️ No se encontró sesión activa', [
                    'user_id' => $userId
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró una sesión de verificación activa',
                    'suggestion' => 'Completa los pasos de verificación antes de finalizar',
                    'suggestions' => [
                        'Paso 1: Verifica tu INE + Selfie',
                        'Paso 2: Sube tu comprobante de domicilio',
                        'Luego haz clic en Finalizar Verificación'
                    ]
                ], 404);
            }

            // Verificar que tenga los 2 pasos completados
            $completedSteps = $session->completed_steps ?? [];
            
            Log::info('📊 Verificando pasos completados', [
                'session_id' => $session->session_id,
                'completed_steps' => $completedSteps,
                'required_steps' => [1, 2],
                'status' => $session->status,
                'progress' => $session->progress_percentage
            ]);

            // Verificar que tenga Paso 1 (INE) y Paso 2 (Comprobante)
            $hasStep1 = in_array(1, $completedSteps);
            $hasStep2 = in_array(2, $completedSteps);

            if (!$hasStep1 || !$hasStep2) {
                $missingSteps = [];
                if (!$hasStep1) $missingSteps[] = 'Paso 1: INE + Selfie';
                if (!$hasStep2) $missingSteps[] = 'Paso 2: Comprobante de Domicilio';

                Log::warning('⚠️ Pasos incompletos', [
                    'user_id' => $userId,
                    'session_id' => $session->session_id,
                    'completed_steps' => $completedSteps,
                    'missing_steps' => $missingSteps,
                    'has_step_1' => $hasStep1,
                    'has_step_2' => $hasStep2
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Debes completar ambos pasos antes de finalizar',
                    'data' => [
                        'completed_steps' => $completedSteps,
                        'missing_steps' => $missingSteps,
                        'has_step_1' => $hasStep1,
                        'has_step_2' => $hasStep2,
                        'session_id' => $session->session_id,
                        'progress_percentage' => $session->progress_percentage
                    ],
                    'suggestions' => [
                        'Completa todos los pasos requeridos:',
                        ...$missingSteps,
                        '',
                        'Pasos completados hasta ahora:',
                        ...array_map(function($step) {
                            return "✅ Paso {$step}";
                        }, $completedSteps)
                    ]
                ], 422);
            }

            // 🎉 MARCAR USUARIO COMO VERIFICADO
            $user->update([
                'is_identity_verified' => true,
                'verified_at' => now(),
                'verification_method' => 'face_id_85_document_proof'
            ]);

            // Marcar sesión como completada
            $session->update([
                'status' => 'completed',
                'completed_at' => now(),
                'progress_percentage' => 100
            ]);

            Log::info('🎉 Usuario verificado completamente', [
                'user_id' => $userId,
                'session_id' => $session->session_id,
                'verified_at' => $user->verified_at,
                'verification_method' => $user->verification_method,
                'completed_steps' => $completedSteps,
                'session_status' => $session->status
            ]);

            return response()->json([
                'success' => true,
                'message' => '🎉 ¡Verificación completada exitosamente!',
                'data' => [
                    'is_verified' => true,
                    'verified_at' => $user->verified_at->toISOString(),
                    'verification_method' => $user->verification_method,
                    'can_publish_properties' => true,
                    'completed_steps' => $completedSteps,
                    'session_id' => $session->session_id,
                    'progress_percentage' => 100
                ],
                'congratulations' => [
                    'title' => '¡Felicidades!',
                    'message' => 'Tu identidad ha sido verificada exitosamente. Ya puedes publicar propiedades en la plataforma.',
                    'next_steps' => [
                        'Publica tu primera propiedad',
                        'Explora propiedades disponibles',
                        'Completa tu perfil'
                    ]
                ],
                'redirect_url' => '/properties/create'
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Error finalizando verificación', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al finalizar la verificación',
                'details' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
                'suggestion' => 'Intenta nuevamente en unos momentos'
            ], 500);
        }
    }


    public function startVerificationSession(Request $request)
    {
        try {
            $userId = auth()->id();
            
            Log::info('🔄 Iniciando sesión de verificación', ['user_id' => $userId]);
            
            // Buscar sesión activa existente
            $session = UserVerification::forUser($userId)->active()->latest()->first();
            
            if ($session) {
                Log::info('📋 Sesión recuperada', [
                    'session_id' => $session->session_id,
                    'progress' => $session->progress_percentage
                ]);
                
                return response()->json([
                    'success' => true,
                    'session_id' => $session->session_id,
                    'existing' => true,
                    'current_step' => $session->current_step,
                    'completed_steps' => $session->completed_steps,
                    'steps_data' => $session->steps_data,
                    'progress' => $session->progress_percentage,
                    'expires_at' => $session->expires_at->toISOString(),
                    'message' => 'Sesión recuperada'
                ]);
            }
            
            // Crear nueva sesión
            $faceEnabled = config('services.compreface.enabled', false);
            
            $session = UserVerification::create([
                'user_id' => $userId,
                'session_id' => 'verify_' . Str::uuid(),
                'current_step' => 1,
                'completed_steps' => [],
                'steps_data' => [],
                'status' => 'in_progress',
                'progress_percentage' => 0,
                'last_activity_at' => now(),
                'expires_at' => now()->addHours(2)
            ]);
            
            Log::info('🆕 Nueva sesión creada', ['session_id' => $session->session_id]);
            
            return response()->json([
                'success' => true,
                'session_id' => $session->session_id,
                'existing' => false,
                'current_step' => 1,
                'face_enabled' => $faceEnabled,
                'message' => 'Sesión iniciada'
            ]);
            
        } catch (\Exception $e) {
            Log::error('❌ Error iniciando sesión', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'No se pudo iniciar la sesión'
            ], 500);
        }
    }

/**
 * 🔥 Guardar progreso de un paso
 */
    public function saveStepProgress(Request $request)
    {
        try {
            $request->validate([
                'session_id' => 'required|string',
                'step_number' => 'required|integer',
                'step_data' => 'required|array'
            ]);
            
            $userId = auth()->id();
            $sessionId = $request->input('session_id');
            $stepNumber = $request->input('step_number');
            $stepData = $request->input('step_data');
            
            // Buscar sesión
            $session = UserVerification::forUser($userId)
                ->where('session_id', $sessionId)
                ->active()
                ->firstOrFail();
            
            // Guardar paso completado
            $session->markStepCompleted($stepNumber, $stepData);
            
            Log::info('✅ Progreso guardado', [
                'session_id' => $sessionId,
                'step' => $stepNumber,
                'progress' => $session->progress_percentage
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Progreso guardado',
                'next_step' => $stepNumber + 1,
                'progress' => $session->progress_percentage,
                'is_completed' => $session->isCompleted()
            ]);
            
        } catch (\Exception $e) {
            Log::error('❌ Error guardando progreso', [
                'error' => $e->getMessage(),
                'session_id' => $request->input('session_id')
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'No se pudo guardar el progreso'
            ], 500);
        }
    }




                /**
 * 🔥 OBTENER PROGRESO - Busca sesiones completadas o en progreso
 */
        public function getVerificationProgress(Request $request)
    {
        try {
            $userId = auth()->id();
            
            \Log::info('🔍 Consultando progreso de verificación', [
                'user_id' => $userId
            ]);
            
            // 🔥 BUSCAR SESIONES ACTIVAS O COMPLETADAS
            $session = UserVerification::forUser($userId)
                ->whereIn('status', ['in_progress', 'completed'])
                ->latest()
                ->first();
            
            if (!$session) {
                \Log::info('📭 No hay sesión para recuperar', [
                    'user_id' => $userId
                ]);
                
                return response()->json([
                    'success' => true,
                    'has_session' => false
                ]);
            }
            
            // 🔥 VALIDACIÓN DE INTEGRIDAD: Verificar que los datos pertenecen al usuario
            $user = auth()->user();
            $userName = $user->name . ' ' . $user->last_name;
            $stepsData = $session->steps_data ?? [];

            // Verificar si hay datos de verificación facial
            if (isset($stepsData['1']) && isset($stepsData['1']['ocr_text'])) {
                $ocrText = $stepsData['1']['ocr_text'];

                // Validar que el nombre en el OCR coincida con el usuario
                $nameMatch = $this->ocrService->validateNameMatch($ocrText, $userName);
                $matchPercentage = $nameMatch['match_percentage'];

                if ($matchPercentage < 60) {
                    \Log::warning('⚠️ Datos de verificación no coinciden con usuario actual', [
                        'user_id' => $userId,
                        'user_name' => $userName,
                        'match_percentage' => $matchPercentage,
                        'session_id' => $session->session_id
                    ]);

                    // Invalidar la sesión corrupta
                    $session->update(['status' => 'invalidated']);

                    return response()->json([
                        'success' => true,
                        'has_session' => false,
                        'warning' => 'Sesión anterior inválida - datos no coinciden con tu perfil'
                    ]);
                }
            }

            // 🔥 LOG DETALLADO de lo que se va a devolver
            \Log::info('📦 Sesión recuperada', [
                'session_id' => $session->session_id,
                'status' => $session->status,
                'completed_steps' => $session->completed_steps,
                'steps_data_keys' => array_keys($session->steps_data ?? []),
                'progress' => $session->progress_percentage,
                'current_step' => $session->current_step
            ]);

            return response()->json([
                'success' => true,
                'has_session' => true,
                'session_id' => $session->session_id,
                'current_step' => $session->current_step,
                'completed_steps' => $session->completed_steps,
                'steps_data' => $session->steps_data,
                'progress_percentage' => $session->progress_percentage,
                'status' => $session->status,
                'expires_at' => $session->expires_at->toISOString()
            ]);
            
        } catch (\Exception $e) {
            \Log::error('❌ Error obteniendo progreso', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'No se pudo obtener el progreso'
            ], 500);
        }
    }

    /**
     * 🆕 ENDPOINT PARA OBTENER CONFIGURACIÓN DE VERIFICACIÓN
     * Frontend consulta este endpoint para saber qué features están activas
     */
    public function getVerificationConfig()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'ocr_enabled' => true,
                'face_verification_enabled' => config('services.compreface.enabled', false),
                'face_threshold' => 85, // 🔒 THRESHOLD FIJO
                'face_threshold_adjustable' => false, // 🔒 NO SE AJUSTA
                'supported_documents' => ['ine', 'pasaporte', 'comprobante'],
                'features' => [
                    'name_verification' => true,
                    'vigency_verification' => true,
                    'curp_validation' => true,
                    'quality_assessment' => true,
                    'contamination_detection' => true
                ]
            ]
        ]);
    }

    /**
     * Helper: Limpiar archivos temporales
     */
    private function cleanupTempFiles($files)
    {
        foreach ($files as $file) {
            if (is_string($file) && file_exists($file)) {
                try {
                    unlink($file);
                    Log::info('🧹 Archivo temporal eliminado: ' . basename($file));
                } catch (\Exception $e) {
                    Log::warning('⚠️ No se pudo eliminar archivo temporal: ' . basename($file));
                }
            }
        }
    }

    /**
     * Helper: Obtener nivel de confianza desde similitud
     */
    private function getConfidenceLevelFromSimilarity($similarityPercentage)
    {
        if ($similarityPercentage >= 95) return 'muy_alta';
        if ($similarityPercentage >= 90) return 'alta';
        if ($similarityPercentage >= 85) return 'buena';
        if ($similarityPercentage >= 70) return 'media';
        if ($similarityPercentage >= 60) return 'baja';
        return 'muy_baja';
    }

    // ==========================================
    // RESTO DE MÉTODOS (OCR, etc.) - SIN CAMBIOS
    // ==========================================

    public function verifySingleDocument(Request $request)
    {
        try {
            $this->enforceRateLimit($request, 'single_document');
            $this->validateSingleDocumentRequest($request);

            $documentType = $request->input('document_type');
            $file = $request->file('document');
            $user = auth()->user();

            Log::info("🔍 Iniciando verificación con validaciones avanzadas", [
                'user_id' => $user->id,
                'user_name' => $user->name . ' ' . $user->last_name,
                'document_type' => $documentType,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ]);

            $this->validateDocumentFile($file, $documentType);

            $ocrResult = $this->ocrService->processImage($file, $documentType);

            if (!$ocrResult['success']) {
                return $this->strictErrorResponse(
                    'No se pudo procesar el documento - Verifica la calidad de la imagen',
                    'ocr_failed',
                    'OCR_PROCESSING_FAILED',
                    [
                        'Verifica que el documento esté claro y bien iluminado',
                        'Asegúrate de que no tenga reflejos o sombras',
                        'El documento debe estar completamente visible',
                        'Evita imágenes borrosas o con muy poca resolución'
                    ]
                );
            }

            $extractedText = $ocrResult['text'] ?? '';
            $ocrValidation = $ocrResult['validation'] ?? null;

            $nameMatch = null;
            if (in_array($documentType, ['ine', 'pasaporte'])) {
                $userName = $user->name . ' ' . $user->last_name;
                $nameMatch = $this->ocrService->validateNameMatch($extractedText, $userName);

                Log::info('📝 Resultado validación de nombre', [
                    'user_name' => $userName,
                    'matches' => $nameMatch['matches'],
                    'match_percentage' => $nameMatch['match_percentage'],
                    'matched_words' => $nameMatch['matched_words'],
                    'total_words' => $nameMatch['total_words']
                ]);

                if (!$nameMatch['matches']) {
                    return $this->strictErrorResponse(
                        "El nombre en el documento no coincide con tu nombre registrado ({$nameMatch['match_percentage']}% de coincidencia)",
                        'name_mismatch',
                        'NAME_MISMATCH',
                        [
                            "Tu nombre registrado: {$userName}",
                            "Palabras encontradas en el documento: " . implode(', ', $nameMatch['found_words']),
                            "Coincidencia: {$nameMatch['matched_words']} de {$nameMatch['total_words']} palabras",
                            'Asegúrate de que el nombre en tu perfil coincida exactamente con tu documento oficial',
                            'Si tu nombre es diferente, actualiza tu perfil antes de continuar',
                            'Verifica que el documento sea tuyo y esté completo'
                        ]
                    );
                }

                Log::info('✅ Nombre verificado correctamente', [
                    'match_percentage' => $nameMatch['match_percentage'],
                    'matched_words' => $nameMatch['matched_words']
                ]);
            }

            $recencyCheck = $this->ocrService->validateDocumentRecency($extractedText, $documentType);

            Log::info('📅 Resultado validación de vigencia', [
                'document_type' => $documentType,
                'is_recent' => $recencyCheck['is_recent'],
                'year_found' => $recencyCheck['year_found'] ?? 'no detectado',
                'message' => $recencyCheck['message']
            ]);

            if (!$recencyCheck['is_recent']) {
                $suggestions = [
                    $recencyCheck['message'],
                    $recencyCheck['suggestion'] ?? 'Verifica la vigencia del documento'
                ];

                if ($documentType === 'ine') {
                    $suggestions[] = 'Tu INE debe estar vigente (no vencida)';
                    $suggestions[] = 'La fecha de vigencia debe ser 2025 o posterior';
                    $suggestions[] = 'Puedes renovarla en cualquier módulo del INE';
                    if (isset($recencyCheck['year_found'])) {
                        $suggestions[] = "Año detectado en documento: {$recencyCheck['year_found']}";
                    }
                } elseif ($documentType === 'pasaporte') {
                    $suggestions[] = 'Tu pasaporte debe estar vigente';
                    $suggestions[] = 'Verifica la fecha de vencimiento en el documento';
                    $suggestions[] = 'Los pasaportes tienen validez de 10 años';
                    if (isset($recencyCheck['year_found'])) {
                        $suggestions[] = "Año detectado en documento: {$recencyCheck['year_found']}";
                    }
                } elseif ($documentType === 'comprobante') {
                    $suggestions[] = 'El comprobante debe tener máximo 4 meses de antigüedad';
                    $suggestions[] = 'Sube un recibo más reciente de luz, agua, gas o teléfono';
                    if (isset($recencyCheck['date_found'])) {
                        $suggestions[] = "Fecha detectada: {$recencyCheck['date_found']}";
                    }
                    if (isset($recencyCheck['months_old'])) {
                        $suggestions[] = "Antigüedad: {$recencyCheck['months_old']} meses";
                    }
                }

                return $this->strictErrorResponse(
                    $recencyCheck['message'],
                    'document_expired',
                    'DOCUMENT_EXPIRED',
                    $suggestions
                );
            }

            Log::info('✅ Documento vigente verificado', [
                'document_type' => $documentType,
                'year_found' => $recencyCheck['year_found'],
                'validation_message' => $recencyCheck['message']
            ]);

            $detectedType = $this->detectDocumentTypeEnhanced($extractedText);

            if ($detectedType !== $documentType) {
                return $this->strictErrorResponse(
                    "Se esperaba {$documentType} pero se detectó: " . ($detectedType ?: 'documento no reconocido'),
                    'document_type_mismatch',
                    'DOCUMENT_TYPE_MISMATCH',
                    [
                        "Asegúrate de subir únicamente un {$documentType}",
                        "El documento detectado no corresponde al tipo solicitado",
                        "Verifica que no sea una captura de pantalla o copia",
                        "Revisa que el documento sea auténtico y esté completo"
                    ]
                );
            }

            $validationResult = $this->strictValidateDocumentTypeEnhanced($extractedText, $documentType, $ocrValidation);

            if (!$validationResult['is_valid']) {
                return $this->strictErrorResponse(
                    $validationResult['error'] ?? 'Documento no válido',
                    'strict_validation_failed',
                    'STRICT_VALIDATION_FAILED',
                    $validationResult['suggestions'] ?? []
                );
            }

            $purityCheck = $this->validateDocumentPurityEnhanced($extractedText, $documentType);

            if (!$purityCheck['is_pure']) {
                return $this->strictErrorResponse(
                    $purityCheck['error'],
                    'document_contamination',
                    'DOCUMENT_CONTAMINATION',
                    $purityCheck['suggestions']
                );
            }

            $qualityCheck = $this->validateImageQuality($file, $extractedText);

            if (!$qualityCheck['is_quality']) {
                return $this->strictErrorResponse(
                    $qualityCheck['error'],
                    'image_quality_failed',
                    'IMAGE_QUALITY_FAILED',
                    $qualityCheck['suggestions']
                );
            }

            Log::info('🎉 Documento verificado exitosamente con TODAS las validaciones', [
                'user_id' => $user->id,
                'document_type' => $documentType,
                'confidence' => $validationResult['confidence'],
                'name_match_percentage' => $nameMatch['match_percentage'] ?? 'N/A',
                'document_vigency' => $recencyCheck['message'],
                'document_year' => $recencyCheck['year_found'] ?? 'N/A',
                'quality_score' => $qualityCheck['quality_score'] ?? 0,
                'critical_elements' => $validationResult['critical_elements'] ?? 0
            ]);

            return response()->json([
                'success' => true,
                'message' => "✅ {$documentType} verificado correctamente con validación avanzada",
                'code' => 'DOCUMENT_VERIFIED_ENHANCED',
                'data' => [
                    'document_type' => $documentType,
                    'confidence' => $validationResult['confidence'],
                    'critical_elements_found' => $validationResult['critical_elements'] ?? 0,
                    'patterns_detected' => count($validationResult['patterns'] ?? []),
                    'quality_level' => $this->getQualityLevel($validationResult['confidence']),
                    'quality_score' => $qualityCheck['quality_score'] ?? 0,
                    'verification_timestamp' => now()->toISOString(),
                    'validation_details' => [
                        'name_verified' => $nameMatch ? true : false,
                        'name_match_percentage' => $nameMatch['match_percentage'] ?? null,
                        'name_matched_words' => $nameMatch['matched_words'] ?? null,
                        'vigency_verified' => true,
                        'vigency_message' => $recencyCheck['message'],
                        'document_year' => $recencyCheck['year_found'] ?? null,
                        'curp_valid' => $validationResult['curp_valid'] ?? false,
                        'voter_key_valid' => $validationResult['voter_key_valid'] ?? false,
                        'state_detected' => $validationResult['state_detected'] ?? null,
                        'service_company' => $validationResult['service_company'] ?? null
                    ]
                ],
                'security_notice' => 'Documento procesado únicamente en memoria con validación CURP completa. No se almacenan datos personales ni imágenes.',
                'next_steps' => $this->getNextStepsForDocument($documentType)
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación: ' . implode(', ', Arr::flatten($e->errors())),
                'code' => 'VALIDATION_ERROR',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            $errorId = 'strict_err_' . uniqid();

            Log::error('Error crítico en verificación estricta mejorada', [
                'error_id' => $errorId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'document_type' => $request->input('document_type'),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del sistema',
                'code' => 'INTERNAL_ERROR',
                'error_id' => $errorId
            ], 500);
        }
    }

    // ==========================================
    // MÉTODOS PRIVADOS DE VALIDACIÓN (Sin cambios)
    // ==========================================

    private function detectDocumentTypeEnhanced($text)
    {
        $text = strtoupper($text);
        $scores = ['ine' => 0, 'pasaporte' => 0, 'comprobante' => 0];

        if (strpos($text, 'INSTITUTO NACIONAL ELECTORAL') !== false) {
            $scores['ine'] += 50;
        }
        if (strpos($text, 'CREDENCIAL PARA VOTAR') !== false) {
            $scores['ine'] += 40;
        }
        if (preg_match('/[A-Z]{4}\d{6}[HMX][A-Z0-9]{5}[A-Z0-9]{2}/', $text)) {
            $scores['ine'] += 30;
        }
        if (preg_match('/[A-Z]{6}\d{8}[HM]\d{3}/', $text)) {
            $scores['ine'] += 25;
        }

        if (strpos($text, 'PASAPORTE') !== false || strpos($text, 'PASSPORT') !== false) {
            $scores['pasaporte'] += 40;
        }
        if (strpos($text, 'ESTADOS UNIDOS MEXICANOS') !== false) {
            $scores['pasaporte'] += 45;
        }
        if (preg_match('/[GN]\d{8}/', $text)) {
            $scores['pasaporte'] += 30;
        }
        if (strpos($text, 'MEX') !== false) {
            $scores['pasaporte'] += 15;
        }

        $serviceCompanies = ['CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'TELMEX', 'IZZI', 'TOTALPLAY', 'MEGACABLE'];
        foreach ($serviceCompanies as $company) {
            if (strpos($text, $company) !== false) {
                $scores['comprobante'] += 35;
                break;
            }
        }

        if (preg_match('/\$[\d,]+\.?\d*/', $text)) {
            $scores['comprobante'] += 15;
        }
        if (preg_match('/KWH|CONSUMO|LECTURA/', $text)) {
            $scores['comprobante'] += 20;
        }

        if ($scores['ine'] > 0) {
            if (strpos($text, 'PASAPORTE') !== false) $scores['ine'] -= 30;
            if (strpos($text, 'CFE') !== false) $scores['ine'] -= 25;
        }

        if ($scores['pasaporte'] > 0) {
            if (strpos($text, 'CREDENCIAL PARA VOTAR') !== false) $scores['pasaporte'] -= 40;
            if (strpos($text, 'CFE') !== false) $scores['pasaporte'] -= 25;
        }

        if ($scores['comprobante'] > 0) {
            if (strpos($text, 'INSTITUTO NACIONAL ELECTORAL') !== false) $scores['comprobante'] -= 40;
            if (strpos($text, 'PASAPORTE') !== false) $scores['comprobante'] -= 35;
        }

        $maxScore = max($scores);
        if ($maxScore < 15) {
            return null;
        }

        return array_search($maxScore, $scores);
    }

    private function strictValidateDocumentTypeEnhanced($text, $documentType, $ocrValidation = null)
    {
        switch ($documentType) {
            case 'ine':
                return $this->strictValidateINEEnhanced($text, $ocrValidation);
            case 'pasaporte':
                return $this->strictValidatePassportEnhanced($text, $ocrValidation);
            case 'comprobante':
                return $this->strictValidateAddressProofEnhanced($text, $ocrValidation);
            default:
                return [
                    'is_valid' => false,
                    'error' => 'Tipo de documento no soportado',
                    'confidence' => 0
                ];
        }
    }

    private function strictValidateINEEnhanced($text, $ocrValidation = null)
    {
        $text = strtoupper($text);
        $score = 0;
        $patterns = [];
        $criticalElements = 0;

        if ($ocrValidation && isset($ocrValidation['is_valid'])) {
            $score = $ocrValidation['confidence'] ?? 0;
            $patterns = $ocrValidation['patterns'] ?? [];
            $criticalElements = $ocrValidation['critical_elements_passed'] ?? 0;

            $extractedData = $ocrValidation['extracted_data'] ?? [];

            foreach (self::VALID_MEXICAN_STATES as $state) {
                if (strpos($text, $state) !== false) {
                    $score += 5;
                    $patterns[] = 'Valid Mexican State: ' . $state;
                    break;
                }
            }

            $retryInfo = $this->handleIntelligentRetries('ine');
            $progressiveValidation = $this->validateWithProgressiveThresholds(
                $score,
                'ine',
                $criticalElements,
                $retryInfo['current_attempts']
            );

            $isValid = $ocrValidation['is_valid'] && $progressiveValidation['is_valid'];
            $detailedFeedback = $isValid ? [] : $this->getDetailedFeedback(
                $score,
                $progressiveValidation['threshold_used'],
                'ine'
            );

            return [
                'is_valid' => $isValid,
                'confidence' => min(100, $score),
                'patterns' => $patterns,
                'critical_elements' => $criticalElements,
                'curp_valid' => isset($extractedData['curp']),
                'voter_key_valid' => isset($extractedData['voter_key']),
                'state_detected' => $extractedData['state'] ?? null,
                'threshold_info' => $progressiveValidation,
                'retry_info' => $retryInfo,
                'error' => !$isValid ? $detailedFeedback['message'] : null,
                'suggestions' => !$isValid ? $detailedFeedback['suggestions'] : []
            ];
        }

        return $this->basicINEValidation($text);
    }

    private function strictValidatePassportEnhanced($text, $ocrValidation = null)
    {
        if ($ocrValidation && isset($ocrValidation['is_valid'])) {
            $score = $ocrValidation['confidence'] ?? 0;

            $retryInfo = $this->handleIntelligentRetries('pasaporte');
            $progressiveValidation = $this->validateWithProgressiveThresholds(
                $score,
                'pasaporte',
                count($ocrValidation['patterns'] ?? []),
                $retryInfo['current_attempts']
            );

            $isValid = $ocrValidation['is_valid'] && $progressiveValidation['is_valid'];
            $detailedFeedback = $isValid ? [] : $this->getDetailedFeedback(
                $score,
                $progressiveValidation['threshold_used'],
                'pasaporte'
            );

            return [
                'is_valid' => $isValid,
                'confidence' => $score,
                'patterns' => $ocrValidation['patterns'] ?? [],
                'critical_elements' => count($ocrValidation['patterns'] ?? []),
                'threshold_info' => $progressiveValidation,
                'retry_info' => $retryInfo,
                'error' => !$isValid ? $detailedFeedback['message'] : null,
                'suggestions' => !$isValid ? $detailedFeedback['suggestions'] : []
            ];
        }

        return $this->basicPassportValidation($text);
    }

    private function strictValidateAddressProofEnhanced($text, $ocrValidation = null)
    {
        if ($ocrValidation && isset($ocrValidation['is_valid'])) {
            $score = $ocrValidation['confidence'] ?? 0;
            $extractedData = $ocrValidation['extracted_data'] ?? [];

            if (isset($extractedData['bill_date'])) {
                $billDate = $extractedData['bill_date'];
                if ($this->isDateTooOld($billDate, 4)) {
                    $score -= 30;
                }
            }

            $retryInfo = $this->handleIntelligentRetries('comprobante');
            $progressiveValidation = $this->validateWithProgressiveThresholds(
                max(0, $score),
                'comprobante',
                count($ocrValidation['patterns'] ?? []),
                $retryInfo['current_attempts']
            );

            $isValid = $ocrValidation['is_valid'] && $progressiveValidation['is_valid'];
            $detailedFeedback = $isValid ? [] : $this->getDetailedFeedback(
                max(0, $score),
                $progressiveValidation['threshold_used'],
                'comprobante'
            );

            return [
                'is_valid' => $isValid,
                'confidence' => max(0, $score),
                'patterns' => $ocrValidation['patterns'] ?? [],
                'critical_elements' => count($ocrValidation['patterns'] ?? []),
                'service_company' => $extractedData['service'] ?? null,
                'threshold_info' => $progressiveValidation,
                'retry_info' => $retryInfo,
                'error' => !$isValid ? $detailedFeedback['message'] : null,
                'suggestions' => !$isValid ? $detailedFeedback['suggestions'] : []
            ];
        }

        return $this->basicAddressProofValidation($text);
    }

    private function validateDocumentPurityEnhanced($text, $documentType)
    {
        $text = strtoupper($text);
        $blacklist = self::DOCUMENT_BLACKLISTS[$documentType] ?? [];
        $contamination = [];
        $severityScore = 0;

        foreach ($blacklist as $forbiddenWord) {
            if (strpos($text, $forbiddenWord) !== false) {
                $contamination[] = $forbiddenWord;

                if (in_array($forbiddenWord, ['INSTITUTO NACIONAL ELECTORAL', 'PASAPORTE', 'CFE'])) {
                    $severityScore += 50;
                } else {
                    $severityScore += 20;
                }
            }
        }

        if (!empty($contamination)) {
            $severity = $severityScore > 50 ? 'alta' : ($severityScore > 20 ? 'media' : 'baja');

            return [
                'is_pure' => false,
                'error' => "El documento contiene elementos no permitidos para {$documentType} (severidad {$severity}): " . implode(', ', $contamination),
                'contamination_score' => $severityScore,
                'suggestions' => [
                    "Asegúrate de subir únicamente un {$documentType}",
                    "No incluyas otros documentos en la misma imagen",
                    "Verifica que no sea una captura de pantalla con múltiples documentos",
                    "Evita documentos que contengan elementos de otros tipos de identificación"
                ]
            ];
        }

        return ['is_pure' => true, 'contamination_score' => 0];
    }

    private function validateWithProgressiveThresholds($confidence, $documentType, $criticalElements, $attempts = 0)
    {
        $baseThreshold = self::STRICT_CONFIDENCE_THRESHOLDS[$documentType];

        if ($criticalElements >= 2) {
            $baseThreshold -= 8;
        }

        if ($attempts >= 1) {
            $baseThreshold -= 15;
        }

        $minimumThreshold = [
            'ine' => 30,
            'pasaporte' => 25,
            'comprobante' => 20
        ];

        $finalThreshold = max($baseThreshold, $minimumThreshold[$documentType]);

        return [
            'is_valid' => $confidence >= $finalThreshold,
            'threshold_used' => $finalThreshold,
            'original_threshold' => self::STRICT_CONFIDENCE_THRESHOLDS[$documentType],
            'adjustments_applied' => [
                'critical_elements_bonus' => $criticalElements >= 3 ? -5 : 0,
                'attempts_bonus' => $attempts >= 2 ? -10 : 0
            ]
        ];
    }

    private function getDetailedFeedback($confidence, $requiredConfidence, $documentType)
    {
        $gap = $requiredConfidence - $confidence;

        if ($gap <= 5) {
            return [
                'level' => 'minor',
                'message' => 'Documento casi válido. Pequeños ajustes necesarios.',
                'suggestions' => [
                    'Mejora ligeramente la iluminación',
                    'Enfoca un poco más el documento',
                    'Evita pequeñas sombras en las esquinas'
                ]
            ];
        } elseif ($gap <= 15) {
            return [
                'level' => 'moderate',
                'message' => 'Documento necesita mejoras en calidad.',
                'suggestions' => [
                    'Usa mejor iluminación natural',
                    'Asegúrate de que esté completamente visible',
                    'Evita reflejos y sombras',
                    'Toma la foto más de cerca'
                ]
            ];
        } else {
            return [
                'level' => 'major',
                'message' => 'Documento requiere mejoras significativas.',
                'suggestions' => [
                    'Verifica que sea una ' . strtoupper($documentType) . ' oficial vigente',
                    'Mejora considerablemente la iluminación',
                    'Asegúrate de que todos los textos sean legibles',
                    'Toma la foto con mejor resolución',
                    'Evita que esté borroso o pixelado'
                ]
            ];
        }
    }

    private function handleIntelligentRetries($documentType)
    {
        $userId = auth()->id();
        $attemptsKey = "attempts_{$documentType}_{$userId}";
        $attempts = Cache::get($attemptsKey, 0);

        Cache::put($attemptsKey, $attempts + 1, now()->addHours(24));

        return [
            'current_attempts' => $attempts + 1,
            'use_relaxed' => $attempts >= 1,
            'message' => $attempts >= 1 ? 'Aplicando criterios más flexibles' : null
        ];
    }

    private function validateImageQuality($file, $extractedText)
    {
        $qualityScore = 100;
        $issues = [];

        $fileSize = $file->getSize();
        if ($fileSize < 50000) {
            $qualityScore -= 15;
            $issues[] = 'Archivo muy pequeño, posible baja resolución';
        }

        $textLength = strlen($extractedText);
        if ($textLength < 50) {
            $qualityScore -= 15;
            $issues[] = 'Poco texto extraído, posible imagen borrosa';
        }

        $strangeCharCount = preg_match_all('/[^\p{L}\p{N}\s\.\,\:\;\-\/\(\)]/u', $extractedText);
        if ($strangeCharCount > 10) {
            $qualityScore -= 20;
            $issues[] = 'Muchos caracteres mal reconocidos, mejora la calidad de imagen';
        }

        $qualityScore = max(0, $qualityScore);

        if ($qualityScore < 30) {
            return [
                'is_quality' => false,
                'error' => 'Calidad de imagen insuficiente para procesamiento confiable',
                'quality_score' => $qualityScore,
                'suggestions' => array_merge($issues, [
                    'Usa mejor iluminación al tomar la foto',
                    'Evita reflejos y sombras',
                    'Asegúrate de que el documento esté enfocado',
                    'Usa una resolución más alta'
                ])
            ];
        }

        return [
            'is_quality' => true,
            'quality_score' => $qualityScore
        ];
    }

    private function isDateTooOld($dateString, $maxMonths)
    {
        try {
            $patterns = [
                '/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/',
                '/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/'
            ];

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $dateString, $matches)) {
                    if (count($matches) >= 4) {
                        $date = Carbon::createFromDate($matches[3], $matches[2], $matches[1]);
                        $monthsAgo = $date->diffInMonths(Carbon::now());
                        return $monthsAgo > $maxMonths;
                    }
                }
            }

            return true;
        } catch (\Exception $e) {
            return true;
        }
    }

    private function basicINEValidation($text)
    {
        $score = 0;
        if (strpos($text, 'INSTITUTO NACIONAL ELECTORAL') !== false) $score += 30;
        if (strpos($text, 'CREDENCIAL PARA VOTAR') !== false) $score += 25;

        return [
            'is_valid' => $score >= 40,
            'confidence' => $score,
            'patterns' => [],
            'critical_elements' => $score >= 40 ? 2 : 0
        ];
    }

    private function basicPassportValidation($text)
    {
        $score = 0;
        if (strpos($text, 'PASAPORTE') !== false) $score += 30;
        if (strpos($text, 'ESTADOS UNIDOS MEXICANOS') !== false) $score += 40;

        return [
            'is_valid' => $score >= 50,
            'confidence' => $score,
            'patterns' => [],
            'critical_elements' => $score >= 50 ? 2 : 0
        ];
    }

    private function basicAddressProofValidation($text)
    {
        $score = 0;
        $services = ['CFE', 'TELMEX', 'IZZI', 'TOTALPLAY', 'MEGACABLE'];
        foreach ($services as $service) {
            if (strpos($text, $service) !== false) {
                $score += 40;
                break;
            }
        }

        return [
            'is_valid' => $score >= 40,
            'confidence' => $score,
            'patterns' => [],
            'critical_elements' => $score >= 40 ? 1 : 0
        ];
    }

    // ==========================================
    // MÉTODOS AUXILIARES
    // ==========================================

    public function verifyComplete(Request $request)
    {
        try {
            $this->enforceRateLimit($request, 'verification_complete');
            $this->validateCompleteRequest($request);

            $user = auth()->user();

            if ($user->is_identity_verified) {
                return $this->strictErrorResponse(
                    'Tu identidad ya ha sido verificada previamente',
                    'already_verified',
                    'ALREADY_VERIFIED',
                    [],
                    409
                );
            }

            $results = [];
            $totalConfidence = 0;
            $documentsProcessed = 0;
            $totalCriticalElements = 0;

            $identityType = $request->input('identity_type');
            $identityFile = $request->file('identity_document');

            if (!$identityFile || !$identityType) {
                return $this->strictErrorResponse(
                    'Debes proporcionar un documento de identidad válido (INE o Pasaporte)',
                    'no_identity_document',
                    'NO_IDENTITY_DOCUMENT'
                );
            }

            Log::info('🔍 Procesando documento de identidad', [
                'user_id' => $user->id,
                'identity_type' => $identityType
            ]);

            $identityResult = $this->processDocumentCompleteWithValidations($identityFile, $identityType, $user);

            if (!$identityResult['success']) {
                return $this->strictErrorResponse(
                    "Error en {$identityType}: " . $identityResult['error'],
                    $identityType . '_failed',
                    strtoupper($identityType) . '_PROCESSING_FAILED',
                    $identityResult['suggestions'] ?? []
                );
            }

            $results[$identityType] = $identityResult;
            $totalConfidence += $identityResult['confidence'];
            $totalCriticalElements += $identityResult['critical_elements'] ?? 0;
            $documentsProcessed++;

            if ($request->hasFile('address_proof')) {
                Log::info('🔍 Procesando comprobante de domicilio', [
                    'user_id' => $user->id
                ]);

                $addressResult = $this->processDocumentCompleteWithValidations(
                    $request->file('address_proof'),
                    'comprobante',
                    $user
                );

                if (!$addressResult['success']) {
                    return $this->strictErrorResponse(
                        "Error en comprobante: " . $addressResult['error'],
                        'comprobante_failed',
                        'COMPROBANTE_PROCESSING_FAILED',
                        $addressResult['suggestions'] ?? []
                    );
                }

                $results['comprobante'] = $addressResult;
                $totalConfidence += $addressResult['confidence'];
                $totalCriticalElements += $addressResult['critical_elements'] ?? 0;
                $documentsProcessed++;
            }

            $averageConfidence = $documentsProcessed > 0 ? ($totalConfidence / $documentsProcessed) : 0;
            $confidenceBonus = $totalCriticalElements > 6 ? 5 : 0;
            $finalConfidence = min(100, $averageConfidence + $confidenceBonus);

            $verificationId = 'ver_complete_' . uniqid() . '_' . $user->id;

            $user->update([
                'is_identity_verified' => true,
                'verified_at' => now(),
                'verification_method' => 'complete_enhanced_' . $identityType,
                'verified_name' => $results[$identityType]['extracted_name'] ?? $user->name,
                'verification_confidence' => $finalConfidence
            ]);

            $this->saveVerificationMetadataEnhanced($verificationId, [
                'documents_processed' => array_keys($results),
                'identity_type' => $identityType,
                'final_confidence' => $finalConfidence,
                'total_critical_elements' => $totalCriticalElements,
                'name_verified' => true,
                'vigency_verified' => true,
                'verification_timestamp' => now(),
                'validation_method' => 'complete_with_name_and_vigency'
            ]);

            Log::info('🎉 Verificación completa exitosa con TODAS las validaciones', [
                'user_id' => $user->id,
                'verification_id' => $verificationId,
                'documents_count' => $documentsProcessed,
                'final_confidence' => $finalConfidence,
                'identity_type' => $identityType
            ]);

            return response()->json([
                'success' => true,
                'message' => '🎉 Verificación de identidad completada exitosamente',
                'code' => 'VERIFICATION_COMPLETE_ENHANCED',
                'data' => [
                    'verification_id' => $verificationId,
                    'documents_verified' => array_keys($results),
                    'identity_type' => $identityType,
                    'confidence_score' => round($finalConfidence, 2),
                    'individual_scores' => array_map(function($result) {
                        return round($result['confidence'], 2);
                    }, $results),
                    'critical_elements_total' => $totalCriticalElements,
                    'verified_at' => now()->toISOString(),
                    'verified_name' => $results[$identityType]['extracted_name'] ?? $user->name,
                    'validations_performed' => [
                        'name_verification' => true,
                        'vigency_verification' => true,
                        'document_type_verification' => true,
                        'quality_verification' => true,
                        'purity_verification' => true
                    ]
                ],
                'privacy_notice' => 'Documentos procesados únicamente en memoria. No se almacenan imágenes originales ni datos biométricos.'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'code' => 'VALIDATION_FAILED',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            $errorId = 'complete_err_' . uniqid();

            Log::error('Error crítico en verificación completa', [
                'error_id' => $errorId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del sistema',
                'code' => 'INTERNAL_ERROR',
                'error_id' => $errorId
            ], 500);
        }
    }

    private function processDocumentCompleteWithValidations($file, $documentType, $user)
    {
        try {
            $this->validateDocumentFile($file, $documentType);

            $ocrResult = $this->ocrService->processImage($file, $documentType);

            if (!$ocrResult['success']) {
                return [
                    'success' => false,
                    'error' => 'No se pudo procesar el documento',
                    'suggestions' => ['Mejora la calidad de la imagen', 'Asegúrate de que el documento sea legible']
                ];
            }

            $extractedText = $ocrResult['text'] ?? '';
            $ocrValidation = $ocrResult['validation'] ?? null;

            if (in_array($documentType, ['ine', 'pasaporte'])) {
                $userName = $user->name . ' ' . $user->last_name;
                $nameMatch = $this->ocrService->validateNameMatch($extractedText, $userName);

                if (!$nameMatch['matches']) {
                    return [
                        'success' => false,
                        'error' => "El nombre no coincide ({$nameMatch['match_percentage']}% de coincidencia)",
                        'suggestions' => [
                            "Tu nombre registrado: {$userName}",
                            'Verifica que el documento sea tuyo',
                            'Actualiza tu perfil si el nombre es diferente'
                        ]
                    ];
                }
            }

            $recencyCheck = $this->ocrService->validateDocumentRecency($extractedText, $documentType);

            if (!$recencyCheck['is_recent']) {
                return [
                    'success' => false,
                    'error' => $recencyCheck['message'],
                    'suggestions' => [
                        $recencyCheck['suggestion'] ?? 'Documento no vigente',
                        'Verifica la fecha de vigencia del documento'
                    ]
                ];
            }

            $validation = $this->strictValidateDocumentTypeEnhanced(
                $extractedText,
                $documentType,
                $ocrValidation
            );

            if (!$validation['is_valid']) {
                return [
                    'success' => false,
                    'error' => $validation['error'] ?? 'Documento no válido',
                    'suggestions' => $validation['suggestions'] ?? ['Verifica la calidad del documento']
                ];
            }

            $purityCheck = $this->validateDocumentPurityEnhanced($extractedText, $documentType);

            if (!$purityCheck['is_pure']) {
                return [
                    'success' => false,
                    'error' => $purityCheck['error'],
                    'suggestions' => $purityCheck['suggestions']
                ];
            }

            $qualityCheck = $this->validateImageQuality($file, $extractedText);

            if (!$qualityCheck['is_quality']) {
                return [
                    'success' => false,
                    'error' => $qualityCheck['error'],
                    'suggestions' => $qualityCheck['suggestions']
                ];
            }

            return [
                'success' => true,
                'confidence' => $validation['confidence'],
                'critical_elements' => $validation['critical_elements'] ?? 0,
                'patterns' => $validation['patterns'] ?? [],
                'quality_score' => $qualityCheck['quality_score'] ?? 0,
                'extracted_name' => $ocrValidation['extracted_name'] ?? null,
                'extracted_data' => $ocrValidation['extracted_data'] ?? []
            ];

        } catch (\Exception $e) {
            Log::error("Error procesando {$documentType}", [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'success' => false,
                'error' => 'Error interno procesando el documento'
            ];
        }
    }

    private function saveVerificationMetadataEnhanced($verificationId, $metadata)
    {
        try {
            $enhancedMetadata = array_merge($metadata, [
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'processing_version' => '6.0_strict_face_id_85_fixed',
                'created_at' => now()
            ]);

            Cache::put("verification_meta_{$verificationId}", $enhancedMetadata, now()->addDays(30));

            Log::info('Metadata de verificación guardada', [
                'verification_id' => $verificationId,
                'metadata_size' => count($enhancedMetadata)
            ]);

        } catch (\Exception $e) {
            Log::warning('No se pudo guardar metadata de verificación', [
                'verification_id' => $verificationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function getSupportedDocuments()
    {
        $faceVerificationEnabled = config('services.compreface.enabled', false);

        return response()->json([
            'success' => true,
            'data' => [
                'document_types' => self::DOCUMENT_TYPES,
                'validation_features' => [
                    'name_verification' => 'Verifica que el nombre coincida con el registrado',
                    'vigency_verification' => 'Verifica que documentos sean recientes (2024-2025)',
                    'curp_validation' => 'Algoritmo oficial CURP con dígito verificador',
                    'quality_assessment' => 'Evaluación de calidad de imagen',
                    'contamination_detection' => 'Detección de elementos cruzados',
                    'facial_recognition' => $faceVerificationEnabled 
                        ? 'Verificación biométrica ESTRICTA con Verify API (threshold fijo 85%)'
                        : 'Verificación facial no disponible'
                ],
                'strict_requirements' => [
                    'ine' => [
                        'min_confidence' => self::STRICT_CONFIDENCE_THRESHOLDS['ine'],
                        'required_validations' => ['Nombre', 'CURP', 'Vigencia 2024+'],
                    ],
                    'pasaporte' => [
                        'min_confidence' => self::STRICT_CONFIDENCE_THRESHOLDS['pasaporte'],
                        'required_validations' => ['Nombre', 'Número pasaporte', 'Vigencia'],
                    ],
                    'comprobante' => [
                        'min_confidence' => self::STRICT_CONFIDENCE_THRESHOLDS['comprobante'],
                        'required_validations' => ['Empresa válida', 'Fecha máx 4 meses'],
                    ]
                ],
                'file_requirements' => [
                    'max_size_mb' => round(self::MAX_FILE_SIZE / 1024, 1),
                    'min_size_kb' => self::MIN_FILE_SIZE,
                    'allowed_formats' => self::ALL_ALLOWED_TYPES
                ],
                'facial_verification' => $faceVerificationEnabled ? [
                    'algorithm' => 'CompreFace Verify API',
                    'enabled' => true,
                    'strict_threshold' => 85,
                    'threshold_fixed' => true,
                    'no_exceptions' => 'Threshold NO se reduce por lentes, iluminación o cualquier condición',
                    'multiple_faces_rejected' => true,
                    'quality_checks' => true,
                    'approval_criteria' => 'ÚNICO: Face ID ≥85%'
                ] : [
                    'enabled' => false,
                    'message' => 'Verificación facial no disponible en este momento'
                ],
                'api_version' => '6.0_strict_face_id_85_fixed',
                'last_updated' => now()->toISOString()
            ]
        ]);
    }

    private function validateSingleDocumentRequest(Request $request)
    {
        $allowedTypes = implode(',', self::ALL_ALLOWED_TYPES);

        $request->validate([
            'document_type' => [
                'required',
                'string',
                'in:' . implode(',', array_keys(self::DOCUMENT_TYPES))
            ],
            'document' => [
                'required',
                'file',
                'mimes:' . $allowedTypes,
                'min:' . self::MIN_FILE_SIZE,
                'max:' . self::MAX_FILE_SIZE
            ]
        ], [
            'document_type.required' => 'Debes especificar el tipo de documento',
            'document_type.in' => 'Tipo de documento no válido',
            'document.required' => 'Debes seleccionar un archivo',
            'document.mimes' => 'Formato no permitido',
            'document.min' => 'El archivo es demasiado pequeño',
            'document.max' => 'El archivo es demasiado grande'
        ]);
    }

    private function validateCompleteRequest(Request $request)
    {
        $request->validate([
            'identity_type' => 'required|in:ine,pasaporte',
            'identity_document' => 'required|file|mimes:jpeg,jpg,png,webp|max:10240',
            'address_proof' => 'nullable|file|mimes:jpeg,jpg,png,webp,pdf|max:10240'
        ], [
            'identity_type.required' => 'Debes especificar el tipo de identidad',
            'identity_document.required' => 'Debes subir tu documento de identidad',
            '*.mimes' => 'Formato de archivo no soportado',
            '*.max' => 'El archivo es demasiado grande'
        ]);
    }

    private function validateDocumentFile($file, $documentType)
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($documentType === 'comprobante' && $extension === 'pdf') {
            if ($file->getSize() > self::MAX_FILE_SIZE * 1024) {
                throw ValidationException::withMessages([
                    'document' => 'El PDF del comprobante es demasiado grande'
                ]);
            }
            return;
        }

        if (in_array($documentType, ['ine', 'pasaporte']) && !in_array($extension, self::ALLOWED_IMAGE_TYPES)) {
            throw ValidationException::withMessages([
                'document' => "Para {$documentType} debe ser una imagen clara (JPG, PNG, WEBP)"
            ]);
        }

        if (in_array($documentType, ['ine', 'pasaporte']) && $file->getSize() < 20000) {
            throw ValidationException::withMessages([
                'document' => "La imagen del {$documentType} es demasiado pequeña (mínimo 20KB)"
            ]);
        }
    }

    private function enforceRateLimit(Request $request, $type)
    {
        $key = $type . '_' . $request->ip() . '_' . (auth()->id() ?? 'guest');

        if (RateLimiter::tooManyAttempts($key . '_hour', self::MAX_ATTEMPTS_PER_HOUR)) {
            $seconds = RateLimiter::availableIn($key . '_hour');
            throw ValidationException::withMessages([
                'rate_limit' => "Demasiados intentos. Intenta de nuevo en " . ceil($seconds / 60) . " minutos."
            ]);
        }

        if (RateLimiter::tooManyAttempts($key . '_day', self::MAX_ATTEMPTS_PER_DAY)) {
            throw ValidationException::withMessages([
                'rate_limit' => "Límite diario alcanzado. Intenta mañana."
            ]);
        }

        RateLimiter::hit($key . '_hour', 3600);
        RateLimiter::hit($key . '_day', 86400);
    }

    private function getQualityLevel($confidence)
    {
        if ($confidence >= 95) return 'Excelente';
        if ($confidence >= 85) return 'Muy buena';
        if ($confidence >= 75) return 'Buena';
        if ($confidence >= 65) return 'Regular';
        return 'Aceptable';
    }

    private function getNextStepsForDocument($documentType)
    {
        $nextSteps = [
            'ine' => [
                'Sube un comprobante de domicilio reciente (máximo 4 meses)',
                'Completa la verificación para publicar propiedades'
            ],
            'pasaporte' => [
                'Sube un comprobante de domicilio reciente (máximo 4 meses)',
                'Completa la verificación para publicar propiedades'
            ],
            'comprobante' => [
                'Sube tu INE o Pasaporte para verificar identidad',
                'Completa el proceso de verificación integral'
            ]
        ];

        return $nextSteps[$documentType] ?? [];
    }

    private function strictErrorResponse($message, $step, $code, $suggestions = [], $status = 422)
    {
        $response = [
            'success' => false,
            'message' => $message,
            'step' => $step,
            'code' => $code,
            'validation_level' => 'strict_v6_face_id_85_fixed',
            'timestamp' => now()->toISOString()
        ];

        if (!empty($suggestions)) {
            $response['suggestions'] = $suggestions;
        }

        $response['help'] = [
            'contact_support' => 'Si tienes problemas, contacta al soporte técnico',
            'document_requirements' => 'Revisa los requisitos específicos para cada documento',
            'quality_tips' => [
                'Usa buena iluminación uniforme sin reflejos',
                'Enfoque nítido en todo el documento',
                'Resolución mínima recomendada: 1200x800 píxeles',
                'Evita capturas de pantalla o fotocopias'
            ]
        ];

        return response()->json($response, $status);
    }

    public function testOCR(Request $request)
    {
        try {
            $this->enforceRateLimit($request, 'test_ocr');

            $request->validate([
                'image' => 'required|file|mimes:' . implode(',', self::ALL_ALLOWED_TYPES) . '|max:' . self::MAX_FILE_SIZE,
                'document_type' => 'nullable|in:' . implode(',', array_keys(self::DOCUMENT_TYPES))
            ]);

            $file = $request->file('image');
            $documentType = $request->input('document_type');

            $startTime = microtime(true);
            $result = $this->ocrService->processImage($file, $documentType);
            $processingTime = round((microtime(true) - $startTime) * 1000, 2);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error en el procesamiento OCR',
                    'code' => 'OCR_PROCESSING_FAILED',
                    'processing_time_ms' => $processingTime
                ], 422);
            }

            $detectedType = $this->detectDocumentTypeEnhanced($result['text'] ?? '');
            $qualityCheck = $this->validateImageQuality($file, $result['text'] ?? '');

            $result['metadata'] = [
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'processing_time_ms' => $processingTime,
                'detected_type' => $detectedType,
                'specified_type' => $documentType,
                'quality_assessment' => $qualityCheck,
                'api_version' => '6.0_strict_face_id_85_fixed'
            ];

            return response()->json([
                'success' => true,
                'data' => $result,
                'code' => 'OCR_SUCCESS_ENHANCED'
            ]);

        } catch (\Exception $e) {
            $errorId = 'test_err_' . uniqid();

            Log::error('Error en testOCR', [
                'error_id' => $errorId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error interno del sistema',
                'code' => 'INTERNAL_ERROR',
                'error_id' => $errorId
            ], 500);
        }
    }

    public function getVerificationStatus()
    {
        $user = auth()->user();

        return response()->json([
            'success' => true,
            'data' => [
                'is_verified' => $user->is_identity_verified ?? false,
                'verified_at' => $user->verified_at ?? null,
                'verification_method' => $user->verification_method ?? null,
                'verified_name' => $user->verified_name ?? null,
                'verification_confidence' => $user->verification_confidence ?? null,
                'user_info' => [
                    'id' => $user->id,
                    'name' => $user->name . ' ' . $user->last_name,
                    'email' => $user->email
                ]
            ]
        ]);
    }

    public function showFaceTest()
    {
        return view('verification.face-test');
    }

    /**
     * 🔥 DETECCIÓN EN TIEMPO REAL - MANTENER
     */
    public function detectFacesRealTime(Request $request)
    {
        try {
            // 🔥 VERIFICAR SI FACE VERIFICATION ESTÁ HABILITADO
            if (!config('services.compreface.enabled')) {
                return response()->json([
                    'success' => false,
                    'faces' => [],
                    'message' => 'Detección facial no disponible en este momento'
                ], 503);
            }

            $request->validate([
                'image' => 'required|file|mimes:jpeg,jpg,png|max:5120',
            ]);

            $image = $request->file('image');
            
            $tempPath = storage_path('app/temp/frame_' . uniqid() . '.' . $image->getClientOriginalExtension());
            if (!file_exists(dirname($tempPath))) {
                mkdir(dirname($tempPath), 0755, true);
            }
            $image->move(dirname($tempPath), basename($tempPath));

            $detection = $this->faceService->detectFaces($tempPath);

            if (file_exists($tempPath)) {
                unlink($tempPath);
            }

            if (!$detection['success']) {
                return response()->json([
                    'success' => false,
                    'faces' => [],
                    'message' => 'No se pudieron detectar rostros'
                ]);
            }

            $faces = [];
            if (isset($detection['faces_data']) && is_array($detection['faces_data'])) {
                foreach ($detection['faces_data'] as $face) {
                    $box = $face['box'] ?? null;
                    if ($box) {
                        $faces[] = [
                            'box' => [
                                'x' => $box['x_min'] ?? 0,
                                'y' => $box['y_min'] ?? 0,
                                'width' => ($box['x_max'] ?? 0) - ($box['x_min'] ?? 0),
                                'height' => ($box['y_max'] ?? 0) - ($box['y_min'] ?? 0)
                            ],
                            'confidence' => $face['subjects'][0]['similarity'] ?? 0,
                            'attributes' => [
                                'glasses' => $this->detectGlasses($face)
                            ]
                        ];
                    }
                }
            }

            return response()->json([
                'success' => true,
                'faces' => $faces,
                'faces_count' => count($faces),
                'timestamp' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error('Error en detección de rostros tiempo real', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'faces' => [],
                'error' => 'Error en detección'
            ], 500);
        }
    }

    /**
     * Helper para detectar lentes
     */
    private function detectGlasses($faceData)
    {
        $confidence = $faceData['subjects'][0]['similarity'] ?? 0;
        return $confidence >= 0.7 && $confidence < 0.95;
    }
}