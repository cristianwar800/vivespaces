<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Property;
use App\Models\Message;
use App\Mail\PasswordResetMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    /**
     * Dashboard principal del administrador
     * Muestra estadísticas generales del sistema
     */
    public function dashboard()
    {
        // VERIFICAR QUE EL USUARIO SEA ADMINISTRADOR
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        // CONTAR TOTAL DE USUARIOS
        $totalUsers = User::count();

        // CONTAR USUARIOS REGISTRADOS HOY
        $usersToday = User::whereDate('created_at', now()->toDateString())->count();

        // CONTAR USUARIOS ACTIVOS (QUE SE CONECTARON EN LOS ÚLTIMOS 30 DÍAS)
        $activeUsers = User::where('updated_at', '>=', now()->subDays(30))->count();

        // CONTAR TOTAL DE PROPIEDADES
        $totalProperties = Property::count();

        // CONTAR PROPIEDADES PUBLICADAS HOY
        $propertiesToday = Property::whereDate('created_at', now()->toDateString())->count();

        // CONTAR PROPIEDADES ACTIVAS
        $activeProperties = Property::where('is_active', true)->count();

        // CONTAR MENSAJES ENVIADOS HOY
        $messagesToday = Message::whereDate('created_at', now()->toDateString())->count();

        // OBTENER USUARIOS REGISTRADOS RECIENTEMENTE (ÚLTIMOS 5)
        $recentUsers = User::latest()->take(5)->get(['id', 'name', 'last_name', 'email', 'created_at']);

        // OBTENER PROPIEDADES RECIENTES (ÚLTIMOS 5)
        $recentProperties = Property::with('user')->latest()->take(5)->get()->map(function($property) {
            return [
                'id' => $property->id,
                'title' => $property->title,
                'owner' => $property->user ? $property->user->name . ' ' . $property->user->last_name : 'N/A',
                'price' => $property->price,
                'price_formatted' => '$' . number_format($property->price, 2),
                'is_active' => (bool) $property->is_active,
                'created_at' => $property->created_at->format('d/m/Y H:i'),
            ];
        });

        // RETORNAR RESPUESTA JSON CON TODAS LAS ESTADÍSTICAS
        return response()->json([
            'success' => true,
            'stats' => [
                'users' => [
                    'total' => $totalUsers,
                    'today' => $usersToday,
                    'active' => $activeUsers
                ],
                'properties' => [
                    'total' => $totalProperties,
                    'today' => $propertiesToday,
                    'active' => $activeProperties
                ],
                'messages' => [
                    'today' => $messagesToday
                ]
            ],
            'recent_users' => $recentUsers,
            'recent_properties' => $recentProperties
        ]);
    }

        /**
 * Obtener lista de todos los usuarios para administración
 * Con filtros y paginación
 */
        public function getAllUsers(Request $request)
        {
            // VERIFICAR QUE EL USUARIO SEA ADMINISTRADOR
            if (auth()->user()->role !== 'admin') {
                return response()->json(['error' => 'No tienes permisos de administrador'], 403);
            }

            // CREAR CONSULTA BASE
            $query = User::query();

            // FILTRO POR BÚSQUEDA (OPCIONAL)
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // FILTRO POR ROL (OPCIONAL)
            if ($request->filled('role')) {
                $query->where('role', $request->role);
            }

            // FILTRO POR ESTADO (ACTIVO/SUSPENDIDO)
            if ($request->filled('status')) {
                if ($request->status === 'suspended') {
                    $query->whereNotNull('suspended_at');
                } else {
                    $query->whereNull('suspended_at');
                }
            }

            // ORDENAMIENTO Y PAGINACIÓN
            $users = $query->latest()->paginate($request->get('per_page', 15));

            // TRANSFORMAR DATOS PARA LA RESPUESTA
            $users->getCollection()->transform(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at->format('d/m/Y H:i'),
                    'suspended' => !is_null($user->suspended_at),
                    'suspended_at' => $user->suspended_at ? $user->suspended_at->format('d/m/Y H:i') : null,
                    'properties_count' => $user->properties()->count(),
                    
                    // ✅ CAMPOS AGREGADOS PARA VERIFICACIÓN DE IDENTIDAD
                    'is_identity_verified' => (bool) $user->is_identity_verified,
                    'verified_at' => $user->verified_at ?? null,
                    'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->format('d/m/Y H:i') : null,
                ];
            });

            return response()->json([
                'success' => true,
                'users' => $users
            ]);
        }

    /**
     * 🆕 Obtener lista de todas las propiedades para administración
     * Con filtros y paginación
     */
    public function getAllProperties(Request $request)
    {
        // VERIFICAR PERMISOS DE ADMINISTRADOR
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        // CREAR CONSULTA BASE con relación de usuario y fotos
        $query = Property::query()->with(['user', 'photos']);

        // FILTRO POR BÚSQUEDA (OPCIONAL)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // FILTRO POR ESTADO (ACTIVO/INACTIVO)
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active' ? 1 : 0);
        }

        // FILTRO POR TIPO DE PROPIEDAD
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // FILTRO POR CIUDAD
        if ($request->filled('city')) {
            $query->where('city', 'like', "%{$request->city}%");
        }

        // FILTRO POR RANGO DE PRECIOS
        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // ORDENAMIENTO Y PAGINACIÓN
        $properties = $query->latest()->paginate($request->get('per_page', 15));

        // TRANSFORMAR DATOS PARA LA RESPUESTA
        $properties->getCollection()->transform(function ($property) {
            return [
                'id' => $property->id,
                'title' => $property->title,
                'description' => strlen($property->description) > 100 ?
                    substr($property->description, 0, 100) . '...' :
                    $property->description,
                'price' => $property->price,
                'price_formatted' => '$' . number_format($property->price, 2),
                'type' => $property->type,
                'city' => $property->city,
                'state' => $property->state,
                'address' => $property->address,
                'bedrooms' => $property->bedrooms,
                'bathrooms' => $property->bathrooms,
                'area' => $property->area,
                'owner' => $property->user ? $property->user->name . ' ' . $property->user->last_name : 'N/A',
                'owner_email' => $property->user ? $property->user->email : 'N/A',
                'owner_id' => $property->user_id,
                'is_active' => (bool) $property->is_active,
                'created_at' => $property->created_at->format('d/m/Y H:i'),
                'updated_at' => $property->updated_at->format('d/m/Y H:i'),
                'image_url' => $property->photos->isNotEmpty()
                    ? $property->photos->first()->url
                    : ($property->image ? asset('storage/' . $property->image) : null),
                'messages_count' => $property->messages()->count(),
                'photos' => $property->photos->map(function($photo) {
                    return [
                        'url' => $photo->url,
                        'thumbnail' => $photo->url,
                        'is_primary' => $photo->is_primary,
                        'is_duplicate' => $photo->is_duplicate,
                    ];
                })->toArray()
            ];
        });

        return response()->json([
            'success' => true,
            'properties' => $properties
        ]);
    }

    /**
     * 🆕 Alternar estado activo/inactivo de una propiedad
     */
    public function togglePropertyActive($propertyId)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        try {
            $property = Property::findOrFail($propertyId);

            // Alternar estado
            $property->update(['is_active' => !$property->is_active]);

            $action = $property->is_active ? 'activada' : 'desactivada';

            Log::info('Property status toggled by admin', [
                'admin_id' => auth()->id(),
                'property_id' => $property->id,
                'new_status' => $property->is_active
            ]);

            return response()->json([
                'success' => true,
                'message' => "Propiedad {$action} exitosamente",
                'property' => [
                    'id' => $property->id,
                    'title' => $property->title,
                    'is_active' => (bool) $property->is_active
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error toggling property status: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar estado de la propiedad: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🆕 Eliminar una propiedad
     */
    public function deleteProperty($propertyId)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        try {
            $property = Property::with('user')->findOrFail($propertyId);

            // Guardar info para el log antes de eliminar
            $propertyTitle = $property->title;
            $propertyOwner = $property->user ? $property->user->name : 'Unknown';

            // Eliminar imagen si existe
            if ($property->image) {
                Storage::disk('public')->delete($property->image);
            }

            // Eliminar mensajes relacionados
            Message::where('property_id', $property->id)->delete();

            // Eliminar la propiedad
            $property->delete();

            Log::info('Property deleted by admin', [
                'admin_id' => auth()->id(),
                'property_id' => $propertyId,
                'property_title' => $propertyTitle,
                'property_owner' => $propertyOwner
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Propiedad eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting property: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la propiedad: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🆕 Actualizar una propiedad - VERSIÓN CORREGIDA
     */
    public function updateProperty($propertyId, Request $request)
    {
        // VERIFICAR PERMISOS
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        try {
            // BUSCAR LA PROPIEDAD
            $property = Property::findOrFail($propertyId);

            // VALIDAR DATOS DE ENTRADA
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string|max:65535',
                'address' => 'required|string|max:255',
                'city' => 'required|string|max:255',
                'state' => 'nullable|string|max:255',
                'country' => 'nullable|string|max:255',
                'postal_code' => 'nullable|string|max:255',
                'price' => 'required|numeric|min:0|max:999999999.99',
                'type' => 'nullable|string|in:casa,apartamento,condominio,oficina,local,terreno',
                'bedrooms' => 'nullable|integer|min:0',
                'bathrooms' => 'nullable|integer|min:0',
                'area' => 'nullable|integer|min:0',
                'is_active' => 'sometimes|boolean'
            ]);

            // LIMPIAR DATOS (convertir strings vacíos a null)
            foreach ($validated as $key => $value) {
                if ($value === '') {
                    $validated[$key] = null;
                }
            }

            // MANEJAR CAMPOS ESPECÍFICOS
            if (isset($validated['bedrooms'])) {
                $validated['bedrooms'] = (int) $validated['bedrooms'];
            }
            if (isset($validated['bathrooms'])) {
                $validated['bathrooms'] = (int) $validated['bathrooms'];
            }
            if (isset($validated['area'])) {
                $validated['area'] = (int) $validated['area'];
            }

            // ACTUALIZAR LA PROPIEDAD
            $property->update($validated);

            // LOG DE LA ACCIÓN
            Log::info('Property updated by admin', [
                'admin_id' => auth()->id(),
                'property_id' => $property->id,
                'changes' => array_keys($validated)
            ]);

            // RESPUESTA EXITOSA
            return response()->json([
                'success' => true,
                'message' => 'Propiedad actualizada exitosamente',
                'property' => [
                    'id' => $property->id,
                    'title' => $property->title,
                    'price' => $property->price,
                    'price_formatted' => '$' . number_format($property->price, 2),
                    'is_active' => (bool) $property->is_active,
                    'updated_at' => $property->updated_at->format('d/m/Y H:i')
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            // ERROR DE VALIDACIÓN
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $e->errors()
            ], 422);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            // PROPIEDAD NO ENCONTRADA
            return response()->json([
                'success' => false,
                'message' => 'Propiedad no encontrada'
            ], 404);

        } catch (\Exception $e) {
            // ERROR GENERAL
            Log::error('Error updating property: ' . $e->getMessage(), [
                'property_id' => $propertyId,
                'admin_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Suspender o reactivar un usuario
     * Alterna el estado de suspensión del usuario
     */
    public function toggleUserSuspension($userId)
    {
        // VERIFICAR PERMISOS
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        // BUSCAR USUARIO POR ID
        $user = User::findOrFail($userId);

        // VERIFICAR QUE NO SEA OTRO ADMIN
        if ($user->role === 'admin') {
            return response()->json(['error' => 'No puedes suspender a otro administrador'], 422);
        }

        // VERIFICAR QUE NO SE SUSPENDA A SÍ MISMO
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'No puedes suspenderte a ti mismo'], 422);
        }

        // ALTERNAR ESTADO DE SUSPENSIÓN
        if ($user->suspended_at) {
            // SI ESTÁ SUSPENDIDO: Reactivar
            $user->update(['suspended_at' => null]);
            $action = 'reactivado';
        } else {
            // SI NO ESTÁ SUSPENDIDO: Suspender
            $user->update(['suspended_at' => now()]);
            $action = 'suspendido';
        }

        Log::info('User suspension toggled by admin', [
            'admin_id' => auth()->id(),
            'user_id' => $user->id,
            'action' => $action
        ]);

        // RETORNAR CONFIRMACIÓN
        return response()->json([
            'success' => true,
            'message' => "Usuario {$action} exitosamente",
            'user' => [
                'id' => $user->id,
                'name' => $user->name . ' ' . $user->last_name,
                'email' => $user->email,
                'suspended' => !is_null($user->suspended_at)
            ]
        ]);
    }

    /**
     * Resetear contraseña de un usuario y enviarla por email
     * Genera una nueva contraseña temporal
     */
    public function resetUserPassword($userId)
    {
        try {
            // VERIFICAR PERMISOS
            if (!auth()->check()) {
                return response()->json(['error' => 'Usuario no autenticado'], 401);
            }

            if (auth()->user()->role !== 'admin') {
                return response()->json(['error' => 'No tienes permisos de administrador'], 403);
            }

            // VALIDAR QUE EL ID SEA VÁLIDO
            if (!is_numeric($userId) || $userId <= 0) {
                return response()->json(['error' => 'ID de usuario inválido'], 422);
            }

            // BUSCAR USUARIO
            $user = User::find($userId);

            if (!$user) {
                return response()->json(['error' => 'Usuario no encontrado'], 404);
            }

            // VERIFICAR QUE NO SEA EL MISMO ADMIN
            if ($user->id === auth()->id()) {
                return response()->json(['error' => 'No puedes resetear tu propia contraseña desde aquí'], 422);
            }

            // VERIFICAR QUE NO SEA OTRO ADMIN
            if ($user->role === 'admin') {
                return response()->json(['error' => 'No puedes resetear la contraseña de otro administrador'], 422);
            }

            // GENERAR CONTRASEÑA TEMPORAL ALEATORIA
            $newPassword = Str::random(12); // Aumenté a 12 caracteres

            // HASHEAR LA NUEVA CONTRASEÑA
            $hashedPassword = Hash::make($newPassword);

            // ACTUALIZAR CONTRASEÑA EN BASE DE DATOS
            $updated = $user->update([
                'password' => $hashedPassword,
                'must_change_password' => true // Asegúrate de que esta columna exista en tu tabla
            ]);

            if (!$updated) {
                throw new \Exception('No se pudo actualizar la contraseña en la base de datos');
            }

            // ENVIAR EMAIL CON NUEVA CONTRASEÑA
            $emailSent = false;
            try {
                // Verificar que la clase Mail y PasswordResetMail existan
                if (class_exists('App\Mail\PasswordResetMail')) {
                    Mail::to($user->email)->send(new \App\Mail\PasswordResetMail($user, $newPassword));
                    $emailSent = true;
                } else {
                    Log::warning('PasswordResetMail class not found');
                }
            } catch (\Exception $mailException) {
                Log::error('Error sending password reset email', [
                    'error' => $mailException->getMessage(),
                    'user_id' => $user->id,
                    'admin_id' => auth()->id()
                ]);
                $emailSent = false;
            }

            // LOG DE LA ACCIÓN
            Log::info('Password reset by admin', [
                'admin_id' => auth()->id(),
                'admin_name' => auth()->user()->name,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'email_sent' => $emailSent,
                'timestamp' => now()
            ]);

            // RESPUESTA EXITOSA
            return response()->json([
                'success' => true,
                'message' => $emailSent
                    ? 'Contraseña reseteada exitosamente. Se ha enviado la nueva contraseña por email al usuario.'
                    : 'Contraseña reseteada exitosamente, pero hubo un error al enviar el email. Contacta al usuario manualmente.',
                'data' => [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'email_sent' => $emailSent,
                    // Solo para debugging en desarrollo - REMOVER EN PRODUCCIÓN
                    'temp_password' => app()->environment('local') ? $newPassword : null
                ]
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::error('User not found for password reset', [
                'user_id' => $userId,
                'admin_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Usuario no encontrado'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Error resetting user password', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $userId,
                'admin_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error interno del servidor al resetear contraseña',
                'message' => app()->environment('local') ? $e->getMessage() : 'Contacta al administrador del sistema'
            ], 500);
        }
    }

    /**
     * Cambiar rol de un usuario
     */
    public function changeUserRole($userId, Request $request)
    {
        // 1. Verificar permisos de administrador
        if (!auth()->check() || auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        // 2. Verificar que el usuario existe
        $targetUser = User::find($userId);
        if (!$targetUser) {
            return response()->json(['error' => 'Usuario no encontrado'], 404);
        }

        // 3. Validar el request
        $request->validate([
            'new_role' => 'required|string|in:admin,user,landlord',
            'reason' => 'nullable|string|max:255'
        ]);

        // 4. Validar que no se cambie a sí mismo
        if ($targetUser->id === auth()->id() && $targetUser->role === 'admin' && $request->new_role !== 'admin') {
            return response()->json(['error' => 'No puedes quitarte tu propio rol de administrador'], 422);
        }

        // 5. Proteger último admin
        if ($targetUser->role === 'admin' && $request->new_role !== 'admin') {
            $totalAdmins = User::where('role', 'admin')->count();
            if ($totalAdmins <= 1) {
                return response()->json(['error' => 'No puedes quitar el rol de admin. Debe haber al menos un administrador'], 422);
            }
        }

        // 6. Proteger super admin
        if ($targetUser->id === 1 && $request->new_role !== 'admin') {
            return response()->json(['error' => 'No puedes cambiar el rol del administrador principal'], 422);
        }

        // 7. Verificar estado del usuario
        if (isset($targetUser->permanently_banned) && $targetUser->permanently_banned) {
            return response()->json(['error' => 'No se puede cambiar el rol de un usuario baneado permanentemente'], 422);
        }

        if ($targetUser->deleted_at) {
            return response()->json(['error' => 'No se puede cambiar el rol de un usuario eliminado'], 422);
        }

        // 8. Limitar número de administradores
        if ($request->new_role === 'admin') {
            $maxAdmins = config('app.max_admins', 3);
            $currentAdmins = User::where('role', 'admin')->count();

            if ($currentAdmins >= $maxAdmins) {
                return response()->json(['error' => "No se pueden tener más de {$maxAdmins} administradores"], 422);
            }
        }

        // 9. ACTUALIZAR EL ROL
        try {
            $oldRole = $targetUser->role;
            $targetUser->update(['role' => $request->new_role]);

            // 10. Log del cambio
            Log::info('Role changed by admin', [
                'admin_id' => auth()->id(),
                'user_id' => $targetUser->id,
                'old_role' => $oldRole,
                'new_role' => $request->new_role,
                'reason' => $request->reason
            ]);

            // 11. RETORNAR RESPUESTA DE ÉXITO
            return response()->json([
                'success' => true,
                'message' => "Rol cambiado exitosamente de {$oldRole} a {$request->new_role}",
                'user' => [
                    'id' => $targetUser->id,
                    'name' => $targetUser->name . ' ' . $targetUser->last_name,
                    'email' => $targetUser->email,
                    'role' => $targetUser->role
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error changing user role: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar el rol: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 🆕 Eliminar un usuario
     */
    public function deleteUser($userId)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        try {
            $user = User::findOrFail($userId);

            // Verificar que no sea el mismo usuario
            if ($user->id === auth()->id()) {
                return response()->json(['error' => 'No puedes eliminarte a ti mismo'], 422);
            }

            // Verificar que no sea otro administrador
            if ($user->role === 'admin') {
                return response()->json(['error' => 'No puedes eliminar a otro administrador'], 422);
            }

            // Eliminar propiedades asociadas
            foreach ($user->properties as $property) {
                // Eliminar imagen de la propiedad si existe
                if ($property->image) {
                    Storage::disk('public')->delete($property->image);
                }

                // Eliminar mensajes relacionados con la propiedad
                Message::where('property_id', $property->id)->delete();

                // Eliminar la propiedad
                $property->delete();
            }

            // Eliminar foto de perfil del usuario si existe
            if ($user->profile_photo) {
                Storage::disk('public')->delete($user->profile_photo);
            }

            // Eliminar mensajes enviados por el usuario (asumiendo que Message tiene 'sender_id')
            Message::where('sender_id', $user->id)->delete();

            // Eliminar el usuario
            $user->delete();

            Log::info('User deleted by admin', [
                'admin_id' => auth()->id(),
                'user_id' => $userId,
                'user_email' => $user->email
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Usuario eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting user: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el usuario: ' . $e->getMessage()
            ], 500);
        }
    }
        public function revokeVerification($userId, Request $request)
    {
        // VERIFICAR PERMISOS
        if (auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No tienes permisos de administrador'], 403);
        }

        try {
            $user = User::findOrFail($userId);

            // VERIFICAR QUE NO SEA EL MISMO USUARIO
            if ($user->id === auth()->id()) {
                return response()->json(['error' => 'No puedes revocar tu propia verificación'], 422);
            }

            // VERIFICAR QUE EL USUARIO ESTÉ VERIFICADO
            if (!$user->is_identity_verified) {
                return response()->json(['error' => 'Este usuario no tiene verificación activa'], 422);
            }

            // REVOCAR VERIFICACIÓN
            $user->is_identity_verified = false;
            $user->verified_at = null;
            $user->verification_method = null;
            $user->save();

            // 🔥 ELIMINAR SESIONES DE VERIFICACIÓN (progreso guardado)
            $deletedSessions = \App\Models\UserVerification::where('user_id', $user->id)->delete();

            // Refrescar el modelo para asegurar que tenemos los datos actualizados
            $user->refresh();

            // LOG DE LA ACCIÓN
            Log::info('Identity verification revoked by admin', [
                'admin_id' => auth()->id(),
                'user_id' => $user->id,
                'user_email' => $user->email,
                'is_identity_verified_after' => $user->is_identity_verified,
                'verification_sessions_deleted' => $deletedSessions,
                'reason' => $request->reason ?? 'Revocado manualmente desde panel de administración'
            ]);

            // RETORNAR CONFIRMACIÓN
            return response()->json([
                'success' => true,
                'message' => 'Verificación de identidad revocada exitosamente',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name . ' ' . $user->last_name,
                    'email' => $user->email,
                    'is_identity_verified' => false,
                    'verified_at' => null
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error revoking verification: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al revocar verificación: ' . $e->getMessage()
            ], 500);
        }
    }

                    /**
     * 🆕 Obtener reportes con filtros
     */
    public function getReports(Request $request)
    {
        $this->ensureAdmin();

        $reports = PropertyReport::with(['property', 'reporter', 'reviewer'])
            ->when($request->search, fn($q, $search) =>
                $q->where('reason', 'like', "%{$search}%")
                  ->orWhereHas('property', fn($pq) => $pq->where('title', 'like', "%{$search}%"))
                  ->orWhereHas('reporter', fn($uq) => $uq->where('name', 'like', "%{$search}%"))
            )
            ->when($request->date_from, fn($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($request->date_to, fn($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->tap(fn($q) => collect(['status', 'category', 'priority'])->each(
                fn($filter) => $request->filled($filter) && $q->where($filter, $request->$filter)
            ))
            ->orderByPriority()
            ->paginate($request->get('per_page', 15));

        return $this->success(compact('reports') + [
            'categories' => PropertyReport::CATEGORIES,
            'statuses' => PropertyReport::STATUSES,
            'priorities' => PropertyReport::PRIORITIES
        ]);
    }

    /**
     * 🆕 Actualizar estado de reporte
     */
    public function updateReportStatus($reportId, Request $request)
    {
        return $this->handleReport($reportId, function($report) use ($request) {
            $request->validate(['status' => 'required|in:pending,in_review,resolved,dismissed']);

            $oldStatus = $report->status;
            $report->update(['status' => $request->status, 'reviewed_by' => auth()->id(), 'reviewed_at' => now()]);

            $request->admin_notes && $report->addAdminNote($request->admin_notes);
            $report->addAdminNote("Estado: {$oldStatus} → {$request->status}");

            return 'Estado actualizado exitosamente';
        });
    }

    /**
     * 🆕 Asignar reporte
     */
    public function assignReport($reportId, Request $request)
    {
        return $this->handleReport($reportId, function($report) use ($request) {
            $admin = User::findOrFail($request->admin_id);
            throw_unless($admin->role === 'admin', new \Exception('Solo admins'));

            $report->update(['reviewed_by' => $request->admin_id, 'status' => 'in_review', 'reviewed_at' => now()]);
            $report->addAdminNote("Asignado a: {$admin->name}");

            return 'Asignado exitosamente';
        });
    }

    /**
     * 🆕 Eliminar reporte
     */
    public function deleteReport($reportId)
    {
        return $this->handleReport($reportId, fn($report) => $report->delete() ? 'Reporte eliminado' : 'Error');
    }

    /**
     * 🆕 Estadísticas de reportes
     */
    public function getReportsStats()
    {
        $this->ensureAdmin();

        $stats = collect(['total', 'pending', 'in_review', 'resolved', 'critical'])
            ->mapWithKeys(fn($status) => [
                $status => PropertyReport::when($status !== 'total', fn($q) =>
                    $status === 'critical' ? $q->where('priority', 'critical') : $q->where('status', $status)
                )->count()
            ])
            ->merge(['today' => PropertyReport::whereDate('created_at', today())->count()]);

        $criticalReports = PropertyReport::with(['property', 'reporter'])
            ->where(['priority' => 'critical', 'status' => 'pending'])
            ->latest()->take(5)->get()
            ->map(fn($r) => collect($r)->only(['id'])->merge([
                'property_title' => $r->property->title,
                'reporter_name' => $r->reporter->name,
                'category' => $r->category_label,
                'created_at' => $r->created_at->format('d/m/Y H:i')
            ]));

        return $this->success(compact('stats', 'criticalReports'));
    }

    /**
     * 🆕 Agregar nota
     */
    public function addReportNote($reportId, Request $request)
    {
        return $this->handleReport($reportId, function($report) use ($request) {
            $request->validate(['note' => 'required|string|max:1000']);
            $report->addAdminNote($request->note);
            return 'Nota agregada';
        });
    }

    /**
     * 🆕 Cambiar prioridad
     */
    public function changeReportPriority($reportId, Request $request)
    {
        return $this->handleReport($reportId, function($report) use ($request) {
            $request->validate(['priority' => 'required|in:low,medium,high,critical']);
            $report->changePriority($request->priority, $request->reason);
            return 'Prioridad actualizada';
        });
    }

    /**
     * 🆕 Acción sobre propiedad
     */
    public function takePropertyAction($reportId, Request $request)
    {
        return $this->handleReport($reportId, function($report) use ($request) {
            $request->validate([
                'action' => 'required|in:suspend,activate,delete,no_action',
                'reason' => 'required|string|max:500'
            ]);

            $property = $report->property;

            match($request->action) {
                'suspend' => $property->update(['is_active' => false]),
                'activate' => $property->update(['is_active' => true]),
                'delete' => tap($property, fn($p) => $p->image && Storage::disk('public')->delete($p->image))->delete(),
                'no_action' => null
            };

            $report->update(['status' => 'resolved']);
            $report->addAdminNote("Acción: {$request->action} - {$request->reason}");

            return 'Acción ejecutada';
        });
    }

    // MÉTODOS HELPER PRIVADOS

    private function ensureAdmin()
    {
        throw_unless(auth()->user()->role === 'admin', new \Exception('No tienes permisos de administrador'));
    }

    private function handleReport($reportId, callable $callback)
    {
        $this->ensureAdmin();

        try {
            $report = PropertyReport::findOrFail($reportId);
            $message = $callback($report);
            return $this->success(['message' => $message]);
        } catch (\Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    private function success($data = [])
    {
        return response()->json(['success' => true] + $data);
    }

    private function error($message, $code = 500)
    {
        return response()->json(['success' => false, 'message' => $message], $code);
    }
}
