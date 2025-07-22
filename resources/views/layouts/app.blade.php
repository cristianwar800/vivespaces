<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'ViveSpaces - Encuentra tu hogar ideal')</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>
    <!-- Datos del usuario para React -->
    <script id="user-data" type="application/json">
        @auth
            {!! json_encode([
                'id' => auth()->user()->id,
                'name' => auth()->user()->name,
                'last_name' => auth()->user()->last_name,
                'email' => auth()->user()->email,
                'role' => auth()->user()->role,
                'profile_photo' => auth()->user()->profile_photo
            ]) !!}
        @else
            null
        @endauth
    </script>

    <!-- React Navbar -->
    <div id="navbar-root"></div>

    <!-- Main Content -->
    <main>
        @yield('content')
    </main>
</body>
</html>
