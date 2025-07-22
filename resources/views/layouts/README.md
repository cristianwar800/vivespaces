# Componente Navbar - ViveSpaces

## Descripción
El componente `navbar.blade.php` es una barra de navegación reutilizable que incluye todas las funcionalidades necesarias para la navegación del sitio web de ViveSpaces.

## Características

### ✅ Funcionalidades Principales
- **Diseño Responsive**: Se adapta perfectamente a dispositivos móviles y desktop
- **Autenticación Dinámica**: Muestra botones de login/registro o menú de usuario según el estado de autenticación
- **Navegación Activa**: Resalta la página actual en el menú
- **Menú Móvil**: Hamburguesa funcional para dispositivos móviles
- **Dropdown de Usuario**: Menú desplegable con opciones del usuario autenticado
- **Efectos Visuales**: Animaciones suaves y efectos hover

### 🎨 Estilos Incluidos
- Glass morphism effect con backdrop-filter
- Gradientes modernos
- Sombras y efectos de profundidad
- Transiciones suaves
- Diseño limpio y profesional

### 📱 Responsive Design
- Breakpoint principal: 768px
- Menú hamburguesa en móviles
- Adaptación automática de elementos
- Touch-friendly en dispositivos móviles

## Cómo Usar

### 1. Incluir en una página individual
```php
@include('layouts.navbar')
```

### 2. Usar con el layout principal (Recomendado)
```php
@extends('layouts.app')

@section('content')
    <!-- Tu contenido aquí -->
@endsection
```

### 3. Ejemplo completo de página
```php
@extends('layouts.app')

@section('title', 'Mi Página - ViveSpaces')

@section('content')
    <div class="container">
        <h1>Mi Contenido</h1>
        <p>El navbar se incluye automáticamente.</p>
    </div>
@endsection
```

## Estructura del Componente

### HTML Structure
```html
<nav class="navbar">
    <div class="nav-container">
        <!-- Logo -->
        <a href="/" class="logo">ViveSpace</a>
        
        <!-- Navigation Links -->
        <ul class="nav-links">
            <li><a href="/properties">Propiedades</a></li>
            <li><a href="#renta">Renta tu Hogar</a></li>
            <li><a href="#contacto">Contacto</a></li>
        </ul>
        
        <!-- Auth Buttons / User Menu -->
        <div class="auth-buttons">
            @auth
                <!-- User dropdown menu -->
            @else
                <!-- Login/Register buttons -->
            @endauth
        </div>
        
        <!-- Mobile Menu -->
        <div class="mobile-menu">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
</nav>
```

## Personalización

### Cambiar el Logo
```php
<a href="{{ url('/') }}" class="logo">Tu Logo</a>
```

### Agregar/Modificar Enlaces
```php
<ul class="nav-links" id="navLinks">
    <li><a href="{{ url('/properties') }}" class="{{ request()->is('properties*') ? 'active' : '' }}">Propiedades</a></li>
    <li><a href="{{ url('/about') }}" class="{{ request()->is('about*') ? 'active' : '' }}">Sobre Nosotros</a></li>
    <!-- Agregar más enlaces aquí -->
</ul>
```

### Modificar Opciones del Usuario
```php
<div class="user-dropdown" id="userDropdown">
    <a href="{{ url('/dashboard') }}" class="dropdown-item">
        <i class="fas fa-tachometer-alt"></i> Dashboard
    </a>
    <a href="{{ url('/profile') }}" class="dropdown-item">
        <i class="fas fa-user"></i> Perfil
    </a>
    <!-- Agregar más opciones aquí -->
</div>
```

## Dependencias

### CSS/JS Incluidos
- **Font Awesome 6.4.0**: Para iconos
- **Google Fonts**: Inter y Poppins
- **CSS Personalizado**: Incluido en el componente
- **JavaScript**: Incluido en el componente

### Requisitos del Sistema
- Laravel Blade
- Autenticación de Laravel (opcional)
- Font Awesome CDN
- Google Fonts

## Variables de Entorno

### Rutas Requeridas
- `/` - Página principal
- `/login` - Página de login
- `/register` - Página de registro
- `/dashboard` - Dashboard del usuario
- `/profile` - Perfil del usuario
- `/favorites` - Favoritos del usuario
- `/properties` - Página de propiedades

### Middleware de Autenticación
El componente usa `@auth` y `@else` de Laravel para mostrar contenido diferente según el estado de autenticación.

## Troubleshooting

### Problemas Comunes

1. **El navbar no se muestra**
   - Verifica que la ruta del include sea correcta
   - Asegúrate de que el archivo existe en `resources/views/layouts/navbar.blade.php`

2. **Los estilos no se aplican**
   - Verifica que Font Awesome esté cargado
   - Asegúrate de que Google Fonts esté disponible

3. **El menú móvil no funciona**
   - Verifica que el JavaScript se esté ejecutando
   - Revisa la consola del navegador para errores

4. **El dropdown de usuario no aparece**
   - Verifica que el usuario esté autenticado
   - Asegúrate de que las rutas de autenticación estén configuradas

## Mantenimiento

### Actualizaciones
- El componente es autónomo y no requiere dependencias externas
- Los estilos están encapsulados dentro del componente
- El JavaScript está optimizado para evitar conflictos

### Compatibilidad
- Compatible con Laravel 8+
- Funciona en todos los navegadores modernos
- Soporte completo para dispositivos móviles 
