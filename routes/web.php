<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\Comparison\PhotoComparisonController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================

// Página principal
Route::get('/', function () {
    return view('welcome');
})->name('welcome');

// Verificación de email
Route::post('/send-verification', [EmailVerificationController::class, 'sendVerificationCode'])->name('email.send-verification');
Route::post('/verify-code', [EmailVerificationController::class, 'verifyCode'])->name('email.verify-code');
Route::get('/verification-status', [EmailVerificationController::class, 'getVerificationStatus'])->name('email.verification-status');
Route::get('/verify-email', function () {
    return view('email');
})->name('email.verification');

// ==========================================
// RUTAS PARA INVITADOS (solo no autenticados)
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
// RUTAS PROTEGIDAS (solo usuarios autenticados)
// ==========================================

Route::middleware('auth')->group(function () {

    Route::get('/verificar-identidad', [App\Http\Controllers\Comparison\PhotoComparisonController::class, 'index'])->name('photo.verification');
Route::post('/verificar-fotos', [App\Http\Controllers\Comparison\PhotoComparisonController::class, 'verifyPhotos'])->name('photo.verify');
Route::get('/estado-verificacion', [App\Http\Controllers\Comparison\PhotoComparisonController::class, 'getVerificationStatus'])->name('verification.status');


    // ----------------
    // Autenticación
    // ----------------
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // ----------------
    // Dashboard
    // ----------------
    Route::get('/dashboard', function () {
        return view('dashboard');
    })->name('dashboard');

    // ----------------
    // Perfil de usuario
    // ----------------
    Route::get('/profile', [AuthController::class, 'showProfile'])->name('profile.show');
    Route::post('/profile/update', [AuthController::class, 'updateProfile'])->name('profile.update');
    Route::get('/profile/data', [AuthController::class, 'getProfile'])->name('profile.data');
    Route::get('/profile/get', [AuthController::class, 'getProfile']);

    // ----------------
    // Gestión de propiedades (CRUD completo)
    // ----------------
    // IMPORTANTE: Las rutas específicas van ANTES que las genéricas
    Route::get('/properties/create', [PropertyController::class, 'create'])->name('properties.create');
    Route::post('/properties', [PropertyController::class, 'store'])->name('properties.store');
    Route::get('/properties/{property}/edit', [PropertyController::class, 'edit'])->name('properties.edit');
    Route::put('/properties/{property}', [PropertyController::class, 'update'])->name('properties.update');
    Route::delete('/properties/{property}', [PropertyController::class, 'destroy'])->name('properties.destroy');
    Route::get('/properties/{property}', [PropertyController::class, 'show'])->name('properties.show'); // COMENTADA TEMPORALMENTE
});

// ==========================================
// RUTAS PÚBLICAS DE PROPIEDADES (después de las protegidas)
// ==========================================

// Propiedades públicas (lectura) - MOVIDA AQUÍ PARA EVITAR CONFLICTOS
Route::get('/properties', [PropertyController::class, 'index'])->name('properties');

// ==========================================
// RUTAS DE DEBUG/TESTING (eliminar en producción)
// ==========================================

Route::get('/test-auth', function() {
    if (auth()->check()) {
        return 'Usuario logueado: ' . auth()->user()->name . ' (ID: ' . auth()->id() . ')';
    } else {
        return 'NO estás logueado';
    }
});

Route::get('/test-properties-create', function() {
    return app(App\Http\Controllers\PropertyController::class)->create();
});

Route::get('/test-create-route', function() {
    dd('Esta ruta sí funciona');
});

Route::get('/debug-controller', function() {
    try {
        $controller = app(App\Http\Controllers\PropertyController::class);
        return 'Controller resolved successfully: ' . get_class($controller);
    } catch (\Exception $e) {
        return 'Error resolving controller: ' . $e->getMessage();
    }
});

//rutas json para el chat entre usuarios
// Ruta para obtener información del usuario (para el chat)
// Agregar esta ruta en tu archivo routes/web.php
// En routes/web.php - agregar estas rutas:

// Iniciar conversación (para el botón "Contactar")
Route::post('/api/conversations/start', [MessageController::class, 'startConversation'])->middleware('auth');

// Obtener conversaciones
Route::get('/api/conversations', [MessageController::class, 'getConversations'])->middleware('auth');

// Obtener mensajes de una conversación
Route::get('/api/conversations/{propertyId}/{userId}/messages', [MessageController::class, 'getMessages'])->middleware('auth');

// RUTA DE PRUEBA - ELIMINAR DESPUÉS
Route::get('/test-chat', function() {
    return response()->json([
        'success' => true,
        'message' => 'El endpoint funciona',
        'user' => auth()->user() ? auth()->user()->name : 'No logueado'
    ]);
})->middleware('auth');

// Ruta para la página de chat
Route::get('/chat', function () {
    return view('chat');
})->middleware('auth')->name('chat');

// Ruta para obtener datos del usuario actual
// Ruta para obtener datos del usuario actual
Route::get('/api/user', function() {
    return response()->json([
        'success' => true,
        'user' => auth()->user()
    ]);
})->middleware('auth');

// Ruta temporal para debug de conversaciones
Route::get('/api/conversations/debug', function() {
    $user = auth()->user();
    $conversations = $user->getConversationsWith();

    return response()->json([
        'success' => true,
        'raw_conversations' => $conversations,
        'user_id' => $user->id
    ]);
})->middleware('auth');


// ==========================================
// 🆕 RUTAS ADICIONALES PARA CHAT - CORREGIDAS
// ==========================================

// Rutas corregidas para el nuevo sistema de chat
Route::get('/api/conversations/{conversationId}/messages', [MessageController::class, 'getMessagesByConversationId'])->middleware('auth');
Route::post('/api/conversations/{conversationId}/mark-read', [MessageController::class, 'markMessagesAsRead'])->middleware('auth');
Route::post('/api/messages', [MessageController::class, 'store'])->middleware('auth');

//reaciones de emojis para mensajes
Route::post('/messages/{message}/reactions', [MessageController::class, 'addReaction']);
Route::delete('/messages/{message}/reactions', [MessageController::class, 'removeReaction']);

// Ruta de debug temporal para verificar conversaciones
Route::get('/debug-conversations', function() {
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


Route::get('/api/properties-map', function() {
    $properties = \App\Models\Property::where('is_active', true)
        ->select('id', 'title', 'description', 'address', 'city', 'state', 'price', 'type', 'bedrooms', 'bathrooms', 'area', 'is_active')
        ->get();

    return response()->json([
        'success' => true,
        'properties' => $properties
    ]);
});



//RUTAS OCR
// Verificación de identidad
Route::middleware('auth')->group(function () {
    Route::post('/verify-identity', [App\Http\Controllers\VerificationController::class, 'verify']);
    Route::post('/test-ocr', [App\Http\Controllers\VerificationController::class, 'testOCR']);
});


Route::get('/test-verification', function () {
    return view('test-verification');
})->middleware('auth');



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


// En routes/web.php, dentro del grupo middleware('auth'):

// ----------------
// Verificación de Identidad con Fotos
// ----------------
Route::get('/test-model-files', function() {
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
