<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AISearchController extends Controller
{
        private function getAiApiUrl()
    {
        // Detectar si estamos dentro de Kubernetes
        if (env('KUBERNETES_SERVICE_HOST')) {
            // Usar servicio interno de Kubernetes
            return 'http://ai-service-internal.vivespaces-ai.svc.cluster.local:8001';
        }
        
        // Intentar usar host.docker.internal (funciona en Docker Desktop)
        if (gethostbyname('host.docker.internal') !== 'host.docker.internal') {
            return 'http://host.docker.internal:30801';
        }
        
        // Fallback para desarrollo local
        return 'http://localhost:30801';
    }
    /**
     * 🔥 Calcular delay óptimo según contexto
     */
    private function calculateOptimalDelay($searchQuery, $searchType)
    {
        // Búsqueda de prueba/testing rápido
        if (app()->environment('local')) {
            // Búsquedas específicas (más de 3 palabras) = más rápido
            if (str_word_count($searchQuery) >= 3) {
                return 5; // 5 segundos
            }
            return 10; // 10 segundos en local
        }

        // PRODUCCIÓN
        // Búsquedas muy específicas = más rápido (usuario sabe lo que quiere)
        if (strlen($searchQuery) > 20 || str_word_count($searchQuery) >= 4) {
            return 30; // 30 segundos
        }

        // Búsquedas del mapa = más tiempo (usuario explorando)
        if ($searchType === 'map_radar') {
            return 90; // 1.5 minutos
        }

        // Búsqueda general = tiempo medio
        return 60; // 1 minuto (default)
    }

    /**
     * Detectar tipo de dispositivo
     */
    private function detectDevice(Request $request)
    {
        $userAgent = $request->header('User-Agent', '');

        if (preg_match('/Mobile|Android|iPhone/', $userAgent)) {
            return 'mobile';
        }

        if (preg_match('/iPad|Tablet/', $userAgent)) {
            return 'tablet';
        }

        return 'desktop';
    }

    /**
     * ============================================
     * MÉTODOS DE MACHINE LEARNING (NUEVOS)
     * ============================================
     */

    /**
     * Clasificación RÁPIDA con Naive Bayes
     * POST /ai/classify/quick
     */
    public function classifyQuick(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2|max:500'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(5)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/ml/classify/quick', [
                    'query' => $request->input('query')
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al clasificar',
                'error_code' => $response->status(),
                'ai_url' => $aiUrl
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error en classifyQuick: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Búsquedas SIMILARES con KNN
     * POST /ai/similar
     */
    public function findSimilar(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2|max:500',
                'n_similar' => 'nullable|integer|min:1|max:10'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(5)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/ml/similar', [
                    'query' => $request->input('query'),
                    'n_similar' => $request->input('n_similar', 5)
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al buscar similares',
                'error_code' => $response->status(),
                'ai_url' => $aiUrl
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error en findSimilar: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Predicción COMPLEJA con MLP (Red Neuronal)
     * POST /ai/predict/complex
     */
    public function predictComplex(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2|max:500'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(5)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/ml/predict/complex', [
                    'query' => $request->input('query')
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error en predicción compleja',
                'error_code' => $response->status(),
                'ai_url' => $aiUrl
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error en predictComplex: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ENSEMBLE - Combina los 3 algoritmos
     * POST /ai/predict/ensemble
     */
    public function predictEnsemble(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2|max:500'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(5)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/ml/predict/ensemble', [
                    'query' => $request->input('query')
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error en ensemble',
                'error_code' => $response->status(),
                'ai_url' => $aiUrl
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error en predictEnsemble: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * COMPARAR TODOS los algoritmos
     * POST /ai/compare
     */
    public function compareAll(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2|max:500',
                'n_similar' => 'nullable|integer|min:1|max:10'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(10)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/ml/compare', [
                    'query' => $request->input('query'),
                    'n_similar' => $request->input('n_similar', 5)
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al comparar algoritmos',
                'error_code' => $response->status(),
                'ai_url' => $aiUrl
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error en compareAll: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test de algoritmos ML
     * GET /ai/ml-test
     */
    public function testML()
    {
        try {
            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(10)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . '/api/test');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => '✅ Algoritmos ML funcionando correctamente',
                    'ai_url' => $aiUrl,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => '❌ Error en test de ML',
                'ai_url' => $aiUrl,
                'error_code' => $response->status()
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error en testML: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
                'ai_url' => $this->getAiApiUrl()
            ], 500);
        }
    }

    /**
     * ============================================
     * MÉTODOS ORIGINALES (YA EXISTENTES)
     * ============================================
     */

    /**
     * Healthcheck del sistema AI
     */
    public function healthCheck()
    {
        try {
            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . '/health');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'ai_status' => 'connected',
                    'ai_url' => $aiUrl,
                    'ngrok_mode' => env('VITE_USE_NGROK', false),
                    'message' => '✅ Sistema AI funcionando correctamente',
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'ai_status' => 'disconnected',
                'ai_url' => $aiUrl,
                'ngrok_mode' => env('VITE_USE_NGROK', false),
                'message' => '❌ Sistema AI no responde',
                'response_code' => $response->status(),
                'response_body' => $response->body()
            ], 503);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'ai_status' => 'error',
                'ai_url' => $this->getAiApiUrl(),
                'ngrok_mode' => env('VITE_USE_NGROK', false),
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 503);
        }
    }

    /**
     * 🔥 DEFINITIVO: Trackear búsqueda y enviar notificación después de un delay (SIN archivos extra)
     */
            /**
 * 🔥 DEFINITIVO: Trackear búsqueda y enviar notificación después de un delay (SIN archivos extra)
 */
public function trackSearch(Request $request)
{
    try {
        $aiUrl = $this->getAiApiUrl();

        // 🔥 FILTRAR SOLO BÚSQUEDAS REALES
        $searchQuery = $request->input('search_query', '');
        $searchType = $request->input('search_type', 'general');

        // Lista de tipos que NO son búsquedas
        $nonSearchTypes = [
            'scroll_depth',
            'page_time',
            'result_click',
            'property_view',
            'contact_click'
        ];

        $isActualSearch = !in_array($searchType, $nonSearchTypes) && !empty($searchQuery);

        Log::info('==================== TRACK EVENT INICIADO ====================');
        Log::info('📥 Event recibido:', [
            'user_id' => auth()->id(),
            'search_query' => $searchQuery,
            'search_type' => $searchType,
            'is_authenticated' => auth()->check(),
            'is_actual_search' => $isActualSearch ? 'YES' : 'NO'
        ]);

        if (!$isActualSearch) {
            Log::info('ℹ️ Evento de tracking (no búsqueda) - Solo guardando en BD');
        }

        $filters = $request->input('filters', []);
        if (is_array($filters) && empty($filters)) {
            $filters = new \stdClass();
        }

        $searchData = [
            'user_id' => auth()->id(),
            'session_id' => $request->input('session_id', session()->getId()),
            'search_query' => $searchQuery,
            'search_type' => $searchType,
            'filters' => $filters,
            'results_count' => $request->input('results_count', 0),
            'device' => $this->detectDevice($request),
            'page_url' => $request->input('page_url', request()->fullUrl()),
            'referrer' => $request->input('referrer', request()->header('referer')),
            'click_position' => $request->input('click_position'),
            'time_spent' => $request->input('time_spent'),
            'scroll_depth' => $request->input('scroll_depth'),
            'property_id' => $request->input('property_id'),
            'element_clicked' => $request->input('element_clicked'),
            'filter_changed' => $request->input('filter_changed')
        ];

        Log::info('📤 Enviando a FastAPI:', [
            'url' => $aiUrl . '/api/search/track',
            'user_id' => $searchData['user_id'],
            'query' => $searchQuery,
            'type' => $searchType
        ]);

        $response = Http::timeout(15)
            ->withHeaders([
                'ngrok-skip-browser-warning' => 'true',
                'Content-Type' => 'application/json',
                'User-Agent' => 'ViveSpaces-Laravel/1.0'
            ])
            ->post($aiUrl . '/api/search/track', $searchData);

        if ($response->successful()) {
            Log::info('✅ Evento guardado exitosamente');

            // 🔥 SOLO PROCESAR RECOMENDACIONES SI ES UNA BÚSQUEDA REAL
            if ($isActualSearch) {
                $shouldSchedule = auth()->check() && strlen($searchQuery) >= 3;

                Log::info('🔍 Es búsqueda real - Verificando condiciones para recomendaciones:', [
                    'user_authenticated' => auth()->check(),
                    'user_id' => auth()->id(),
                    'query_length' => strlen($searchQuery),
                    'should_schedule' => $shouldSchedule
                ]);

                if ($shouldSchedule) {
                    // 🔥 DELAY ALEATORIO entre 2-5 minutos
                    $minDelay = 120;  // 2 minutos en segundos
                    $maxDelay = 300;  // 5 minutos en segundos

                    // En local: 2-5 minutos (igual que producción)
                    if (app()->environment('local')) {
                        $minDelay = 120;  // 2 minutos
                        $maxDelay = 300;  // 5 minutos
                    }

                    $delay = rand($minDelay, $maxDelay);
                    $delayMinutes = round($delay / 60, 1);
                    $userId = auth()->id();

                    Log::info('⏰ Programando recomendaciones con delay aleatorio', [
                        'delay_seconds' => $delay,
                        'delay_minutes' => $delayMinutes,
                        'query' => $searchQuery,
                        'will_execute_around' => now()->addSeconds($delay)->format('H:i:s')
                    ]);

                    // 🔥 CREAR SCRIPT PHP TEMPORAL PARA EJECUTAR
                    $scriptPath = storage_path('app/recommendation_' . $userId . '_' . time() . '.php');
                    $searchQueryEscaped = str_replace("'", "\\'", $searchQuery);

                    $scriptContent = <<<PHP
<?php
require_once __DIR__ . '/../../vendor/autoload.php';

\$app = require_once __DIR__ . '/../../bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

sleep({$delay});

\$user = \App\Models\User::find({$userId});
if (\$user) {
    auth()->setUser(\$user);

    \$controller = new \App\Http\Controllers\AISearchController();
    \$request = new \Illuminate\Http\Request();
    \$request->merge([
        'search_query' => '{$searchQueryEscaped}',
        'search_type' => '{$searchType}'
    ]);

    \$controller->processRecommendations(\$request);
}

@unlink(__FILE__);
PHP;

                    file_put_contents($scriptPath, $scriptContent);

                    // Ejecutar en segundo plano
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        // Windows
                        pclose(popen("start /B php " . escapeshellarg($scriptPath), "r"));
                    } else {
                        // Linux/Mac
                        exec("php " . escapeshellarg($scriptPath) . " > /dev/null 2>&1 &");
                    }

                    Log::info('✅ Job programado en segundo plano', [
                        'script_path' => $scriptPath,
                        'delay_seconds' => $delay,
                        'delay_minutes' => $delayMinutes
                    ]);

                } else {
                    Log::info('ℹ️ No se programarán recomendaciones:', [
                        'reason' => !auth()->check() ? 'Usuario no autenticado' : 'Query muy corto',
                        'query_length' => strlen($searchQuery)
                    ]);
                }
            } else {
                Log::info('ℹ️ Evento de tracking guardado (no se procesarán recomendaciones)');
            }

            return response()->json([
                'success' => true,
                'message' => '✅ Evento guardado correctamente',
                'event_type' => $searchType,
                'is_search' => $isActualSearch
            ]);
        }

        Log::warning('⚠️ AI API error', [
            'ai_url' => $aiUrl,
            'response_code' => $response->status()
        ]);

        return response()->json([
            'success' => false,
            'message' => '❌ Error guardando datos en AI',
            'error_code' => $response->status()
        ], 500);

    } catch (\Exception $e) {
        Log::error('❌ Error tracking event', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error interno: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * 🔥 ULTRA MEJORADO: Procesar recomendaciones con búsqueda PRECISA
     */
    /**
 * 🔥 ULTRA MEJORADO: Procesar recomendaciones con búsqueda PRECISA y filtrado estricto
 */
public function processRecommendations(Request $request)
{
    try {
        $userId = auth()->id();

        $request->validate([
            'search_query' => 'required|string|min:2',
            'search_type' => 'nullable|string'
        ]);

        $searchQuery = $request->input('search_query');
        $searchType = $request->input('search_type', 'general');

        Log::info('🔄 Procesando recomendaciones', [
            'user_id' => $userId,
            'query' => $searchQuery,
            'type' => $searchType
        ]);

        $user = \App\Models\User::find($userId);
        if (!$user) {
            Log::warning('❌ Usuario no encontrado', ['user_id' => $userId]);
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado'
            ], 404);
        }

        // 🔥 VALIDAR BÚSQUEDAS REPETIDAS (últimos 30 minutos)
        $recentSearches = \DB::table('search_events')
            ->where('user_id', $userId)
            ->where('search_query', 'like', "%{$searchQuery}%")
            ->where('created_at', '>', now()->subMinutes(30))
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $sameSearchCount = $recentSearches->filter(function($search) use ($searchQuery) {
            return strtolower(trim($search->search_query)) === strtolower(trim($searchQuery));
        })->count();

        if ($sameSearchCount >= 3) {
            Log::info('⏸️ Usuario buscó lo mismo varias veces - Omitiendo notificación', [
                'user_id' => $userId,
                'query' => $searchQuery,
                'repeticiones' => $sameSearchCount
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Búsqueda repetida detectada',
                'repeated_searches' => $sameSearchCount,
                'recommendation_sent' => false
            ]);
        }

        // 🔥 RATE LIMITING (15 minutos)
        $lastNotification = $user->notifications()
            ->where('type', 'App\Notifications\TestNotification')
            ->where('created_at', '>', now()->subMinutes(15))
            ->first();

        if ($lastNotification) {
            $minutesAgo = $lastNotification->created_at->diffInMinutes(now());
            Log::info('⏸️ Cooldown activo', [
                'user_id' => $userId,
                'cooldown_remaining' => 15 - $minutesAgo . ' minutos'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cooldown activo',
                'cooldown_remaining_minutes' => 15 - $minutesAgo,
                'recommendation_sent' => false
            ]);
        }

        // 🔥 VALIDAR NOTIFICACIÓN DUPLICADA (24 horas)
        $recentNotifications = $user->notifications()
            ->where('type', 'App\Notifications\TestNotification')
            ->where('created_at', '>', now()->subHours(24))
            ->get();

        $sameQueryNotification = $recentNotifications->filter(function($notification) use ($searchQuery) {
            $data = $notification->data;
            if (isset($data['original_query'])) {
                return strtolower(trim($data['original_query'])) === strtolower(trim($searchQuery));
            }
            return false;
        })->first();

        if ($sameQueryNotification) {
            $hoursAgo = $sameQueryNotification->created_at->diffInHours(now());
            Log::info('⏸️ Ya se envió notificación para esta búsqueda', [
                'user_id' => $userId,
                'query' => $searchQuery,
                'last_sent' => "{$hoursAgo} horas atrás"
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notificación ya enviada',
                'last_sent_hours_ago' => $hoursAgo,
                'recommendation_sent' => false
            ]);
        }

        // 🔥 LÍMITE DIARIO (5 notificaciones)
        $todayNotifications = $user->notifications()
            ->where('type', 'App\Notifications\TestNotification')
            ->whereDate('created_at', today())
            ->count();

        if ($todayNotifications >= 5) {
            Log::info('⏸️ Límite diario alcanzado', [
                'user_id' => $userId,
                'today_count' => $todayNotifications
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Límite diario alcanzado',
                'today_count' => $todayNotifications,
                'recommendation_sent' => false
            ]);
        }

        // 🔥 BÚSQUEDA PRECISA DE PROPIEDADES
        Log::info('🔍 Buscando propiedades en base de datos...');

        // Extraer palabras clave (mínimo 3 caracteres)
        $keywords = array_filter(explode(' ', strtolower($searchQuery)), function($word) {
            return strlen($word) >= 3;
        });

        Log::info('🔑 Keywords extraídos:', ['keywords' => $keywords]);

        // 🔥 BÚSQUEDA MÁS ESTRICTA Y PRECISA
        $properties = \App\Models\Property::query()
            ->where('is_active', true)
            ->where(function($query) use ($searchQuery, $keywords) {
                if (count($keywords) > 0) {
                    // Si hay keywords, buscar que AL MENOS coincida UNO
                    $query->where(function($subQuery) use ($searchQuery, $keywords) {
                        // Búsqueda exacta del query completo
                        $subQuery->where('title', 'like', "%{$searchQuery}%")
                            ->orWhere('description', 'like', "%{$searchQuery}%")
                            ->orWhere('city', 'like', "%{$searchQuery}%")
                            ->orWhere('address', 'like', "%{$searchQuery}%");

                        // O buscar por keywords individuales
                        foreach ($keywords as $keyword) {
                            $subQuery->orWhere(function($keywordQuery) use ($keyword) {
                                $keywordQuery->where('title', 'like', "%{$keyword}%")
                                    ->orWhere('description', 'like', "%{$keyword}%")
                                    ->orWhere('city', 'like', "%{$keyword}%")
                                    ->orWhere('type', 'like', "%{$keyword}%")
                                    ->orWhere('address', 'like', "%{$keyword}%");
                            });
                        }
                    });
                } else {
                    // Si no hay keywords, solo búsqueda exacta
                    $query->where('title', 'like', "%{$searchQuery}%")
                        ->orWhere('description', 'like', "%{$searchQuery}%")
                        ->orWhere('city', 'like', "%{$searchQuery}%")
                        ->orWhere('address', 'like', "%{$searchQuery}%");
                }
            })
            ->orderByRaw("
                CASE
                    WHEN LOWER(title) LIKE ? THEN 1
                    WHEN LOWER(city) LIKE ? THEN 2
                    WHEN LOWER(description) LIKE ? THEN 3
                    WHEN LOWER(address) LIKE ? THEN 4
                    ELSE 5
                END
            ", [
                '%' . strtolower($searchQuery) . '%',
                '%' . strtolower($searchQuery) . '%',
                '%' . strtolower($searchQuery) . '%',
                '%' . strtolower($searchQuery) . '%'
            ])
            ->orderBy('created_at', 'desc')
            ->get(); // Sin limit aquí, lo aplicamos después del filtro

        // 🔥 CALCULAR SCORE DE RELEVANCIA PARA CADA PROPIEDAD
        $propertiesWithScore = $properties->map(function($property) use ($searchQuery, $keywords) {
            $score = 0;

            // SCORE POR COINCIDENCIA EXACTA
            if (stripos($property->title, $searchQuery) !== false) {
                $score += 10; // Coincidencia exacta en título
            }
            if (stripos($property->city, $searchQuery) !== false) {
                $score += 8; // Coincidencia en ciudad
            }
            if (stripos($property->description, $searchQuery) !== false) {
                $score += 5; // Coincidencia en descripción
            }
            if (stripos($property->address, $searchQuery) !== false) {
                $score += 5; // Coincidencia en dirección
            }
            if (stripos($property->type, $searchQuery) !== false) {
                $score += 7; // Coincidencia en tipo
            }

            // SCORE POR KEYWORDS INDIVIDUALES
            foreach ($keywords as $keyword) {
                if (stripos($property->title, $keyword) !== false) {
                    $score += 3;
                }
                if (stripos($property->city, $keyword) !== false) {
                    $score += 2;
                }
                if (stripos($property->type, $keyword) !== false) {
                    $score += 2;
                }
                if (stripos($property->description, $keyword) !== false) {
                    $score += 1;
                }
            }

            $property->relevance_score = $score;
            return $property;
        });

        // 🔥 FILTRAR: Solo propiedades con score >= 5 (MÁS ESTRICTO)
        $relevantProperties = $propertiesWithScore
            ->filter(function($property) {
                return $property->relevance_score >= 5; // Mínimo score de 5
            })
            ->sortByDesc('relevance_score')
            ->take(10) // Máximo 10 propiedades
            ->values();

        $propertiesCount = $relevantProperties->count();

        Log::info('📊 Propiedades encontradas:', [
            'total_raw' => $properties->count(),
            'relevant_filtered' => $propertiesCount,
            'query' => $searchQuery,
            'keywords' => $keywords
        ]);

        // 🔥 SI NO HAY PROPIEDADES RELEVANTES, NO CONTINUAR
        if ($propertiesCount === 0) {
            Log::info('ℹ️ No se encontraron propiedades relevantes', [
                'query' => $searchQuery
            ]);

            return response()->json([
                'success' => true,
                'message' => 'No hay propiedades relevantes',
                'properties_found' => 0,
                'recommendation_sent' => false
            ]);
        }

        // 🔥 BUSCAR BÚSQUEDAS SIMILARES CON KNN
        $similarSearches = [];
        $aiUrl = $this->getAiApiUrl();

        try {
            $similarResponse = Http::timeout(5)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/ml/similar', [
                    'query' => $searchQuery,
                    'n_similar' => 3
                ]);

            if ($similarResponse->successful()) {
                $data = $similarResponse->json();
                $similarSearches = $data['result']['similar_searches'] ?? [];
                Log::info('✅ Búsquedas similares:', ['count' => count($similarSearches)]);
            }
        } catch (\Exception $e) {
            Log::info('ℹ️ KNN no disponible');
        }

        // 🔥 MENSAJES PERSONALIZADOS
        $firstName = explode(' ', $user->name)[0];
        $topProperties = $relevantProperties->take(5);

        $propertyList = $topProperties->take(2)->map(function($prop) {
            $price = '$' . number_format($prop->price, 0, '.', ',');
            return "{$prop->title} ({$price})";
        })->join(' y ');

        // 🔥 MENSAJES VARIADOS
        if (count($similarSearches) > 0 && $propertiesCount > 0) {
            $titles = [
                "¡Hola {$firstName}! Encontramos {$propertiesCount} propiedades para ti",
                "🏠 {$firstName}, tenemos {$propertiesCount} opciones que te pueden interesar",
                "✨ {$propertiesCount} propiedades perfectas basadas en tu búsqueda",
            ];

            $title = $titles[array_rand($titles)];

            $messages = [
                "Basándonos en tu búsqueda de '{$searchQuery}', encontramos propiedades relevantes: {$propertyList}.",
                "Encontramos {$propertiesCount} propiedades que coinciden con '{$searchQuery}': {$propertyList}.",
                "¡Buenas noticias! Hay {$propertiesCount} propiedades relacionadas con '{$searchQuery}': {$propertyList}.",
            ];

            $message = $messages[array_rand($messages)];

            if (count($similarSearches) > 0) {
                $otherSearches = collect($similarSearches)
                    ->take(2)
                    ->pluck('query')
                    ->join(' y ');
                $message .= " Otros usuarios también buscaron: {$otherSearches}.";
            }

        } else {
            $titles = [
                "🏠 {$propertiesCount} propiedades disponibles",
                "✨ Encontramos {$propertiesCount} opciones para ti",
                "🎯 {$firstName}, mira estas {$propertiesCount} propiedades",
            ];

            $title = $titles[array_rand($titles)];

            if ($propertiesCount === 1) {
                $prop = $topProperties->first();
                $message = "Encontramos una propiedad perfecta para '{$searchQuery}': {$prop->title} en {$prop->city}.";
            } else {
                $messages = [
                    "Encontramos {$propertiesCount} propiedades relacionadas con '{$searchQuery}': {$propertyList}.",
                    "Hay {$propertiesCount} propiedades que coinciden: {$propertyList}.",
                    "¡Genial! Tenemos {$propertiesCount} propiedades relevantes: {$propertyList}.",
                ];
                $message = $messages[array_rand($messages)];
            }
        }

        $actionUrl = "/properties?search=" . urlencode($searchQuery);

        // 🔥 CREAR NOTIFICACIÓN
        Log::info('📬 Creando notificación...', [
            'title' => $title,
            'properties_count' => $propertiesCount
        ]);

        $user->notify(new \App\Notifications\TestNotification([
            'type' => 'property_recommendation',
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'action_text' => 'Ver propiedades',
            'properties' => $topProperties->map(function($prop) {
                return [
                    'id' => $prop->id,
                    'title' => $prop->title,
                    'price' => $prop->price,
                    'city' => $prop->city,
                    'type' => $prop->type,
                    'image' => $prop->image
                ];
            })->toArray(),
            'properties_count' => $propertiesCount,
            'original_query' => $searchQuery,
            'search_type' => $searchType
        ]));

        // 🔥 EVENTO TIEMPO REAL
        $notification = $user->notifications()->latest()->first();
        if ($notification) {
            broadcast(new \App\Events\NotificationSent($notification, $user->id));
        }

        Log::info('✅ Recomendación enviada', [
            'user_id' => $userId,
            'query' => $searchQuery,
            'properties_found' => $propertiesCount,
            'similar_searches' => count($similarSearches)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Recomendación enviada exitosamente',
            'properties_found' => $propertiesCount,
            'similar_searches_count' => count($similarSearches),
            'recommendation_sent' => true,
            'cooldown_minutes' => 15,
            'daily_limit_remaining' => 5 - $todayNotifications - 1
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Error en processRecommendations', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Obtener patrones de un usuario
     */
    public function getUserPatterns($userId, Request $request)
    {
        try {
            $aiUrl = $this->getAiApiUrl();
            $daysBack = $request->input('days_back', 30);

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . "/api/search/patterns/user/{$userId}", [
                    'days_back' => $daysBack
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo patrones del usuario'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error getting user patterns: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Obtener patrones globales
     */
    public function getGlobalPatterns(Request $request)
    {
        try {
            $aiUrl = $this->getAiApiUrl();
            $daysBack = $request->input('days_back', 30);

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . '/api/search/patterns/global', [
                    'days_back' => $daysBack
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo patrones globales'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error getting global patterns: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Obtener predicciones de búsqueda
     */
    public function getPredictions(Request $request)
    {
        try {
            $request->validate([
                'user_id' => 'required|integer',
                'current_query' => 'required|string'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/search/predict', [
                    'user_id' => $request->input('user_id'),
                    'current_query' => $request->input('current_query')
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error generando predicciones'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error getting predictions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Obtener sugerencias inteligentes
     */
    public function getSuggestions($userId, Request $request)
    {
        try {
            $aiUrl = $this->getAiApiUrl();
            $currentQuery = $request->input('current_query', '');
            $limit = $request->input('limit', 5);

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . "/api/search/suggestions/{$userId}", [
                    'current_query' => $currentQuery,
                    'limit' => $limit
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo sugerencias'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error getting suggestions: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Obtener trending searches
     */
    public function getTrending(Request $request)
    {
        try {
            $aiUrl = $this->getAiApiUrl();
            $daysBack = $request->input('days_back', 7);
            $limit = $request->input('limit', 10);

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . '/api/search/trending', [
                    'days_back' => $daysBack,
                    'limit' => $limit
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo trending'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error getting trending: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Obtener dashboard completo de analytics
     */
    public function getAnalyticsDashboard(Request $request)
    {
        try {
            $aiUrl = $this->getAiApiUrl();
            $daysBack = $request->input('days_back', 30);

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . '/api/search/analytics/dashboard', [
                    'days_back' => $daysBack
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo dashboard'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error getting analytics dashboard: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Analizar intención de búsqueda
     */
    public function analyzeIntent(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string'
            ]);

            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/search/intent', [
                    'query' => $request->input('query')
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error analizando intención'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error analyzing intent: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error conectando con sistema AI'
            ], 500);
        }
    }

    /**
     * Inicializar sistema AI
     */
    public function initialize()
    {
        try {
            $aiUrl = $this->getAiApiUrl();

            $response = Http::timeout(30)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/api/search/initialize');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Sistema AI inicializado correctamente',
                    'ai_url' => $aiUrl,
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error inicializando sistema AI',
                'ai_url' => $aiUrl
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error inicializando AI: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error de conexión con sistema AI'
            ], 500);
        }
    }

    /**
     * Test de conexión con información detallada
     */
    public function testConnection()
    {
        try {
            $aiUrl = $this->getAiApiUrl();
            $currentHost = request()->getHost();

            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->get($aiUrl . '/');

            return response()->json([
                'laravel_status' => '✅ Laravel funcionando',
                'current_host' => $currentHost,
                'env_ngrok_url' => env('NGROK_URL'),
                'use_ngrok' => env('VITE_USE_NGROK'),
                'detected_ai_url' => $aiUrl,
                'ai_connection' => $response->successful() ? '✅ AI conectado' : '❌ AI desconectado',
                'ai_response' => $response->successful() ? $response->json() : null,
                'response_code' => $response->status(),
                'headers_sent' => [
                    'ngrok-skip-browser-warning' => 'true',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ],
                'timestamp' => now()->format('Y-m-d H:i:s')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'laravel_status' => '✅ Laravel funcionando',
                'current_host' => request()->getHost(),
                'env_ngrok_url' => env('NGROK_URL'),
                'use_ngrok' => env('VITE_USE_NGROK'),
                'detected_ai_url' => $this->getAiApiUrl(),
                'ai_connection' => '❌ Error: ' . $e->getMessage(),
                'timestamp' => now()->format('Y-m-d H:i:s')
            ]);
        }
    }
}
