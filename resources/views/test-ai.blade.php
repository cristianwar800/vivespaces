{{-- resources/views/test-ai.blade.php --}}
@extends('layouts.app')

@section('title', 'ViveSpaces AI - Pruebas de Algoritmos ML')

@section('content')
    <!-- Configuración para React -->
    <script id="ai-config" type="application/json">
        {!! json_encode([
            'apiBaseUrl' => '/ai',
            'fastApiUrl' => 'http://localhost:8001',
            'algorithms' => [
                'naive_bayes' => [
                    'name' => 'Naive Bayes',
                    'endpoint' => '/classify/quick',
                    'icon' => '⚡',
                    'color' => 'yellow',
                    'description' => 'Clasificación ultra rápida'
                ],
                'knn' => [
                    'name' => 'KNN',
                    'endpoint' => '/similar',
                    'icon' => '👥',
                    'color' => 'blue',
                    'description' => 'Búsquedas similares'
                ],
                'mlp' => [
                    'name' => 'MLP',
                    'endpoint' => '/predict/complex',
                    'icon' => '🧠',
                    'color' => 'purple',
                    'description' => 'Red Neuronal'
                ],
                'ensemble' => [
                    'name' => 'Ensemble',
                    'endpoint' => '/predict/ensemble',
                    'icon' => '🎯',
                    'color' => 'green',
                    'description' => 'Los 3 combinados'
                ]
            ],
            'testQueries' => [
                'casa venta zapopan con piscina',
                'departamento amueblado estudiante barato',
                'oficina corporativa andares',
                'terreno comercial guadalajara',
                'casa 3 recámaras jardín privado'
            ],
            'csrfToken' => csrf_token()
        ]) !!}
    </script>

    <!-- Contenedor de React -->
    <div id="test-ai-root"></div>

    <!-- Estilos adicionales -->
    <style>
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
            50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
        }

        .ai-test-success {
            animation: pulse-glow 2s infinite;
        }

        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }

        .loading-shimmer {
            background: linear-gradient(
                90deg,
                #f0f0f0 25%,
                #e0e0e0 50%,
                #f0f0f0 75%
            );
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
        }
    </style>
@endsection
