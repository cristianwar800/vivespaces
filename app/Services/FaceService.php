<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\UploadedFile;

class FaceService
{
    private $apiKey;
    private $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.compreface.api_key');
        $this->baseUrl = config('services.compreface.base_url');
    }

    // ==========================================
    // 🔥 MÉTODO PRINCIPAL - VERIFY API ESTRICTO
    // ==========================================

    /**
     * Verificar dos rostros usando Verify API
     * MODO ESTRICTO: Threshold fijo en 85%, sin ajustes
     */
    public function verifyFaces($image1, $image2)
    {
        try {
            // 🔥 VERIFICAR SI FACE VERIFICATION ESTÁ HABILITADO
            if (!config('services.compreface.enabled')) {
                Log::info('⚠️ Face verification deshabilitado en FaceService');
                
                return [
                    'success' => false,
                    'error' => 'El servicio de verificación facial no está disponible',
                    'code' => 'SERVICE_DISABLED',
                    'suggestions' => [
                        'La verificación facial está temporalmente deshabilitada',
                        'Por favor, completa la verificación con tus documentos oficiales'
                    ]
                ];
            }

            Log::info('FaceService: Iniciando verificación facial ESTRICTA', [
                'image1_type' => $this->getImageType($image1),
                'image2_type' => $this->getImageType($image2),
                'threshold_mode' => 'FIXED_85_NO_ADJUSTMENTS'
            ]);

            $image1Path = $this->getImagePath($image1);
            $image2Path = $this->getImagePath($image2);

            // Pre-procesar imágenes para mejorar detección
            $enhanced1 = $this->preprocessImageForFaceDetection($image1Path);
            $enhanced2 = $this->preprocessImageForFaceDetection($image2Path);

            // Detección de rostros en imagen 1 (INE)
            $detection1 = $this->detectFaces($enhanced1);
            if (!$detection1['success'] || !$detection1['has_face']) {
                $this->cleanupTempFiles([$enhanced1, $enhanced2]);
                
                return [
                    'success' => false,
                    'error' => 'No se detectó un rostro en la imagen del documento',
                    'code' => 'NO_FACE_IN_DOCUMENT',
                    'suggestions' => [
                        'Asegúrate de que la foto del documento sea visible',
                        'Verifica que no haya reflejos en la foto',
                        'La imagen debe estar clara y enfocada'
                    ]
                ];
            }

            // Detección de rostros en imagen 2 (Selfie)
            $detection2 = $this->detectFaces($enhanced2);
            if (!$detection2['success'] || !$detection2['has_face']) {
                $this->cleanupTempFiles([$enhanced1, $enhanced2]);
                
                return [
                    'success' => false,
                    'error' => 'No se detectó un rostro claro en tu selfie',
                    'code' => 'NO_FACE_IN_SELFIE',
                    'suggestions' => [
                        'Asegúrate de que tu rostro esté visible',
                        'Mejora la iluminación',
                        'Mira directamente a la cámara',
                        'No uses filtros o accesorios que cubran tu cara'
                    ]
                ];
            }

            // Validar múltiples rostros en selfie
            if ($detection2['multiple_faces']) {
                $this->cleanupTempFiles([$enhanced1, $enhanced2]);
                
                return [
                    'success' => false,
                    'error' => 'Se detectaron múltiples rostros en la selfie',
                    'code' => 'MULTIPLE_FACES',
                    'faces_detected' => $detection2['faces_detected'],
                    'suggestions' => [
                        'Solo tu rostro debe estar visible',
                        'Toma la selfie en un lugar sin otras personas',
                        'Asegúrate de estar solo en el encuadre'
                    ]
                ];
            }

            // Llamar a CompreFace Verify API
            $response = Http::timeout(60)
                ->withHeaders(['x-api-key' => $this->apiKey])
                ->attach('source_image', file_get_contents($enhanced1), basename($enhanced1))
                ->attach('target_image', file_get_contents($enhanced2), basename($enhanced2))
                ->post("{$this->baseUrl}/api/v1/verification/verify");

            // 📊 Obtener información de brillo (SOLO INFORMATIVO)
            $brightness1 = $this->getImageBrightness($enhanced1);
            $brightness2 = $this->getImageBrightness($enhanced2);

            // 👓 Detectar lentes (SOLO INFORMATIVO)
            $possibleGlassesImage1 = $this->detectGlassesInImage($detection1);
            $possibleGlassesImage2 = $this->detectGlassesInImage($detection2);

            // Limpiar archivos temporales
            $this->cleanupTempFiles([$enhanced1, $enhanced2]);

            // Validar respuesta de API
            if (!$response->successful()) {
                Log::error('FaceService: Error en verificación', [
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);

                return [
                    'success' => false,
                    'error' => 'No se pudo verificar las imágenes',
                    'code' => 'VERIFICATION_FAILED',
                    'details' => $response->json()['message'] ?? 'Unknown error',
                    'suggestions' => [
                        'Intenta con mejor iluminación',
                        'Asegúrate de que ambas fotos sean claras',
                        'Intenta de nuevo en unos momentos'
                    ]
                ];
            }

            $data = $response->json();
            $result = $data['result'][0] ?? null;

            if (!$result) {
                return [
                    'success' => false,
                    'error' => 'No se pudo obtener resultado de verificación',
                    'code' => 'NO_RESULT'
                ];
            }

            $faceMatches = $result['face_matches'][0] ?? null;

            if (!$faceMatches) {
                return [
                    'success' => false,
                    'error' => 'No se encontraron coincidencias de rostros',
                    'code' => 'NO_FACE_MATCHES',
                    'suggestions' => [
                        'Asegúrate de que ambas imágenes tengan rostros visibles',
                        'Verifica que las fotos sean claras y bien iluminadas'
                    ]
                ];
            }

            // Obtener similitud
            $similarity = $faceMatches['similarity'] ?? 0;
            $similarityPercentage = round($similarity * 100, 2);
            
            // 🔒 THRESHOLD FIJO - NO SE AJUSTA POR NINGUNA CONDICIÓN
            $threshold = 85;

            // 📊 Logging de condiciones (solo informativo, NO afecta threshold)
            if ($possibleGlassesImage1 || $possibleGlassesImage2) {
                Log::info('👓 Lentes detectados (informativo, threshold se mantiene en 85%)');
            }

            if ($brightness1 < 100 || $brightness2 < 100) {
                Log::info('⚠️ Baja luminosidad detectada (informativo, threshold se mantiene en 85%)');
            }

            $isMatch = $similarityPercentage >= $threshold;

            Log::info('FaceService: Verificación completada (MODO ESTRICTO)', [
                'similarity' => $similarityPercentage . '%',
                'is_match' => $isMatch,
                'threshold_fixed' => $threshold . '%',
                'glasses_detected' => $possibleGlassesImage1 || $possibleGlassesImage2,
                'brightness_image1' => round($brightness1, 2),
                'brightness_image2' => round($brightness2, 2),
                'preprocessing' => 'balanced',
                'no_adjustments_applied' => true
            ]);

            return [
                'success' => true,
                'is_match' => $isMatch,
                'similarity' => $similarity,
                'similarity_percentage' => $similarityPercentage,
                'confidence_level' => $this->getConfidenceLevel($similarityPercentage),
                'threshold_fixed' => $threshold,
                'validation_mode' => 'STRICT_NO_ADJUSTMENTS',
                'preprocessing_applied' => true,
                'image_quality' => [
                    'image1_brightness' => round($brightness1, 2),
                    'image2_brightness' => round($brightness2, 2),
                    'glasses_detected' => $possibleGlassesImage1 || $possibleGlassesImage2,
                    'note' => 'Información de referencia, no afecta el threshold'
                ],
                'message' => $isMatch 
                    ? "✅ Rostros coinciden ({$similarityPercentage}% de similitud, threshold fijo: {$threshold}%)" . 
                      ($possibleGlassesImage1 || $possibleGlassesImage2 ? ' 👓 Lentes detectados (sin ajustes)' : '')
                    : "❌ Los rostros no coinciden suficientemente ({$similarityPercentage}% de similitud, se requiere {$threshold}%)"
            ];

        } catch (\Exception $e) {
            Log::error('FaceService: Error crítico en verificación facial', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Error interno en la verificación facial',
                'code' => 'INTERNAL_ERROR',
                'details' => $e->getMessage(),
                'suggestions' => [
                    'Intenta nuevamente en unos momentos',
                    'Si el problema persiste, contacta al soporte'
                ]
            ];
        }
    }

    // ==========================================
    // DETECCIÓN DE ROSTROS
    // ==========================================

    /**
     * Detectar rostros en una imagen usando Detection API
     */
    public function detectFaces($image)
    {
        try {
            // 🔥 VERIFICAR SI FACE VERIFICATION ESTÁ HABILITADO
            if (!config('services.compreface.enabled')) {
                return [
                    'success' => false,
                    'error' => 'Face detection service is disabled',
                    'code' => 'SERVICE_DISABLED'
                ];
            }

            $imageData = $this->prepareImageData($image);
            $fileName = $this->getFileName($image);

            $response = Http::timeout(30)
                ->withHeaders(['x-api-key' => $this->apiKey])
                ->attach('file', $imageData, $fileName)
                ->post("{$this->baseUrl}/api/v1/detection/detect");

            if ($response->successful()) {
                $data = $response->json();
                $faces = $data['result'] ?? [];

                Log::info('FaceService: Detección completada', [
                    'faces_found' => count($faces)
                ]);

                return [
                    'success' => true,
                    'faces_detected' => count($faces),
                    'has_face' => count($faces) > 0,
                    'multiple_faces' => count($faces) > 1,
                    'faces_data' => $faces
                ];
            }

            Log::warning('FaceService: Detección falló', [
                'status' => $response->status(),
                'response' => $response->json()
            ]);

            return [
                'success' => false,
                'error' => 'Face detection failed',
                'status_code' => $response->status()
            ];

        } catch (\Exception $e) {
            Log::error('FaceService: Error en detección', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // ==========================================
    // PRE-PROCESAMIENTO DE IMÁGENES
    // ==========================================

    /**
     * Pre-procesar imagen para mejorar detección de rostros
     * Aplica ajustes de brillo, contraste y nitidez
     */
    private function preprocessImageForFaceDetection($imagePath)
    {
        try {
            if (!extension_loaded('gd')) {
                Log::warning('GD extension no disponible, saltando preprocesamiento');
                return $imagePath;
            }

            $imageInfo = @getimagesize($imagePath);
            if (!$imageInfo) {
                Log::warning('No se pudo leer información de la imagen');
                return $imagePath;
            }

            $mimeType = $imageInfo['mime'] ?? 'image/jpeg';

            switch ($mimeType) {
                case 'image/jpeg':
                    $image = @imagecreatefromjpeg($imagePath);
                    break;
                case 'image/png':
                    $image = @imagecreatefrompng($imagePath);
                    break;
                case 'image/webp':
                    $image = @imagecreatefromwebp($imagePath);
                    break;
                default:
                    Log::info('Tipo de imagen no soportado: ' . $mimeType);
                    return $imagePath;
            }

            if (!$image) {
                Log::warning('No se pudo cargar la imagen');
                return $imagePath;
            }

            $width = imagesx($image);
            $height = imagesy($image);

            Log::info('🎨 Preprocesando imagen (modo BALANCEADO - threshold 85% fijo)', [
                'width' => $width,
                'height' => $height,
                'mime' => $mimeType
            ]);

            // Calcular brillo promedio
            $avgBrightness = $this->calculateAverageBrightness($image, $width, $height);
            Log::info('📊 Brillo promedio detectado: ' . round($avgBrightness, 2));

            // Ajuste de brillo
            $targetBrightness = 145;
            $brightnessAdjustment = ($targetBrightness - $avgBrightness) * 0.5;

            if (abs($brightnessAdjustment) > 8) {
                Log::info('💡 Ajustando brillo moderado en: ' . round($brightnessAdjustment, 2));
                imagefilter($image, IMG_FILTER_BRIGHTNESS, (int)$brightnessAdjustment);
            }

            // Ajuste de contraste
            imagefilter($image, IMG_FILTER_CONTRAST, -18);

            // Aplicar sharpen (nitidez)
            $sharpen = [
                [0, -1, 0],
                [-1, 5.5, -1],
                [0, -1, 0]
            ];
            imageconvolution($image, $sharpen, 1.5, 0);

            // Corrección gamma para imágenes muy oscuras
            if ($avgBrightness < 90) {
                Log::info('🌙 Imagen muy oscura, aplicando corrección gamma suave');
                imagegammacorrect($image, 1.0, 0.7);
            }

            // Smooth para reducir ruido en imágenes oscuras
            if ($avgBrightness < 110) {
                imagefilter($image, IMG_FILTER_SMOOTH, 1);
            }

            // Guardar imagen mejorada
            $tempPath = storage_path('app/temp/enhanced_' . uniqid() . '.jpg');
            
            if (!file_exists(dirname($tempPath))) {
                mkdir(dirname($tempPath), 0755, true);
            }

            imagejpeg($image, $tempPath, 95);
            imagedestroy($image);

            $finalBrightness = $this->getImageBrightness($tempPath);

            Log::info('✅ Imagen preprocesada (BALANCEADO - threshold 85% sin ajustes)', [
                'original_path' => basename($imagePath),
                'enhanced_path' => basename($tempPath),
                'original_brightness' => round($avgBrightness, 2),
                'final_brightness' => round($finalBrightness, 2),
                'improvement' => round($finalBrightness - $avgBrightness, 2)
            ]);

            return $tempPath;

        } catch (\Exception $e) {
            Log::error('Error en preprocesamiento BALANCEADO', [
                'error' => $e->getMessage(),
                'path' => $imagePath
            ]);
            return $imagePath;
        }
    }

    /**
     * Calcular brillo promedio de una imagen
     */
    private function calculateAverageBrightness($image, $width, $height)
    {
        $totalBrightness = 0;
        $pixelCount = 0;

        // Muestrear cada 8 píxeles para mejor performance
        for ($x = 0; $x < $width; $x += 8) {
            for ($y = 0; $y < $height; $y += 8) {
                $rgb = @imagecolorat($image, $x, $y);
                if ($rgb === false) continue;
                
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                
                // Fórmula estándar de luminosidad
                $brightness = (0.299 * $r + 0.587 * $g + 0.114 * $b);
                $totalBrightness += $brightness;
                $pixelCount++;
            }
        }

        return $pixelCount > 0 ? $totalBrightness / $pixelCount : 128;
    }

    /**
     * Obtener brillo de una imagen desde archivo
     */
    private function getImageBrightness($imagePath)
    {
        try {
            $image = @imagecreatefromjpeg($imagePath);
            if (!$image) return 0;
            
            $width = imagesx($image);
            $height = imagesy($image);
            $brightness = $this->calculateAverageBrightness($image, $width, $height);
            
            imagedestroy($image);
            return $brightness;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Detectar si hay lentes en una imagen basado en detección
     */
    private function detectGlassesInImage($detection)
    {
        if (!isset($detection['faces_data']) || !is_array($detection['faces_data'])) {
            return false;
        }

        foreach ($detection['faces_data'] as $face) {
            $similarity = $face['subjects'][0]['similarity'] ?? 0;
            
            // Similitud entre 70% y 95% puede indicar lentes
            if ($similarity >= 0.7 && $similarity < 0.95) {
                return true;
            }
        }

        return false;
    }

    /**
     * Limpiar archivos temporales
     */
    private function cleanupTempFiles($files)
    {
        foreach ($files as $file) {
            if (is_string($file) && file_exists($file)) {
                if (strpos($file, 'enhanced_') !== false || strpos($file, 'temp_') !== false) {
                    try {
                        unlink($file);
                        Log::info('🧹 Archivo temporal limpiado: ' . basename($file));
                    } catch (\Exception $e) {
                        Log::warning('No se pudo limpiar archivo temporal: ' . basename($file));
                    }
                }
            }
        }
    }

    // ==========================================
    // HELPERS DE CONVERSIÓN
    // ==========================================

    /**
     * Obtener path de imagen desde diferentes tipos de entrada
     */
    private function getImagePath($image)
    {
        if ($image instanceof UploadedFile) {
            return $image->getRealPath();
        }

        if (is_string($image) && file_exists($image)) {
            return $image;
        }

        if (is_string($image)) {
            $tempPath = storage_path('app/temp/temp_' . uniqid() . '.jpg');
            if (!file_exists(dirname($tempPath))) {
                mkdir(dirname($tempPath), 0755, true);
            }
            file_put_contents($tempPath, $image);
            return $tempPath;
        }

        return null;
    }

    /**
     * Preparar datos de imagen para enviar a API
     */
    private function prepareImageData($image)
    {
        if ($image instanceof UploadedFile) {
            return file_get_contents($image->getRealPath());
        }

        if (is_string($image) && file_exists($image)) {
            return file_get_contents($image);
        }

        if (is_string($image)) {
            return $image;
        }

        if (is_resource($image)) {
            ob_start();
            imagejpeg($image);
            $imageData = ob_get_contents();
            ob_end_clean();
            return $imageData;
        }

        return $image;
    }

    /**
     * Obtener nombre de archivo
     */
    private function getFileName($image)
    {
        if ($image instanceof UploadedFile) {
            return $image->getClientOriginalName();
        }

        if (is_string($image) && file_exists($image)) {
            return basename($image);
        }

        return 'image_' . uniqid() . '.jpg';
    }

    /**
     * Obtener tipo de imagen para logging
     */
    private function getImageType($image)
    {
        if ($image instanceof UploadedFile) {
            return 'UploadedFile (' . $image->getSize() . ' bytes)';
        }

        if (is_string($image) && file_exists($image)) {
            return 'FilePath (' . filesize($image) . ' bytes)';
        }

        if (is_string($image)) {
            return 'Binary (' . strlen($image) . ' bytes)';
        }

        if (is_resource($image)) {
            return 'Resource (GD Image)';
        }

        return 'Unknown';
    }

    /**
     * Obtener nivel de confianza desde porcentaje de similitud
     */
    private function getConfidenceLevel($similarityPercentage)
    {
        if ($similarityPercentage >= 95) {
            return 'muy_alta';
        }
        
        if ($similarityPercentage >= 90) {
            return 'alta';
        }
        
        if ($similarityPercentage >= 85) {
            return 'buena';
        }
        
        if ($similarityPercentage >= 70) {
            return 'media';
        }
        
        if ($similarityPercentage >= 60) {
            return 'baja';
        }
        
        return 'muy_baja';
    }

    // ==========================================
    // 🆕 MÉTODOS ADICIONALES - RECOGNITION API (OPCIONALES)
    // ==========================================

    /**
     * 🆕 Agregar rostro a la colección (Recognition API)
     * NOTA: No usado actualmente, pero disponible para futuras implementaciones
     */
    public function addFaceToCollection($imagePath, $subjectName)
    {
        try {
            Log::info('📝 Registrando rostro en colección', [
                'subject' => $subjectName,
                'image_path' => $imagePath
            ]);

            if (!file_exists($imagePath)) {
                throw new \Exception("Archivo no existe: {$imagePath}");
            }

            $imageData = file_get_contents($imagePath);
            $fileName = basename($imagePath);

            $url = "{$this->baseUrl}/api/v1/recognition/faces?subject=" . urlencode($subjectName);

            $response = Http::timeout(60)
                ->withHeaders([
                    'x-api-key' => $this->apiKey,
                    'Accept' => 'application/json'
                ])
                ->attach('file', $imageData, $fileName)
                ->post($url);

            if (!$response->successful()) {
                $errorBody = $response->json();
                
                Log::error('❌ CompreFace rechazó el registro', [
                    'status' => $response->status(),
                    'error_body' => $errorBody
                ]);

                return [
                    'success' => false,
                    'error' => 'CompreFace rechazó la imagen: ' . ($errorBody['message'] ?? 'Error desconocido'),
                    'status_code' => $response->status(),
                    'details' => $errorBody
                ];
            }

            $data = $response->json();

            Log::info('✅ Rostro registrado exitosamente', [
                'subject' => $subjectName,
                'image_id' => $data['image_id'] ?? 'unknown'
            ]);

            return [
                'success' => true,
                'subject' => $subjectName,
                'image_id' => $data['image_id'] ?? null,
                'data' => $data
            ];

        } catch (\Exception $e) {
            Log::error('❌ Error al registrar rostro', [
                'error' => $e->getMessage(),
                'subject' => $subjectName
            ]);

            return [
                'success' => false,
                'error' => 'Error interno al registrar rostro: ' . $e->getMessage()
            ];
        }
    }

    /**
     * 🆕 Reconocer rostro en imagen (Recognition API)
     * NOTA: No usado actualmente, pero disponible para futuras implementaciones
     */
    public function recognizeFace($imagePath, $expectedSubject = null)
    {
        try {
            Log::info('🔍 Reconociendo rostro', [
                'image_path' => $imagePath,
                'expected_subject' => $expectedSubject
            ]);

            if (!file_exists($imagePath)) {
                throw new \Exception("Archivo no existe: {$imagePath}");
            }

            $imageData = file_get_contents($imagePath);
            $fileName = basename($imagePath);

            $url = "{$this->baseUrl}/api/v1/recognition/recognize";

            $response = Http::timeout(60)
                ->withHeaders([
                    'x-api-key' => $this->apiKey,
                    'Accept' => 'application/json'
                ])
                ->attach('file', $imageData, $fileName)
                ->post($url);

            if (!$response->successful()) {
                $errorBody = $response->json();
                
                Log::error('❌ Error en reconocimiento', [
                    'status' => $response->status(),
                    'error_body' => $errorBody
                ]);

                return [
                    'success' => false,
                    'error' => 'Error en reconocimiento facial',
                    'details' => $errorBody
                ];
            }

            $data = $response->json();
            $results = $data['result'] ?? [];

            if (empty($results)) {
                return [
                    'success' => false,
                    'error' => 'No se detectó ningún rostro en la imagen',
                    'code' => 'NO_FACE_DETECTED'
                ];
            }

            $firstResult = $results[0];
            $subjects = $firstResult['subjects'] ?? [];

            if (empty($subjects)) {
                return [
                    'success' => false,
                    'error' => 'Rostro no reconocido en la colección',
                    'code' => 'NO_MATCH_FOUND'
                ];
            }

            $bestMatch = $subjects[0];
            $recognizedSubject = $bestMatch['subject'] ?? null;
            $similarity = $bestMatch['similarity'] ?? 0;
            $similarityPercentage = round($similarity * 100, 2);

            Log::info('✅ Rostro reconocido', [
                'recognized_subject' => $recognizedSubject,
                'similarity_percentage' => $similarityPercentage . '%'
            ]);

            if ($expectedSubject) {
                $isMatch = ($recognizedSubject === $expectedSubject);
                
                return [
                    'success' => true,
                    'is_match' => $isMatch,
                    'recognized_subject' => $recognizedSubject,
                    'expected_subject' => $expectedSubject,
                    'similarity' => $similarity,
                    'similarity_percentage' => $similarityPercentage,
                    'all_matches' => $subjects
                ];
            }

            return [
                'success' => true,
                'recognized_subject' => $recognizedSubject,
                'similarity' => $similarity,
                'similarity_percentage' => $similarityPercentage,
                'all_matches' => $subjects
            ];

        } catch (\Exception $e) {
            Log::error('❌ Error en reconocimiento', [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Error interno en reconocimiento: ' . $e->getMessage()
            ];
        }
    }

    /**
     * 🆕 Eliminar rostro de la colección
     */
    public function deleteFaceFromCollection($subjectName)
    {
        try {
            Log::info('🗑️ Eliminando rostro de colección', [
                'subject' => $subjectName
            ]);

            $response = Http::timeout(30)
                ->withHeaders(['x-api-key' => $this->apiKey])
                ->delete("{$this->baseUrl}/api/v1/recognition/faces?subject={$subjectName}");

            if ($response->successful()) {
                Log::info('✅ Rostro eliminado exitosamente');
                return ['success' => true];
            }

            if ($response->status() === 404) {
                Log::info('ℹ️ Rostro ya no existe en colección');
                return ['success' => true];
            }

            Log::warning('⚠️ No se pudo eliminar rostro', [
                'status' => $response->status()
            ]);

            return ['success' => false];

        } catch (\Exception $e) {
            Log::error('❌ Error al eliminar rostro', [
                'error' => $e->getMessage()
            ]);

            return ['success' => false];
        }
    }

    /**
     * 🆕 Guardar imagen temporalmente
     */
    public function saveTemporaryImage($imageData, $type, $sessionId)
    {
        try {
            $directory = storage_path("app/temp/face_verify/{$sessionId}");
            
            if (!file_exists($directory)) {
                mkdir($directory, 0755, true);
            }

            $filename = "{$type}_" . uniqid() . '.jpg';
            $path = "{$directory}/{$filename}";

            if ($imageData instanceof UploadedFile) {
                $imageData->move($directory, $filename);
            } else {
                $imageData = str_replace('data:image/jpeg;base64,', '', $imageData);
                $imageData = str_replace('data:image/png;base64,', '', $imageData);
                $imageData = str_replace(' ', '+', $imageData);
                
                $decoded = base64_decode($imageData);
                file_put_contents($path, $decoded);
            }

            $cacheKey = "temp_image_{$sessionId}_{$type}";
            Cache::put($cacheKey, $path, now()->addMinutes(10));
            
            return $path;

        } catch (\Exception $e) {
            Log::error('❌ Error guardando imagen temporal', [
                'error' => $e->getMessage(),
                'type' => $type
            ]);
            throw $e;
        }
    }

    /**
     * 🆕 Limpiar sesión completa
     */
    public function cleanupSession($sessionId, $subjectName = null)
    {
        try {
            Log::info('🧹 Limpiando sesión', ['session_id' => $sessionId]);

            $directory = storage_path("app/temp/face_verify/{$sessionId}");
            
            if (file_exists($directory)) {
                $files = glob($directory . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }
                rmdir($directory);
            }

            if ($subjectName) {
                $this->deleteFaceFromCollection($subjectName);
            }

            Cache::forget("temp_image_{$sessionId}_selfie");
            Cache::forget("temp_image_{$sessionId}_ine");

            return true;

        } catch (\Exception $e) {
            Log::error("⚠️ Error limpiando sesión {$sessionId}", [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 🆕 Limpiar SOLO archivos temporales (sin eliminar subject)
     */
    public function cleanupSessionFiles($sessionId)
    {
        try {
            $directory = storage_path("app/temp/face_verify/{$sessionId}");
            
            if (file_exists($directory)) {
                $files = glob($directory . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }
                rmdir($directory);
            }

            Cache::forget("temp_image_{$sessionId}_selfie");
            Cache::forget("temp_image_{$sessionId}_ine");

            return true;

        } catch (\Exception $e) {
            Log::error("⚠️ Error limpiando archivos {$sessionId}", [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 🆕 Verificar si un subject existe
     */
    public function checkSubjectExists($subjectName)
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders(['x-api-key' => $this->apiKey])
                ->get("{$this->baseUrl}/api/v1/recognition/subjects");

            if ($response->successful()) {
                $data = $response->json();
                $subjects = $data['subjects'] ?? [];
                return in_array($subjectName, $subjects);
            }

            return false;

        } catch (\Exception $e) {
            Log::error('❌ Error verificando subject', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 🆕 Pre-procesar imagen de documento
     */
    public function preprocessDocumentImage($imagePath, $type = 'ine')
    {
        try {
            if (!extension_loaded('gd')) {
                return [
                    'success' => true,
                    'path' => $imagePath,
                    'preprocessing_applied' => false,
                    'reason' => 'GD extension no disponible'
                ];
            }

            $imageInfo = @getimagesize($imagePath);
            if (!$imageInfo) {
                return [
                    'success' => true,
                    'path' => $imagePath,
                    'preprocessing_applied' => false,
                    'reason' => 'No se pudo leer imagen'
                ];
            }

            $mimeType = $imageInfo['mime'] ?? 'image/jpeg';
            
            switch ($mimeType) {
                case 'image/jpeg':
                    $image = @imagecreatefromjpeg($imagePath);
                    break;
                case 'image/png':
                    $image = @imagecreatefrompng($imagePath);
                    break;
                case 'image/webp':
                    $image = @imagecreatefromwebp($imagePath);
                    break;
                default:
                    return [
                        'success' => true,
                        'path' => $imagePath,
                        'preprocessing_applied' => false,
                        'reason' => 'Tipo no soportado: ' . $mimeType
                    ];
            }

            if (!$image) {
                return [
                    'success' => true,
                    'path' => $imagePath,
                    'preprocessing_applied' => false,
                    'reason' => 'No se pudo cargar imagen'
                ];
            }

            $width = imagesx($image);
            $height = imagesy($image);

            $avgBrightness = $this->calculateAverageBrightness($image, $width, $height);
            $adjustments = [];
            
            // Corrección de brillo
            $targetBrightness = 140;
            $brightnessAdjustment = 0;
            
            if ($avgBrightness < 80) {
                $brightnessAdjustment = ($targetBrightness - $avgBrightness) * 0.8;
                $adjustments[] = 'Imagen muy oscura - Incrementando brillo significativamente';
            } elseif ($avgBrightness < 110) {
                $brightnessAdjustment = ($targetBrightness - $avgBrightness) * 0.6;
                $adjustments[] = 'Imagen oscura - Incrementando brillo moderadamente';
            } elseif ($avgBrightness > 180) {
                $brightnessAdjustment = ($targetBrightness - $avgBrightness) * 0.5;
                $adjustments[] = 'Imagen muy brillante - Reduciendo brillo';
            } elseif ($avgBrightness < 130 || $avgBrightness > 160) {
                $brightnessAdjustment = ($targetBrightness - $avgBrightness) * 0.4;
                $adjustments[] = 'Optimizando brillo para mejor detección';
            }

            if (abs($brightnessAdjustment) > 5) {
                imagefilter($image, IMG_FILTER_BRIGHTNESS, (int)$brightnessAdjustment);
            }

            // Contraste
            if ($avgBrightness < 90 || $avgBrightness > 170) {
                imagefilter($image, IMG_FILTER_CONTRAST, -25);
                $adjustments[] = 'Mejorando contraste';
            } else {
                imagefilter($image, IMG_FILTER_CONTRAST, -15);
            }

            // Sharpen
            $sharpen = [
                [0, -1, 0],
                [-1, 5.5, -1],
                [0, -1, 0]
            ];
            imageconvolution($image, $sharpen, 1.5, 0);
            $adjustments[] = 'Mejorando nitidez de la imagen';

            // Gamma para imágenes muy oscuras
            if ($avgBrightness < 80) {
                imagegammacorrect($image, 1.0, 0.65);
                $adjustments[] = 'Aplicando corrección gamma para recuperar detalles en sombras';
            }

            // Smooth para reducir ruido
            if ($avgBrightness < 100) {
                imagefilter($image, IMG_FILTER_SMOOTH, 2);
                $adjustments[] = 'Reduciendo ruido en áreas oscuras';
            }

            // Guardar versión mejorada
            $enhancedPath = storage_path('app/temp/enhanced_' . $type . '_' . uniqid() . '.jpg');
            
            if (!file_exists(dirname($enhancedPath))) {
                mkdir(dirname($enhancedPath), 0755, true);
            }

            imagejpeg($image, $enhancedPath, 95);
            
            $finalBrightness = $this->calculateAverageBrightness($image, $width, $height);
            
            imagedestroy($image);

            return [
                'success' => true,
                'path' => $enhancedPath,
                'preprocessing_applied' => true,
                'original_path' => $imagePath,
                'original_brightness' => round($avgBrightness, 2),
                'final_brightness' => round($finalBrightness, 2),
                'improvement' => round($finalBrightness - $avgBrightness, 2),
                'adjustments' => $adjustments
            ];

        } catch (\Exception $e) {
            Log::error('❌ Error en pre-procesamiento', [
                'error' => $e->getMessage()
            ]);
                
            return [
                'success' => true,
                'path' => $imagePath,
                'preprocessing_applied' => false,
                'reason' => 'Error: ' . $e->getMessage()
            ];
        }
    }
}