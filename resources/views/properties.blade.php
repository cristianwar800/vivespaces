    @extends('layouts.app')

    @section('title', 'ViveSpaces - Propiedades')

    @section('content')
        <!-- Datos para React -->
        <script id="properties-data" type="application/json">
            {!! json_encode([
                'properties' => $properties ?? [],
                'property' => $property ?? null,
                'currentPage' => $currentPage ?? 'index',
                'csrfToken' => csrf_token(),
                'routes' => [
                    'index' => route('properties'),
                    'store' => route('properties.store'),
                    'update' => isset($property) ? route('properties.update', $property) : '',
                    'destroy' => isset($property) ? route('properties.destroy', $property) : ''
                ],
                'messages' => [
                    'success' => session('succeess'),
                    'errors' => $errors->toArray()
                ]
            ]) !!}
        </script>

        <!-- Datos del usuario autenticado -->
        @auth
        <script id="user-data" type="application/json">
            {!! json_encode(auth()->user()) !!}
        </script>
        @else
        <script id="user-data" type="application/json">
            null
        </script>
        @endauth

        <!-- Contenedor de React -->
        <div id="properties-root"></div>
    @endsection
