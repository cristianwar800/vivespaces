{{-- resources/views/fastapi-recomendador.blade.php --}}
@extends('layouts.app')

@section('title', 'Buscar Propiedades - ViveSpaces')

@section('content')
    {{-- Configuración para React --}}
    <script id="recomendador-config" type="application/json">
        {!! json_encode([
            'user' => auth()->check() ? [
                'id' => auth()->id(),
                'name' => auth()->user()->name,
                'email' => auth()->user()->email
            ] : null,
            'apiEndpoints' => [
                'track' => '/ai/track',
                'similar' => '/ai/similar',
                'classify' => '/ai/classify/quick',
                'searchProperties' => '/api/search/properties',
                'nearbyProperties' => '/api/properties/nearby'
            ],
            'csrfToken' => csrf_token()
        ]) !!}
    </script>

    {{-- Contenedor principal --}}
    <div id="fastapi-recomendador-root"></div>

    {{-- Script global para comunicación con otros componentes --}}
    @push('scripts')
        <script>
            // API global para que Navbar y LayoutMap envíen búsquedas
            window.RecomendadorAPI = {
                // Navbar envía búsqueda
                notifySearch: function(query, filters = {}) {
                    window.dispatchEvent(new CustomEvent('recomendador:nueva-busqueda', {
                        detail: {
                            source: 'navbar',
                            query: query,
                            filters: filters
                        }
                    }));
                },

                // LayoutMap envía búsqueda
                notifyMapSearch: function(lat, lng, radius, resultados) {
                    window.dispatchEvent(new CustomEvent('recomendador:nueva-busqueda', {
                        detail: {
                            source: 'map',
                            coordinates: { lat, lng },
                            radius: radius,
                            propertiesFound: resultados
                        }
                    }));
                }
            };

            console.log('✅ Recomendador API cargado');
        </script>
    @endpush
@endsection
