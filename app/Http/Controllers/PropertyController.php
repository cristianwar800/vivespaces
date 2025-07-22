<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

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
    public function store(Request $request)
    {
        // ✅ VERIFICACIÓN TEMPORAL DE getID3
        try {
            $getID3 = new \getID3;
            \Log::info('✅ getID3 disponible, versión: ' . $getID3->version());
        } catch (\Exception $e) {
            \Log::error('❌ getID3 NO disponible: ' . $e->getMessage());
        }

        // Debug logging
        \Log::info('📥 Recibiendo mensaje:', [
            'all_data' => $request->all(),
            'files' => $request->allFiles(),
            'has_file' => $request->hasFile('file')
        ]);

        // ✅ VALIDACIÓN ACTUALIZADA PARA AUDIO
        $validator = Validator::make($request->all(), [
            'property_id' => 'required|exists:properties,id',
            'receiver_id' => 'required|exists:users,id',
            'message' => 'nullable|string|max:1000',
            // ✅ AGREGADO MÁS TIPOS DE AUDIO
            'file' => 'nullable|file|max:10240|mimes:jpeg,png,jpg,gif,webp,pdf,txt,doc,docx,mp3,wav,ogg,webm,mp4,aac,m4a,flac',
            'reply_to_id' => 'nullable|exists:messages,id',
            'type' => 'nullable|in:text,image,file,voice,location',
            'metadata' => 'nullable|string'
        ], [
            'property_id.required' => 'La propiedad es requerida',
            'property_id.exists' => 'La propiedad no existe',
            'receiver_id.required' => 'El receptor es requerido',
            'receiver_id.exists' => 'El receptor no existe',
            'message.max' => 'El mensaje no puede tener más de 1000 caracteres',
            'file.file' => 'El archivo debe ser válido',
            'file.max' => 'El archivo no puede ser mayor a 10MB',
            'file.mimes' => 'El archivo debe ser de tipo: imágenes (jpeg, png, jpg, gif, webp), documentos (pdf, txt, doc, docx) o audio (mp3, wav, ogg, webm, mp4, aac, m4a, flac)',
        ]);

        if ($validator->fails()) {
            \Log::error('❌ Validation failed:', $validator->errors()->toArray());
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        // ✅ VERIFICACIÓN ACTUALIZADA: mensaje O archivo O ubicación
        if (empty($request->message) && !$request->hasFile('file') && $request->type !== 'location') {
            return response()->json([
                'success' => false,
                'message' => 'Debes enviar un mensaje, un archivo o compartir ubicación',
                'errors' => ['message' => ['Debes enviar un mensaje, un archivo o compartir ubicación']]
            ], 422);
        }

        try {
            $property = Property::findOrFail($request->property_id);

            // Verificar permisos básicos
            if ($request->receiver_id == Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes enviarte mensajes a ti mismo'
                ], 422);
            }

            $messageData = [
                'property_id' => $request->property_id,
                'sender_id' => Auth::id(),
                'receiver_id' => $request->receiver_id,
                'message' => $request->message ?: '',
                'type' => $request->type ?: 'text',
                'reply_to_id' => $request->reply_to_id,
            ];

            // ✅ MANEJO DE UBICACIÓN
            if ($request->type === 'location' && $request->has('metadata')) {
                \Log::info('📍 Procesando ubicación...');

                $metadata = json_decode($request->metadata, true);
                if (isset($metadata['latitude']) && isset($metadata['longitude'])) {
                    $messageData['metadata'] = $metadata;
                    $messageData['type'] = 'location';

                    // Si no hay mensaje, crear uno descriptivo
                    if (empty($messageData['message'])) {
                        $messageData['message'] = '📍 Ubicación compartida';
                    }

                    \Log::info('✅ Ubicación procesada:', [
                        'lat' => $metadata['latitude'],
                        'lng' => $metadata['longitude']
                    ]);
                }
            }

            // ✅ MANEJO MEJORADO DE ARCHIVOS CON getID3
            if ($request->hasFile('file')) {
                \Log::info('📎 Procesando archivo...');

                $file = $request->file('file');
                $path = $file->store('messages', 'public');
                $fullPath = storage_path('app/public/' . $path);

                $messageData['file_path'] = $path;
                $messageData['file_name'] = $file->getClientOriginalName();
                $messageData['file_size'] = $file->getSize();
                $messageData['mime_type'] = $file->getMimeType();

                \Log::info('📁 Detalles del archivo:', [
                    'path' => $fullPath,
                    'name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'extension' => $file->getExtension(),
                    'size' => $file->getSize()
                ]);

                // ✅ DETECCIÓN MEJORADA DE TIPO DE ARCHIVO
                if (str_starts_with($file->getMimeType(), 'image/')) {
                    $messageData['type'] = 'image';
                    \Log::info('🖼️ Detectado como imagen');
                }
                // ✅ MEJORA: Detectar audio por extensión Y mime-type
                elseif (
                    str_starts_with($file->getMimeType(), 'audio/') ||
                    $file->getMimeType() === 'video/webm' ||  // ✅ AGREGADO: webm puede ser audio
                    in_array(strtolower($file->getExtension()), ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac']) ||
                    $file->getClientOriginalName() === 'voice-message.wav'  // ✅ AGREGADO: Detectar por nombre
                ) {
                    $messageData['type'] = 'voice';
                    \Log::info('🎵 Detectado como audio/voz');

                    // ✅ OBTENER DURACIÓN DEL AUDIO CON getID3
                    try {
                        \Log::info('🎵 Analizando audio con getID3...');
                        \Log::info('📁 Archivo a analizar: ' . $fullPath);
                        \Log::info('🔍 Mime type: ' . $file->getMimeType());
                        \Log::info('📝 Nombre original: ' . $file->getClientOriginalName());

                        $getID3 = new \getID3;
                        $fileInfo = $getID3->analyze($fullPath);

                        \Log::info('📊 Información completa del archivo:', $fileInfo);

                        if (isset($fileInfo['playtime_seconds'])) {
                            $duration = round($fileInfo['playtime_seconds']);
                            $messageData['duration'] = $duration;

                            \Log::info('✅ Duración obtenida:', [
                                'duration_seconds' => $duration,
                                'duration_formatted' => gmdate('i:s', $duration)
                            ]);
                        } else {
                            \Log::warning('⚠️ No se encontró playtime_seconds en fileInfo');
                            \Log::info('🔍 Claves disponibles en fileInfo: ' . implode(', ', array_keys($fileInfo)));
                        }

                        // Información adicional del audio
                        if (isset($fileInfo['audio'])) {
                            $audioInfo = [
                                'bitrate' => $fileInfo['audio']['bitrate'] ?? null,
                                'sample_rate' => $fileInfo['audio']['sample_rate'] ?? null,
                                'channels' => $fileInfo['audio']['channels'] ?? null,
                            ];

                            $messageData['metadata'] = $audioInfo;
                            \Log::info('🎵 Info del audio:', $audioInfo);
                        } elseif (isset($fileInfo['video'])) {
                            // Para archivos webm que pueden tener info en 'video'
                            $audioInfo = [
                                'bitrate' => $fileInfo['video']['bitrate'] ?? null,
                                'resolution' => ($fileInfo['video']['resolution_x'] ?? '') . 'x' . ($fileInfo['video']['resolution_y'] ?? ''),
                                'dataformat' => $fileInfo['video']['dataformat'] ?? null,
                            ];

                            $messageData['metadata'] = $audioInfo;
                            \Log::info('🎥 Info del video/webm:', $audioInfo);
                        }

                    } catch (\Exception $e) {
                        \Log::error('💥 Error al analizar audio con getID3: ' . $e->getMessage());
                        \Log::error('📍 Stack trace: ' . $e->getTraceAsString());

                        // Fallback: duración por defecto para webm
                        if ($file->getMimeType() === 'video/webm' || $file->getClientOriginalName() === 'voice-message.wav') {
                            $messageData['duration'] = 10; // 10 segundos por defecto
                            \Log::info('🔄 Usando duración por defecto para audio: 10 segundos');
                        }
                    }
                }
                else {
                    $messageData['type'] = 'file';
                    \Log::info('📄 Detectado como archivo general');
                }

                \Log::info('✅ Archivo procesado completamente:', [
                    'path' => $path,
                    'name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'type' => $messageData['type'],
                    'mime_type' => $file->getMimeType(),
                    'duration' => $messageData['duration'] ?? 'N/A'
                ]);
            }

            \Log::info('💾 Creando mensaje:', $messageData);

            $message = Message::create($messageData);
            $message->load(['sender', 'replyTo']);

            // ✅ RESPUESTA MEJORADA CON DATOS DE AUDIO
            $formattedMessage = [
                'id' => $message->id,
                'sender_id' => $message->sender_id,
                'receiver_id' => $message->receiver_id,
                'message' => $message->message,
                'type' => $message->type,
                'file_url' => $message->getFileUrl(),
                'file_name' => $message->file_name,
                'file_size_formatted' => $message->getFileSizeFormatted(),
                'mime_type' => $message->mime_type,
                'duration' => $message->duration,
                'duration_formatted' => $message->duration ? gmdate('i:s', $message->duration) : null,
                'metadata' => $message->metadata,
                'read_at' => $message->read_at,
                'created_at' => $message->created_at,
                'sender' => $message->sender
            ];

            \Log::info('✅ Mensaje creado exitosamente:', [
                'message_id' => $message->id,
                'type' => $message->type,
                'duration' => $message->duration ?? 'N/A'
            ]);

            return response()->json([
                'success' => true,
                'message' => $formattedMessage
            ]);

        } catch (\Exception $e) {
            \Log::error('💥 Error creating message:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor: ' . $e->getMessage()
            ], 500);
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
}
