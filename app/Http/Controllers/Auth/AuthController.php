<?php


namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\EmailVerification;
use App\Mail\EmailVerificationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;



class AuthController extends Controller
{
    /**
     * Handle user login
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'redirect' => route('welcome'),
                'user' => [
                    'id' => auth()->user()->id,
                    'name' => auth()->user()->name,
                    'last_name' => auth()->user()->last_name,
                    'email' => auth()->user()->email,
                    'role' => auth()->user()->role,
                    'profile_photo' => auth()->user()->profile_photo
                ]
            ]);
        }

        return response()->json([
            'message' => 'The provided credentials do not match our records.'
        ], 401);
    }

    /**
     * Handle user registration - CORREGIDO
     */
    public function register(Request $request)
    {
        // Validación solo para los campos que tienes en el formulario
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:20',
            'password' => 'required|string|min:8',
            'terms' => 'required|accepted',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // 🆕 NO CREAR EL USUARIO TODAVÍA - Solo guardar los datos temporalmente

            // Guardar datos del registro en sesión para crear usuario después de verificar
            session([
                'pending_registration' => [
                    'name' => $request->name,
                    'last_name' => $request->last_name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'password' => Hash::make($request->password),
                    'role' => 'user',
                    'is_active' => true,
                    'address' => null,
                    'city' => null,
                    'state' => null,
                    'country' => 'MX',
                    'postal_code' => null,
                ]
            ]);

            // Enviar código de verificación (SIN user_id porque aún no existe el usuario)
            $verification = EmailVerification::createForEmail($request->email, null);

            // Enviar email con código
            Mail::to($request->email)->send(new EmailVerificationMail($verification->code, $request->name . ' ' . $request->last_name));

            // Log para debugging
            Log::info('Código de verificación enviado para registro', [
                'email' => $request->email,
                'pending_registration' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Te hemos enviado un código de verificación. Verifica tu email para completar el registro.',
                'email' => $request->email,
                'verification_required' => true,
                'redirect' => '/verify-email?email=' . urlencode($request->email) . '&from_register=1'
            ]);

        } catch (\Exception $e) {
            // Log del error para debugging
            Log::error('Error enviando código de verificación', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error enviando código de verificación: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle user logout
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('welcome');
    }

    /**
     * Show login form
     */
    public function showLogin()
    {
        return view('auth.login');
    }

    /**
     * Show registration form
     */
    public function showRegister()
    {
        return view('auth.register');
    }

    public function showProfile()
    {
        return view('auth.profile');
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();

        // Logs temporales para debuggear - MEJORADOS
        \Log::info('Remove photo value: ' . $request->get('remove_photo'));
        \Log::info('Remove photo type: ' . gettype($request->get('remove_photo')));
        \Log::info('Remove photo boolean: ' . ($request->boolean('remove_photo') ? 'true' : 'false'));
        \Log::info('Has file: ' . ($request->hasFile('profile_photo') ? 'yes' : 'no'));
        \Log::info('All request data:', $request->all());

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:2',
            'postal_code' => 'nullable|string|max:10',
            'current_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:8|confirmed',
            'profile_photo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'remove_photo' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Verificar contraseña actual si se quiere cambiar
            if ($request->filled('current_password')) {
                if (!Hash::check($request->current_password, $user->password)) {
                    return response()->json([
                        'success' => false,
                        'errors' => ['current_password' => ['La contraseña actual es incorrecta.']]
                    ], 422);
                }
            }

            // MANEJO DE IMAGEN CORREGIDO COMPLETAMENTE:
            $profilePhotoPath = $user->profile_photo;
            $removePhoto = $request->get('remove_photo');

            \Log::info('Processing image logic...');
            \Log::info('removePhoto variable: "' . $removePhoto . '"');
            \Log::info('Current user photo: ' . ($user->profile_photo ?? 'NULL'));

            // CONDICIÓN SIMPLIFICADA Y CORREGIDA
            if ($removePhoto === 'true' || $removePhoto === true || $removePhoto == '1') {
                \Log::info('🗑️ Eliminando foto...');

                // Eliminar imagen anterior si existe
                if ($user->profile_photo) {
                    $fullPath = storage_path('app/public/' . $user->profile_photo);
                    if (file_exists($fullPath)) {
                        unlink($fullPath);
                        \Log::info('✅ Archivo físico eliminado: ' . $fullPath);
                    } else {
                        \Log::info('⚠️ Archivo no encontrado en: ' . $fullPath);
                    }

                    if (Storage::disk('public')->exists($user->profile_photo)) {
                        Storage::disk('public')->delete($user->profile_photo);
                        \Log::info('✅ Eliminado del storage disk: ' . $user->profile_photo);
                    }
                } else {
                    \Log::info('ℹ️ No había foto para eliminar');
                }

                $profilePhotoPath = null;
                \Log::info('✅ profilePhotoPath establecido a NULL');

            } elseif ($request->hasFile('profile_photo')) {
                \Log::info('📤 Subiendo nueva foto...');

                // Eliminar imagen anterior si existe
                if ($user->profile_photo && Storage::disk('public')->exists($user->profile_photo)) {
                    Storage::disk('public')->delete($user->profile_photo);
                    \Log::info('🗑️ Foto anterior eliminada: ' . $user->profile_photo);
                }

                // Subir nueva imagen
                $profilePhotoPath = $request->file('profile_photo')->store('profile-photos', 'public');
                \Log::info('✅ Nueva foto guardada: ' . $profilePhotoPath);

            } else {
                \Log::info('ℹ️ No se modifica la foto, manteniendo: ' . ($user->profile_photo ?? 'NULL'));
            }

            // ACTUALIZACIÓN:
            $updateData = [
                'name' => $request->name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'address' => $request->address,
                'city' => $request->city,
                'state' => $request->state,
                'country' => $request->country ?? 'MX',
                'postal_code' => $request->postal_code,
                'profile_photo' => $profilePhotoPath,
            ];

            // Actualizar contraseña si se proporcionó
            if ($request->filled('new_password')) {
                $updateData['password'] = Hash::make($request->new_password);
            }

            \Log::info('📝 Datos a actualizar:', [
                'profile_photo' => $profilePhotoPath,
                'name' => $updateData['name']
            ]);

            $user->update($updateData);

            // Refrescar el modelo para obtener los datos actualizados
            $user->refresh();

            // Log para verificar el valor final
            \Log::info('✅ Profile photo después de update: ' . ($user->profile_photo ?? 'NULL'));

            return response()->json([
                'success' => true,
                'message' => 'Perfil actualizado exitosamente',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'city' => $user->city,
                    'state' => $user->state,
                    'country' => $user->country,
                    'postal_code' => $user->postal_code,
                    'profile_photo' => $user->profile_photo,
                    'role' => $user->role,
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('💥 Error updating profile: ' . $e->getMessage());
            \Log::error('📍 Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el perfil: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getProfile()
    {
        $user = Auth::user();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address' => $user->address,
                'city' => $user->city,
                'state' => $user->state,
                'country' => $user->country,
                'postal_code' => $user->postal_code,
                'profile_photo' => $user->profile_photo,
                'role' => $user->role,
            ]
        ]);
    }
}
