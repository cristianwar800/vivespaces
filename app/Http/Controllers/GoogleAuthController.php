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
            return Socialite::driver('google')->redirect();
        } catch (Exception $e) {
            Log::error('Error redirigiendo a Google: ' . $e->getMessage());
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
            // Obtener usuario de Google
            $googleUser = Socialite::driver('google')->user();
            
            Log::info('Usuario de Google obtenido', [
                'email' => $googleUser->email,
                'name' => $googleUser->name,
                'google_id' => $googleUser->id
            ]);
            
            // 🆕 DETERMINAR EL ROL DEL USUARIO
            $role = $this->determineUserRole($googleUser->email);
            
            // Buscar usuario por email o google_id
            $user = User::where('email', $googleUser->email)
                    ->orWhere('google_id', $googleUser->id)
                    ->first();
            
            if ($user) {
                // Usuario existe - actualizar google_id y avatar si no los tiene
                Log::info('Usuario encontrado, actualizando datos', ['user_id' => $user->id]);
                
                if (!$user->google_id) {
                    $user->update([
                        'google_id' => $googleUser->id,
                        'avatar' => $googleUser->avatar,
                    ]);
                }

                // 🆕 ACTUALIZAR ROL SI ES ADMIN (solo si aún no es admin)
                if ($role === 'admin' && $user->role !== 'admin') {
                    $user->update(['role' => 'admin']);
                    Log::info('Usuario promovido a admin', ['user_id' => $user->id, 'email' => $user->email]);
                }
                
            } else {
                // Usuario NO existe - crear nuevo
                Log::info('Creando nuevo usuario desde Google', ['role' => $role]);
                
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
                
                Log::info('Usuario creado exitosamente', [
                    'user_id' => $user->id,
                    'role' => $user->role,
                    'email' => $user->email
                ]);
            }
            
            // Login automático
            Auth::login($user, true);
            
            Log::info('Login exitoso con Google', [
                'user_id' => $user->id,
                'role' => $user->role
            ]);
            
            // Redirigir a welcome
            return redirect()->route('welcome');
            
        } catch (Exception $e) {
            Log::error('Google login error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
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