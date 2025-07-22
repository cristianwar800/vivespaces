<?php
// app/Http/Controllers/EmailVerificationController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\EmailVerification;
use App\Models\User;
use App\Mail\EmailVerificationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth; // 🆕 ESTA LÍNEA FALTABA


class EmailVerificationController extends Controller
{
    /**
     * Enviar código de verificación por email
     */
    public function sendVerificationCode(Request $request)
    {
        // Validar entrada
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255'
        ], [
            'email.required' => 'El email es requerido',
            'email.email' => 'El formato del email no es válido',
            'email.max' => 'El email no puede tener más de 255 caracteres'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $email = $request->email;

            // Buscar si el usuario ya existe
            $user = User::where('email', $email)->first();

            // Verificar si el email ya está verificado
            if ($user && $user->hasVerifiedEmail()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este email ya está verificado'
                ], 400);
            }

            // Crear código de verificación
            $verification = EmailVerification::createForEmail($email, $user?->id);

            // Obtener nombre del usuario si existe
            $userName = null;
                if ($user) {
                    $userName = $user->name . ' ' . $user->last_name;
                } else {
                    $pendingRegistration = session('pending_registration');
                    if ($pendingRegistration && $pendingRegistration['email'] === $email) {
                        $userName = $pendingRegistration['name'] . ' ' . $pendingRegistration['last_name'];
                    }
        }

            // Enviar email
            Mail::to($email)->send(new EmailVerificationMail($verification->code, $userName));

            // Log para debugging
            Log::info('Código de verificación enviado', [
                'email' => $email,
                'code' => $verification->code,
                'user_exists' => $user ? true : false
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Código enviado correctamente',
                'data' => [
                    'user_exists' => $user ? true : false,
                    'expires_in_minutes' => 10
                ]
            ]);

        } catch (\Exception $e) {
            // Log del error
            Log::error('Error enviando código de verificación', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Verificar código de verificación
     */
    public function verifyCode(Request $request)
    {
        // Validar entrada
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'code' => 'required|string|size:6|regex:/^[0-9]{6}$/'
        ], [
            'email.required' => 'El email es requerido',
            'email.email' => 'El formato del email no es válido',
            'code.required' => 'El código es requerido',
            'code.size' => 'El código debe tener exactamente 6 dígitos',
            'code.regex' => 'El código debe contener solo números'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $email = $request->email;
            $code = $request->code;

            // Buscar código válido
            $verification = EmailVerification::findValidCode($email, $code);

            if (!$verification) {
                // Verificar si existe pero expiró
                $expiredVerification = EmailVerification::where('email', $email)
                                                      ->where('code', $code)
                                                      ->first();

                if ($expiredVerification && $expiredVerification->isExpired()) {
                    $expiredVerification->delete();
                    return response()->json([
                        'success' => false,
                        'message' => 'El código ha expirado. Solicita uno nuevo.'
                    ], 400);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Código incorrecto'
                ], 400);
            }

            // 🆕 VERIFICAR SI HAY UN REGISTRO PENDIENTE
            $pendingRegistration = session('pending_registration');

            if ($pendingRegistration && $pendingRegistration['email'] === $email) {
                // 🆕 CREAR EL USUARIO AHORA QUE SE VERIFICÓ EL EMAIL
                $user = User::create(array_merge($pendingRegistration, [
                    'email_verified_at' => now()
                ]));

                // Limpiar datos de sesión
                session()->forget('pending_registration');

                // Login automático
                Auth::login($user);

                Log::info('Usuario creado después de verificación', [
                    'user_id' => $user->id,
                    'email' => $email
                ]);

                // Eliminar código usado
                $verification->delete();

                return response()->json([
                    'success' => true,
                    'message' => 'Email verificado y cuenta creada exitosamente',
                    'data' => [
                        'user_created' => true,
                        'user_id' => $user->id,
                        'redirect' => '/dashboard'
                    ]
                ]);
            }

            // Si no hay registro pendiente, verificar usuario existente
            $user = User::where('email', $email)->first();
            if ($user && !$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
                Log::info('Usuario existente verificado', ['user_id' => $user->id, 'email' => $email]);
            }

            // Eliminar código usado
            $verification->delete();

            Log::info('Código verificado exitosamente', [
                'email' => $email,
                'user_id' => $user?->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email verificado correctamente',
                'data' => [
                    'user_verified' => $user ? true : false,
                    'verified_at' => now()->toISOString(),
                    'redirect' => $user ? '/dashboard' : '/'
                ]
            ]);

        } catch (\Exception $e) {
            // Log del error
            Log::error('Error verificando código', [
                'email' => $request->email,
                'code' => $request->code,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener estado de verificación de un email
     */
    public function getVerificationStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();
        $pendingVerification = EmailVerification::where('email', $request->email)
                                               ->where('expires_at', '>', now())
                                               ->exists();

        return response()->json([
            'success' => true,
            'data' => [
                'email_verified' => $user ? $user->hasVerifiedEmail() : false,
                'user_exists' => $user ? true : false,
                'pending_verification' => $pendingVerification
            ]
        ]);
    }

    /**
     * Limpiar códigos expirados (método para cron job)
     */
    public function cleanExpiredCodes()
    {
        $deletedCount = EmailVerification::cleanExpiredCodes();

        Log::info('Códigos expirados limpiados', ['count' => $deletedCount]);

        return response()->json([
            'success' => true,
            'message' => "Se eliminaron {$deletedCount} códigos expirados"
        ]);
    }
}
