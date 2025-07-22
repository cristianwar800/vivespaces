<?php
namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class OCRService
{
    private $client;
    private $apiKey;
    private $baseUrl;

    public function __construct()
    {
        $this->client = new Client();
        $this->apiKey = config('services.ocr_space.api_key');
        $this->baseUrl = config('services.ocr_space.base_url');
    }

    public function processImage($imageFile)
    {
        try {
            // Optimizar imagen en memoria
            $optimizedImage = $this->optimizeImage($imageFile);

            Log::info('Enviando solicitud a OCR.space', [
                'api_key_length' => strlen($this->apiKey),
                'base_url' => $this->baseUrl,
                'image_size' => strlen($optimizedImage)
            ]);

            $response = $this->client->post($this->baseUrl, [
                'form_params' => [
                    'apikey' => $this->apiKey,
                    'base64Image' => 'data:image/jpeg;base64,' . base64_encode($optimizedImage),
                    'language' => 'spa',
                    'isOverlayRequired' => 'false',        // ✅ String en lugar de boolean
                    'detectOrientation' => 'true',         // ✅ String en lugar de boolean
                    'scale' => 'true',                     // ✅ String en lugar de boolean
                    'OCREngine' => '2',                    // ✅ String en lugar de número
                ],
                'timeout' => 30
            ]);

            $result = json_decode($response->getBody(), true);

            Log::info('Respuesta de OCR.space', [
                'exit_code' => $result['OCRExitCode'] ?? 'N/A',
                'has_error' => $result['IsErroredOnProcessing'] ?? false
            ]);

            if (isset($result['OCRExitCode']) && $result['OCRExitCode'] === 1) {
                $text = $result['ParsedResults'][0]['ParsedText'];

                // 🔍 Log temporal para ver qué texto se extrajo
                Log::info('Texto extraído por OCR', [
                    'text_length' => strlen($text),
                    'text_preview' => substr($text, 0, 200),
                    'full_text' => $text
                ]);

                return [
                    'success' => true,
                    'text' => $text,
                    'validation' => $this->validateINE($text)
                ];
            }

            // Manejar errores de manera más limpia
            $errorMessages = $result['ErrorMessage'] ?? ['Unknown error'];
            if (is_array($errorMessages)) {
                $errorString = implode(', ', $errorMessages);
            } else {
                $errorString = $errorMessages;
            }

            Log::error('OCR falló', [
                'exit_code' => $result['OCRExitCode'] ?? 'N/A',
                'error_message' => $errorString,
            ]);

            return ['success' => false, 'error' => 'OCR failed: ' . $errorString];

        } catch (\Exception $e) {
            Log::error('OCR Error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function testConnection()
    {
        try {
            $response = $this->client->get('https://api.ocr.space/parse/image', [
                'query' => [
                    'apikey' => $this->apiKey,
                    'url' => 'https://i.imgur.com/example.jpg', // URL de prueba
                    'language' => 'spa'
                ]
            ]);

            $result = json_decode($response->getBody(), true);
            Log::info('Test connection result', $result);

            return $result;
        } catch (\Exception $e) {
            Log::error('Test connection failed: ' . $e->getMessage());
            return false;
        }
    }

    private function optimizeImage($imageFile)
    {
        try {
            // Leer imagen original
            $imageData = file_get_contents($imageFile->getRealPath());
            $fileSize = strlen($imageData);

            Log::info('Imagen original', [
                'size' => $fileSize . ' bytes',
                'size_mb' => round($fileSize / (1024 * 1024), 2) . ' MB'
            ]);

            // Si es menor a 5MB, usar tal como está
            if ($fileSize <= 5 * 1024 * 1024) {
                return $imageData;
            }

            // Si es muy grande, intentar optimización básica con GD
            if (extension_loaded('gd')) {
                return $this->compressWithGD($imageFile->getRealPath());
            }

            // Si no hay GD, usar imagen original
            Log::warning('Imagen grande pero GD no disponible, usando original');
            return $imageData;

        } catch (\Exception $e) {
            Log::error('Error optimizando imagen: ' . $e->getMessage());
            // En caso de error, usar imagen original
            return file_get_contents($imageFile->getRealPath());
        }
    }

    private function compressWithGD($imagePath)
    {
        try {
            // Detectar tipo de imagen
            $imageInfo = getimagesize($imagePath);
            if (!$imageInfo) {
                throw new \Exception('No se pudo leer información de la imagen');
            }

            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $type = $imageInfo[2];

            // Crear imagen desde archivo
            switch ($type) {
                case IMAGETYPE_JPEG:
                    $image = imagecreatefromjpeg($imagePath);
                    break;
                case IMAGETYPE_PNG:
                    $image = imagecreatefrompng($imagePath);
                    break;
                case IMAGETYPE_GIF:
                    $image = imagecreatefromgif($imagePath);
                    break;
                default:
                    throw new \Exception('Tipo de imagen no soportado');
            }

            if (!$image) {
                throw new \Exception('No se pudo crear imagen GD');
            }

            // Redimensionar si es muy grande (máximo 1500px)
            $maxWidth = 1500;
            $maxHeight = 1500;

            if ($width > $maxWidth || $height > $maxHeight) {
                $ratio = min($maxWidth / $width, $maxHeight / $height);
                $newWidth = round($width * $ratio);
                $newHeight = round($height * $ratio);

                $newImage = imagecreatetruecolor($newWidth, $newHeight);

                // Preservar transparencia para PNG
                if ($type == IMAGETYPE_PNG) {
                    imagealphablending($newImage, false);
                    imagesavealpha($newImage, true);
                }

                imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $newImage;
            }

            // Convertir a JPEG con compresión
            ob_start();
            imagejpeg($image, null, 85); // 85% calidad
            $imageData = ob_get_contents();
            ob_end_clean();

            imagedestroy($image);

            Log::info('Imagen optimizada con GD', [
                'original_size' => filesize($imagePath) . ' bytes',
                'optimized_size' => strlen($imageData) . ' bytes'
            ]);

            return $imageData;

        } catch (\Exception $e) {
            Log::error('Error en compresión GD: ' . $e->getMessage());
            // Si falla la compresión, usar imagen original
            return file_get_contents($imagePath);
        }
    }

    private function validateINE($text)
    {
        $text = strtoupper($text);
        $score = 0;
        $patterns = [];

        // Buscar patrones de INE
        if (preg_match('/INSTITUTO\s+NACIONAL\s+ELECTORAL/i', $text)) {
            $score += 30;
            $patterns[] = 'INE Header';
        }

        if (preg_match('/CREDENCIAL\s+PARA\s+VOTAR/i', $text)) {
            $score += 25;
            $patterns[] = 'Credential Title';
        }

        if (preg_match('/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/i', $text, $matches)) {
            $score += 35;
            $patterns[] = 'CURP Found: ' . $matches[0];
        }

        $name = $this->extractName($text);
        if ($name) {
            $score += 10;
            $patterns[] = 'Name: ' . $name;
        }

        return [
            'is_valid' => $score >= 60,
            'confidence' => $score,
            'patterns' => $patterns,
            'extracted_name' => $name
        ];
    }

    private function extractName($text)
    {
        // Buscar nombre en diferentes patrones
        if (preg_match('/NOMBRE\s*:?\s*([A-ZÁÉÍÓÚÑÜ\s]{3,50})/i', $text, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }
}
