<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\AdminController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\Comparison\PhotoComparisonController;
use App\Http\Controllers\ComunidadController;
use App\Http\Controllers\AISearchController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// ==========================================
// 🌐 RUTAS PÚBLICAS (Acceso libre)
// ==========================================

// Página principal
Route::get('/', function () {
    return view('welcome');
})->name('welcome');

// Propiedades públicas (solo lectura)
Route::get('/properties', [PropertyController::class, 'index'])->name('properties');

// Verificación de email (público)
Route::prefix('email')->group(function () {
    Route::post('/send-verification', [EmailVerificationController::class, 'sendVerificationCode'])->name('email.send-verification');
    Route::post('/verify-code', [EmailVerificationController::class, 'verifyCode'])->name('email.verify-code');
    Route::get('/verification-status', [EmailVerificationController::class, 'getVerificationStatus'])->name('email.verification-status');
    Route::get('/verify-email', function () {
        return view('email');
    })->name('email.verification');
});

// ==========================================
// 👤 RUTAS DE AUTENTICACIÓN (Solo invitados)
// ==========================================

Route::middleware('guest')->group(function () {
    // Login
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);

    // Registro
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

// ==========================================
// 🔒 RUTAS PROTEGIDAS (Solo usuarios autenticados)
// ==========================================

Route::middleware('auth')->group(function () {

    // ----------------
    // 🔐 Autenticación y Perfil
    // ----------------
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Perfil de usuario
    Route::prefix('profile')->group(function () {
        Route::get('/', [AuthController::class, 'showProfile'])->name('profile.show');
        Route::post('/update', [AuthController::class, 'updateProfile'])->name('profile.update');
        Route::get('/data', [AuthController::class, 'getProfile'])->name('profile.data');
        Route::get('/get', [AuthController::class, 'getProfile']);
    });

    // ----------------
    // 🏠 Gestión de Propiedades (CRUD completo)
    // ----------------
    Route::prefix('properties')->group(function () {
        Route::get('/create', [PropertyController::class, 'create'])->name('properties.create');
        Route::post('/', [PropertyController::class, 'store'])->name('properties.store');
        Route::get('/{property}/edit', [PropertyController::class, 'edit'])->name('properties.edit');
        Route::put('/{property}', [PropertyController::class, 'update'])->name('properties.update');
        Route::delete('/{property}', [PropertyController::class, 'destroy'])->name('properties.destroy');
        Route::get('/{property}', [PropertyController::class, 'show'])->name('properties.show');
    });

    // ----------------
    // ✅ Verificación de Identidad
    // ----------------
    Route::prefix('verification')->group(function () {
        // Verificación con fotos
        Route::get('/identity', [PhotoComparisonController::class, 'index'])->name('photo.verification');
        Route::post('/photos', [PhotoComparisonController::class, 'verifyPhotos'])->name('photo.verify');
        Route::get('/status', [PhotoComparisonController::class, 'getVerificationStatus'])->name('verification.status');

        // Verificación OCR
        Route::post('/identity-ocr', [VerificationController::class, 'verify']);
        Route::post('/test-ocr', [VerificationController::class, 'testOCR']);

        // Vista de prueba
        Route::get('/test', function () {
            return view('test-verification');
        });
    });

    // ----------------
    // 💬 Sistema de Mensajería/Chat
    // ----------------
    Route::get('/chat', function () {
        return view('chat');
    })->name('chat');

    // Conversaciones
    Route::prefix('conversations')->group(function () {
        Route::post('/start', [MessageController::class, 'startConversation']);
        Route::get('/', [MessageController::class, 'getConversations']);
        Route::get('/{propertyId}/{userId}/messages', [MessageController::class, 'getMessages']);
        Route::get('/{conversationId}/messages', [MessageController::class, 'getMessagesByConversationId']);
        Route::post('/{conversationId}/mark-read', [MessageController::class, 'markMessagesAsRead']);
    });

    // Mensajes
    Route::prefix('messages')->group(function () {
        Route::post('/', [MessageController::class, 'store']);
        Route::post('/{message}/reactions', [MessageController::class, 'addReaction']);
        Route::delete('/{message}/reactions', [MessageController::class, 'removeReaction']);
    });

    // ----------------
    // 👥 Comunidad
    // ----------------
    Route::get('/comunidad', function () {
        return view('comunidad');
    })->name('comunidad');

    // ----------------
    // 🛡️ Panel de Administración
    // ----------------
    Route::prefix('admin')->group(function () {
        // Vista principal
        Route::get('/', function () {
            return view('admin.panel');
        })->name('admin.panel');

        // Dashboard
        Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');

        // Gestión de usuarios
        Route::prefix('users')->group(function () {
            Route::get('/', [AdminController::class, 'getAllUsers'])->name('admin.users.index');
            Route::patch('/{userId}/toggle-suspension', [AdminController::class, 'toggleUserSuspension'])->name('admin.users.toggle-suspension');
            Route::post('/{userId}/reset-password', [AdminController::class, 'resetUserPassword'])->name('admin.users.reset-password');
            Route::patch('/{userId}/change-role', [AdminController::class, 'changeUserRole'])->name('admin.users.change-role');
            Route::delete('/{userId}', [AdminController::class, 'deleteUser'])->name('admin.users.delete');
        });

        // Gestión de propiedades desde admin
        Route::prefix('properties')->group(function () {
            Route::get('/', [AdminController::class, 'getAllProperties'])->name('admin.properties.index');
            Route::patch('/{propertyId}/toggle-active', [AdminController::class, 'togglePropertyActive'])->name('admin.properties.toggle-active');
            Route::patch('/{propertyId}', [AdminController::class, 'updateProperty'])->name('admin.properties.update');
            Route::delete('/{propertyId}', [AdminController::class, 'deleteProperty'])->name('admin.properties.delete');
        });
    });
});

// ==========================================
// 🔌 API ROUTES (JSON responses)
// ==========================================

// ==========================================
// 🌐 API ROUTES PÚBLICAS (Sin autenticación)
// ==========================================

// Propiedades para el mapa (público)
Route::get('/api/properties-map', function() {
    $properties = \App\Models\Property::where('is_active', true)
        ->select('id', 'title', 'description', 'address', 'city', 'state', 'price', 'type', 'bedrooms', 'bathrooms', 'area', 'is_active')
        ->get();

    return response()->json([
        'success' => true,
        'properties' => $properties
    ]);
});

// Propiedades destacadas (público)
Route::get('/api/featured-properties', function() {
    $featuredProperties = \App\Models\Property::where('is_active', true)
        ->inRandomOrder()
        ->limit(4)
        ->select('id', 'title', 'description', 'address', 'city', 'state', 'price', 'type', 'bedrooms', 'bathrooms', 'area', 'is_active', 'image')
        ->get();

    return response()->json([
        'success' => true,
        'properties' => $featuredProperties
    ]);
});


// Agregar en la sección "API ROUTES PÚBLICAS (Sin autenticación)"

// Búsqueda básica de propiedades (para el navbar)
Route::get('/api/search/properties', [PropertyController::class, 'searchProperties'])
    ->name('api.search.properties');

// Endpoint para obtener sugerencias de ciudades
Route::get('/api/search/cities', function(Request $request) {
    $query = $request->get('query', '');

    if (empty(trim($query))) {
        return response()->json(['success' => true, 'cities' => []]);
    }

    $cities = \App\Models\Property::where('is_active', true)
        ->where('city', 'like', '%' . $query . '%')
        ->select('city')
        ->groupBy('city')
        ->limit(5)
        ->pluck('city');

    return response()->json([
        'success' => true,
        'cities' => $cities
    ]);
});

// ==========================================
// 🔌 API ROUTES (JSON responses) - CON AUTENTICACIÓN
// ==========================================

Route::prefix('api')->middleware('auth')->group(function () {

    // ----------------
    // 👤 Usuario actual
    // ----------------
    Route::get('/user', function () {
        return response()->json([
            'success' => true,
            'user' => auth()->user()
        ]);
    });

    // ----------------
    // 💬 Chat API
    // ----------------
    Route::prefix('conversations')->group(function () {
        Route::post('/start', [MessageController::class, 'startConversation']);
        Route::get('/', [MessageController::class, 'getConversations']);
        Route::get('/{conversationId}/messages', [MessageController::class, 'getMessagesByConversationId']);
        Route::post('/{conversationId}/mark-read', [MessageController::class, 'markMessagesAsRead']);
        Route::get('/debug', function() {
            $user = auth()->user();
            $conversations = $user->getConversationsWith();

            return response()->json([
                'success' => true,
                'raw_conversations' => $conversations,
                'user_id' => $user->id
            ]);
        });
    });

    Route::post('/messages', [MessageController::class, 'store']);

    // ----------------
    // 👥 Comunidad API
    // ----------------
    Route::resource('comunidad', ComunidadController::class)->except(['create', 'edit']);
    Route::post('comunidad/{id}/react', [ComunidadController::class, 'react']);
    Route::get('comunidad/zone/{zone}', [ComunidadController::class, 'byZone']);

    // Comentarios de comunidad
    Route::prefix('comunidad/{id}')->group(function () {
        Route::post('/comments', [ComunidadController::class, 'addComment']);
        Route::get('/comments', [ComunidadController::class, 'getComments']);
    });

    Route::prefix('comunidad/comments')->group(function () {
        Route::delete('/{commentId}', [ComunidadController::class, 'deleteComment']);
    });

    Route::post('comments/{commentId}/react', [ComunidadController::class, 'reactToComment']);
});

// ==========================================
// 🧪 RUTAS DE TESTING/DEBUG (ELIMINAR EN PRODUCCIÓN)
// ==========================================

if (app()->environment(['local', 'staging'])) {
    Route::prefix('debug')->group(function () {
        Route::get('/auth', function() {
            if (auth()->check()) {
                return 'Usuario logueado: ' . auth()->user()->name . ' (ID: ' . auth()->id() . ')';
            } else {
                return 'NO estás logueado';
            }
        });

        Route::get('/properties-create', function() {
            return app(App\Http\Controllers\PropertyController::class)->create();
        });

        Route::get('/create-route', function() {
            dd('Esta ruta sí funciona');
        });

        Route::get('/controller', function() {
            try {
                $controller = app(App\Http\Controllers\PropertyController::class);
                return 'Controller resolved successfully: ' . get_class($controller);
            } catch (\Exception $e) {
                return 'Error resolving controller: ' . $e->getMessage();
            }
        });

        Route::get('/model-files', function() {
            $modelPath = public_path('comparison-model/model.json');
            $metadataPath = public_path('comparison-model/metadata.json');
            $weightsPath = public_path('comparison-model/weights.bin');

            return response()->json([
                'model_exists' => file_exists($modelPath),
                'metadata_exists' => file_exists($metadataPath),
                'weights_exists' => file_exists($weightsPath),
                'model_path' => $modelPath,
                'metadata_path' => $metadataPath,
                'weights_path' => $weightsPath,
                'model_size' => file_exists($modelPath) ? filesize($modelPath) : 0,
                'metadata_size' => file_exists($metadataPath) ? filesize($metadataPath) : 0,
                'weights_size' => file_exists($weightsPath) ? filesize($weightsPath) : 0,
            ]);
        });

        Route::get('/dd-test', function() {
            dd([
                'message' => 'Ruta funciona!',
                'api_key' => config('services.ocr_space.api_key'),
                'ocr_service_exists' => class_exists('App\Services\OCRService'),
                'controller_exists' => class_exists('App\Http\Controllers\VerificationController'),
                'guzzle_exists' => class_exists('GuzzleHttp\Client'),
                'intervention_exists' => class_exists('Intervention\Image\Facades\Image'),
            ]);
        });

        Route::get('/chat-test', function() {
            return response()->json([
                'success' => true,
                'message' => 'El endpoint funciona',
                'user' => auth()->user() ? auth()->user()->name : 'No logueado'
            ]);
        })->middleware('auth');

        Route::get('/conversations', function() {
            if (!auth()->check()) {
                return 'No estás logueado';
            }

            try {
                $conversations = auth()->user()->getConversationsWith();
                return response()->json([
                    'success' => true,
                    'conversations_count' => count($conversations),
                    'conversations' => $conversations,
                    'user_id' => auth()->id()
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        })->middleware('auth');
    });

    Route::prefix('api/ai')->group(function () {
        Route::get('/health', [App\Http\Controllers\AISearchController::class, 'healthCheck']);
        Route::get('/test', [App\Http\Controllers\AISearchController::class, 'testConnection']);
        Route::post('/track', [App\Http\Controllers\AISearchController::class, 'trackSearch']);
    });

    // ==========================================
    // 🤖 AI PROXY SIMPLE - SIN ERRORES
    // ==========================================

    Route::prefix('ai')->group(function () {
        Route::get('/health', function () {
            try {
                $response = Http::timeout(10)->get('http://localhost:8001/health');
                return response($response->body(), $response->status())
                    ->header('Content-Type', 'application/json');
            } catch (\Exception $e) {
                return response()->json(['error' => 'AI not available'], 503);
            }
        });

        Route::get('/', function () {
            try {
                $response = Http::timeout(10)->get('http://localhost:8001/');
                return response($response->body(), $response->status())
                    ->header('Content-Type', 'application/json');
            } catch (\Exception $e) {
                return response()->json(['error' => 'AI not available'], 503);
            }
        });
    });

}
