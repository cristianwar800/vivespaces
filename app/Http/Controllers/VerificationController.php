<?php
namespace App\Http\Controllers;

use App\Services\OCRService;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    private $ocrService;

    public function __construct(OCRService $ocrService)
    {
        $this->ocrService = $ocrService;
    }

    public function verify(Request $request)
    {
        $request->validate([
            'ine_image' => 'required|image|max:5120',
            'selfie' => 'required|image|max:5120',
        ]);

        try {
            // 1. Procesar INE con OCR (en memoria, sin guardar)
            $ocrResult = $this->ocrService->processImage($request->file('ine_image'));

            if (!$ocrResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo leer la INE',
                    'step' => 'ocr_failed'
                ]);
            }

            if (!$ocrResult['validation']['is_valid']) {
                return response()->json([
                    'success' => false,
                    'message' => 'El documento no parece ser una INE válida',
                    'step' => 'invalid_ine',
                    'details' => $ocrResult['validation']
                ]);
            }

            // 2. TODO: Aquí irá CompreFace para verificar rostro
            $faceMatch = true; // Por ahora simulamos que pasa

            if (!$faceMatch) {
                return response()->json([
                    'success' => false,
                    'message' => 'El rostro no coincide con la INE',
                    'step' => 'face_mismatch'
                ]);
            }

            // 3. ✅ VERIFICACIÓN EXITOSA
            auth()->user()->update([
                'is_identity_verified' => true,
                'verified_at' => now(),
                'verification_method' => 'ine_facial'
            ]);

            return response()->json([
                'success' => true,
                'message' => '¡Identidad verificada exitosamente!',
                'verified_name' => $ocrResult['validation']['extracted_name'],
                'privacy_notice' => 'Tus datos biométricos fueron procesados únicamente en memoria y eliminados inmediatamente.'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error verificación: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error interno del sistema',
                'step' => 'system_error'
            ], 500);
        }
    }

    public function testOCR(Request $request)
    {
        $request->validate(['image' => 'required|image|max:5120']);

        $result = $this->ocrService->processImage($request->file('image'));

        return response()->json([
            'success' => $result['success'],
            'data' => $result
        ]);
    }
}
