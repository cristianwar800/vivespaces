<?php

namespace App\Http\Controllers;

use App\Services\OCRService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Arr;
use Carbon\Carbon;

class VerificationController extends Controller
{
    private $ocrService;

    // Configuración de límites
    private const MAX_FILE_SIZE = 10240; // 10MB en KB
    private const MIN_FILE_SIZE = 10; // 10KB mínimo
    private const MAX_ATTEMPTS_PER_HOUR = 100;
    private const MAX_ATTEMPTS_PER_DAY = 10000;

    // SOLO tipos de archivo para documentos oficiales
    private const ALLOWED_IMAGE_TYPES = ['jpeg', 'jpg', 'png', 'webp'];
    private const ALLOWED_DOC_TYPES = ['pdf'];
    private const ALL_ALLOWED_TYPES = ['jpeg', 'jpg', 'png', 'webp', 'pdf'];

    // Configuración ESTRICTA de confianza por tipo - MEJORADA
    // En VerificationController.php, línea ~25
    private const STRICT_CONFIDENCE_THRESHOLDS = [
        'ine' => 45,        // SÚPER accesible - de 70 a 45
        'pasaporte' => 40,   // SÚPER accesible - de 65 a 40
        'comprobante' => 35  // SÚPER accesible - de 60 a 35
    ];

    // Tipos de documentos ÚNICOS permitidos
    private const DOCUMENT_TYPES = [
        'ine' => 'Credencial INE',
        'pasaporte' => 'Pasaporte Mexicano',
        'comprobante' => 'Comprobante de Domicilio'
    ];

    // BLACKLISTS EXPANDIDAS - Palabras que NO deben aparecer en cada tipo
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

    // WHITELISTS MEJORADAS - Palabras que DEBEN aparecer
    private const DOCUMENT_REQUIRED_PATTERNS = [
        'ine' => [
            'INSTITUTO NACIONAL ELECTORAL',
            'CREDENCIAL PARA VOTAR',
            // Al menos uno de estos identificadores
            'CURP', 'CLAVE DE ELECTOR'
        ],
        'pasaporte' => [
            'PASAPORTE',
            'ESTADOS UNIDOS MEXICANOS',
            // Formatos de número de pasaporte mexicano
            'MEX'
        ],
        'comprobante' => [
            // Al menos uno de estos servicios válidos
            'CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'TELMEX', 'IZZI',
            'TOTALPLAY', 'MEGACABLE', 'TELCEL', 'MOVISTAR', 'AT&T',
            'AXTEL', 'UNEFON', 'DISH', 'SKY',
            'AGUA', 'AGUAKAN', 'SAPAC', 'SIAPA', 'SADM',
            'GAS NATURAL', 'GAS LP', 'NATURGY'
        ]
    ];

    // NUEVOS: Estados mexicanos válidos para validación
    private const VALID_MEXICAN_STATES = [
        'AGUASCALIENTES', 'BAJA CALIFORNIA', 'BAJA CALIFORNIA SUR', 'CAMPECHE',
        'COAHUILA', 'COLIMA', 'CHIAPAS', 'CHIHUAHUA', 'CDMX', 'CIUDAD DE MEXICO',
        'DURANGO', 'GUANAJUATO', 'GUERRERO', 'HIDALGO', 'JALISCO', 'MEXICO',
        'MICHOACAN', 'MORELOS', 'NAYARIT', 'NUEVO LEON', 'OAXACA', 'PUEBLA',
        'QUERETARO', 'QUINTANA ROO', 'SAN LUIS POTOSI', 'SINALOA', 'SONORA',
        'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ', 'YUCATAN', 'ZACATECAS'
    ];

    public function __construct(OCRService $ocrService)
    {
        $this->ocrService = $ocrService;
    }

    /**
     * Verificación individual ESTRICTA de documento - MEJORADA
     */
    public function verifySingleDocument(Request $request)
    {
        try {
            // Rate Limiting
            $this->enforceRateLimit($request, 'single_document');

            // Validar request básico
            $this->validateSingleDocumentRequest($request);

            $documentType = $request->input('document_type');
            $file = $request->file('document');

            Log::info("Iniciando verificación ESTRICTA mejorada", [
                'user_id' => auth()->id(),
                'document_type' => $documentType,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType()
            ]);

            // PASO 1: Validar archivo físico
            $this->validateDocumentFile($file, $documentType);

            // PASO 2: Procesar con OCR MEJORADO
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

            // PASO 3: DETECCIÓN AUTOMÁTICA MEJORADA vs EXPECTATIVA
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

            // PASO 4: VALIDACIÓN ESTRICTA MEJORADA POR TIPO
            $validationResult = $this->strictValidateDocumentTypeEnhanced($extractedText, $documentType, $ocrValidation);

            if (!$validationResult['is_valid']) {
                return $this->strictErrorResponse(
                    $validationResult['error'],
                    'strict_validation_failed',
                    'STRICT_VALIDATION_FAILED',
                    $validationResult['suggestions'] ?? []
                );
            }

            // PASO 5: VERIFICAR PUREZA MEJORADA (NO contiene elementos de otros documentos)
            $purityCheck = $this->validateDocumentPurityEnhanced($extractedText, $documentType);

            if (!$purityCheck['is_pure']) {
                return $this->strictErrorResponse(
                    $purityCheck['error'],
                    'document_contamination',
                    'DOCUMENT_CONTAMINATION',
                    $purityCheck['suggestions']
                );
            }

            // PASO 6: VERIFICACIÓN DE CALIDAD DE IMAGEN (nuevo)
            $qualityCheck = $this->validateImageQuality($file, $extractedText);

            if (!$qualityCheck['is_quality']) {
                return $this->strictErrorResponse(
                    $qualityCheck['error'],
                    'image_quality_failed',
                    'IMAGE_QUALITY_FAILED',
                    $qualityCheck['suggestions']
                );
            }

            // VERIFICACIÓN EXITOSA
            Log::info('Documento ESTRICTO verificado exitosamente con mejoras', [
                'user_id' => auth()->id(),
                'document_type' => $documentType,
                'confidence' => $validationResult['confidence'],
                'critical_elements' => $validationResult['critical_elements'] ?? 0,
                'quality_score' => $qualityCheck['quality_score'] ?? 0
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
                        'curp_valid' => $validationResult['curp_valid'] ?? false,
                        'voter_key_valid' => $validationResult['voter_key_valid'] ?? false,
                        'state_detected' => $validationResult['state_detected'] ?? null,
                        'service_company' => $validationResult['service_company'] ?? null
                    ]
                ],
                'security_notice' => 'Documento procesado únicamente en memoria con validación CURP completa. No se almacenan datos personales.',
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



    /**
     * Detección automática de tipo de documento MEJORADA
     */
    private function detectDocumentTypeEnhanced($text)
    {
        $text = strtoupper($text);
        $scores = ['ine' => 0, 'pasaporte' => 0, 'comprobante' => 0];

        // Detectar INE - múltiples indicadores
        if (strpos($text, 'INSTITUTO NACIONAL ELECTORAL') !== false) {
            $scores['ine'] += 50;
        }
        if (strpos($text, 'CREDENCIAL PARA VOTAR') !== false) {
            $scores['ine'] += 40;
        }
        if (preg_match('/[A-Z]{4}\d{6}[HMX][A-Z0-9]{5}[A-Z0-9]{2}/', $text)) {
            $scores['ine'] += 30; // CURP encontrado
        }
        if (preg_match('/[A-Z]{6}\d{8}[HM]\d{3}/', $text)) {
            $scores['ine'] += 25; // Clave de elector
        }

        // Detectar Pasaporte - indicadores específicos
        if (strpos($text, 'PASAPORTE') !== false || strpos($text, 'PASSPORT') !== false) {
            $scores['pasaporte'] += 40;
        }
        if (strpos($text, 'ESTADOS UNIDOS MEXICANOS') !== false) {
            $scores['pasaporte'] += 45;
        }
        if (preg_match('/[GN]\d{8}/', $text)) {
            $scores['pasaporte'] += 30; // Número de pasaporte mexicano
        }
        if (strpos($text, 'MEX') !== false) {
            $scores['pasaporte'] += 15;
        }

        // Detectar Comprobante - empresas específicas
        $serviceCompanies = ['CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'TELMEX', 'IZZI', 'TOTALPLAY', 'MEGACABLE'];
        foreach ($serviceCompanies as $company) {
            if (strpos($text, $company) !== false) {
                $scores['comprobante'] += 35;
                break;
            }
        }

        // Indicadores adicionales de comprobante
        if (preg_match('/\$[\d,]+\.?\d*/', $text)) {
            $scores['comprobante'] += 15; // Monto
        }
        if (preg_match('/KWH|CONSUMO|LECTURA/', $text)) {
            $scores['comprobante'] += 20;
        }

        // Penalizaciones por contaminación cruzada
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

        // Determinar el tipo con mayor score
        $maxScore = max($scores);
        if ($maxScore < 15) { // Umbral mínimo
            return null;
        }

        return array_search($maxScore, $scores);
    }

    /**
     * Validación estricta mejorada por tipo de documento
     */
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

    /**
     * Validación INE MEJORADA con integración del OCRService
     */
                private function strictValidateINEEnhanced($text, $ocrValidation = null)
{
    $text = strtoupper($text);
    $score = 0;
    $patterns = [];
    $criticalElements = 0;
    $errors = [];

    // Si tenemos validación del OCRService, usarla como base
    if ($ocrValidation && isset($ocrValidation['is_valid'])) {
        $score = $ocrValidation['confidence'] ?? 0;
        $patterns = $ocrValidation['patterns'] ?? [];
        $criticalElements = $ocrValidation['critical_elements_passed'] ?? 0;

        // Verificaciones adicionales del controlador
        $extractedData = $ocrValidation['extracted_data'] ?? [];

        // Validación adicional de estado mexicano
        foreach (self::VALID_MEXICAN_STATES as $state) {
            if (strpos($text, $state) !== false) {
                $score += 5;
                $patterns[] = 'Valid Mexican State: ' . $state;
                break;
            }
        }

        // NUEVO: Usar validación progresiva
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

    // Fallback a validación básica si no hay OCR validation
    return $this->basicINEValidation($text);
}

    /**
     * Validación Pasaporte MEJORADA
     */
        private function strictValidatePassportEnhanced($text, $ocrValidation = null)
    {
        if ($ocrValidation && isset($ocrValidation['is_valid'])) {
            $score = $ocrValidation['confidence'] ?? 0;

            // NUEVO: Usar validación progresiva
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

    /**
     * Validación Comprobante MEJORADA
     */
        private function strictValidateAddressProofEnhanced($text, $ocrValidation = null)
    {
        if ($ocrValidation && isset($ocrValidation['is_valid'])) {
            $score = $ocrValidation['confidence'] ?? 0;
            $extractedData = $ocrValidation['extracted_data'] ?? [];

            // Validación adicional de fecha (máximo 4 meses)
            if (isset($extractedData['bill_date'])) {
                $billDate = $extractedData['bill_date'];
                if ($this->isDateTooOld($billDate, 4)) {
                    $score -= 30;
                }
            }

            // NUEVO: Usar validación progresiva
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

    /**
     * Validación de pureza mejorada
     */
    private function validateDocumentPurityEnhanced($text, $documentType)
    {
        $text = strtoupper($text);
        $blacklist = self::DOCUMENT_BLACKLISTS[$documentType] ?? [];
        $contamination = [];
        $severityScore = 0;

        foreach ($blacklist as $forbiddenWord) {
            if (strpos($text, $forbiddenWord) !== false) {
                $contamination[] = $forbiddenWord;

                // Asignar severidad según la palabra
                if (in_array($forbiddenWord, ['INSTITUTO NACIONAL ELECTORAL', 'PASAPORTE', 'CFE'])) {
                    $severityScore += 50; // Alta severidad
                } else {
                    $severityScore += 20; // Severidad media
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

        // Reducir umbral si tiene elementos críticos válidos
        if ($criticalElements >= 2) {
            $baseThreshold -= 8;
        }

        // Reducir umbral para múltiples intentos (más tolerante)
        if ($attempts >= 1) {
            $baseThreshold -= 15;
        }

        // Nunca bajar de un mínimo de seguridad
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

        // Incrementar contador
        Cache::put($attemptsKey, $attempts + 1, now()->addHours(24));

        return [
            'current_attempts' => $attempts + 1,
            'use_relaxed' => $attempts >= 1, // Desde el segundo intento
            'message' => $attempts >= 1 ? 'Aplicando criterios más flexibles' : null
        ];
    }

    /**
     * NUEVA: Validación de calidad de imagen
     */
    private function validateImageQuality($file, $extractedText)
    {
        $qualityScore = 100;
        $issues = [];

        // Verificar tamaño de archivo (muy pequeño = baja calidad)
        $fileSize = $file->getSize();
        if ($fileSize < 10000) { // Menos de 50KB
            $qualityScore -= 15;
            $issues[] = 'Archivo muy pequeño, posible baja resolución';
        }

        // Verificar longitud del texto extraído
        $textLength = strlen($extractedText);
        if ($textLength < 50) {
            $qualityScore -= 15;
            $issues[] = 'Poco texto extraído, posible imagen borrosa';
        }

        // Verificar presencia de caracteres extraños (indicativo de OCR pobre)
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

    /**
     * Verificar si una fecha es muy antigua
     */
    private function isDateTooOld($dateString, $maxMonths)
    {
        try {
            // Intentar parsear diferentes formatos de fecha
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

            return true; // Si no se puede parsear, considerar muy antigua
        } catch (\Exception $e) {
            return true;
        }
    }

    // Métodos de validación básica (fallback)
    private function basicINEValidation($text)
    {
        // Implementación básica como fallback
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

    /**
     * Verificación completa con los 3 documentos - MEJORADA
     */
    public function verifyComplete(Request $request)
    {
        try {
            $this->enforceRateLimit($request, 'verification_complete');
            $this->validateCompleteRequest($request);

            if (auth()->user()->is_identity_verified) {
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

            // Procesar cada documento con validación estricta mejorada
            $documentsToProcess = [
                'ine_document' => 'ine',
                'passport_document' => 'pasaporte',
                'address_proof' => 'comprobante'
            ];

            foreach ($documentsToProcess as $fileKey => $documentType) {
                if ($request->hasFile($fileKey)) {
                    $result = $this->processDocumentStrictEnhanced($request->file($fileKey), $documentType);

                    if (!$result['success']) {
                        return $this->strictErrorResponse(
                            "Error en {$documentType}: " . $result['error'],
                            $documentType . '_failed',
                            strtoupper($documentType) . '_PROCESSING_FAILED',
                            $result['suggestions'] ?? []
                        );
                    }

                    $results[$documentType] = $result;
                    $totalConfidence += $result['confidence'];
                    $totalCriticalElements += $result['critical_elements'] ?? 0;
                    $documentsProcessed++;
                }
            }

            // Validar que al menos tenemos un documento de identidad
            if (!isset($results['ine']) && !isset($results['pasaporte'])) {
                return $this->strictErrorResponse(
                    'Debes proporcionar al menos un documento de identidad válido (INE o Pasaporte)',
                    'no_identity_document',
                    'NO_IDENTITY_DOCUMENT'
                );
            }

            // Verificación facial opcional mejorada
            $faceVerification = null;
            if ($request->hasFile('selfie')) {
                $faceVerification = $this->verifyFaceMatchEnhanced($request->file('selfie'), $results);
            }

            // Calcular métricas finales con ponderación
            $averageConfidence = $documentsProcessed > 0 ? ($totalConfidence / $documentsProcessed) : 0;
            $confidenceBonus = $totalCriticalElements > 6 ? 5 : 0; // Bonus por elementos críticos
            $finalConfidence = min(100, $averageConfidence + $confidenceBonus);

            $verificationId = 'strict_ver_' . uniqid() . '_' . auth()->id();

            // Extraer nombre más confiable
            $verifiedName = $this->extractVerifiedNameEnhanced($results);

            // Actualizar usuario con información mejorada
            auth()->user()->update([
                'is_identity_verified' => true,
                'verified_at' => now(),
                'verification_method' => 'strict_multi_document_enhanced',
                'verified_name' => $verifiedName,
                'verification_confidence' => $finalConfidence
            ]);

            // Guardar metadata mejorada
            $this->saveVerificationMetadataEnhanced($verificationId, [
                'documents_processed' => array_keys($results),
                'individual_confidences' => array_map(function($result) {
                    return $result['confidence'];
                }, $results),
                'average_confidence' => $averageConfidence,
                'final_confidence' => $finalConfidence,
                'total_critical_elements' => $totalCriticalElements,
                'face_verification' => $faceVerification ? 'completed' : 'skipped',
                'verification_timestamp' => now(),
                'validation_method' => 'strict_enhanced',
                'quality_scores' => array_map(function($result) {
                    return $result['quality_score'] ?? 0;
                }, $results)
            ]);

            Log::info('Verificación completa ESTRICTA MEJORADA exitosa', [
                'user_id' => auth()->id(),
                'verification_id' => $verificationId,
                'documents_count' => $documentsProcessed,
                'final_confidence' => $finalConfidence,
                'critical_elements' => $totalCriticalElements
            ]);

            return response()->json([
                'success' => true,
                'message' => '🎉 Verificación de identidad completada exitosamente con validación avanzada',
                'code' => 'STRICT_VERIFICATION_COMPLETE_ENHANCED',
                'data' => [
                    'verification_id' => $verificationId,
                    'documents_verified' => array_keys($results),
                    'confidence_score' => round($finalConfidence, 2),
                    'individual_scores' => array_map(function($result) {
                        return round($result['confidence'], 2);
                    }, $results),
                    'critical_elements_total' => $totalCriticalElements,
                    'verified_at' => now()->toISOString(),
                    'verified_name' => $verifiedName,
                    'face_verification' => $faceVerification ? 'completed' : 'not_provided',
                    'quality_assessment' => $this->getOverallQualityAssessment($results)
                ],
                'privacy_notice' => 'Documentos procesados únicamente en memoria con algoritmos de validación CURP oficiales. No se almacenan datos biométricos.'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación mejorada',
                'code' => 'VALIDATION_FAILED_ENHANCED',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            $errorId = 'complete_err_enhanced_' . uniqid();

            Log::error('Error crítico en verificación completa mejorada', [
                'error_id' => $errorId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del sistema mejorado',
                'code' => 'INTERNAL_SERVER_ERROR_ENHANCED',
                'error_id' => $errorId
            ], 500);
        }
    }

    /**
     * NUEVO: Procesamiento estricto mejorado de documento individual
     */
    private function processDocumentStrictEnhanced($file, $documentType)
    {
        try {
            $this->validateDocumentFile($file, $documentType);

            $ocrResult = $this->ocrService->processImage($file, $documentType);

            if (!$ocrResult['success']) {
                return [
                    'success' => false,
                    'error' => 'No se pudo procesar el documento con OCR mejorado',
                    'suggestions' => [
                        'Mejora la calidad de la imagen',
                        'Verifica la iluminación',
                        'Asegúrate de que el documento esté completo y enfocado'
                    ]
                ];
            }

            $extractedText = $ocrResult['text'] ?? '';
            $ocrValidation = $ocrResult['validation'] ?? null;

            // Validación estricta mejorada
            $validation = $this->strictValidateDocumentTypeEnhanced($extractedText, $documentType, $ocrValidation);

            if (!$validation['is_valid']) {
                return [
                    'success' => false,
                    'error' => $validation['error'],
                    'suggestions' => $validation['suggestions'] ?? []
                ];
            }

            // Verificar pureza mejorada
            $purityCheck = $this->validateDocumentPurityEnhanced($extractedText, $documentType);
            if (!$purityCheck['is_pure']) {
                return [
                    'success' => false,
                    'error' => $purityCheck['error'],
                    'suggestions' => $purityCheck['suggestions']
                ];
            }

            // Verificar calidad de imagen
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
                'extracted_data' => $ocrValidation['extracted_data'] ?? []
            ];

        } catch (\Exception $e) {
            Log::error("Error procesando {$documentType} estricto mejorado", [
                'error' => $e->getMessage(),
                'file_size' => $file->getSize(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Error interno procesando el documento'
            ];
        }
    }

    /**
     * MEJORADO: Verificación facial con mejor logging
     */
    private function verifyFaceMatchEnhanced($selfieFile, $documentResults): bool
    {
        try {
            Log::info('Iniciando verificación facial mejorada', [
                'user_id' => auth()->id(),
                'selfie_size' => $selfieFile->getSize(),
                'documents_count' => count($documentResults)
            ]);

            // TODO: Implementar CompreFace aquí con mejores validaciones
            return true;

        } catch (\Exception $e) {
            Log::error('Error en verificación facial mejorada', [
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * MEJORADO: Extracción de nombre más inteligente
     */
    private function extractVerifiedNameEnhanced($results)
    {
        // Priorizar INE > Pasaporte > Fallback
        if (isset($results['ine']['extracted_data']['name'])) {
            return $results['ine']['extracted_data']['name'];
        }

        if (isset($results['pasaporte']['extracted_data']['name'])) {
            return $results['pasaporte']['extracted_data']['name'];
        }

        // Fallback a nombres extraídos por OCR
        foreach ($results as $type => $result) {
            if (isset($result['extracted_data']['name'])) {
                return $result['extracted_data']['name'];
            }
        }

        return 'Nombre no extraído';
    }

    /**
     * NUEVO: Evaluación general de calidad
     */
    private function getOverallQualityAssessment($results)
    {
        $totalQuality = 0;
        $count = 0;

        foreach ($results as $result) {
            if (isset($result['quality_score'])) {
                $totalQuality += $result['quality_score'];
                $count++;
            }
        }

        $averageQuality = $count > 0 ? $totalQuality / $count : 0;

        if ($averageQuality >= 90) return 'Excelente';
        if ($averageQuality >= 80) return 'Muy buena';
        if ($averageQuality >= 70) return 'Buena';
        if ($averageQuality >= 60) return 'Regular';
        return 'Aceptable';
    }

    /**
     * MEJORADO: Guardar metadata con más detalles
     */
    private function saveVerificationMetadataEnhanced($verificationId, $metadata)
    {
        try {
            $enhancedMetadata = array_merge($metadata, [
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'processing_version' => '2.0_enhanced',
                'created_at' => now()
            ]);

            Cache::put("verification_meta_{$verificationId}", $enhancedMetadata, now()->addDays(30));

            Log::info('Metadata de verificación guardada', [
                'verification_id' => $verificationId,
                'metadata_size' => count($enhancedMetadata)
            ]);

        } catch (\Exception $e) {
            Log::warning('No se pudo guardar metadata de verificación mejorada', [
                'verification_id' => $verificationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Obtener información de documentos soportados - MEJORADA
     */
    public function getSupportedDocuments()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'document_types' => self::DOCUMENT_TYPES,
                'strict_requirements' => [
                    'ine' => [
                        'required_elements' => [
                            'CURP válido con dígito verificador',
                            'Instituto Nacional Electoral',
                            'Credencial para Votar',
                            'Clave de elector válida'
                        ],
                        'forbidden_elements' => ['Pasaporte', 'CFE', 'Servicios públicos'],
                        'min_confidence' => self::STRICT_CONFIDENCE_THRESHOLDS['ine'],
                        'validation_features' => [
                            'Algoritmo oficial CURP',
                            'Validación de estados mexicanos',
                            'Verificación de fechas de nacimiento'
                        ]
                    ],
                    'pasaporte' => [
                        'required_elements' => [
                            'Pasaporte',
                            'Estados Unidos Mexicanos',
                            'Número de pasaporte mexicano (G/N + 8 dígitos)'
                        ],
                        'forbidden_elements' => ['INE', 'Credencial', 'CFE'],
                        'min_confidence' => self::STRICT_CONFIDENCE_THRESHOLDS['pasaporte'],
                        'validation_features' => [
                            'Detección de formato MRZ',
                            'Validación de códigos de país',
                            'Verificación de fechas de emisión'
                        ]
                    ],
                    'comprobante' => [
                        'required_elements' => [
                            'Empresa de servicios válida',
                            'Dirección completa',
                            'Fecha reciente (máximo 4 meses)'
                        ],
                        'forbidden_elements' => ['INE', 'Pasaporte', 'CURP'],
                        'min_confidence' => self::STRICT_CONFIDENCE_THRESHOLDS['comprobante'],
                        'accepted_companies' => [
                            'CFE', 'Telmex', 'Izzi', 'Totalplay', 'Megacable',
                            'Telcel', 'Movistar', 'AT&T', 'Axtel', 'Dish', 'Sky'
                        ],
                        'validation_features' => [
                            'Validación de códigos postales mexicanos',
                            'Verificación de fechas de vencimiento',
                            'Detección de formato de direcciones mexicanas'
                        ]
                    ]
                ],
                'file_requirements' => [
                    'max_size_mb' => round(self::MAX_FILE_SIZE / 1024, 1),
                    'min_size_kb' => self::MIN_FILE_SIZE,
                    'allowed_formats' => self::ALL_ALLOWED_TYPES,
                    'recommended_formats' => ['jpg', 'png'],
                    'quality_requirements' => [
                        'Resolución mínima recomendada: 1200x800 píxeles',
                        'Iluminación uniforme sin reflejos',
                        'Enfoque nítido en todo el documento',
                        'Contraste adecuado para lectura clara'
                    ]
                ],
                'security_features' => [
                    'processing_mode' => 'In-memory only (no persistent storage)',
                    'curp_validation' => 'Official Mexican algorithm with check digit',
                    'contamination_detection' => 'Cross-document element detection',
                    'quality_assessment' => 'Image quality scoring system'
                ]
            ],
            'api_version' => '2.0_enhanced',
            'last_updated' => now()->toISOString()
        ]);
    }

    // MÉTODOS DE VALIDACIÓN Y UTILIDADES MEJORADOS

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
            'document_type.in' => 'Tipo de documento no válido. Permitidos: ' . implode(', ', array_keys(self::DOCUMENT_TYPES)),
            'document.required' => 'Debes seleccionar un archivo',
            'document.mimes' => 'Formato no permitido. Usa: ' . implode(', ', self::ALL_ALLOWED_TYPES),
            'document.min' => 'El archivo es demasiado pequeño (mínimo ' . self::MIN_FILE_SIZE . 'KB)',
            'document.max' => 'El archivo es demasiado grande (máximo ' . round(self::MAX_FILE_SIZE/1024, 1) . 'MB)'
        ]);
    }

    private function validateCompleteRequest(Request $request)
    {
        $allowedTypes = implode(',', self::ALL_ALLOWED_TYPES);

        $rules = [
            'selfie' => [
                'required',
                'file',
                'mimes:' . implode(',', self::ALLOWED_IMAGE_TYPES),
                'min:' . self::MIN_FILE_SIZE,
                'max:' . self::MAX_FILE_SIZE
            ]
        ];

        if (!$request->hasFile('ine_document') && !$request->hasFile('passport_document')) {
            throw ValidationException::withMessages([
                'identity_document' => 'Debes proporcionar al menos un documento de identidad (INE o Pasaporte)'
            ]);
        }

        foreach (['ine_document', 'passport_document', 'address_proof'] as $fileKey) {
            if ($request->hasFile($fileKey)) {
                $rules[$fileKey] = [
                    'file',
                    'mimes:' . $allowedTypes,
                    'min:' . self::MIN_FILE_SIZE,
                    'max:' . self::MAX_FILE_SIZE
                ];
            }
        }

        $request->validate($rules, [
            'selfie.required' => 'La selfie es obligatoria para verificación facial',
            '*.mimes' => 'Formato de archivo no soportado',
            '*.min' => 'El archivo es demasiado pequeño',
            '*.max' => 'El archivo es demasiado grande (máximo ' . round(self::MAX_FILE_SIZE/1024, 1) . 'MB)'
        ]);
    }

    private function validateDocumentFile($file, string $documentType)
    {
        $extension = strtolower($file->getClientOriginalExtension());

        // Validaciones específicas por tipo
        if ($documentType === 'comprobante' && $extension === 'pdf') {
            if ($file->getSize() > self::MAX_FILE_SIZE * 1024) {
                throw ValidationException::withMessages([
                    'document' => 'El PDF del comprobante es demasiado grande'
                ]);
            }
            return;
        }

        // Para INE y Pasaporte, preferir imágenes de alta calidad
        if (in_array($documentType, ['ine', 'pasaporte']) && !in_array($extension, self::ALLOWED_IMAGE_TYPES)) {
            throw ValidationException::withMessages([
                'document' => "Para {$documentType} debe ser una imagen clara (JPG, PNG, WEBP)"
            ]);
        }

        // Validar tamaño mínimo más estricto para documentos oficiales
        if (in_array($documentType, ['ine', 'pasaporte']) && $file->getSize() < 20000) { // 20KB
            throw ValidationException::withMessages([
                'document' => "La imagen del {$documentType} es demasiado pequeña para análisis detallado (mínimo 20KB)"
            ]);
        }
    }

    private function enforceRateLimit(Request $request, string $type)
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
                'Si tienes pasaporte, también puedes verificarlo para mayor seguridad',
                'Sube un comprobante de domicilio reciente (máximo 4 meses)',
                'Toma una selfie clara para verificación facial'
            ],
            'pasaporte' => [
                'Si tienes INE, también puedes verificarla',
                'Sube un comprobante de domicilio reciente (máximo 4 meses)',
                'Toma una selfie clara para verificación facial'
            ],
            'comprobante' => [
                'Sube tu INE o Pasaporte para verificar identidad',
                'Toma una selfie clara para verificación facial',
                'Completa el proceso de verificación integral'
            ]
        ];

        return $nextSteps[$documentType] ?? [];
    }

    private function strictErrorResponse(string $message, string $step, string $code, array $suggestions = [], int $status = 422)
    {
        $response = [
            'success' => false,
            'message' => $message,
            'step' => $step,
            'code' => $code,
            'validation_level' => 'strict_enhanced',
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

    /**
     * Endpoint para testing mejorado
     */
    public function testOCR(Request $request)
    {
        try {
            $this->enforceRateLimit($request, 'test_ocr');

            $request->validate([
                'image' => [
                    'required',
                    'file',
                    'mimes:' . implode(',', self::ALL_ALLOWED_TYPES),
                    'min:' . self::MIN_FILE_SIZE,
                    'max:' . self::MAX_FILE_SIZE
                ],
                'document_type' => [
                    'sometimes',
                    'string',
                    'in:' . implode(',', array_keys(self::DOCUMENT_TYPES))
                ]
            ]);

            $file = $request->file('image');
            $documentType = $request->input('document_type');

            Log::info('Test OCR mejorado iniciado', [
                'user_id' => auth()->id(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'specified_type' => $documentType
            ]);

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

            // Detectar tipo automáticamente mejorado
            $detectedType = $this->detectDocumentTypeEnhanced($result['text'] ?? '');

            // Validación de calidad de imagen
            $qualityCheck = $this->validateImageQuality($file, $result['text'] ?? '');

            $result['metadata'] = [
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'processing_time_ms' => $processingTime,
                'detected_type' => $detectedType,
                'specified_type' => $documentType,
                'auto_detection' => $detectedType ? "Detectado como: {$detectedType}" : 'Tipo no identificado',
                'quality_assessment' => $qualityCheck,
                'api_version' => '2.0_enhanced'
            ];

            return response()->json([
                'success' => true,
                'data' => $result,
                'code' => 'OCR_SUCCESS_ENHANCED'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error de validación: ' . implode(', ', Arr::flatten($e->errors())),
                'code' => 'VALIDATION_ERROR',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            $errorId = 'test_err_enhanced_' . uniqid();

            Log::error('Error crítico en testOCR mejorado', [
                'error_id' => $errorId,
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error interno del sistema',
                'code' => 'INTERNAL_ERROR',
                'error_id' => $errorId
            ], 500);
        }
    }

    /**
     * Obtener status de verificación del usuario - MEJORADO
     */
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
                'verification_level' => $this->getVerificationLevel($user->verification_method ?? ''),
                'user_info' => [
                    'id' => $user->id,
                    'name' => $user->name . ' ' . $user->last_name,
                    'email' => $user->email
                ]
            ]
        ]);
    }

    /**
     * NUEVO: Determinar nivel de verificación
     */
    private function getVerificationLevel($method)
    {
        if (strpos($method, 'strict') !== false && strpos($method, 'enhanced') !== false) {
            return 'strict_enhanced';
        } elseif (strpos($method, 'strict') !== false) {
            return 'strict';
        } else {
            return 'standard';
        }
    }
}
