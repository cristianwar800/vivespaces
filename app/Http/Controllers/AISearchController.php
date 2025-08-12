<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AISearchController extends Controller
{
    private function getAiApiUrl()
    {
        $ngrokUrl = env('NGROK_URL', 'https://86213ba073ca.ngrok-free.app');
        $useNgrok = env('VITE_USE_NGROK', false);

        if ($useNgrok && $ngrokUrl) {
            // Usar puerto 8002 para el AI
            return rtrim($ngrokUrl, '/') . ':8002';
        }

        return 'http://localhost:8002';
    }

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
                ->get($aiUrl . '/ai/health');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'ai_status' => 'connected',
                    'ai_url' => $aiUrl . '/ai',
                    'ngrok_mode' => env('VITE_USE_NGROK', false),
                    'message' => '✅ Sistema AI funcionando correctamente',
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'ai_status' => 'disconnected',
                'ai_url' => $aiUrl . '/ai',
                'ngrok_mode' => env('VITE_USE_NGROK', false),
                'message' => '❌ Sistema AI no responde',
                'response_code' => $response->status(),
                'response_body' => $response->body()
            ], 503);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'ai_status' => 'error',
                'ai_url' => $this->getAiApiUrl() . '/ai',
                'ngrok_mode' => env('VITE_USE_NGROK', false),
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 503);
        }
    }

    /**
     * Trackear evento de búsqueda
     */
    public function trackSearch(Request $request)
    {
        try {
            $aiUrl = $this->getAiApiUrl();

            // Preparar datos para enviar al AI
            $searchData = [
                'user_id' => auth()->id(),
                'session_id' => $request->input('session_id', session()->getId()),
                'search_query' => $request->input('search_query', ''),
                'search_type' => $request->input('search_type', 'general'),
                'filters' => $request->input('filters', []),
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

            // Enviar al sistema AI a través del proxy
            $response = Http::timeout(15)
                ->withHeaders([
                    'ngrok-skip-browser-warning' => 'true',
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'ViveSpaces-Laravel/1.0'
                ])
                ->post($aiUrl . '/ai/api/search/track', $searchData);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => '✅ Búsqueda trackeada correctamente',
                    'ai_url' => $aiUrl . '/ai'
                ]);
            }

            // Log para debugging
            Log::warning('AI API error', [
                'ai_url' => $aiUrl . '/ai',
                'search_data' => $searchData,
                'response_code' => $response->status(),
                'response_body' => $response->body()
            ]);

            return response()->json([
                'success' => false,
                'message' => '❌ Error guardando datos en AI',
                'ai_url' => $aiUrl . '/ai',
                'error_code' => $response->status(),
                'debug_info' => [
                    'sent_data' => $searchData,
                    'response' => $response->body()
                ]
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error tracking search', [
                'ai_url' => $this->getAiApiUrl() . '/ai',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno: ' . $e->getMessage(),
                'ai_url' => $this->getAiApiUrl() . '/ai'
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
                ->get($aiUrl . "/ai/api/search/patterns/user/{$userId}", [
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
                ->get($aiUrl . '/ai/api/search/patterns/global', [
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
                ->post($aiUrl . '/ai/api/search/predict', [
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
                ->get($aiUrl . "/ai/api/search/suggestions/{$userId}", [
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
                ->get($aiUrl . '/ai/api/search/trending', [
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
                ->get($aiUrl . '/ai/api/search/analytics/dashboard', [
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
                ->post($aiUrl . '/ai/api/search/intent', [
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
                ->post($aiUrl . '/ai/api/search/initialize');

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Sistema AI inicializado correctamente',
                    'ai_url' => $aiUrl . '/ai',
                    'data' => $response->json()
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error inicializando sistema AI',
                'ai_url' => $aiUrl . '/ai'
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
                ->get($aiUrl . '/ai/');

            return response()->json([
                'laravel_status' => '✅ Laravel funcionando',
                'current_host' => $currentHost,
                'env_ngrok_url' => env('NGROK_URL'),
                'use_ngrok' => env('VITE_USE_NGROK'),
                'detected_ai_url' => $aiUrl . '/ai',
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
                'detected_ai_url' => $this->getAiApiUrl() . '/ai',
                'ai_connection' => '❌ Error: ' . $e->getMessage(),
                'timestamp' => now()->format('Y-m-d H:i:s')
            ]);
        }
    }
}
