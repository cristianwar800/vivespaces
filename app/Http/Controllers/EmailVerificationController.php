<?php
// app/Http/Controllers/EmailVerificationController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\EmailVerification;
use App\Models\PasswordReset;
use App\Models\User;
use App\Mail\EmailVerificationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;


class EmailVerificationController extends Controller
{
    // ==========================================
    // 📧 EMAIL VERIFICATION METHODS
    // ==========================================

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

                Log::info('✅ Usuario creado después de verificación', [
                    'user_id' => $user->id,
                    'email' => $email,
                    'role' => $user->role
                ]);

                // Eliminar código usado
                $verification->delete();

                // 🎯 REDIRIGIR A PROFILE
                return response()->json([
                    'success' => true,
                    'message' => '¡Email verificado y cuenta creada exitosamente!',
                    'data' => [
                        'user_created' => true,
                        'user_id' => $user->id,
                        'redirect' => '/profile'
                    ]
                ]);
            }

            // Si no hay registro pendiente, verificar usuario existente
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            if (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
                Log::info('✅ Usuario existente verificado', [
                    'user_id' => $user->id,
                    'email' => $email
                ]);
            }

            // Eliminar código usado
            $verification->delete();

            Log::info('✅ Código verificado exitosamente', [
                'email' => $email,
                'user_id' => $user->id
            ]);

            // 🎯 REDIRIGIR A PROFILE
            return response()->json([
                'success' => true,
                'message' => '¡Email verificado correctamente!',
                'data' => [
                    'user_verified' => true,
                    'verified_at' => now()->toISOString(),
                    'redirect' => '/profile'
                ]
            ]);

        } catch (\Exception $e) {
            // Log del error
            Log::error('❌ Error verificando código', [
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

        Log::info('🧹 Códigos de verificación expirados limpiados', ['count' => $deletedCount]);

        return response()->json([
            'success' => true,
            'message' => "Se eliminaron {$deletedCount} códigos expirados"
        ]);
    }

    // ==========================================
    // 🔑 PASSWORD RESET METHODS
    // ==========================================

    /**
     * Enviar código de recuperación de contraseña
     */
    public function sendPasswordResetCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email'
        ], [
            'email.required' => 'El email es requerido',
            'email.email' => 'El formato del email no es válido',
            'email.exists' => 'No existe una cuenta con este email'
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
            $user = User::where('email', $email)->first();

            // Crear código de recuperación
            $passwordReset = PasswordReset::createForEmail($email);

            // 🔥 ENVIAR EMAIL CON TERCER PARÁMETRO
            Mail::to($email)->send(new EmailVerificationMail(
                $passwordReset->code,
                $user->name . ' ' . $user->last_name,
                'password_reset' // 👈 ÚNICO CAMBIO NECESARIO
            ));

            Log::info('🔑 Código de recuperación enviado', [
                'email' => $email,
                'code' => $passwordReset->code
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Código de recuperación enviado a tu email',
                'data' => [
                    'expires_in_minutes' => 10
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Error enviando código de recuperación', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error enviando código de recuperación'
            ], 500);
        }
    }

    /**
     * Verificar código de recuperación
     */
    public function verifyPasswordResetCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6|regex:/^[0-9]{6}$/'
        ], [
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
            $passwordReset = PasswordReset::findValidCode($email, $code);

            if (!$passwordReset) {
                // Verificar si existe pero expiró
                $expiredReset = PasswordReset::where('email', $email)
                    ->where('code', $code)
                    ->first();

                if ($expiredReset) {
                    if ($expiredReset->isExpired()) {
                        $expiredReset->delete();
                        return response()->json([
                            'success' => false,
                            'message' => 'El código ha expirado. Solicita uno nuevo.'
                        ], 400);
                    }
                    
                    // Incrementar intentos fallidos
                    $expiredReset->incrementAttempts();
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Código incorrecto'
                ], 400);
            }

            Log::info('✅ Código de recuperación verificado', [
                'email' => $email
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Código verificado correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Error verificando código de recuperación', [
                'email' => $request->email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error verificando código'
            ], 500);
        }
    }

    /**
     * Restablecer contraseña
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed'
        ], [
            'password.min' => 'La contraseña debe tener al menos 8 caracteres',
            'password.confirmed' => 'Las contraseñas no coinciden'
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

            // Verificar código
            $passwordReset = PasswordReset::findValidCode($email, $code);

            if (!$passwordReset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Código inválido o expirado'
                ], 400);
            }

            // Buscar usuario
            $user = User::where('email', $email)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ], 404);
            }

            // Actualizar contraseña
            $user->password = Hash::make($request->password);
            $user->save();

            // Eliminar código usado
            $passwordReset->delete();

            Log::info('✅ Contraseña restablecida', [
                'user_id' => $user->id,
                'email' => $email
            ]);

            return response()->json([
                'success' => true,
                'message' => '¡Contraseña restablecida exitosamente!',
                'data' => [
                    'redirect' => '/login'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Error restableciendo contraseña', [
                'email' => $request->email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al restablecer contraseña'
            ], 500);
        }
    }

    /**
     * Limpiar códigos de password reset expirados
     */
    public function cleanExpiredPasswordResets()
    {
        $deletedCount = PasswordReset::cleanExpired();

        Log::info('🧹 Códigos de recuperación expirados limpiados', ['count' => $deletedCount]);

        return response()->json([
            'success' => true,
            'message' => "Se eliminaron {$deletedCount} códigos de recuperación expirados"
        ]);
    }
}