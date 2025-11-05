<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class OCRService
{
    private $client;
    private $apiKey;
    private $baseUrl;

    // Configuración para diferentes motores OCR
    private const OCR_ENGINES = [
        'standard' => '1',    // Motor estándar
        'advanced' => '2',    // Motor avanzado para documentos complejos
        'table' => '3'        // Motor para tablas (útil para comprobantes)
    ];

    // Configuración de calidad por tipo de documento
    private const DOCUMENT_OPTIMIZATION = [
        'ine' => [
            'max_width' => 1800,
            'max_height' => 1200,
            'quality' => 90,
            'engine' => '2'
        ],
        'pasaporte' => [
            'max_width' => 1600,
            'max_height' => 1200,
            'quality' => 88,
            'engine' => '2'
        ],
        'comprobante' => [
            'max_width' => 1400,
            'max_height' => 1800,
            'quality' => 85,
            'engine' => '2'
        ]
    ];

    public function __construct()
    {
        $this->client = new Client();
        $this->apiKey = config('services.ocr_space.api_key');
        $this->baseUrl = config('services.ocr_space.base_url');
    }

    /**
     * Procesar imagen con optimización específica por tipo de documento
     */
    public function processImage($imageFile, $documentType = null)
    {
        try {
            // Detectar tipo si no se especifica
            if (!$documentType) {
                $documentType = $this->detectDocumentTypeFromImage($imageFile);
            }

            // Optimizar imagen según el tipo de documento
            $optimizedImage = $this->optimizeImageForDocument($imageFile, $documentType);

            // Configuración específica por tipo de documento
            $ocrConfig = self::DOCUMENT_OPTIMIZATION[$documentType] ?? self::DOCUMENT_OPTIMIZATION['ine'];

            Log::info('Enviando solicitud OCR optimizada', [
                'document_type' => $documentType,
                'api_key_length' => strlen($this->apiKey),
                'base_url' => $this->baseUrl,
                'image_size' => strlen($optimizedImage),
                'ocr_engine' => $ocrConfig['engine']
            ]);

            $response = $this->client->post($this->baseUrl, [
                'form_params' => [
                    'apikey' => $this->apiKey,
                    'base64Image' => 'data:image/jpeg;base64,' . base64_encode($optimizedImage),
                    'language' => 'spa',
                    'isOverlayRequired' => 'false',
                    'detectOrientation' => 'true',
                    'scale' => 'true',
                    'OCREngine' => $ocrConfig['engine'],
                    'isTable' => $documentType === 'comprobante' ? 'true' : 'false',
                    'filetype' => 'JPG'
                ],
                'timeout' => 45
            ]);

            $result = json_decode($response->getBody(), true);

            Log::info('Respuesta de OCR.space', [
                'exit_code' => $result['OCRExitCode'] ?? 'N/A',
                'has_error' => $result['IsErroredOnProcessing'] ?? false,
                'document_type' => $documentType
            ]);

            if (isset($result['OCRExitCode']) && $result['OCRExitCode'] === 1) {
                $text = $result['ParsedResults'][0]['ParsedText'];

                // Post-procesamiento del texto
                $cleanText = $this->postProcessText($text, $documentType);

                Log::info('Texto extraído y procesado', [
                    'document_type' => $documentType,
                    'original_length' => strlen($text),
                    'processed_length' => strlen($cleanText),
                    'text_preview' => substr($cleanText, 0, 200)
                ]);

                // Validación específica por tipo de documento
                $validation = $this->validateDocument($cleanText, $documentType);

                return [
                    'success' => true,
                    'text' => $cleanText,
                    'original_text' => $text,
                    'document_type' => $documentType,
                    'validation' => $validation,
                    'confidence' => $validation['confidence'] ?? 0
                ];
            }

            $errorMessages = $result['ErrorMessage'] ?? ['Unknown error'];
            $errorString = is_array($errorMessages) ? implode(', ', $errorMessages) : $errorMessages;

            Log::error('OCR falló', [
                'exit_code' => $result['OCRExitCode'] ?? 'N/A',
                'error_message' => $errorString,
                'document_type' => $documentType
            ]);

            return ['success' => false, 'error' => 'OCR failed: ' . $errorString];

        } catch (\Exception $e) {
            Log::error('OCR Error crítico', [
                'error' => $e->getMessage(),
                'document_type' => $documentType ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * 🆕 Validar que el nombre del documento coincida con el usuario
     */
    public function validateNameMatch($extractedText, $userName)
    {
        $extractedText = strtoupper($this->removeAccents($extractedText));
        $userName = strtoupper($this->removeAccents($userName));
        
        Log::info('🔍 Comparando nombres', [
            'user_name' => $userName,
            'extracted_text_preview' => substr($extractedText, 0, 200)
        ]);

        // Dividir nombre del usuario en palabras
        $userWords = preg_split('/\s+/', trim($userName));
        $matchedWords = 0;
        $totalWords = count($userWords);
        $foundWords = [];

        foreach ($userWords as $word) {
            if (strlen($word) < 3) continue; // Ignorar palabras muy cortas como "DE", "LA"
            
            // Buscar la palabra completa o con variaciones
            if (strpos($extractedText, $word) !== false) {
                $matchedWords++;
                $foundWords[] = $word;
                Log::info("✓ Palabra encontrada: {$word}");
            } else {
                Log::warning("✗ Palabra NO encontrada: {$word}");
            }
        }

        $matchPercentage = $totalWords > 0 ? ($matchedWords / $totalWords) * 100 : 0;

        Log::info('📊 Resultado comparación de nombres', [
            'matched_words' => $matchedWords,
            'total_words' => $totalWords,
            'match_percentage' => round($matchPercentage, 2),
            'found_words' => $foundWords
        ]);

        return [
            'matches' => $matchPercentage >= 70, // Al menos 70% de coincidencia
            'match_percentage' => round($matchPercentage, 2),
            'matched_words' => $matchedWords,
            'total_words' => $totalWords,
            'found_words' => $foundWords
        ];
    }

    /**
     * 🆕 Remover acentos para mejor comparación
     */
    private function removeAccents($string)
    {
        $unwanted = [
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U',
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'Ñ' => 'N', 'ñ' => 'n', 'Ü' => 'U', 'ü' => 'u'
        ];
        
        return strtr($string, $unwanted);
    }

    /**
     * 🆕 Validar que el documento sea reciente (2024-2025)
     */
    public function validateDocumentRecency($text, $documentType)
    {
        $currentYear = date('Y'); // 2025
        $allowedYears = [$currentYear - 1, $currentYear, $currentYear + 1]; // 2024, 2025, 2026

        $foundYears = [];
        
        // Buscar años en formato 4 dígitos
        if (preg_match_all('/\b(20\d{2})\b/', $text, $matches)) {
            foreach ($matches[1] as $year) {
                $year = intval($year);
                if ($year >= 2020 && $year <= 2035) {
                    $foundYears[] = $year;
                }
            }
        }

        Log::info('📅 Validando vigencia del documento', [
            'document_type' => $documentType,
            'found_years' => $foundYears,
            'allowed_years' => $allowedYears,
            'current_year' => $currentYear
        ]);

        // Para INE: debe tener año de vigencia 2024 o superior
        if ($documentType === 'ine') {
            // La INE muestra año de vigencia (cuando expira)
            $validYears = array_filter($foundYears, function($year) use ($currentYear) {
                return $year >= $currentYear; // Vigente si expira en 2025 o después
            });

            if (!empty($validYears)) {
                $latestYear = max($validYears);
                Log::info("✅ INE vigente encontrada, expira: {$latestYear}");
                return [
                    'is_recent' => true,
                    'year_found' => $latestYear,
                    'message' => "INE vigente hasta {$latestYear}"
                ];
            }
            
            return [
                'is_recent' => false,
                'year_found' => $foundYears[0] ?? null,
                'message' => 'La INE debe estar vigente (no vencida)',
                'suggestion' => 'Tu INE parece estar vencida. Necesitas renovarla.'
            ];
        }

        // Para Pasaporte: similar validación
        if ($documentType === 'pasaporte') {
            // El pasaporte muestra fecha de expedición y vencimiento
            $validYears = array_filter($foundYears, function($year) use ($currentYear) {
                return $year >= $currentYear - 5 && $year <= $currentYear + 10;
            });

            if (!empty($validYears)) {
                $latestYear = max($validYears);
                Log::info("✅ Pasaporte vigente encontrado, expira: {$latestYear}");
                return [
                    'is_recent' => true,
                    'year_found' => $latestYear,
                    'message' => "Pasaporte vigente hasta {$latestYear}"
                ];
            }
            
            return [
                'is_recent' => false,
                'year_found' => null,
                'message' => 'El pasaporte debe estar vigente',
                'suggestion' => 'Tu pasaporte parece estar vencido o próximo a vencer.'
            ];
        }

        // Para comprobante: máximo 4 meses
        if ($documentType === 'comprobante') {
            return $this->validateBillRecency($text);
        }

        return ['is_recent' => true, 'message' => 'Validación no requerida'];
    }

    /**
     * 🆕 Validar que el comprobante sea reciente (máximo 4 meses)
     */
    private function validateBillRecency($text)
    {
        $currentYear = date('Y');
        $currentMonth = date('m');
        $currentDate = new \DateTime();

        Log::info('📅 Validando fecha del comprobante', [
            'current_date' => $currentDate->format('Y-m-d')
        ]);

        // Buscar fechas en diferentes formatos
        $datePatterns = [
            '/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/',  // DD/MM/YYYY o DD-MM-YYYY
            '/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/',  // YYYY/MM/DD o YYYY-MM-DD
            '/(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+(\d{4})/i' // DD MES YYYY
        ];

        $foundDates = [];

        foreach ($datePatterns as $pattern) {
            if (preg_match_all($pattern, $text, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    if (count($match) === 4) {
                        if (preg_match('/^\d{4}/', $match[0])) {
                            // Formato YYYY-MM-DD
                            $year = intval($match[1]);
                            $month = intval($match[2]);
                            $day = intval($match[3]);
                        } elseif (preg_match('/[A-Z]+/', $match[2])) {
                            // Formato DD MES YYYY
                            $day = intval($match[1]);
                            $monthNames = [
                                'ENE' => 1, 'FEB' => 2, 'MAR' => 3, 'ABR' => 4,
                                'MAY' => 5, 'JUN' => 6, 'JUL' => 7, 'AGO' => 8,
                                'SEP' => 9, 'OCT' => 10, 'NOV' => 11, 'DIC' => 12
                            ];
                            $monthStr = strtoupper(substr($match[2], 0, 3));
                            $month = $monthNames[$monthStr] ?? 0;
                            $year = intval($match[3]);
                        } else {
                            // Formato DD/MM/YYYY
                            $day = intval($match[1]);
                            $month = intval($match[2]);
                            $year = intval($match[3]);
                        }

                        if (checkdate($month, $day, $year)) {
                            $foundDates[] = [
                                'year' => $year,
                                'month' => $month,
                                'day' => $day,
                                'date_string' => sprintf('%04d-%02d-%02d', $year, $month, $day)
                            ];
                        }
                    }
                }
            }
        }

        if (empty($foundDates)) {
            return [
                'is_recent' => false,
                'message' => 'No se pudo detectar la fecha del comprobante',
                'suggestion' => 'Asegúrate de que la fecha sea claramente visible'
            ];
        }

        // Buscar la fecha más reciente encontrada
        usort($foundDates, function($a, $b) {
            return strcmp($b['date_string'], $a['date_string']);
        });

        $mostRecentDate = $foundDates[0];
        $billDate = new \DateTime($mostRecentDate['date_string']);
        $interval = $currentDate->diff($billDate);
        $monthsDiff = ($interval->y * 12) + $interval->m;

        Log::info('📊 Análisis de fecha del comprobante', [
            'found_date' => $mostRecentDate['date_string'],
            'months_difference' => $monthsDiff,
            'is_in_future' => $billDate > $currentDate
        ]);

        if ($billDate > $currentDate) {
            return [
                'is_recent' => false,
                'date_found' => $mostRecentDate['date_string'],
                'message' => 'La fecha del comprobante está en el futuro',
                'suggestion' => 'Verifica que la fecha sea correcta'
            ];
        }

        if ($monthsDiff <= 4) {
            return [
                'is_recent' => true,
                'date_found' => $mostRecentDate['date_string'],
                'months_old' => $monthsDiff,
                'message' => "Comprobante válido ({$monthsDiff} meses de antigüedad)"
            ];
        }

        return [
            'is_recent' => false,
            'date_found' => $mostRecentDate['date_string'],
            'months_old' => $monthsDiff,
            'message' => "El comprobante es muy antiguo ({$monthsDiff} meses)",
            'suggestion' => 'El comprobante debe tener máximo 4 meses de antigüedad'
        ];
    }

    /**
     * Detectar tipo de documento con análisis mejorado
     */
    private function detectDocumentTypeFromImage($imageFile)
    {
        try {
            $imageInfo = getimagesize($imageFile->getRealPath());
            if (!$imageInfo) {
                return 'ine';
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $ratio = $width / $height;

            // Análisis básico inicial
            if ($ratio > 1.4 && $ratio < 1.8) {
                return 'ine';
            }

            if ($ratio > 0.6 && $ratio < 1.2) {
                return 'pasaporte';
            }

            if ($ratio < 0.9) {
                return 'comprobante';
            }

            return 'ine';

        } catch (\Exception $e) {
            Log::warning('No se pudo detectar tipo de documento automáticamente', [
                'error' => $e->getMessage()
            ]);
            return 'ine';
        }
    }

    /**
     * Optimizar imagen específicamente para el tipo de documento
     */
    private function optimizeImageForDocument($imageFile, $documentType)
    {
        try {
            $imageData = file_get_contents($imageFile->getRealPath());
            $fileSize = strlen($imageData);

            Log::info('Optimizando imagen para documento', [
                'document_type' => $documentType,
                'original_size' => $fileSize . ' bytes',
                'size_mb' => round($fileSize / (1024 * 1024), 2) . ' MB'
            ]);

            if ($fileSize <= 2 * 1024 * 1024) {
                return $imageData;
            }

            if (extension_loaded('gd')) {
                return $this->compressWithGDForDocument($imageFile->getRealPath(), $documentType);
            }

            Log::warning('GD no disponible, usando imagen original');
            return $imageData;

        } catch (\Exception $e) {
            Log::error('Error optimizando imagen para documento', [
                'document_type' => $documentType,
                'error' => $e->getMessage()
            ]);
            return file_get_contents($imageFile->getRealPath());
        }
    }

    /**
     * Compresión optimizada por tipo de documento
     */
    private function compressWithGDForDocument($imagePath, $documentType)
    {
        try {
            $config = self::DOCUMENT_OPTIMIZATION[$documentType] ?? self::DOCUMENT_OPTIMIZATION['ine'];

            $imageInfo = getimagesize($imagePath);
            if (!$imageInfo) {
                throw new \Exception('No se pudo leer información de la imagen');
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $type = $imageInfo[2];

            switch ($type) {
                case IMAGETYPE_JPEG:
                    $image = imagecreatefromjpeg($imagePath);
                    break;
                case IMAGETYPE_PNG:
                    $image = imagecreatefrompng($imagePath);
                    break;
                case IMAGETYPE_WEBP:
                    $image = imagecreatefromwebp($imagePath);
                    break;
                default:
                    throw new \Exception('Tipo de imagen no soportado para optimización');
            }

            if (!$image) {
                throw new \Exception('No se pudo crear imagen GD');
            }

            $maxWidth = $config['max_width'];
            $maxHeight = $config['max_height'];

            if ($width > $maxWidth || $height > $maxHeight) {
                $ratio = min($maxWidth / $width, $maxHeight / $height);
                $newWidth = round($width * $ratio);
                $newHeight = round($height * $ratio);

                $newImage = imagecreatetruecolor($newWidth, $newHeight);

                if ($type == IMAGETYPE_PNG) {
                    imagealphablending($newImage, false);
                    imagesavealpha($newImage, true);
                    $transparent = imagecolorallocatealpha($newImage, 255, 255, 255, 127);
                    imagefill($newImage, 0, 0, $transparent);
                }

                imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $newImage;
            }

            $this->applyDocumentFilters($image, $documentType);

            ob_start();
            imagejpeg($image, null, $config['quality']);
            $imageData = ob_get_contents();
            ob_end_clean();
            imagedestroy($image);

            Log::info('Imagen optimizada con GD para documento', [
                'document_type' => $documentType,
                'original_size' => filesize($imagePath) . ' bytes',
                'optimized_size' => strlen($imageData) . ' bytes',
                'quality' => $config['quality']
            ]);

            return $imageData;

        } catch (\Exception $e) {
            Log::error('Error en compresión GD para documento', [
                'document_type' => $documentType,
                'error' => $e->getMessage()
            ]);
            return file_get_contents($imagePath);
        }
    }

    /**
     * Aplicar filtros específicos por tipo de documento
     */
    private function applyDocumentFilters($image, $documentType)
    {
        switch ($documentType) {
            case 'ine':
            case 'pasaporte':
                imagefilter($image, IMG_FILTER_CONTRAST, -20);
                imagefilter($image, IMG_FILTER_BRIGHTNESS, 10);
                break;

            case 'comprobante':
                imagefilter($image, IMG_FILTER_CONTRAST, -15);
                imagefilter($image, IMG_FILTER_BRIGHTNESS, 5);
                break;
        }
    }

    /**
     * Post-procesamiento del texto según el tipo de documento
     */
    private function postProcessText($text, $documentType)
    {
        // Limpiar caracteres problemáticos
        $cleanText = preg_replace('/[^\p{L}\p{N}\s\.\,\:\;\-\/\(\)]/u', ' ', $text);
        $cleanText = preg_replace('/\s+/', ' ', $cleanText);
        $cleanText = trim($cleanText);

        switch ($documentType) {
            case 'ine':
                return $this->postProcessINEText($cleanText);
            case 'pasaporte':
                return $this->postProcessPassportText($cleanText);
            case 'comprobante':
                return $this->postProcessAddressProofText($cleanText);
            default:
                return $cleanText;
        }
    }

    /**
     * Post-procesamiento específico para INE con correcciones avanzadas
     */
    private function postProcessINEText($text)
    {
        // Correcciones OCR específicas para INE
        $corrections = [
            '/INSTITUTO\s+NAC10NAL/i' => 'INSTITUTO NACIONAL',
            '/INSTITUTO\s+NACI0NAL/i' => 'INSTITUTO NACIONAL',
            '/1NSTITUTO/i' => 'INSTITUTO',
            '/CREDENC1AL/i' => 'CREDENCIAL',
            '/CREDENCIAL/i' => 'CREDENCIAL',
            '/EL3CTORAL/i' => 'ELECTORAL',
            '/ELECT0RAL/i' => 'ELECTORAL',
            '/V0TAR/i' => 'VOTAR',
            '/D0MICILIO/i' => 'DOMICILIO',
            '/D0M1CILIO/i' => 'DOMICILIO',
            '/CURP\s*[:]\s*([A-Z0-9]{18})/i' => 'CURP: $1',
            '/CLAVE\s+DE\s+ELECT0R/i' => 'CLAVE DE ELECTOR'
        ];

        foreach ($corrections as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }

        // Corrección específica para CURPs mal leídos
        $text = $this->correctCURPOCRErrors($text);

        return $text;
    }

    /**
     * Corrección avanzada de errores OCR en CURPs
     */
    private function correctCURPOCRErrors($text)
    {
        // Patrones de CURP con errores comunes
        $curpPattern = '/[A-Z0-9]{4}[0-9]{6}[HMX][A-Z0-9]{5}[A-Z0-9]{2}/';

        if (preg_match_all($curpPattern, $text, $matches)) {
            foreach ($matches[0] as $possibleCURP) {
                // Correcciones comunes en CURPs
                $corrected = $possibleCURP;
                $corrected = str_replace(['0', 'O'], ['O', '0'], $corrected); // Alternar entre O y 0
                $corrected = str_replace(['1', 'I'], ['I', '1'], $corrected); // Alternar entre 1 e I
                $corrected = str_replace(['5', 'S'], ['S', '5'], $corrected); // Alternar entre 5 y S

                // Reemplazar en el texto si la corrección es válida
                if ($this->validateCURPStructure($corrected)) {
                    $text = str_replace($possibleCURP, $corrected, $text);
                }
            }
        }

        return $text;
    }

    /**
     * Post-procesamiento para pasaportes
     */
    private function postProcessPassportText($text)
    {
        $corrections = [
            '/PASAP0RTE/i' => 'PASAPORTE',
            '/ESTAD0S/i' => 'ESTADOS',
            '/UN1DOS/i' => 'UNIDOS',
            '/MEX1CANOS/i' => 'MEXICANOS',
            '/PASSF0RT/i' => 'PASSPORT'
        ];

        foreach ($corrections as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }

        return $text;
    }

    /**
     * Post-procesamiento para comprobantes
     */
    private function postProcessAddressProofText($text)
    {
        $corrections = [
            '/C0MPROBANTE/i' => 'COMPROBANTE',
            '/D0MICILIO/i' => 'DOMICILIO',
            '/SERV1CIO/i' => 'SERVICIO',
            '/FECH4/i' => 'FECHA',
            '/TELM3X/i' => 'TELMEX'
        ];

        foreach ($corrections as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }

        return $text;
    }

    /**
     * Router de validación por tipo de documento
     */
    private function validateDocument($text, $documentType)
    {
        switch ($documentType) {
            case 'ine':
                return $this->validateINEEnhanced($text);
            case 'pasaporte':
                return $this->validatePassport($text);
            case 'comprobante':
                return $this->validateAddressProof($text);
            default:
                return $this->validateINEEnhanced($text);
        }
    }

    /**
     * Validación mejorada de INE con CURP completo
     */
    private function validateINEEnhanced($text)
    {
        $text = strtoupper($text);
        $originalText = $text;
        $score = 0;
        $patterns = [];
        $extractedData = [];
        $confidence = 0;

        $criticalPassed = 0;
        $criticalTotal = 2;

        // 1. Instituto Nacional Electoral (CRÍTICO)
        if (preg_match('/INSTITUTO\s+NACIONAL\s+ELECTORAL/i', $text) ||
            preg_match('/INST\.?\s*NAC\.?\s*ELECTORAL/i', $text)) {
            $score += 30;
            $patterns[] = 'INE Institution Name';
            $criticalPassed++;
        }

        // 2. Credencial para votar (CRÍTICO)
        if (preg_match('/CREDENCIAL\s+PARA\s+VOTAR/i', $text)) {
            $score += 25;
            $patterns[] = 'Voting Credential Text';
            $criticalPassed++;
        }

        // 3. CURP válido (CRÍTICO) - MEJORADO
        if (preg_match('/[A-Z]{4}\d{6}[HMX][A-Z0-9]{5}[A-Z0-9]{2}/i', $text, $matches)) {
            $curp = strtoupper($matches[0]);
            if ($this->validateCURPStructure($curp)) {
                $score += 35;
                $patterns[] = 'Valid CURP: ' . $curp;
                $extractedData['curp'] = $curp;
                $criticalPassed++;
            } else {
                // CURP encontrado pero inválido - penalización
                $score -= 10;
                $patterns[] = 'Invalid CURP found: ' . $curp;
            }
        }

        // 4. Clave de elector (CRÍTICO) - MEJORADO
        if (preg_match('/[A-Z]{6}\d{8}[HM]\d{3}/i', $text, $matches)) {
            $voterKey = strtoupper($matches[0]);
            if ($this->validateVoterKey($voterKey)) {
                $score += 20;
                $patterns[] = 'Valid Voter Key: ' . $voterKey;
                $extractedData['voter_key'] = $voterKey;
                $criticalPassed++;
            }
        }

        // Estados mexicanos válidos
        $mexicanStates = [
            'AGUASCALIENTES', 'BAJA CALIFORNIA', 'BAJA CALIFORNIA SUR', 'CAMPECHE',
            'COAHUILA', 'COLIMA', 'CHIAPAS', 'CHIHUAHUA', 'CDMX', 'CIUDAD DE MEXICO',
            'DURANGO', 'GUANAJUATO', 'GUERRERO', 'HIDALGO', 'JALISCO', 'MEXICO',
            'MICHOACAN', 'MORELOS', 'NAYARIT', 'NUEVO LEON', 'OAXACA', 'PUEBLA',
            'QUERETARO', 'QUINTANA ROO', 'SAN LUIS POTOSI', 'SINALOA', 'SONORA',
            'TABASCO', 'TAMAULIPAS', 'TLAXCALA', 'VERACRUZ', 'YUCATAN', 'ZACATECAS'
        ];

        foreach ($mexicanStates as $state) {
            if (strpos($text, $state) !== false) {
                $score += 10;
                $patterns[] = 'Mexican State: ' . $state;
                $extractedData['state'] = $state;
                break;
            }
        }

        // Año de vigencia
        $currentYear = date('Y');
        if (preg_match('/\b(20\d{2})\b/', $text, $matches)) {
            $year = intval($matches[0]);
            if ($year >= 2010 && $year <= $currentYear + 10) {
                $score += 10;
                $patterns[] = 'Valid Year: ' . $year;
                $extractedData['year'] = $year;
            }
        }

        $extractedName = $this->extractNameEnhanced($text);
        if ($extractedName) {
            $score += 10;
            $patterns[] = 'Name Extracted: ' . $extractedName;
            $extractedData['name'] = $extractedName;
        }

        $confidence = min(100, $score);
        $criticalPercentage = ($criticalPassed / $criticalTotal) * 100;

        return [
            'is_valid' => $criticalPassed >= 2 && $confidence >= 40,
            'confidence' => $confidence,
            'critical_elements_passed' => $criticalPassed,
            'critical_elements_total' => $criticalTotal,
            'critical_percentage' => $criticalPercentage,
            'patterns' => $patterns,
            'extracted_name' => $extractedName,
            'extracted_data' => $extractedData,
            'text_length' => strlen($originalText)
        ];
    }

    /**
     * Validación completa de CURP con algoritmo oficial mexicano
     */
    private function validateCURPStructure($curp)
    {
        if (strlen($curp) !== 18) {
            return false;
        }

        // Validar formato básico
        if (!preg_match('/^[A-Z]{4}[0-9]{6}[HMX][A-Z0-9]{3}[A-Z0-9]{2}$/', $curp)) {
            return false;
        }

        // Validar fecha de nacimiento
        if (!$this->validateCURPDate($curp)) {
            return false;
        }

        // Validar código de estado
        if (!$this->validateCURPStateCode($curp)) {
            return false;
        }

        // Validar dígito verificador
        if (!$this->validateCURPCheckDigit($curp)) {
            return false;
        }

        // Validar que no sea un patrón sospechoso
        if ($this->isSuspiciousCURP($curp)) {
            return false;
        }

        return true;
    }

    /**
     * Validar fecha de nacimiento en CURP
     */
    private function validateCURPDate($curp)
    {
        $year = substr($curp, 4, 2);
        $month = substr($curp, 6, 2);
        $day = substr($curp, 8, 2);

        // Determinar siglo
        $currentYear = date('Y');
        $fullYear = ($year <= ($currentYear - 2000)) ? 2000 + intval($year) : 1900 + intval($year);

        if ($fullYear < 1900 || $fullYear > $currentYear) {
            return false;
        }

        if ($month < 1 || $month > 12) {
            return false;
        }

        if ($day < 1 || $day > 31) {
            return false;
        }

        if (!checkdate(intval($month), intval($day), $fullYear)) {
            return false;
        }

        $birthDate = new \DateTime("$fullYear-$month-$day");
        $today = new \DateTime();
        if ($birthDate > $today) {
            return false;
        }

        $maxAge = new \DateTime();
        $maxAge->sub(new \DateInterval('P120Y'));
        if ($birthDate < $maxAge) {
            return false;
        }

        return true;
    }

    /**
     * Validar código de estado mexicano en CURP
     */
    private function validateCURPStateCode($curp)
    {
        $stateCode = substr($curp, 11, 2);

        $validStateCodes = [
            'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG',
            'GT', 'GR', 'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC',
            'PL', 'QT', 'QR', 'SP', 'SL', 'SR', 'TC', 'TS', 'TL', 'VZ',
            'YN', 'ZS', 'NE'
        ];

        return in_array($stateCode, $validStateCodes);
    }

    /**
     * Algoritmo oficial de dígito verificador CURP
     */
    private function validateCURPCheckDigit($curp)
    {
        $checkDigit = substr($curp, 17, 1);
        $curpWithoutCheck = substr($curp, 0, 17);

        $values = [
            '0' => 0, '1' => 1, '2' => 2, '3' => 3, '4' => 4, '5' => 5,
            '6' => 6, '7' => 7, '8' => 8, '9' => 9, 'A' => 10, 'B' => 11,
            'C' => 12, 'D' => 13, 'E' => 14, 'F' => 15, 'G' => 16, 'H' => 17,
            'I' => 18, 'J' => 19, 'K' => 20, 'L' => 21, 'M' => 22, 'N' => 23,
            'O' => 24, 'P' => 25, 'Q' => 26, 'R' => 27, 'S' => 28, 'T' => 29,
            'U' => 30, 'V' => 31, 'W' => 32, 'X' => 33, 'Y' => 34, 'Z' => 35
        ];

        $sum = 0;
        for ($i = 0; $i < 17; $i++) {
            $char = $curpWithoutCheck[$i];
            $sum += $values[$char] * (18 - $i);
        }

        $remainder = $sum % 10;
        $calculatedDigit = ($remainder == 0) ? 0 : (10 - $remainder);

        return $calculatedDigit == intval($checkDigit);
    }

    /**
     * Detectar patrones sospechosos en CURP
     */
    private function isSuspiciousCURP($curp)
    {
        // Patrones que sugieren CURPs generados automáticamente o falsos
        $suspiciousPatterns = [
            '/^[A-Z]{4}000101/', // Fecha 01/01/00 (común en generadores)
            '/^XXXX/', // Placeholders
            '/^[A-Z]{4}121212/', // Fecha repetitiva
            '/^[A-Z]{4}111111/', // Fecha repetitiva
            '/AAAA|BBBB|CCCC/', // Caracteres repetidos
        ];

        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $curp)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validar clave de elector mejorada
     */
    private function validateVoterKey($voterKey)
    {
        if (strlen($voterKey) !== 18) {
            return false;
        }

        // Formato: 6 consonantes + 8 dígitos + H/M + 3 dígitos
        if (!preg_match('/^[BCDFGHJKLMNPQRSTVWXYZ]{6}[0-9]{8}[HM][0-9]{3}$/', $voterKey)) {
            return false;
        }

        // Validar fecha en posiciones 6-13
        $year = substr($voterKey, 6, 4);
        $month = substr($voterKey, 10, 2);
        $day = substr($voterKey, 12, 2);

        if (!checkdate(intval($month), intval($day), intval($year))) {
            return false;
        }

        return true;
    }

    /**
     * Validación de Pasaporte mejorada
     */
    private function validatePassport($text)
    {
        $text = strtoupper($text);
        $score = 0;
        $patterns = [];
        $extractedData = [];

        // Elementos críticos para pasaporte mexicano
        if (preg_match('/PASAPORTE|PASSPORT/i', $text)) {
            $score += 25;
            $patterns[] = 'Passport Header';
        }

        if (preg_match('/ESTADOS\s+UNIDOS\s+MEXICANOS/i', $text)) {
            $score += 30;
            $patterns[] = 'Mexican Country';
        }

        if (preg_match('/MEXICO|MEX/i', $text)) {
            $score += 15;
            $patterns[] = 'Country Code';
        }

        // Número de pasaporte mexicano (G + 8 dígitos)
        if (preg_match('/[GN]\d{8}/i', $text, $matches)) {
            $score += 25;
            $patterns[] = 'Mexican Passport Number: ' . $matches[0];
            $extractedData['passport_number'] = $matches[0];
        }

        // Fechas de emisión/vencimiento
        if (preg_match('/\d{2}[\/\-]\d{2}[\/\-]\d{4}/', $text)) {
            $score += 15;
            $patterns[] = 'Date Found';
        }

       // Verificar que no contenga elementos de INE
        if (strpos($text, 'CREDENCIAL PARA VOTAR') !== false ||
            strpos($text, 'INSTITUTO NACIONAL ELECTORAL') !== false) {
            $score -= 50; // Penalización severa por contaminación
            $patterns[] = 'Document Contamination: INE elements found';
        }

        return [
            'is_valid' => $score >= 65,
            'confidence' => min(100, $score),
            'patterns' => $patterns,
            'extracted_data' => $extractedData
        ];
    }

    /**
     * Validación de Comprobante de Domicilio mejorada
     */
    private function validateAddressProof($text)
    {
        $text = strtoupper($text);
        $score = 0;
        $patterns = [];
        $extractedData = [];

        // Empresas de servicios válidas expandidas
        $validServices = [
            'CFE', 'COMISION FEDERAL DE ELECTRICIDAD',
            'TELMEX', 'TELCEL', 'MOVISTAR', 'AT&T',
            'IZZI', 'TOTALPLAY', 'MEGACABLE', 'AXTEL',
            'DISH', 'SKY', 'UNEFON', 'VIRGIN MOBILE',
            'AGUAKAN', 'SAPAC', 'SIAPA', 'SADM', // Agua
            'GAS NATURAL', 'GAS LP', 'NATURGY'
        ];

        $serviceFound = false;
        foreach ($validServices as $service) {
            if (strpos($text, $service) !== false) {
                $score += 30;
                $patterns[] = "Service Company: {$service}";
                $extractedData['service'] = $service;
                $serviceFound = true;
                break;
            }
        }

        if (!$serviceFound) {
            return [
                'is_valid' => false,
                'confidence' => 0,
                'patterns' => ['No valid service company found'],
                'extracted_data' => []
            ];
        }

        // Elementos de dirección mexicana
        $addressPatterns = [
            'CALLE', 'AVENIDA', 'AV.', 'BOULEVARD', 'BLVD.',
            'PRIVADA', 'CERRADA', 'ANDADOR', 'CALLEJON',
            'COLONIA', 'COL.', 'FRACCIONAMIENTO', 'FRACC.'
        ];

        foreach ($addressPatterns as $pattern) {
            if (strpos($text, $pattern) !== false) {
                $score += 15;
                $patterns[] = 'Address Element: ' . $pattern;
                break;
            }
        }

        // Código postal mexicano (5 dígitos)
        if (preg_match('/\bCP\s*(\d{5})\b/i', $text, $matches) ||
            preg_match('/\b(\d{5})\b/', $text, $matches)) {
            $postalCode = $matches[1];
            if ($this->isValidMexicanPostalCode($postalCode)) {
                $score += 20;
                $patterns[] = 'Valid Postal Code: ' . $postalCode;
                $extractedData['postal_code'] = $postalCode;
            }
        }

        // Fecha reciente (últimos 4 meses)
        $currentYear = date('Y');
        $currentMonth = date('m');

        if (preg_match('/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/', $text, $matches)) {
            $day = intval($matches[1]);
            $month = intval($matches[2]);
            $year = intval($matches[3]);

            if ($year >= $currentYear - 1 && $year <= $currentYear) {
                $monthsAgo = ($currentYear - $year) * 12 + ($currentMonth - $month);
                if ($monthsAgo <= 4) {
                    $score += 25;
                    $patterns[] = 'Recent Date Found';
                    $extractedData['bill_date'] = $matches[0];
                }
            }
        }

        // Monto o consumo
        if (preg_match('/\$[\d,]+\.?\d*/i', $text)) {
            $score += 10;
            $patterns[] = 'Amount Found';
        }

        // Verificar que no contenga elementos de INE/Pasaporte
        $forbiddenElements = [
            'INSTITUTO NACIONAL ELECTORAL', 'CREDENCIAL PARA VOTAR',
            'PASAPORTE', 'ESTADOS UNIDOS MEXICANOS', 'CURP'
        ];

        foreach ($forbiddenElements as $element) {
            if (strpos($text, $element) !== false) {
                $score -= 30;
                $patterns[] = 'Contamination: ' . $element . ' found';
            }
        }

        return [
            'is_valid' => $serviceFound && $score >= 60,
            'confidence' => min(100, max(0, $score)),
            'patterns' => $patterns,
            'extracted_data' => $extractedData
        ];
    }

    /**
     * Validar código postal mexicano
     */
    private function isValidMexicanPostalCode($postalCode)
    {
        // Códigos postales mexicanos van de 01000 a 99999
        $code = intval($postalCode);
        return $code >= 1000 && $code <= 99999;
    }

    /**
     * Extracción mejorada de nombres
     */
    private function extractNameEnhanced($text)
    {
        // Patrones mejorados para nombres mexicanos
        $patterns = [
            '/NOMBRE[\s:]*([A-ZÁÉÍÓÚÑÜ\s]{3,50})/i',
            '/APELLIDO\s+PATERNO[\s:]*([A-ZÁÉÍÓÚÑÜ\s]{2,30})/i',
            '/APELLIDO\s+MATERNO[\s:]*([A-ZÁÉÍÓÚÑÜ\s]{2,30})/i'
        ];

        $nameparts = [];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                $nameparts[] = trim($matches[1]);
            }
        }

        if (!empty($nameparts)) {
            return implode(' ', $nameparts);
        }

        // Fallback: buscar líneas que parezcan nombres
        $lines = explode("\n", $text);
        foreach ($lines as $line) {
            $cleanLine = trim($line);
            // Buscar líneas que tengan características de nombres mexicanos
            if (preg_match('/^[A-ZÁÉÍÓÚÑÜ\s]{8,60}$/', $cleanLine) &&
                !preg_match('/\b(INSTITUTO|NACIONAL|ELECTORAL|CREDENCIAL|VOTAR|CFE|TELMEX)\b/', $cleanLine)) {

                // Verificar que no sea solo apellidos comunes repetidos
                $commonWords = ['DE', 'LA', 'DEL', 'LOS', 'LAS', 'Y'];
                $words = explode(' ', $cleanLine);
                $validWords = array_filter($words, function($word) use ($commonWords) {
                    return !in_array($word, $commonWords) && strlen($word) > 2;
                });

                if (count($validWords) >= 2 && count($validWords) <= 6) {
                    return $cleanLine;
                }
            }
        }

        return null;
    }

    /**
     * Test de conexión mejorado
     */
    public function testConnection()
    {
        try {
            $response = $this->client->get($this->baseUrl, [
                'query' => [
                    'apikey' => $this->apiKey,
                    'url' => 'https://httpbin.org/image/jpeg',
                    'language' => 'spa',
                    'OCREngine' => '2'
                ],
                'timeout' => 10
            ]);

            $result = json_decode($response->getBody(), true);

            Log::info('Test de conexión OCR', [
                'success' => isset($result['OCRExitCode']),
                'exit_code' => $result['OCRExitCode'] ?? 'N/A'
            ]);

            return [
                'success' => isset($result['OCRExitCode']),
                'result' => $result
            ];

        } catch (\Exception $e) {
            Log::error('Test de conexión OCR falló', [
                'error' => $e->getMessage()
            ]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}