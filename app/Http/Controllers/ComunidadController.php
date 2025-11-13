<?php

namespace App\Http\Controllers;

use App\Models\Comunidad;
use App\Models\Comments;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ComunidadController extends Controller
{
    // Listar posts
    public function index(Request $request)
    {
        try {
            $query = Comunidad::with(['user:id,name,last_name']);

            // Filtros opcionales
            if ($request->filled('zone')) {
                // Soportar múltiples zonas separadas por coma
                if (str_contains($request->zone, ',')) {
                    $zones = array_map('trim', explode(',', $request->zone));
                    $query->where(function($q) use ($zones) {
                        foreach ($zones as $zone) {
                            $q->orWhere('zone', 'like', "%{$zone}%");
                        }
                    });
                } else {
                    // Búsqueda parcial para soportar zonas completas del mapa
                    $query->where('zone', 'like', "%{$request->zone}%");
                }
            }

            if ($request->filled('post_type')) {
                $query->where('post_type', $request->post_type);
            }

            if ($request->filled('topic')) {
                $query->where('topic', $request->topic);
            }

            if ($request->filled('search')) {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('title', 'like', "%{$searchTerm}%")
                        ->orWhere('content', 'like', "%{$searchTerm}%");
                });
            }

            $posts = $query->orderByDesc('is_pinned')
                            ->orderByDesc('created_at')
                            ->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $posts,
                'filters_applied' => array_filter($request->only(['zone', 'post_type', 'topic', 'search']))
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cargar posts',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
            ], 500);
        }
    }

    // Mostrar un post específico
    public function show($id)
    {
        try {
            $post = Comunidad::with(['user:id,name,last_name', 'deletedBy:id,name,last_name'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $post
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Post no encontrado'
            ], 404);
        }
    }

    // Crear post
    public function store(Request $request)
    {
        try {
            // 🔍 DEBUG: Ver exactamente qué datos llegan
            \Log::info('=== INICIO DEBUG STORE ===');
            \Log::info('Datos recibidos en store:', $request->all());
            \Log::info('Headers:', $request->headers->all());
            \Log::info('Método HTTP:', ['method' => $request->method()]);
            \Log::info('Content-Type:', ['content_type' => $request->header('Content-Type')]);

            // Verificar autenticación
            if (!Auth::check()) {
                \Log::error('Usuario no autenticado');
                return response()->json([
                    'success' => false,
                    'message' => 'Debes estar autenticado para crear publicaciones'
                ], 401);
            }

            \Log::info('Usuario autenticado:', ['user_id' => Auth::id(), 'user_name' => Auth::user()->name]);

            // Validación completa
            $validated = $request->validate([
                'title' => 'required|string|max:200|min:5',
                'content' => 'required|string|min:10|max:5000',
                'zone' => 'required|string|max:100',
                'subzone' => 'nullable|string|max:100',
                'post_type' => ['required', Rule::in(['general', 'alert', 'question', 'sale', 'service', 'event', 'lost_found'])],
                'topic' => ['required', Rule::in(['security', 'maintenance', 'social', 'services', 'marketplace', 'pets', 'transportation', 'other'])],
                'is_pinned' => 'nullable|boolean',
                'allow_comments' => 'nullable|boolean',
                'is_anonymous' => 'nullable|boolean',
                'attachments' => 'nullable|array|max:5',
                'attachments.*' => 'file|mimes:jpeg,png,jpg,gif,pdf,doc,docx|max:10240', // 10MB máximo
            ], [
                'title.required' => 'El título es obligatorio',
                'title.min' => 'El título debe tener al menos 5 caracteres',
                'title.max' => 'El título no puede tener más de 200 caracteres',
                'content.required' => 'El contenido es obligatorio',
                'content.min' => 'El contenido debe tener al menos 10 caracteres',
                'content.max' => 'El contenido no puede tener más de 5000 caracteres',
                'zone.required' => 'La zona es obligatoria',
                'zone.max' => 'La zona no puede exceder 100 caracteres',
                'subzone.max' => 'La subzona no puede exceder 100 caracteres',
                'post_type.required' => 'El tipo de publicación es obligatorio',
                'post_type.in' => 'El tipo de publicación seleccionado no es válido',
                'topic.required' => 'El tema es obligatorio',
                'topic.in' => 'El tema seleccionado no es válido',
                'attachments.max' => 'No puedes subir más de 5 archivos',
                'attachments.*.max' => 'Cada archivo no puede ser mayor a 10MB',
                'attachments.*.mimes' => 'Los archivos deben ser de tipo: jpeg, png, jpg, gif, pdf, doc, docx',
            ]);

            \Log::info('✅ Validación exitosa:', $validated);

            // Procesar archivos adjuntos si existen
            $attachmentPaths = [];
            if ($request->hasFile('attachments')) {
                \Log::info('Procesando archivos adjuntos...');
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('community-posts', 'public');
                    $attachmentPaths[] = [
                        'path' => $path,
                        'name' => $file->getClientOriginalName(),
                        'type' => $file->getMimeType(),
                        'size' => $file->getSize()
                    ];
                }
                \Log::info('Archivos procesados:', $attachmentPaths);
            }

            // Crear post
            $postData = [
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'content' => $validated['content'],
                'zone' => $validated['zone'],
                'subzone' => $validated['subzone'] ?? null,
                'post_type' => $validated['post_type'],
                'topic' => $validated['topic'],
                'is_pinned' => $validated['is_pinned'] ?? false,
                'allow_comments' => $validated['allow_comments'] ?? true,
                'is_anonymous' => $validated['is_anonymous'] ?? false,
                'attachments' => $attachmentPaths,
                'reactions_count' => 0,
                'comments_count' => 0,
                'shares_count' => 0
            ];

            \Log::info('Datos del post a crear:', $postData);

            $post = Comunidad::create($postData);

            \Log::info('✅ Post creado exitosamente:', ['post_id' => $post->id]);

            // Cargar relaciones para la respuesta
            $post->load('user:id,name,last_name');

            \Log::info('=== FIN DEBUG STORE ===');

            return response()->json([
                'success' => true,
                'data' => $post,
                'message' => 'Publicación creada exitosamente'
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            // 🔍 DEBUG: Ver exactamente qué validaciones fallan
            \Log::error('❌ Errores de validación:', $e->errors());
            \Log::error('Datos que fallaron:', $request->all());

            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('❌ Error general en store:', [
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear la publicación',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
            ], 500);
        }
    }

    // Actualizar post
    public function update(Request $request, $id)
    {
        try {
            $post = Comunidad::findOrFail($id);

            // Verificar permisos
            if (!Auth::check() || ($post->user_id !== Auth::id() && !Auth::user()->hasRole('admin'))) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para editar esta publicación'
                ], 403);
            }

            // Validación para actualización
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:200|min:5',
                'content' => 'sometimes|required|string|min:10|max:5000',
                'zone' => 'sometimes|required|string|max:100',
                'subzone' => 'nullable|string|max:100',
                'post_type' => ['sometimes', 'required', Rule::in(['general', 'alert', 'question', 'sale', 'service', 'event', 'lost_found'])],
                'topic' => ['sometimes', 'required', Rule::in(['security', 'maintenance', 'social', 'services', 'marketplace', 'pets', 'transportation', 'other'])],
                'is_pinned' => 'nullable|boolean',
                'allow_comments' => 'nullable|boolean',
                'is_anonymous' => 'nullable|boolean',
                'existing_attachments' => 'nullable|string', // JSON string de archivos existentes
                'attachments' => 'nullable|array|max:5',
                'attachments.*' => 'file|mimes:jpeg,png,jpg,gif,pdf,doc,docx|max:10240',
            ], [
                'title.required' => 'El título es obligatorio',
                'title.min' => 'El título debe tener al menos 5 caracteres',
                'title.max' => 'El título no puede tener más de 200 caracteres',
                'content.required' => 'El contenido es obligatorio',
                'content.min' => 'El contenido debe tener al menos 10 caracteres',
                'content.max' => 'El contenido no puede tener más de 5000 caracteres',
                'zone.required' => 'La zona es obligatoria',
                'zone.max' => 'La zona no puede exceder 100 caracteres',
                'subzone.max' => 'La subzona no puede exceder 100 caracteres',
                'post_type.required' => 'El tipo de publicación es obligatorio',
                'post_type.in' => 'El tipo de publicación seleccionado no es válido',
                'topic.required' => 'El tema es obligatorio',
                'topic.in' => 'El tema seleccionado no es válido',
                'attachments.max' => 'No puedes subir más de 5 archivos nuevos',
                'attachments.*.max' => 'Cada archivo no puede ser mayor a 10MB',
                'attachments.*.mimes' => 'Los archivos deben ser de tipo: jpeg, png, jpg, gif, pdf, doc, docx',
            ]);

            // 🆕 Procesar archivos adjuntos
            $attachmentPaths = [];

            // Obtener archivos existentes que se mantienen (enviados desde el frontend)
            if ($request->has('existing_attachments')) {
                $existingAttachmentsJson = $request->input('existing_attachments');

                // Validar que sea un JSON válido
                if (!empty($existingAttachmentsJson)) {
                    $existingAttachments = json_decode($existingAttachmentsJson, true);

                    if (json_last_error() === JSON_ERROR_NONE && is_array($existingAttachments)) {
                        // Validar que cada archivo tenga la estructura correcta
                        foreach ($existingAttachments as $file) {
                            if (isset($file['path']) && isset($file['name'])) {
                                $attachmentPaths[] = $file;
                            }
                        }
                    } else {
                        \Log::warning('JSON inválido en existing_attachments', [
                            'json' => $existingAttachmentsJson,
                            'error' => json_last_error_msg()
                        ]);
                    }
                }
            }

            // Agregar nuevos archivos
            if ($request->hasFile('attachments')) {
                // Validar que no se excedan los 5 archivos totales
                $totalFiles = count($attachmentPaths) + count($request->file('attachments'));
                if ($totalFiles > 5) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No puedes tener más de 5 archivos en total',
                        'errors' => [
                            'attachments' => ['El total de archivos (existentes + nuevos) no puede exceder 5']
                        ]
                    ], 422);
                }

                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('community-posts', 'public');
                    $attachmentPaths[] = [
                        'path' => $path,
                        'name' => $file->getClientOriginalName(),
                        'type' => $file->getMimeType(),
                        'size' => $file->getSize()
                    ];
                }
            }

            // Actualizar attachments solo si se enviaron cambios
            // Si se envió existing_attachments (aunque esté vacío), significa que el usuario editó los archivos
            if ($request->has('existing_attachments') || $request->hasFile('attachments')) {
                $validated['attachments'] = $attachmentPaths;
            }

            $post->update($validated);
            $post->load('user:id,name,last_name');

            return response()->json([
                'success' => true,
                'data' => $post,
                'message' => 'Publicación actualizada exitosamente'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errores de validación',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la publicación'
            ], 500);
        }
    }

    // Eliminar post (soft delete)
    public function destroy(Request $request, $id)
    {
        try {
            $post = Comunidad::findOrFail($id);

            // Verificar permisos
            if (!Auth::check() || ($post->user_id !== Auth::id() && !Auth::user()->hasRole('admin'))) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar esta publicación'
                ], 403);
            }

            // Validar razón de eliminación
            $request->validate([
                'deletion_reason' => 'nullable|string|max:500'
            ]);

            // Actualizar información de eliminación
            $post->update([
                'deleted_by' => Auth::id(),
                'deletion_reason' => $request->input('deletion_reason', 'Eliminado por el usuario')
            ]);

            // Soft delete
            $post->delete();

            return response()->json([
                'success' => true,
                'message' => 'Publicación eliminada correctamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la publicación'
            ], 500);
        }
    }

    // 🗑️ REACCIONES REMOVIDAS - Simplificación del sistema
    // Si necesitas reacciones en el futuro, usa una tabla pivot: user_id + comunidad_id

    // ============================================
    // 🆕 MÉTODOS DE COMENTARIOS CORREGIDOS
    // ============================================

    // Agregar comentario - CORREGIDO
    public function addComment(Request $request, $id)
    {
        try {
            // Verificar autenticación
            if (!Auth::check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes estar autenticado para comentar'
                ], 401);
            }

            $post = Comunidad::findOrFail($id);

            // Verificar si se permiten comentarios
            if (!$post->allow_comments) {
                return response()->json([
                    'success' => false,
                    'message' => 'Los comentarios están deshabilitados en esta publicación'
                ], 403);
            }

            // Validar comentario
            $validated = $request->validate([
                'content' => 'required|string|min:1|max:1000',
                'parent_id' => 'nullable|exists:comments,id', // Cambiado a 'comments'
                'is_anonymous' => 'nullable|boolean'
            ], [
                'content.required' => 'El comentario no puede estar vacío',
                'content.min' => 'El comentario debe tener al menos 1 caracter',
                'content.max' => 'El comentario no puede tener más de 1000 caracteres',
                'parent_id.exists' => 'El comentario al que intentas responder no existe'
            ]);

            // Crear comentario usando el modelo Comments - CORREGIDO
            $comment = Comments::create([
                'comunidad_id' => $post->id,
                'user_id' => Auth::id(),
                'parent_id' => $validated['parent_id'] ?? null,
                'content' => trim($validated['content']),
                'is_anonymous' => $validated['is_anonymous'] ?? false,
                'reactions_count' => 0
            ]);

            // Cargar relaciones
            $comment->load(['user:id,name,last_name']);

            // Incrementar contador de comentarios en el post
            $post->increment('comments_count');

            return response()->json([
                'success' => true,
                'data' => $comment,
                'message' => 'Comentario agregado exitosamente'
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al agregar el comentario',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno'
            ], 500);
        }
    }

    // Obtener comentarios de un post - CORREGIDO
    public function getComments($id)
    {
        try {
            $post = Comunidad::findOrFail($id);

            // Obtener comentarios relacionados al post
            $comments = Comments::with(['user:id,name,last_name'])
                ->where('comunidad_id', $post->id)
                ->whereNull('parent_id') // Solo comentarios principales
                ->orderBy('created_at', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $comments,
                'post_id' => $post->id,
                'total_comments' => $post->comments_count
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cargar los comentarios'
            ], 500);
        }
    }

    // Editar comentario - 🆕 NUEVO
    public function updateComment(Request $request, $commentId)
    {
        try {
            // Verificar autenticación
            if (!Auth::check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes estar autenticado'
                ], 401);
            }

            $comment = Comments::findOrFail($commentId);

            // Verificar permisos
            if ($comment->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para editar este comentario'
                ], 403);
            }

            // Validar nuevo contenido
            $validated = $request->validate([
                'content' => 'required|string|min:1|max:1000',
            ], [
                'content.required' => 'El comentario no puede estar vacío',
                'content.min' => 'El comentario debe tener al menos 1 caracter',
                'content.max' => 'El comentario no puede tener más de 1000 caracteres',
            ]);

            // Actualizar comentario
            $comment->update([
                'content' => trim($validated['content'])
            ]);

            // Cargar relaciones para la respuesta
            $comment->load(['user:id,name,last_name']);

            return response()->json([
                'success' => true,
                'data' => $comment,
                'message' => 'Comentario actualizado exitosamente'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el comentario'
            ], 500);
        }
    }

    // Eliminar comentario - CORREGIDO
    public function deleteComment($commentId)
    {
        try {
            // Verificar autenticación
            if (!Auth::check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes estar autenticado'
                ], 401);
            }

            $comment = Comments::findOrFail($commentId); // Cambiado a Comments

            // Verificar permisos
            if ($comment->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para eliminar este comentario'
                ], 403);
            }

            // Eliminar el comentario
            $comment->delete();

            // Decrementar contador en el post
            $post = Comunidad::find($comment->comunidad_id);
            if ($post) {
                $post->decrement('comments_count');
            }

            return response()->json([
                'success' => true,
                'message' => 'Comentario eliminado correctamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el comentario'
            ], 500);
        }
    }

    // Reaccionar a comentario - CORREGIDO
    public function reactToComment($commentId)
    {
        try {
            // Verificar autenticación
            if (!Auth::check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes estar autenticado para reaccionar'
                ], 401);
            }

            $comment = Comments::findOrFail($commentId); // Cambiado a Comments

            // Incrementar contador de reacciones
            $comment->increment('reactions_count');

            return response()->json([
                'success' => true,
                'reactions_count' => $comment->reactions_count,
                'message' => 'Reacción agregada al comentario'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la reacción'
            ], 500);
        }
    }

    // ============================================
    // 🆕 MÉTODOS ORIGINALES MANTENIDOS
    // ============================================

    // Obtener posts por zona
    public function byZone($zone)
    {
        try {
            $posts = Comunidad::with(['user:id,name,last_name'])
                ->where('zone', $zone)
                ->orderByDesc('is_pinned')
                ->orderByDesc('created_at')
                ->paginate(15);

            return response()->json([
                'success' => true,
                'data' => $posts,
                'zone' => $zone
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al cargar posts de la zona'
            ], 500);
        }
    }

    // Buscar posts
    public function search(Request $request)
    {
        try {
            $validated = $request->validate([
                'q' => 'required|string|min:2|max:100',
                'zone' => 'nullable|string|max:100',
                'post_type' => 'nullable|string',
                'topic' => 'nullable|string'
            ]);

            $query = Comunidad::with(['user:id,name,last_name'])
                ->where(function($q) use ($validated) {
                    $q->where('title', 'like', "%{$validated['q']}%")
                        ->orWhere('content', 'like', "%{$validated['q']}%");
                });

            // Aplicar filtros adicionales
            if (!empty($validated['zone'])) {
                $query->where('zone', $validated['zone']);
            }

            if (!empty($validated['post_type'])) {
                $query->where('post_type', $validated['post_type']);
            }

            if (!empty($validated['topic'])) {
                $query->where('topic', $validated['topic']);
            }

            $posts = $query->orderByDesc('is_pinned')
                            ->orderByDesc('created_at')
                            ->paginate(15);

            return response()->json([
                'success' => true,
                'data' => $posts,
                'search_query' => $validated['q']
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Parámetros de búsqueda inválidos',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error en la búsqueda'
            ], 500);
        }
    }

    // Obtener estadísticas de la comunidad
    public function stats()
    {
        try {
            $stats = [
                'total_posts' => Comunidad::count(),
                'posts_today' => Comunidad::whereDate('created_at', today())->count(),
                'posts_this_week' => Comunidad::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
                'active_users' => Comunidad::distinct('user_id')->whereDate('created_at', '>=', now()->subDays(30))->count(),
                'total_reactions' => Comunidad::sum('reactions_count'),
                'total_comments' => Comunidad::sum('comments_count'),
                'posts_by_type' => Comunidad::selectRaw('post_type, COUNT(*) as count')
                    ->groupBy('post_type')
                    ->get()
                    ->pluck('count', 'post_type'),
                'posts_by_zone' => Comunidad::selectRaw('zone, COUNT(*) as count')
                    ->groupBy('zone')
                    ->orderByDesc('count')
                    ->limit(10)
                    ->get()
                    ->pluck('count', 'zone')
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas'
            ], 500);
        }
    }
}
