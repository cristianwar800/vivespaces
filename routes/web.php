<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\Auth\AdminController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\ComunidadController;
use App\Http\Controllers\AISearchController;
use App\Http\Controllers\NotificationController;
use Illuminate\Http\Request;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\ContactoController;
use App\Http\Controllers\UserRatingController;
use App\Http\Controllers\SystemConfigController;
use Inertia\Inertia;

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

// ==========================================
// 🔍 BÚSQUEDA Y CONTACTO (Público)
// ==========================================

// Búsqueda de propiedades
Route::get('/search', function () {
    return view('search');
})->name('search');

Route::get('/search/properties', [PropertyController::class, 'searchProperties'])->name('search.properties');

// Contacto
Route::get('/contacto', [ContactoController::class, 'index'])->name('contacto.index');
Route::post('/contacto', [ContactoController::class, 'enviar'])->name('contacto.enviar');

// Recomendador AI
Route::get('/recomendador', function () {
    return view('fastapi-recomendador');
})->name('recomendador');

// ==========================================
// ✉️ VERIFICACIÓN DE EMAIL (Público)
// ==========================================

// Vista de verificación de email
Route::get('/verify-email', function () {
    return view('email');
})->name('verify.email');

// API endpoints de verificación (sin prefix)
Route::post('/send-verification', [EmailVerificationController::class, 'sendVerificationCode'])
    ->name('verification.send');

Route::post('/verify-code', [EmailVerificationController::class, 'verifyCode'])
    ->name('verification.verify');

Route::get('/verification/status', [EmailVerificationController::class, 'getVerificationStatus'])
    ->name('verification.status');

// ==========================================
// 🔑 PASSWORD RESET (Recuperar contraseña)
// ==========================================

Route::prefix('password')->group(function () {
    // Enviar código de recuperación
    Route::post('/send-reset-code', [EmailVerificationController::class, 'sendPasswordResetCode'])
        ->name('password.send-reset-code');
    
    // Verificar código de recuperación
    Route::post('/verify-reset-code', [EmailVerificationController::class, 'verifyPasswordResetCode'])
        ->name('password.verify-reset-code');
    
    // Restablecer contraseña
    Route::post('/reset', [EmailVerificationController::class, 'resetPassword'])
        ->name('password.reset');
    
    // Vista para "Olvidé mi contraseña"
    Route::get('/forgot', function () {
            return view('email');
    })->name('password.forgot');
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
// 🆕 Google OAuth Routes
Route::get('/auth/google', [GoogleAuthController::class, 'redirectToGoogle'])->name('auth.google');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);

// ==========================================
// 🔒 RUTAS PROTEGIDAS (Solo usuarios autenticados)
// ==========================================

Route::middleware('auth')->group(function () {

    // ----------------
    // 🔐 Autenticación y Perfil
    // ----------------
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/logout', [AuthController::class, 'logout']); // Permitir GET también para evitar error 419

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
        // 🔥 RUTAS ESPECÍFICAS PRIMERO (antes de las rutas con parámetros dinámicos)
        Route::get('/favorites', [PropertyController::class, 'getFavorites'])->name('properties.favorites');

        // 🔒 RUTAS PROTEGIDAS - Requieren identidad verificada
        Route::get('/create', [PropertyController::class, 'create'])
            ->middleware('verified.identity')
            ->name('properties.create');

        // 🔥 RUTAS CON PARÁMETROS DINÁMICOS AL FINAL
        Route::post('/', [PropertyController::class, 'store'])
            ->middleware('verified.identity')
            ->name('properties.store');

        Route::get('/{property}/edit', [PropertyController::class, 'edit'])
            ->middleware('verified.identity')
            ->name('properties.edit');

        Route::put('/{property}', [PropertyController::class, 'update'])
            ->middleware('verified.identity')
            ->name('properties.update');

        Route::delete('/{property}', [PropertyController::class, 'destroy'])
            ->middleware('verified.identity')
            ->name('properties.destroy');

        Route::post('/{property}/favorite', [PropertyController::class, 'toggleFavorite'])->name('properties.favorite.toggle');
        Route::get('/{property}/favorite/check', [PropertyController::class, 'checkFavorite'])->name('properties.favorite.check');
        Route::get('/{property}', [PropertyController::class, 'show'])->name('properties.show'); // ⬅️ Esta SIEMPRE al final
    });

    // 🔒 Gestión de imágenes de propiedades - Requieren identidad verificada
    Route::prefix('properties/{property}/images')
        ->middleware('verified.identity')
        ->group(function () {
            Route::post('/', [PropertyController::class, 'uploadImages'])->name('properties.images.upload');
            Route::get('/', [PropertyController::class, 'getImages'])->name('properties.images.index');
            Route::delete('/{image}', [PropertyController::class, 'deleteImage'])->name('properties.images.delete');
            Route::patch('/{image}/primary', [PropertyController::class, 'setPrimaryImage'])->name('properties.images.primary');
            Route::patch('/reorder', [PropertyController::class, 'reorderImages'])->name('properties.images.reorder');
        });

    // Mis propiedades
    Route::get('/my-properties', [PropertyController::class, 'myProperties'])->name('properties.my');

    Route::get('/favorites', function () {
    return view('favorites');
    })->name('favorites');



    
    // ----------------
    // ✅ Verificación de Identidad
    // ----------------
    Route::prefix('verification')->group(function () {
        // 🔥 Configuración (para que el frontend sepa qué está habilitado)
        Route::get('/config', [VerificationController::class, 'getVerificationConfig'])
            ->name('verification.config');

        // 🔥 Vista principal de verificación con VerificationFlow
        Route::get('/identity', function () {
            return view('verification-identity');
        })->name('verification.identity');

        // 🔥 Verificación facial con Verify API
        Route::post('/face-verify', [VerificationController::class, 'verifyFaceTest'])
            ->name('verification.face-verify');
        
        // 🔥 Detección en tiempo real (para el frontend)
        Route::post('/detect-faces-realtime', [VerificationController::class, 'detectFacesRealTime'])
            ->name('detect.faces.realtime');
        
        // 🔥 Gestión de sesión y progreso
        Route::post('/start-session', [VerificationController::class, 'startVerificationSession'])
            ->name('verification.start-session');
        Route::post('/save-progress', [VerificationController::class, 'saveStepProgress'])
            ->name('verification.save-progress');
        Route::get('/progress', [VerificationController::class, 'getVerificationProgress'])
            ->name('verification.progress');

        // 🔥 Validación de documentos
        Route::post('/validate-document', [VerificationController::class, 'validateDocument'])
            ->name('verification.validate-document');
        
        // 🔥 Finalizar verificación
        Route::post('/finalize', [VerificationController::class, 'finalizeVerification'])
            ->name('verification.finalize');

        // OCR (legacy - si aún lo usas)
        Route::post('/identity-ocr', [VerificationController::class, 'verify']);
        Route::post('/test-ocr', [VerificationController::class, 'testOCR']);
        Route::post('/document', [VerificationController::class, 'verifySingleDocument']);
        Route::post('/complete', [VerificationController::class, 'verifyComplete']);
        Route::get('/documents/supported', [VerificationController::class, 'getSupportedDocuments']);

        // Vista de prueba facial
        Route::get('/face-test', [VerificationController::class, 'showFaceTest'])->name('verification.face.test');
        
        // Vista de prueba general
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
        Route::delete('/{conversationId}', [MessageController::class, 'deleteConversation']);
    });

    // Mensajes
    Route::prefix('messages')->group(function () {
        Route::post('/', [MessageController::class, 'store']);
        Route::post('/{message}/reactions', [MessageController::class, 'addReaction']);
        Route::delete('/{message}/reactions', [MessageController::class, 'removeReaction']);
    });

    // ----------------
    // 🔔 SISTEMA DE NOTIFICACIONES
    // ----------------
    Route::prefix('notifications')->group(function () {
        // Vista principal de notificaciones
        Route::get('/', function () {
            return view('notifications');
        })->name('notifications.index');

        // Obtener todas las notificaciones
        Route::get('/api/all', [NotificationController::class, 'index'])
            ->name('notifications.api.index');

        // Obtener solo no leídas
        Route::get('/api/unread', [NotificationController::class, 'unread'])
            ->name('notifications.api.unread');

        // Obtener contador
        Route::get('/api/count', [NotificationController::class, 'count'])
            ->name('notifications.api.count');

        // Marcar como leída
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead'])
            ->name('notifications.read');

        // Marcar todas como leídas
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead'])
            ->name('notifications.mark-all-read');

        // Eliminar notificación
        Route::delete('/{id}', [NotificationController::class, 'destroy'])
            ->name('notifications.destroy');

        // Eliminar todas las leídas
        Route::delete('/clear/read', [NotificationController::class, 'clearRead'])
            ->name('notifications.clear-read');

        // Generar recomendaciones desde búsqueda
        Route::post('/generate-recommendations', [NotificationController::class, 'generateRecommendations'])
            ->name('notifications.generate-recommendations');

        // Crear notificación de mensaje
        Route::post('/message', [NotificationController::class, 'createMessageNotification'])
            ->name('notifications.message');

        // Notificar nueva propiedad
        Route::post('/new-property', [NotificationController::class, 'notifyNewProperty'])
            ->name('notifications.new-property');

        // Notificar cambio de precio
        Route::post('/price-change', [NotificationController::class, 'notifyPriceChange'])
            ->name('notifications.price-change');
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
            Route::patch('/{userId}/revoke-verification', [AdminController::class, 'revokeVerification'])->name('admin.users.revoke-verification');
        });

        // Gestión de propiedades desde admin
        Route::prefix('properties')->group(function () {
            Route::get('/', [AdminController::class, 'getAllProperties'])->name('admin.properties.index');
            Route::patch('/{propertyId}/toggle-active', [AdminController::class, 'togglePropertyActive'])->name('admin.properties.toggle-active');
            Route::patch('/{propertyId}', [AdminController::class, 'updateProperty'])->name('admin.properties.update');
            Route::delete('/{propertyId}', [AdminController::class, 'deleteProperty'])->name('admin.properties.delete');
        });

        // Configuración del sistema
        Route::prefix('config')->group(function () {
            Route::get('/', [SystemConfigController::class, 'index'])->name('admin.config.index');
            Route::post('/update', [SystemConfigController::class, 'update'])->name('admin.config.update');
            Route::post('/update-batch', [SystemConfigController::class, 'updateBatch'])->name('admin.config.update-batch');
        });
    });

}); // FIN Route::middleware('auth')

// ==========================================
// 🌐 API ROUTES PÚBLICAS (Sin autenticación)
// ==========================================

// Configuraciones públicas del sistema
Route::get('/api/public-config', [SystemConfigController::class, 'getPublicConfigs'])->name('public.config');

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

// 🔥 CHATBOT - PÚBLICO (para invitados y autenticados)
Route::prefix('api/chatbot')
    ->middleware(['throttle:100,1'])
    ->group(function () {
        Route::post('/welcome', [ChatbotController::class, 'getWelcomeMessage'])
            ->name('api.chatbot.welcome');
        Route::post('/message', [ChatbotController::class, 'processMessage'])
            ->name('api.chatbot.message');
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

// Propiedades cercanas
Route::post('/api/properties/nearby', [PropertyController::class, 'searchNearby'])
    ->name('api.properties.nearby');

// Configuración del mapa
Route::get('/api/map-config', function() {
    return response()->json([
        'mapboxToken' => config('services.mapbox.access_token'),
        'defaultCenter' => [-103.3496, 20.6597],
        'defaultZoom' => 11
    ]);
});

Route::post('/api/ai/track', [AISearchController::class, 'trackSearch']);

// Ruta para procesar recomendaciones (después de 2 minutos)
Route::post('/search/process-recommendations', [AISearchController::class, 'processRecommendations']);

// ==========================================
// 🔌 API ROUTES CON AUTENTICACIÓN
// ==========================================

Route::get('/test-notification', [NotificationController::class, 'createTestNotification']);

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

    // 🔥 VERIFICACIÓN FACIAL CON RECOGNITION API (threshold 80%)
    Route::post('face-verify-recognition', [VerificationController::class, 'verifyFaceWithRecognition'])
        ->name('api.face.verify.recognition');

    // 🔥 VERIFICACIÓN FACIAL CON VERIFY API (threshold 80% - RECOMENDADO)
    Route::post('face-verify', [VerificationController::class, 'verifyFaceTest'])
        ->name('api.face.verify');

    // 🔥 NUEVO: Endpoint de configuración de verificación (también disponible vía API)
    Route::get('verification/config', [VerificationController::class, 'getVerificationConfig'])
        ->name('api.verification.config');

    // ----------------
    // 💬 Chat API
    // ----------------
    Route::prefix('conversations')->group(function () {
        Route::post('/start', [MessageController::class, 'startConversation']);
        Route::get('/', [MessageController::class, 'getConversations']);
        Route::get('/{conversationId}/messages', [MessageController::class, 'getMessagesByConversationId']);
        Route::post('/{conversationId}/mark-read', [MessageController::class, 'markMessagesAsRead']);
        Route::delete('/{conversationId}', [MessageController::class, 'deleteConversation']);
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
    // ⭐ CALIFICACIONES DE USUARIOS
    // ----------------
    Route::prefix('ratings')->group(function () {
        Route::post('/can-rate', [UserRatingController::class, 'canRate']);
        Route::post('/', [UserRatingController::class, 'store']);
        Route::post('/should-show-prompt', [UserRatingController::class, 'shouldShowRatingPrompt']);
        Route::post('/detect-keywords', [UserRatingController::class, 'detectRatingKeywords']);
        Route::get('/messages/count/{propertyId}/{userId}', [UserRatingController::class, 'getConversationMessageCount']);
        Route::get('/user/{userId}/stats', [UserRatingController::class, 'getUserStats']);
        Route::get('/user/{userId}', [UserRatingController::class, 'getUserRatings']);
        Route::delete('/{ratingId}', [UserRatingController::class, 'destroy']);
    });

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
        Route::put('/{commentId}', [ComunidadController::class, 'updateComment']); // 🆕 EDITAR COMENTARIO
        Route::delete('/{commentId}', [ComunidadController::class, 'deleteComment']);
    });

}); // FIN Route::prefix('api')->middleware('auth')

// ==========================================
// 🤖 AI API ROUTES - SIEMPRE DISPONIBLES
// ==========================================

Route::prefix('ai')->group(function () {

    // RUTAS DE MACHINE LEARNING
    Route::get('/ml-test', [AISearchController::class, 'testML']);
    Route::post('/classify/quick', [AISearchController::class, 'classifyQuick']);
    Route::post('/similar', [AISearchController::class, 'findSimilar']);
    Route::post('/predict/complex', [AISearchController::class, 'predictComplex']);
    Route::post('/predict/ensemble', [AISearchController::class, 'predictEnsemble']);
    Route::post('/compare', [AISearchController::class, 'compareAll']);

    // RUTAS ORIGINALES
    Route::get('/health', [AISearchController::class, 'healthCheck']);
    Route::get('/test', [AISearchController::class, 'testConnection']);
    Route::post('/track', [AISearchController::class, 'trackSearch']);
    Route::get('/patterns/user/{userId}', [AISearchController::class, 'getUserPatterns']);
    Route::get('/patterns/global', [AISearchController::class, 'getGlobalPatterns']);
    Route::post('/predictions', [AISearchController::class, 'getPredictions']);
    Route::get('/suggestions/{userId}', [AISearchController::class, 'getSuggestions']);
    Route::get('/trending', [AISearchController::class, 'getTrending']);
    Route::get('/analytics/dashboard', [AISearchController::class, 'getAnalyticsDashboard']);
    Route::post('/intent', [AISearchController::class, 'analyzeIntent']);
    Route::post('/initialize', [AISearchController::class, 'initialize']);

}); // FIN Route::prefix('ai')

Route::post('/notifications/delete-all', function() {
    try {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $deleted = $user->notifications()->delete();

        \Log::info('🗑️ Notificaciones eliminadas', [
            'user_id' => $user->id,
            'deleted_count' => $deleted
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Todas las notificaciones han sido eliminadas',
            'deleted_count' => $deleted
        ]);

    } catch (\Exception $e) {
        \Log::error('Error eliminando todas las notificaciones', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error al eliminar notificaciones'
        ], 500);
    }
})->middleware('auth')->name('notifications.deleteAll');

// ==========================================
// 🧪 RUTAS DE TESTING/DEBUG (Solo desarrollo)
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

    Route::get('/test-ai', function () {
        return view('test-ai');
    })->name('test.ai');

    Route::get('/ai-search-test', function () {
        return view('test-ai');
    })->name('ai-search-test');

    Route::get('/face-service', function() {
        $apiKey = config('services.compreface.api_key');
        $baseUrl = config('services.compreface.base_url');
        
        $config = [
            'api_key_configured' => !empty($apiKey),
            'api_key_length' => strlen($apiKey ?? ''),
            'api_key_preview' => substr($apiKey ?? '', 0, 8) . '...' . substr($apiKey ?? '', -4),
            'base_url' => $baseUrl
        ];
        
        try {
            $testImage = imagecreatetruecolor(100, 100);
            ob_start();
            imagejpeg($testImage);
            $imageData = ob_get_contents();
            ob_end_clean();
            imagedestroy($testImage);
            
            $response = Http::timeout(10)
                ->withHeaders(['x-api-key' => $apiKey])
                ->attach('file', $imageData, 'test.jpg')
                ->post("{$baseUrl}/api/v1/detection/detect");
            
            if ($response->successful()) {
                $connection = [
                    'status' => 'Conectado ✅',
                    'message' => 'CompreFace Recognition API funcionando',
                    'response_code' => $response->status(),
                    'test_endpoint' => '/api/v1/detection/detect',
                    'api_type' => 'Recognition API'
                ];
            } else {
                $connection = [
                    'status' => 'Error ❌',
                    'message' => 'CompreFace respondió con error',
                    'response_code' => $response->status(),
                    'response_body' => $response->json()
                ];
            }
        } catch (\Exception $e) {
            $connection = [
                'status' => 'Error ❌',
                'message' => 'No se pudo conectar a CompreFace',
                'error' => $e->getMessage()
            ];
        }
        
        return response()->json([
            'service' => 'FaceService con Recognition API ✅',
            'configuration' => $config,
            'connection' => $connection,
            'ready' => $connection['status'] === 'Conectado ✅' ? 'Listo para usar 🚀' : 'Revisar configuración ⚠️'
        ]);
    });

    Route::get('/test-face-detection', function() {
        return view('test-face-detection');
    });

} // FIN if (app()->environment(['local', 'staging']))