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
                'verificationRequired' => $verificationRequired ?? true,
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
            {!! json_encode([
                'id' => auth()->user()->id,
                'name' => auth()->user()->name,
                'last_name' => auth()->user()->last_name,
                'email' => auth()->user()->email,
                'role' => auth()->user()->role,
                'profile_photo' => auth()->user()->profile_photo,
                'is_identity_verified' => auth()->user()->is_identity_verified
            ]) !!}
        </script>
        @else
        <script id="user-data" type="application/json">
            null
        </script>
        @endauth

        <!-- Contenedor de React -->
        <div id="properties-root"></div>
    @endsection
