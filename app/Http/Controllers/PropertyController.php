<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use App\Models\PropertyImageExtended;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\SystemConfig;

class PropertyController extends Controller
{
    /**
     * Cache en memoria para búsquedas recientes
     * Solo guarda las últimas búsquedas en memoria (sin archivos)
     */
    private static $searchCache = [];
    private static $maxCacheSize = 10; // Máximo 10 búsquedas en cache

    /**
     * Reglas de validación para propiedades
     */
    private function getValidationRules()
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0|max:999999999.99',
            'type' => 'nullable|string|max:255|in:casa,apartamento,cuarto,condominio,oficina,local,terreno',
            'bedrooms' => 'nullable|integer|min:0|max:2147483647',
            'bathrooms' => 'nullable|integer|min:0|max:2147483647',
            'area' => 'nullable|integer|min:0|max:2147483647',
            'is_active' => 'boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'pets_allowed' => 'nullable|string|in:no_pets,pets_allowed,negotiable',
            'pets_details' => 'nullable|string|max:500',
            'images' => 'nullable|array|max:15',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:8192',
            'room_types' => 'nullable|array',
            'room_types.*' => 'nullable|string|in:exterior,living_room,kitchen,bedroom,bathroom,other'
        ];
    }

    /**
     * Mensajes de validación personalizados
     */
    private function getValidationMessages()
    {
        return [
            'title.required' => 'El título de la propiedad es obligatorio.',
            'title.max' => 'El título no puede tener más de 255 caracteres.',
            'description.max' => 'La descripción es demasiado larga.',
            'address.required' => 'La dirección es obligatoria.',
            'city.required' => 'La ciudad es obligatoria.',
            'price.required' => 'El precio es obligatorio.',
            'price.numeric' => 'El precio debe ser un número válido.',
            'price.min' => 'El precio no puede ser negativo.',
            'price.max' => 'El precio es demasiado alto.',
            'type.in' => 'El tipo de propiedad seleccionado no es válido.',
            'bedrooms.integer' => 'El número de habitaciones debe ser un número entero.',
            'bedrooms.min' => 'El número de habitaciones no puede ser negativo.',
            'bathrooms.integer' => 'El número de baños debe ser un número entero.',
            'bathrooms.min' => 'El número de baños no puede ser negativo.',
            'area.integer' => 'El área debe ser un número entero.',
            'area.min' => 'El área no puede ser negativa.',
            'image.image' => 'El archivo debe ser una imagen válida.',
            'image.mimes' => 'La imagen debe ser de tipo: jpeg, png, jpg, gif.',
            'image.max' => 'La imagen no puede ser mayor a 5MB.',
            'latitude.numeric' => 'La latitud debe ser un número válido.',
            'latitude.between' => 'La latitud debe estar entre -90 y 90.',
            'longitude.numeric' => 'La longitud debe ser un número válido.',
            'longitude.between' => 'La longitud debe estar entre -180 y 180.',
            'images.max' => 'No puedes subir más de 15 imágenes.',
            'images.*.image' => 'Todos los archivos deben ser imágenes.',
            'images.*.mimes' => 'Las imágenes deben ser de tipo: jpeg, png, jpg, gif, webp.',
            'images.*.max' => 'Cada imagen no puede ser mayor a 8MB.'
        ];
    }

    /**
     * Atributos personalizados para validación
     */
    private function getValidationAttributes()
    {
        return [
            'title' => 'título',
            'description' => 'descripción',
            'address' => 'dirección',
            'city' => 'ciudad',
            'state' => 'estado',
            'country' => 'país',
            'postal_code' => 'código postal',
            'price' => 'precio',
            'type' => 'tipo de propiedad',
            'bedrooms' => 'habitaciones',
            'bathrooms' => 'baños',
            'area' => 'área',
            'image' => 'imagen',
            'latitude' => 'latitud',
            'longitude' => 'longitud',
            'images' => 'imágenes'
        ];
    }

    /**
     * Validar request
     */
    private function validateRequest(Request $request)
    {
        return Validator::make($request->all(), $this->getValidationRules(), $this->getValidationMessages(), $this->getValidationAttributes());
    }

    /**
     * Lista de todas las propiedades activas
     */
    public function index(Request $request)
    {
        $query = Property::with(['user', 'photos'])->where('is_active', true);

        // Excluir propiedades del usuario actual
        if (Auth::check()) {
            $query->where('user_id', '!=', Auth::id());
        }

        // Filtros de búsqueda
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        if ($request->filled('bedrooms')) {
            $query->where('bedrooms', '>=', $request->bedrooms);
        }

        $properties = $query->latest()->get();

        return view('properties', [
            'properties' => $properties,
            'user' => auth()->user(),
            'currentPage' => 'index',
            'mapboxToken' => config('services.mapbox.access_token'),
            'verificationRequired' => SystemConfig::isVerificationRequiredForPublish()
        ]);
    }

    /**
     * Mis propiedades
     */
    public function myProperties(Request $request)
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        $query = Property::with(['user', 'photos'])->where('user_id', $user->id);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $myProperties = $query->latest()->get();

        return view('properties', [
            'properties' => $myProperties,
            'user' => $user,
            'currentPage' => 'my-properties',
            'mapboxToken' => config('services.mapbox.access_token'),
            'verificationRequired' => SystemConfig::isVerificationRequiredForPublish()
        ]);
    }

    /**
     * Muestra una propiedad específica
     */
    public function show(Property $property)
    {
        if (!$property->is_active && (!auth()->check() || $property->user_id !== auth()->id())) {
            abort(404, 'Propiedad no encontrada');
        }

        $property->load(['user', 'photos']);

        return view('properties', [
            'property' => $property,
            'currentPage' => 'show',
            'mapboxToken' => config('services.mapbox.access_token'),
            'verificationRequired' => SystemConfig::isVerificationRequiredForPublish()
        ]);
    }

    /**
     * Muestra el formulario para crear una nueva propiedad
     */
    public function create()
    {
        if (!auth()->check()) {
            return redirect()->route('login')->with('error', 'Debes iniciar sesión para crear una propiedad.');
        }

        // 🔒 VALIDACIÓN: Usuario debe tener identidad verificada (solo si está habilitado en configuración)
        if (SystemConfig::isVerificationRequiredForPublish() && !auth()->user()->is_identity_verified) {
            return redirect()->route('verification.identity')
                ->with('error', 'Debes verificar tu identidad antes de publicar propiedades')
                ->with('info', 'La verificación es rápida y segura. Solo necesitas tu INE y un comprobante de domicilio.');
        }

        return view('properties', [
            'properties' => [],
            'property' => null,
            'user' => auth()->user(),
            'currentPage' => 'create',
            'errors' => session()->get('errors', new \Illuminate\Support\MessageBag()),
            'mapboxToken' => config('services.mapbox.access_token'),
            'verificationRequired' => SystemConfig::isVerificationRequiredForPublish()
        ]);
    }

    /**
     * STORE MEJORADO - Crea propiedad Y sube imágenes en una sola operación
     */
    public function store(Request $request)
    {
        Log::info('STORE METHOD - Iniciando', [
            'user' => auth()->id(),
            'has_images' => $request->hasFile('images'),
            'images_count' => $request->hasFile('images') ? count($request->file('images')) : 0
        ]);

        // Verificar autenticación
        if (!auth()->check()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes iniciar sesión para crear una propiedad.'
                ], 401);
            }
            return redirect()->route('login');
        }

        // 🔒 VALIDACIÓN: Usuario debe tener identidad verificada (solo si está habilitado en configuración)
        if (SystemConfig::isVerificationRequiredForPublish() && !auth()->user()->is_identity_verified) {
            Log::warning('⚠️ Usuario no verificado intentó crear propiedad', [
                'user_id' => auth()->id(),
                'user_email' => auth()->user()->email,
                'verification_required' => true
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'error' => 'IDENTITY_NOT_VERIFIED',
                    'message' => 'Debes verificar tu identidad antes de publicar propiedades',
                    'redirect' => route('verification.identity')
                ], 403);
            }

            return redirect()->route('verification.identity')
                ->with('error', 'Debes verificar tu identidad antes de publicar propiedades');
        }

        // Validar todo (propiedad + imágenes)
        $validator = $this->validateRequest($request);

        if ($validator->fails()) {
            Log::error('Validación fallida', $validator->errors()->toArray());

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        // Usar transacción para asegurar consistencia
        DB::beginTransaction();

        try {
            // 1. CREAR LA PROPIEDAD
            $data = $validator->validated();
            $data['user_id'] = auth()->id();

            // Convertir tipos de datos
            $data['bathrooms'] = isset($data['bathrooms']) ? (int)$data['bathrooms'] : null;
            $data['bedrooms'] = isset($data['bedrooms']) ? (int)$data['bedrooms'] : null;
            $data['area'] = isset($data['area']) ? (int)$data['area'] : null;
            $data['is_active'] = $request->boolean('is_active');

            // Limpiar campos vacíos
            foreach ($data as $key => $value) {
                if ($value === '') {
                    $data[$key] = null;
                }
            }

            // Manejar imagen principal (legacy)
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('properties', 'public');
                $data['image'] = $imagePath;
            }

            // Crear la propiedad
            $property = Property::create($data);

            Log::info('Propiedad creada', ['property_id' => $property->id]);

            // 2. PROCESAR MÚLTIPLES IMÁGENES SI EXISTEN
            $uploadedImages = [];
            $totalSize = 0;
            $duplicatesFound = 0;
            $spaceSaved = 0;

            if ($request->hasFile('images')) {
                $images = $request->file('images');
                $roomTypes = $request->input('room_types', []);

                foreach ($images as $index => $image) {
                    // Generar hash para deduplicación
                    $fileHash = sha1_file($image->getRealPath());
                    $fileSize = $image->getSize();
                    $totalSize += $fileSize;

                    // Buscar duplicados
                    $existingImage = PropertyImageExtended::where('file_hash', $fileHash)
                        ->where('is_duplicate', false)
                        ->first();

                    if ($existingImage) {
                        // Imagen duplicada - crear referencia
                        $duplicatesFound++;
                        $spaceSaved += $fileSize;

                        Log::info('Imagen duplicada detectada', [
                            'hash' => $fileHash,
                            'original_id' => $existingImage->id
                        ]);

                        $imageRecord = PropertyImageExtended::create([
                            'property_id' => $property->id,
                            'original_filename' => $image->getClientOriginalName(),
                            'stored_filename' => $existingImage->stored_filename,
                            'path' => $existingImage->path,
                            'mime_type' => $existingImage->mime_type,
                            'size' => $fileSize,
                            'width' => $existingImage->width,
                            'height' => $existingImage->height,
                            'file_hash' => $fileHash,
                            'is_duplicate' => true,
                            'original_file_path' => $existingImage->path,
                            'room_type' => $roomTypes[$index] ?? 'other',
                            'sort_order' => $index,
                            'is_primary' => $index === 0 && !$property->image,
                            'disk' => 'public',
                            'uploaded_by' => auth()->id()
                        ]);

                        // Incrementar contador en imagen original
                        $existingImage->increment('duplicate_count');

                    } else {
                        // Imagen nueva - guardar archivo
                        $storedPath = $image->store('property_images', 'public');

                        // Obtener dimensiones de la imagen
                        list($width, $height) = getimagesize($image->getRealPath());

                        $imageRecord = PropertyImageExtended::create([
                            'property_id' => $property->id,
                            'original_filename' => $image->getClientOriginalName(),
                            'stored_filename' => basename($storedPath),
                            'path' => $storedPath,
                            'mime_type' => $image->getMimeType(),
                            'size' => $fileSize,
                            'width' => $width,
                            'height' => $height,
                            'file_hash' => $fileHash,
                            'is_duplicate' => false,
                            'duplicate_count' => 0,
                            'room_type' => $roomTypes[$index] ?? 'other',
                            'sort_order' => $index,
                            'is_primary' => $index === 0 && !$property->image,
                            'disk' => 'public',
                            'uploaded_by' => auth()->id()
                        ]);

                        Log::info('Nueva imagen guardada', [
                            'id' => $imageRecord->id,
                            'path' => $storedPath
                        ]);
                    }

                    $uploadedImages[] = $imageRecord;
                }

                Log::info('Proceso de imágenes completado', [
                    'total_images' => count($uploadedImages),
                    'duplicates' => $duplicatesFound,
                    'space_saved_mb' => round($spaceSaved / 1024 / 1024, 2)
                ]);
            }

            DB::commit();

            // Cargar relaciones para la respuesta
            $property->load(['user', 'photos']);

            // Preparar respuesta
            if ($request->expectsJson() || $request->ajax()) {
                $response = [
                    'success' => true,
                    'message' => '¡Propiedad creada exitosamente!',
                    'property' => [
                        'id' => $property->id,
                        'title' => $property->title,
                        'description' => $property->description,
                        'address' => $property->address,
                        'city' => $property->city,
                        'state' => $property->state,
                        'country' => $property->country,
                        'postal_code' => $property->postal_code,
                        'price' => $property->price,
                        'type' => $property->type,
                        'bedrooms' => $property->bedrooms,
                        'bathrooms' => $property->bathrooms,
                        'area' => $property->area,
                        'is_active' => $property->is_active,
                        'latitude' => $property->latitude,
                        'longitude' => $property->longitude,
                        'image' => $property->image,
                        'user_id' => $property->user_id,
                        'photos_count' => count($uploadedImages)
                    ],
                    'images' => [
                        'uploaded' => count($uploadedImages),
                        'duplicates' => $duplicatesFound,
                        'space_saved_mb' => round($spaceSaved / 1024 / 1024, 2)
                    ],
                    'redirect' => route('properties')
                ];

                // Mensaje adicional si se encontraron duplicados
                if ($duplicatesFound > 0) {
                    $response['message'] .= " Se reutilizaron $duplicatesFound imágenes duplicadas, ahorrando " . round($spaceSaved / 1024 / 1024, 2) . "MB.";
                }

                return response()->json($response);
            }

            return redirect()->route('properties')
                ->with('success', '¡Propiedad creada exitosamente!');

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creando propiedad', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al crear la propiedad: ' . $e->getMessage()
                ], 500);
            }

            return back()->withInput()
                ->withErrors(['error' => 'Error al crear la propiedad: ' . $e->getMessage()]);
        }
    }

    /**
     * Muestra el formulario para editar una propiedad
     */
    public function edit(Property $property)
    {
        if ($property->user_id !== auth()->id()) {
            abort(403, 'No tienes permisos para editar esta propiedad.');
        }

        // 🔒 VALIDACIÓN: Usuario debe tener identidad verificada (solo si está habilitado en configuración)
        if (SystemConfig::isVerificationRequiredForPublish() && !auth()->user()->is_identity_verified) {
            return redirect()->route('verification.identity')
                ->with('error', 'Debes verificar tu identidad para editar propiedades');
        }

        return view('properties', [
            'property' => $property,
            'user' => auth()->user(),
            'currentPage' => 'edit',
            'mapboxToken' => config('services.mapbox.access_token'),
            'verificationRequired' => SystemConfig::isVerificationRequiredForPublish()
        ]);
    }

    /**
     * UPDATE MEJORADO - Actualiza propiedad Y maneja imágenes
     */
    public function update(Request $request, Property $property)
    {
        if ($property->user_id !== auth()->id()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para editar esta propiedad.'
                ], 403);
            }
            abort(403);
        }

        // 🔒 VALIDACIÓN: Usuario debe tener identidad verificada (solo si está habilitado en configuración)
        if (SystemConfig::isVerificationRequiredForPublish() && !auth()->user()->is_identity_verified) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'error' => 'IDENTITY_NOT_VERIFIED',
                    'message' => 'Debes verificar tu identidad para editar propiedades',
                    'redirect' => route('verification.identity')
                ], 403);
            }

            return redirect()->route('verification.identity')
                ->with('error', 'Debes verificar tu identidad para editar propiedades');
        }

        $validator = $this->validateRequest($request);

        if ($validator->fails()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        DB::beginTransaction();

        try {
            // Actualizar propiedad
            $data = $validator->validated();

            $data['bathrooms'] = isset($data['bathrooms']) ? (int)$data['bathrooms'] : null;
            $data['bedrooms'] = isset($data['bedrooms']) ? (int)$data['bedrooms'] : null;
            $data['area'] = isset($data['area']) ? (int)$data['area'] : null;
            $data['is_active'] = $request->boolean('is_active');

            foreach ($data as $key => $value) {
                if ($value === '') {
                    $data[$key] = null;
                }
            }

            if ($request->hasFile('image')) {
                if ($property->image) {
                    Storage::disk('public')->delete($property->image);
                }
                $data['image'] = $request->file('image')->store('properties', 'public');
            }

            $property->update($data);

            // Procesar nuevas imágenes si existen
            if ($request->hasFile('images')) {
                $images = $request->file('images');
                $roomTypes = $request->input('room_types', []);

                // Obtener el último sort_order
                $lastSortOrder = PropertyImageExtended::where('property_id', $property->id)
                    ->max('sort_order') ?? -1;

                foreach ($images as $index => $image) {
                    $fileHash = sha1_file($image->getRealPath());
                    $fileSize = $image->getSize();

                    $existingImage = PropertyImageExtended::where('file_hash', $fileHash)
                        ->where('is_duplicate', false)
                        ->first();

                    if ($existingImage) {
                        PropertyImageExtended::create([
                            'property_id' => $property->id,
                            'original_filename' => $image->getClientOriginalName(),
                            'stored_filename' => $existingImage->stored_filename,
                            'path' => $existingImage->path,
                            'mime_type' => $existingImage->mime_type,
                            'size' => $fileSize,
                            'width' => $existingImage->width,
                            'height' => $existingImage->height,
                            'file_hash' => $fileHash,
                            'is_duplicate' => true,
                            'original_file_path' => $existingImage->path,
                            'room_type' => $roomTypes[$index] ?? 'other',
                            'sort_order' => $lastSortOrder + $index + 1,
                            'is_primary' => false,
                            'disk' => 'public',
                            'uploaded_by' => auth()->id()
                        ]);

                        $existingImage->increment('duplicate_count');
                    } else {
                        $storedPath = $image->store('property_images', 'public');
                        list($width, $height) = getimagesize($image->getRealPath());

                        PropertyImageExtended::create([
                            'property_id' => $property->id,
                            'original_filename' => $image->getClientOriginalName(),
                            'stored_filename' => basename($storedPath),
                            'path' => $storedPath,
                            'mime_type' => $image->getMimeType(),
                            'size' => $fileSize,
                            'width' => $width,
                            'height' => $height,
                            'file_hash' => $fileHash,
                            'is_duplicate' => false,
                            'duplicate_count' => 0,
                            'room_type' => $roomTypes[$index] ?? 'other',
                            'sort_order' => $lastSortOrder + $index + 1,
                            'is_primary' => false,
                            'disk' => 'public',
                            'uploaded_by' => auth()->id()
                        ]);
                    }
                }
            }

            DB::commit();

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => '¡Propiedad actualizada exitosamente!',
                    'property' => $property->fresh()->load('photos'),
                    'redirect' => route('properties')
                ]);
            }

            return redirect()->route('properties')
                ->with('success', '¡Propiedad actualizada exitosamente!');

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error actualizando propiedad', [
                'error' => $e->getMessage(),
                'property_id' => $property->id
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al actualizar la propiedad.'
                ], 500);
            }

            return back()->withInput()
                ->withErrors(['error' => 'Error al actualizar la propiedad.']);
        }
    }

    /**
     * Elimina una propiedad
     */
    public function destroy(Request $request, Property $property)
    {
        if ($property->user_id !== auth()->id()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar esta propiedad.'
                ], 403);
            }
            abort(403);
        }

        try {
            // Eliminar imagen principal si existe
            if ($property->image) {
                Storage::disk('public')->delete($property->image);
            }

            // Eliminar imágenes adicionales
            foreach ($property->photos as $photo) {
                if (!$photo->is_duplicate) {
                    Storage::disk('public')->delete($photo->path);
                }
            }

            $property->delete();

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => '¡Propiedad eliminada exitosamente!',
                    'redirect' => route('properties')
                ]);
            }

            return redirect()->route('properties')
                ->with('success', '¡Propiedad eliminada exitosamente!');

        } catch (\Exception $e) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al eliminar la propiedad.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Error al eliminar la propiedad.']);
        }
    }

    /**
     * Obtener imágenes de una propiedad
     */
    public function getImages($propertyId)
    {
        $property = Property::findOrFail($propertyId);

        $images = PropertyImageExtended::where('property_id', $propertyId)
            ->orderBy('sort_order')
            ->get()
            ->map(function($image) {
                return [
                    'id' => $image->id,
                    'url' => $image->url,
                    'filename' => $image->original_filename,
                    'room_type' => $image->room_type,
                    'is_primary' => $image->is_primary,
                    'is_duplicate' => $image->is_duplicate,
                    'size_mb' => round($image->size / 1024 / 1024, 2),
                    'sort_order' => $image->sort_order
                ];
            });

        return response()->json([
            'success' => true,
            'property_title' => $property->title,
            'images' => $images,
            'total_images' => $images->count(),
            'primary_image' => $images->firstWhere('is_primary', true)
        ]);
    }

    /**
     * Eliminar imagen específica
     */
    public function deleteImage(Request $request, $propertyId, $imageId)
    {
        $property = Property::findOrFail($propertyId);

        if ($property->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos'
            ], 403);
        }

        $image = PropertyImageExtended::where('property_id', $propertyId)
            ->where('id', $imageId)
            ->firstOrFail();

        try {
            $wasPrimary = $image->is_primary;

            if ($image->is_duplicate) {
                $originalImage = PropertyImageExtended::where('file_hash', $image->file_hash)
                    ->where('is_duplicate', false)
                    ->first();

                if ($originalImage) {
                    $originalImage->decrement('duplicate_count');
                }

                $image->delete();

            } else {
                $duplicatesCount = PropertyImageExtended::where('file_hash', $image->file_hash)
                    ->where('is_duplicate', true)
                    ->count();

                if ($duplicatesCount > 0) {
                    $firstDuplicate = PropertyImageExtended::where('file_hash', $image->file_hash)
                        ->where('is_duplicate', true)
                        ->first();

                    $firstDuplicate->update([
                        'is_duplicate' => false,
                        'duplicate_count' => $duplicatesCount - 1
                    ]);
                } else {
                    Storage::disk('public')->delete($image->path);
                }

                $image->delete();
            }

            if ($wasPrimary) {
                $newPrimary = PropertyImageExtended::where('property_id', $propertyId)
                    ->orderBy('sort_order')
                    ->first();

                if ($newPrimary) {
                    $newPrimary->update(['is_primary' => true]);
                }
            }

            $remainingImages = PropertyImageExtended::where('property_id', $propertyId)
                ->orderBy('sort_order')
                ->get();

            foreach ($remainingImages as $index => $img) {
                $img->update(['sort_order' => $index]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Imagen eliminada exitosamente',
                'remaining_images' => $remainingImages->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting image: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la imagen'
            ], 500);
        }
    }

    /**
     * Establecer imagen principal
     */
    public function setPrimaryImage(Request $request, $propertyId, $imageId)
    {
        $property = Property::findOrFail($propertyId);

        if ($property->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos'
            ], 403);
        }

        try {
            PropertyImageExtended::where('property_id', $propertyId)
                ->update(['is_primary' => false]);

            $image = PropertyImageExtended::where('property_id', $propertyId)
                ->where('id', $imageId)
                ->firstOrFail();

            $image->update(['is_primary' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Imagen principal actualizada'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al establecer imagen principal'
            ], 500);
        }
    }

    /**
     * Buscar propiedades
     */
    public function searchProperties(Request $request)
    {
        $request->validate([
            'query' => 'nullable|string|max:255',
            'limit' => 'nullable|integer|min:1|max:50',
            'type' => 'nullable|string|in:all,properties,users,communities',
            'location' => 'nullable|string|max:255',
            'property_type' => 'nullable|string',
            'sort_by' => 'nullable|string|in:relevance,price_asc,price_desc,date_new,date_old',
            'price_min' => 'nullable|numeric|min:0',
            'price_max' => 'nullable|numeric|min:0'
        ]);

        $query = $request->get('query', '');
        $limit = $request->get('limit', 20);
        $type = $request->get('type', 'all');
        $location = $request->get('location', '');
        $propertyType = $request->get('property_type', 'all');
        $sortBy = $request->get('sort_by', 'relevance');
        $priceMin = $request->get('price_min');
        $priceMax = $request->get('price_max');

        // Si no hay query ni filtros, retornar vacío
        if (empty(trim($query)) && empty(trim($location)) && !$priceMin && !$priceMax) {
            return response()->json([
                'success' => true,
                'results' => [],
                'total' => 0
            ]);
        }

        try {
            $searchQuery = Property::with(['user:id,name,last_name', 'photos'])
                ->where('is_active', true);

            // Filtro de texto (query)
            if (!empty(trim($query))) {
                $searchQuery->where(function($q) use ($query) {
                    $searchTerm = '%' . $query . '%';

                    $q->where('title', 'like', $searchTerm)
                      ->orWhere('description', 'like', $searchTerm)
                      ->orWhere('city', 'like', $searchTerm)
                      ->orWhere('address', 'like', $searchTerm)
                      ->orWhere('state', 'like', $searchTerm)
                      ->orWhere('type', 'like', $searchTerm);
                });
            }

            // Filtro de ubicación
            if (!empty(trim($location))) {
                $searchQuery->where(function($q) use ($location) {
                    $locationTerm = '%' . $location . '%';
                    $q->where('city', 'like', $locationTerm)
                      ->orWhere('state', 'like', $locationTerm)
                      ->orWhere('address', 'like', $locationTerm);
                });
            }

            // Filtro de tipo de propiedad
            if ($propertyType !== 'all' && !empty($propertyType)) {
                $searchQuery->where('type', $propertyType);
            }

            // Filtro de rango de precio
            if ($priceMin !== null && $priceMin > 0) {
                $searchQuery->where('price', '>=', $priceMin);
            }

            if ($priceMax !== null && $priceMax > 0) {
                $searchQuery->where('price', '<=', $priceMax);
            }

            // Ordenamiento
            switch ($sortBy) {
                case 'price_asc':
                    $searchQuery->orderBy('price', 'asc');
                    break;
                case 'price_desc':
                    $searchQuery->orderBy('price', 'desc');
                    break;
                case 'date_new':
                    $searchQuery->orderBy('created_at', 'desc');
                    break;
                case 'date_old':
                    $searchQuery->orderBy('created_at', 'asc');
                    break;
                case 'relevance':
                default:
                    // Ordenar por relevancia si hay query
                    if (!empty(trim($query))) {
                        $searchQuery->orderByRaw("
                            CASE
                                WHEN title LIKE ? THEN 1
                                WHEN city LIKE ? THEN 2
                                WHEN address LIKE ? THEN 3
                                WHEN type LIKE ? THEN 4
                                ELSE 5
                            END
                        ", [
                            '%' . $query . '%',
                            '%' . $query . '%',
                            '%' . $query . '%',
                            '%' . $query . '%'
                        ]);
                    } else {
                        $searchQuery->orderBy('created_at', 'desc');
                    }
                    break;
            }

            $searchQuery->select([
                'id', 'title', 'description', 'city', 'address',
                'state', 'price', 'type', 'bedrooms', 'bathrooms',
                'area', 'image', 'user_id', 'created_at'
            ]);

            $properties = $searchQuery->limit($limit)->get();

            $formattedResults = $properties->map(function($property) {
                return [
                    'id' => $property->id,
                    'type' => 'Property',
                    'title' => $property->title,
                    'subtitle' => $property->city . ', ' . $property->state,
                    'description' => $property->description ?
                        Str::limit($property->description, 80) : null,
                    'price' => '$' . number_format($property->price, 0, '.', ','),
                    'details' => $this->formatPropertyDetails($property),
                    'image' => $property->image ?
                        asset('storage/' . $property->image) : null,
                    'url' => route('properties.show', $property->id),
                    'owner' => $property->user ?
                        $property->user->name . ' ' . $property->user->last_name : null
                ];
            });

            return response()->json([
                'success' => true,
                'results' => $formattedResults,
                'total' => $properties->count(),
                'query' => $query,
                'filters_applied' => [
                    'location' => $location,
                    'property_type' => $propertyType,
                    'price_min' => $priceMin,
                    'price_max' => $priceMax,
                    'sort_by' => $sortBy
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error en búsqueda de propiedades:', [
                'error' => $e->getMessage(),
                'query' => $query
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al realizar la búsqueda',
                'results' => [],
                'total' => 0
            ], 500);
        }
    }

    /**
     * Formatear detalles de la propiedad
     */
    private function formatPropertyDetails($property)
    {
        $details = [];

        if ($property->bedrooms) {
            $details[] = $property->bedrooms . ' hab';
        }

        if ($property->bathrooms) {
            $details[] = $property->bathrooms . ' baños';
        }

        if ($property->area) {
            $details[] = $property->area . ' m²';
        }

        if ($property->type) {
            $details[] = ucfirst($property->type);
        }

        return implode(' • ', $details);
    }


            /**
 * Buscar propiedades cercanas basadas en coordenadas
 * 🚀 OPTIMIZADO: Usa bounding box + caché para mejor rendimiento
 */
    public function searchNearby(Request $request)
    {
        try {
            $startTotal = microtime(true);

            $validated = $request->validate([
                'lng' => 'required|numeric|between:-180,180',
                'lat' => 'required|numeric|between:-90,90',
                'radius' => 'nullable|numeric|min:0.1|max:50'
            ]);

            $lng = $validated['lng'];
            $lat = $validated['lat'];
            $radius = $validated['radius'] ?? 3;

            // 🚀 OPTIMIZACIÓN 1: Cache en memoria (instantáneo, sin archivos)
            $startCache = microtime(true);
            $cacheKey = round($lat, 3) . '_' . round($lng, 3) . '_' . $radius;

            // Buscar en cache en memoria
            if (isset(self::$searchCache[$cacheKey])) {
                $cacheTime = round((microtime(true) - $startCache) * 1000, 2);
                $totalTime = round((microtime(true) - $startTotal) * 1000, 2);

                Log::info('✅ CACHE HIT - Búsqueda desde memoria', [
                    'cache_key' => $cacheKey,
                    'tiempo_cache' => $cacheTime . 'ms',
                    'tiempo_total' => $totalTime . 'ms'
                ]);

                return response()->json(self::$searchCache[$cacheKey]);
            }

            $cacheTime = round((microtime(true) - $startCache) * 1000, 2);

            Log::info('🔍 BÚSQUEDA INICIADA (sin caché)', [
                'lat' => $lat,
                'lng' => $lng,
                'radio_km' => $radius,
                'tiempo_cache_check' => $cacheTime . 'ms'
            ]);

            // 🚀 OPTIMIZACIÓN 2: Calcular bounding box
            $startBbox = microtime(true);
            $latDelta = $radius / 111.0;
            $lngDelta = $radius / (111.0 * cos(deg2rad($lat)));

            $minLat = $lat - $latDelta;
            $maxLat = $lat + $latDelta;
            $minLng = $lng - $lngDelta;
            $maxLng = $lng + $lngDelta;
            $bboxTime = round((microtime(true) - $startBbox) * 1000, 2);

            Log::info('📐 Bounding box calculado', [
                'tiempo' => $bboxTime . 'ms',
                'lat_range' => [$minLat, $maxLat],
                'lng_range' => [$minLng, $maxLng]
            ]);

            // 🚀 OPTIMIZACIÓN 3: Pre-filtro con bounding box (MUCHO más rápido)
            $startQuery = microtime(true);
            $properties = Property::selectRaw("
                    id,
                    title,
                    address,
                    city,
                    state,
                    price,
                    type,
                    bedrooms,
                    bathrooms,
                    area,
                    latitude,
                    longitude,
                    image,
                    user_id,
                    (
                        6371 * acos(
                            cos(radians(?)) * cos(radians(latitude)) *
                            cos(radians(longitude) - radians(?)) +
                            sin(radians(?)) * sin(radians(latitude))
                        )
                    ) AS distance
                ", [$lat, $lng, $lat])
                ->where('is_active', true)
                ->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->where('latitude', '!=', 0)
                ->where('longitude', '!=', 0)
                // 🚀 Bounding box: filtra el 90% de propiedades ANTES de calcular distancia
                ->whereBetween('latitude', [$minLat, $maxLat])
                ->whereBetween('longitude', [$minLng, $maxLng])
                ->having('distance', '<=', $radius)
                ->orderBy('distance', 'asc')
                ->limit(20)
                ->with('user:id,name,last_name')
                ->get();

            $queryTime = round((microtime(true) - $startQuery) * 1000, 2);

            Log::info('🗄️  QUERY ejecutado', [
                'tiempo' => $queryTime . 'ms',
                'resultados' => $properties->count()
            ]);

            $formattedProperties = $properties->map(function($property) {
                return [
                    'id' => $property->id,
                    'title' => $property->title,
                    'address' => $property->address,
                    'city' => $property->city,
                    'state' => $property->state,
                    'price' => $property->price,
                    'type' => $property->type,
                    'bedrooms' => $property->bedrooms,
                    'bathrooms' => $property->bathrooms,
                    'area' => $property->area,
                    'latitude' => (float) $property->latitude,
                    'longitude' => (float) $property->longitude,
                    'distance' => round($property->distance, 2),
                    'image' => $property->image ? asset('storage/' . $property->image) : null,
                    'user' => $property->user
                ];
            });

            $startFormat = microtime(true);
            $result = [
                'success' => true,
                'properties' => $formattedProperties,
                'count' => $formattedProperties->count(),
                'search_center' => [
                    'lat' => $lat,
                    'lng' => $lng
                ],
                'radius_km' => $radius
            ];
            $formatTime = round((microtime(true) - $startFormat) * 1000, 2);

            // 🚀 OPTIMIZACIÓN 4: Guardar en cache en memoria (instantáneo)
            $startCacheSave = microtime(true);

            // Limpiar cache si está lleno (mantener solo las últimas 10 búsquedas)
            if (count(self::$searchCache) >= self::$maxCacheSize) {
                array_shift(self::$searchCache); // Eliminar la más antigua
            }

            // Guardar en cache en memoria
            self::$searchCache[$cacheKey] = $result;

            $cacheSaveTime = round((microtime(true) - $startCacheSave) * 1000, 2);
            $totalTime = round((microtime(true) - $startTotal) * 1000, 2);

            Log::info('⏱️  TIEMPO TOTAL DE BÚSQUEDA', [
                'cache_check' => $cacheTime . 'ms',
                'bounding_box' => $bboxTime . 'ms',
                'query_db' => $queryTime . 'ms',
                'formateo' => $formatTime . 'ms',
                'guardar_cache' => $cacheSaveTime . 'ms',
                '🎯 TOTAL' => $totalTime . 'ms',
                'resultados' => $formattedProperties->count(),
                'cache_size' => count(self::$searchCache)
            ]);

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('❌ ERROR', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al buscar propiedades',
                'properties' => []
            ], 500);
        }
    }


    public function toggleFavorite(Property $property)
    {
        $user = auth()->user();
        
        // Toggle: si existe lo quita, si no existe lo agrega
        $user->favoriteProperties()->toggle($property->id);
        
        // Verificar si ahora es favorito
        $isFavorite = $user->favoriteProperties()->where('property_id', $property->id)->exists();
        
        return response()->json([
            'success' => true,
            'is_favorite' => $isFavorite,
            'message' => $isFavorite ? 'Agregado a favoritos' : 'Eliminado de favoritos'
        ]);
    }

/**
 * Obtener todas las propiedades favoritas del usuario
 */
    public function getFavorites()
{
    $favorites = auth()->user()->favoriteProperties()
        ->with(['photos', 'user'])  // ✅ Cambiado a 'photos'
        ->get();
    
    return response()->json([
        'success' => true,
        'favorites' => $favorites
    ]);
}
/**
 * Verificar si una propiedad es favorita
 */
    public function checkFavorite(Property $property)
    {
        $isFavorite = auth()->user()
            ->favoriteProperties()
            ->where('property_id', $property->id)
            ->exists();
        
        return response()->json([
            'success' => true,
            'is_favorite' => $isFavorite
        ]);
    }


}
