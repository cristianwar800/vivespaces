<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware para verificar que el usuario tenga su identidad verificada
 *
 * Este middleware se aplica a rutas que requieren que el usuario haya
 * completado el proceso de verificación de identidad (INE + Comprobante)
 * antes de poder acceder a ciertas funcionalidades como publicar propiedades.
 */
class EnsureIdentityVerified
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // 🔒 VALIDACIÓN 1: Usuario debe estar autenticado
        if (!$user) {
            Log::warning('⚠️ Intento de acceso sin autenticación a ruta protegida', [
                'url' => $request->fullUrl(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            // Si es petición AJAX/JSON
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'error' => 'UNAUTHENTICATED',
                    'message' => 'Debes iniciar sesión para acceder a esta función',
                    'redirect' => route('login')
                ], 401);
            }

            // Petición normal (web)
            return redirect()->route('login')
                ->with('error', 'Debes iniciar sesión para publicar propiedades');
        }

        // 🔒 VALIDACIÓN 2: Usuario debe tener identidad verificada
        if (!$user->is_identity_verified) {
            Log::info('⚠️ Usuario no verificado intentó acceder a ruta protegida', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'user_name' => $user->name,
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'ip' => $request->ip()
            ]);

            // Si es petición AJAX/JSON
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'error' => 'IDENTITY_NOT_VERIFIED',
                    'message' => 'Debes verificar tu identidad antes de publicar propiedades',
                    'redirect' => route('verification.identity'),
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'is_verified' => false
                    ],
                    'instructions' => [
                        '1. Completa el proceso de verificación con tu INE',
                        '2. Sube tu comprobante de domicilio',
                        '3. Espera la validación automática',
                        '4. Una vez verificado, podrás publicar propiedades'
                    ]
                ], 403);
            }

            // Petición normal (web)
            return redirect()->route('verification.identity')
                ->with('error', 'Debes verificar tu identidad para publicar propiedades')
                ->with('info', 'La verificación es rápida y segura. Solo necesitas tu INE y un comprobante de domicilio.');
        }

        // ✅ Usuario autenticado Y verificado - permitir acceso
        Log::info('✅ Usuario verificado accediendo a ruta protegida', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'verified_at' => $user->verified_at,
            'url' => $request->fullUrl(),
            'method' => $request->method()
        ]);

        return $next($request);
    }
}
