<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;
use Exception;
use Illuminate\Support\Facades\Log;

class GoogleAuthController extends Controller
{
    /**
     * Redirigir al usuario a Google
     */
    public function redirectToGoogle()
    {
        try {
            Log::info('🔵 GOOGLE AUTH - Iniciando redirección a Google', [
                'app_url' => config('app.url'),
                'google_client_id' => config('services.google.client_id'),
                'google_redirect' => config('services.google.redirect'),
                'session_domain' => config('session.domain'),
                'session_secure' => config('session.secure'),
                'session_same_site' => config('session.same_site'),
            ]);

            return Socialite::driver('google')->redirect();
        } catch (Exception $e) {
            Log::error('❌ GOOGLE AUTH - Error redirigiendo a Google', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('login')
                           ->with('error', 'Error al conectar con Google. Verifica tu configuración.');
        }
    }

    /**
     * Manejar el callback de Google
     */
    

            /**
 * Manejar el callback de Google
 */
    public function handleGoogleCallback()
    {
        try {
            Log::info('🟢 GOOGLE CALLBACK - Recibiendo callback de Google', [
                'request_url' => request()->fullUrl(),
                'request_method' => request()->method(),
                'has_code' => request()->has('code'),
                'has_error' => request()->has('error'),
                'error_param' => request()->get('error'),
                'session_id' => session()->getId(),
                'headers' => request()->headers->all(),
            ]);

            // Obtener usuario de Google
            $googleUser = Socialite::driver('google')->user();

            Log::info('✅ GOOGLE CALLBACK - Usuario de Google obtenido exitosamente', [
                'email' => $googleUser->email,
                'name' => $googleUser->name,
                'google_id' => $googleUser->id,
                'avatar' => $googleUser->avatar,
            ]);
            
            // 🆕 DETERMINAR EL ROL DEL USUARIO
            $role = $this->determineUserRole($googleUser->email);
            
            // Buscar usuario por email o google_id
            $user = User::where('email', $googleUser->email)
                    ->orWhere('google_id', $googleUser->id)
                    ->first();
            
            if ($user) {
                // Usuario existe - actualizar google_id y avatar si no los tiene
                Log::info('👤 GOOGLE CALLBACK - Usuario encontrado en BD', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'user_role' => $user->role,
                    'has_google_id' => !empty($user->google_id)
                ]);

                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->id,
                        'avatar' => $googleUser->avatar,
                    ]);
                    Log::info('✏️ GOOGLE CALLBACK - Google ID y avatar actualizados', ['user_id' => $user->id]);
                }

                // 🆕 ACTUALIZAR ROL SI ES ADMIN (solo si aún no es admin)
                if ($role === 'admin' && $user->role !== 'admin') {
                    $user->update(['role' => 'admin']);
                    Log::info('⭐ GOOGLE CALLBACK - Usuario promovido a admin', ['user_id' => $user->id, 'email' => $user->email]);
                }

            } else {
                // Usuario NO existe - crear nuevo
                Log::info('🆕 GOOGLE CALLBACK - Creando nuevo usuario', [
                    'email' => $googleUser->email,
                    'name' => $googleUser->name,
                    'role' => $role
                ]);

                $nameParts = explode(' ', $googleUser->name, 2);

                $user = User::create([
                    'name' => $nameParts[0] ?? $googleUser->name,
                    'last_name' => $nameParts[1] ?? '',
                    'email' => $googleUser->email,
                    'google_id' => $googleUser->id,
                    'avatar' => $googleUser->avatar,
                    'email_verified_at' => now(), // Google ya verificó el email
                    'password' => Hash::make(Str::random(32)), // Password random
                    'role' => $role, // 🆕 ASIGNAR ROL AUTOMÁTICAMENTE
                    'is_active' => true,
                    'country' => 'MX',
                ]);

                Log::info('✅ GOOGLE CALLBACK - Usuario creado exitosamente', [
                    'user_id' => $user->id,
                    'role' => $user->role,
                    'email' => $user->email
                ]);
            }

            // Login automático
            Auth::login($user, true);

            Log::info('🔓 GOOGLE CALLBACK - Login exitoso, sesión creada', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_role' => $user->role,
                'session_id' => session()->getId(),
                'auth_check' => Auth::check(),
                'auth_id' => Auth::id(),
            ]);

            // Redirigir a welcome
            Log::info('🔄 GOOGLE CALLBACK - Redirigiendo a welcome', [
                'redirect_route' => route('welcome'),
                'user_id' => $user->id
            ]);

            return redirect()->route('welcome');
            
        } catch (Exception $e) {
            Log::error('❌ GOOGLE CALLBACK - Error fatal en callback', [
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'request_url' => request()->fullUrl(),
                'has_code' => request()->has('code'),
                'error_param' => request()->get('error'),
                'stack_trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('login')
                        ->with('error', 'Error al iniciar sesión con Google. Intenta de nuevo.');
        }
    }

    private function determineUserRole(string $email): string
    {
        // Obtener lista de emails admin desde .env
        $adminEmails = explode(',', env('ADMIN_EMAILS', ''));
        
        // Limpiar espacios en blanco
        $adminEmails = array_map('trim', $adminEmails);
        
        // Verificar si el email está en la lista de admins
        if (in_array($email, $adminEmails)) {
            Log::info('Email identificado como admin en Google Login', ['email' => $email]);
            return 'admin';
        }
        
        return 'user';
    }


}