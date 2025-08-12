<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;


class PropertyController extends Controller
{
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
            'type' => 'nullable|string|max:255|in:casa,apartamento,condominio,oficina,local,terreno',
            'bedrooms' => 'nullable|integer|min:0|max:2147483647',
            'bathrooms' => 'nullable|integer|min:0|max:2147483647',
            'area' => 'nullable|integer|min:0|max:2147483647',
            'is_active' => 'boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
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
     * Lista de todas las propiedades activas - ADAPTADO PARA REACT
     */
    public function index(Request $request)
    {
        $query = Property::with('user')->where('is_active', true);

        // Filtros de búsqueda (mantenemos la funcionalidad del servidor por si acaso)
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

        // Para React, obtenemos todas las propiedades sin paginación para filtrado en cliente
        $properties = $query->latest()->get();

        // Retornar la vista unificada con datos para React
        return view('properties', [
            'properties' => $properties,
            'currentPage' => 'index'
        ]);
    }

    /**
     * Muestra una propiedad específica - ADAPTADO PARA REACT
     */
    public function show(Property $property)
    {
        // Solo mostrar propiedades activas, excepto si es el propietario
        if (!$property->is_active && (!auth()->check() || $property->user_id !== auth()->id())) {
            abort(404, 'Propiedad no encontrada');
        }

        // Cargar relación con usuario para mostrar datos de contacto
        $property->load('user');

        // Retornar la vista unificada con la propiedad específica
        return view('properties', [
            'property' => $property,
            'currentPage' => 'show'
        ]);
    }

    /**
     * Muestra el formulario para crear una nueva propiedad - ADAPTADO PARA REACT
     */
    public function create()
    {
        // Log para confirmar que llegamos aquí
        \Log::info('CREATE METHOD REACHED', [
            'path' => request()->path(),
            'user' => auth()->id()
        ]);

        // Verificar autenticación
        if (!auth()->check()) {
            return redirect()->route('login')->with('error', 'Debes iniciar sesión para crear una propiedad.');
        }

        // Retornar la vista unificada para crear
        return view('properties', [
            'properties' => [],
            'property' => null,
            'currentPage' => 'create',
            'errors' => session()->get('errors', new \Illuminate\Support\MessageBag())
        ]);
    }

    /**
     * Almacena una nueva propiedad en la base de datos - MEJORADO PARA AJAX
     */
                    /**
     * Almacena una nueva propiedad en la base de datos - CORREGIDO
     */
    public function store(Request $request)
    {
        // Log para confirmar que llegamos aquí
        \Log::info('STORE METHOD REACHED', [
            'path' => request()->path(),
            'user' => auth()->id(),
            'data' => $request->all()
        ]);

        // Verificar autenticación
        if (!auth()->check()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes iniciar sesión para crear una propiedad.',
                    'errors' => ['auth' => ['Usuario no autenticado']]
                ], 401);
            }
            return redirect()->route('login')->with('error', 'Debes iniciar sesión para crear una propiedad.');
        }

        // Validar request
        $validator = $this->validateRequest($request);
        if ($validator->fails()) {
            \Log::error('Validation failed:', $validator->errors()->toArray());

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        try {
            $data = $validator->validated();

            // Agregar el ID del usuario autenticado
            $data['user_id'] = auth()->id();

            // Convertir a enteros donde sea necesario
            if (isset($data['bathrooms'])) {
                $data['bathrooms'] = (int) $data['bathrooms'];
            }

            if (isset($data['bedrooms'])) {
                $data['bedrooms'] = (int) $data['bedrooms'];
            }

            if (isset($data['area'])) {
                $data['area'] = (int) $data['area'];
            }

            // Manejar el checkbox is_active
            $data['is_active'] = $request->has('is_active') ||
                                $request->input('is_active') === '1' ||
                                $request->input('is_active') === 'true' ||
                                $request->input('is_active') === true;

            // Manejar la subida de imagen
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('properties', 'public');
                $data['image'] = $imagePath;
            }

            // Limpiar campos vacíos (convertir strings vacíos a null)
            foreach ($data as $key => $value) {
                if ($value === '') {
                    $data[$key] = null;
                }
            }

            // Crear la propiedad
            $property = Property::create($data);

            \Log::info('Property created successfully:', [
                'property_id' => $property->id,
                'user_id' => auth()->id(),
                'title' => $property->title
            ]);

            // Si es petición AJAX, devolver JSON
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => '¡Propiedad creada exitosamente!',
                    'property' => $property,
                    'redirect' => route('properties')
                ]);
            }

            return redirect()->route('properties')
                ->with('success', '¡Propiedad creada exitosamente!');

        } catch (\Exception $e) {
            \Log::error('Error creating property:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id()
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al crear la propiedad: ' . $e->getMessage(),
                    'errors' => ['general' => ['Error interno del servidor']]
                ], 500);
            }

            return back()->withInput()
                ->withErrors(['error' => 'Error al crear la propiedad. Por favor, intenta de nuevo.']);
        }
    }
    /**
     * Muestra el formulario para editar una propiedad - ADAPTADO PARA REACT
     */
    public function edit(Property $property)
    {
        // Verificar que el usuario sea el propietario
        if ($property->user_id !== auth()->id()) {
            abort(403, 'No tienes permisos para editar esta propiedad.');
        }

        // Retornar la vista unificada para editar
        return view('properties', [
            'property' => $property,
            'currentPage' => 'edit'
        ]);
    }

    /**
     * Actualiza una propiedad existente - MEJORADO PARA AJAX
     */
    public function update(Request $request, Property $property)
    {
        // Verificar que el usuario sea el propietario
        if ($property->user_id !== auth()->id()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para editar esta propiedad.',
                    'errors' => ['auth' => ['Permisos insuficientes']]
                ], 403);
            }
            abort(403, 'No tienes permisos para editar esta propiedad.');
        }

        // Validar request
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

        try {
            $data = $validator->validated();

            // Convertir a enteros
            if (isset($data['bathrooms'])) {
                $data['bathrooms'] = (int) $data['bathrooms'];
            }

            if (isset($data['bedrooms'])) {
                $data['bedrooms'] = (int) $data['bedrooms'];
            }

            if (isset($data['area'])) {
                $data['area'] = (int) $data['area'];
            }

            // Manejar el checkbox is_active
            $data['is_active'] = $request->has('is_active') || $request->input('is_active') === '1' || $request->input('is_active') === 'true';

            // Manejar la subida de nueva imagen
            if ($request->hasFile('image')) {
                // Eliminar imagen anterior si existe
                if ($property->image) {
                    Storage::disk('public')->delete($property->image);
                }

                $imagePath = $request->file('image')->store('properties', 'public');
                $data['image'] = $imagePath;
            }

            $property->update($data);

            // Si es petición AJAX, devolver JSON
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => '¡Propiedad actualizada exitosamente!',
                    'property' => $property->fresh(),
                    'redirect' => route('properties')
                ]);
            }

            return redirect()->route('properties')
                ->with('success', '¡Propiedad actualizada exitosamente!');

        } catch (\Exception $e) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al actualizar la propiedad. Por favor, intenta de nuevo.',
                    'errors' => ['general' => ['Error interno del servidor']]
                ], 500);
            }

            return back()->withInput()
                ->withErrors(['error' => 'Error al actualizar la propiedad. Por favor, intenta de nuevo.']);
        }
    }

    /**
     * Elimina una propiedad - MEJORADO PARA AJAX
     */
    public function destroy(Request $request, Property $property)
    {
        // Verificar que el usuario sea el propietario
        if ($property->user_id !== auth()->id()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar esta propiedad.',
                    'errors' => ['auth' => ['Permisos insuficientes']]
                ], 403);
            }
            abort(403, 'No tienes permisos para eliminar esta propiedad.');
        }

        try {
            // Eliminar imagen si existe
            if ($property->image) {
                Storage::disk('public')->delete($property->image);
            }

            $property->delete();

            // Si es petición AJAX, devolver JSON
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
                    'message' => 'Error al eliminar la propiedad. Por favor, intenta de nuevo.',
                    'errors' => ['general' => ['Error interno del servidor']]
                ], 500);
            }

            return back()->withErrors(['error' => 'Error al eliminar la propiedad. Por favor, intenta de nuevo.']);
        }
    }



    public function searchProperties(Request $request)
    {
        $request->validate([
            'query' => 'nullable|string|max:255',
            'limit' => 'nullable|integer|min:1|max:20'
        ]);

        $query = $request->get('query', '');
        $limit = $request->get('limit', 8);

        if (empty(trim($query))) {
            return response()->json([
                'success' => true,
                'results' => [],
                'total' => 0
            ]);
        }

        try {
            $searchQuery = Property::with(['user:id,name,last_name'])
                ->where('is_active', true)
                ->where(function($q) use ($query) {
                    $searchTerm = '%' . $query . '%';

                    $q->where('title', 'like', $searchTerm)
                      ->orWhere('description', 'like', $searchTerm)
                      ->orWhere('city', 'like', $searchTerm)
                      ->orWhere('address', 'like', $searchTerm)
                      ->orWhere('state', 'like', $searchTerm)
                      ->orWhere('type', 'like', $searchTerm);
                })
                ->select([
                    'id', 'title', 'description', 'city', 'address',
                    'state', 'price', 'type', 'bedrooms', 'bathrooms',
                    'area', 'image', 'user_id'
                ])
                ->orderByRaw("
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
                ])
                ->limit($limit);

            $properties = $searchQuery->get();

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
                'query' => $query
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en búsqueda de propiedades:', [
                'error' => $e->getMessage(),
                'query' => $query,
                'trace' => $e->getTraceAsString()
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
     * Formatear detalles de la propiedad para mostrar
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
}
