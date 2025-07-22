<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    public function __construct()
    {
        // NO DESCOMENTAR ESTE MIDDELWARE PORQUE NO CARGAN LOS MENSAJES $this->middleware('auth');
    }

    // Mostrar todas las conversaciones del usuario
    public function index()
    {
        $conversations = Auth::user()->getConversationsWith();

        // Cargar datos adicionales
        foreach ($conversations as &$conversation) {
            $conversation['other_user'] = User::find($conversation['other_user_id']);
            $conversation['property'] = Property::find($conversation['property_id']);
            $conversation['last_message'] = Auth::user()->getLastMessageWith(
                $conversation['other_user_id'],
                $conversation['property_id']
            );
            $conversation['unread_count'] = Auth::user()->receivedMessages()
                ->where('sender_id', $conversation['other_user_id'])
                ->where('property_id', $conversation['property_id'])
                ->unread(Auth::id())
                ->count();
        }

        return view('messages.index', compact('conversations'));
    }

    // Mostrar conversación específica
    public function show($propertyId, $userId)
    {
        $property = Property::findOrFail($propertyId);
        $otherUser = User::findOrFail($userId);

        // Verificar permisos
        if (!Auth::user()->canContactProperty($propertyId) && $property->user_id !== Auth::id()) {
            abort(403, 'No tienes permiso para ver esta conversación');
        }

        // Obtener mensajes
        $messages = Message::forConversation($propertyId, Auth::id(), $userId)
                           ->with(['sender', 'replyTo'])
                           ->orderBy('created_at', 'asc')
                           ->get();

        // Marcar mensajes como leídos
        Message::where('property_id', $propertyId)
               ->where('sender_id', $userId)
               ->where('receiver_id', Auth::id())
               ->whereNull('read_at')
               ->update(['read_at' => now()]);

        return view('messages.show', compact('property', 'otherUser', 'messages'));
    }

    // ✅ MÉTODO STORE CORREGIDO
    // En app/Http/Controllers/MessageController.php - REEMPLAZAR método store COMPLETO
    public function store(Request $request)
    {
        \Log::info('🚀🚀🚀 CÓDIGO NUEVO EJECUTÁNDOSE - VERSIÓN ACTUALIZADA 🚀🚀🚀');

        // ✅ VERIFICACIÓN DE getID3
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
                    $file->getMimeType() === 'video/webm' ||  // ✅ CLAVE: webm puede ser audio
                    in_array(strtolower($file->getExtension()), ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac']) ||
                    $file->getClientOriginalName() === 'voice-message.webm'  // ✅ DETECTAR POR NOMBRE
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

                        // ✅ OBTENER DURACIÓN DEL AUDIO CON getID3
                        if (isset($fileInfo['playtime_seconds'])) {
                            $duration = round($fileInfo['playtime_seconds']);
                            $messageData['duration'] = $duration;

                            \Log::info('✅ Duración obtenida:', [
                                'duration_seconds' => $duration,
                                'duration_formatted' => gmdate('i:s', $duration)
                            ]);
                        } else {
                            \Log::warning('⚠️ No se encontró playtime_seconds en fileInfo');

                            // ✅ FALLBACK: Calcular duración aproximada para WebM
                            if ($file->getMimeType() === 'video/webm' && isset($fileInfo['filesize'])) {
                                // Aproximación: 1 segundo por cada 8KB para audio WebM
                                $estimatedDuration = max(1, round($fileInfo['filesize'] / 8192));
                                $messageData['duration'] = $estimatedDuration;

                                \Log::info('🔄 Duración estimada para WebM:', [
                                    'duration_seconds' => $estimatedDuration,
                                    'filesize' => $fileInfo['filesize']
                                ]);
                            } else {
                                \Log::info('🔍 Claves disponibles en fileInfo: ' . implode(', ', array_keys($fileInfo)));
                            }
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
                        if ($file->getMimeType() === 'video/webm' || $file->getClientOriginalName() === 'voice-message.webm') {
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
                'reactions' => $message->reactions ?? [],
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
    // Marcar mensaje como leído
    public function markAsRead($messageId)
    {
        $message = Message::findOrFail($messageId);

        if ($message->receiver_id === Auth::id()) {
            $message->update(['read_at' => now()]);

            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false], 403);
    }

    // Agregar reacción
    public function addReaction(Request $request, $messageId)
    {
        $validator = Validator::make($request->all(), [
            'emoji' => 'required|string|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $message = Message::findOrFail($messageId);
        $message->addReaction($request->emoji, Auth::id());

        return response()->json([
            'success' => true,
            'reactions' => $message->fresh()->reactions
        ]);
    }

    // Eliminar reacción
    public function removeReaction(Request $request, $messageId)
    {
        $validator = Validator::make($request->all(), [
            'emoji' => 'required|string|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $message = Message::findOrFail($messageId);

        // Verificar que el usuario puede quitar la reacción
        if (!in_array(Auth::id(), $message->reactions[$request->emoji] ?? [])) {
            return response()->json(['success' => false], 403);
        }

        $message->removeReaction($request->emoji, Auth::id());

        return response()->json([
            'success' => true,
            'reactions' => $message->fresh()->reactions
        ]);
    }

    // Eliminar mensaje
    public function destroy($messageId)
    {
        $message = Message::findOrFail($messageId);

        if ($message->sender_id === Auth::id()) {
            $message->update(['is_deleted' => true, 'deleted_at' => now()]);

            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false], 403);
    }

    // API para obtener mensajes (método original - mantener por compatibilidad)
    public function getMessages($propertyId, $userId)
    {
        $messages = Message::forConversation($propertyId, Auth::id(), $userId)
                           ->with(['sender', 'replyTo'])
                           ->orderBy('created_at', 'asc')
                           ->get();

        return response()->json(['messages' => $messages]);
    }

    // ========================================
    // 🆕 NUEVOS MÉTODOS PARA EL CHAT - CORREGIDOS
    // ========================================

    /**
     * Iniciar una conversación sobre una propiedad
     */
    public function startConversation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'property_id' => 'required|exists:properties,id',
            'receiver_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $property = Property::findOrFail($request->property_id);
        $receiverId = $request->receiver_id;
        $senderId = Auth::id();

        // Verificar que no sea el propietario
        if ($property->user_id === $senderId) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes contactarte a ti mismo'
            ], 422);
        }

        // Buscar si ya existe una conversación
        $existingMessage = Message::where('property_id', $request->property_id)
            ->where(function($query) use ($senderId, $receiverId) {
                $query->where(function($q) use ($senderId, $receiverId) {
                    $q->where('sender_id', $senderId)
                      ->where('receiver_id', $receiverId);
                })->orWhere(function($q) use ($senderId, $receiverId) {
                    $q->where('sender_id', $receiverId)
                      ->where('receiver_id', $senderId);
                });
            })
            ->first();

        // Crear ID de conversación
        $conversationId = 'property_' . $request->property_id . '_users_' . min($senderId, $receiverId) . '_' . max($senderId, $receiverId);

        if (!$existingMessage) {
            // Crear mensaje inicial si no existe conversación
            Message::create([
                'property_id' => $request->property_id,
                'sender_id' => $senderId,
                'receiver_id' => $receiverId,
                'message' => "Hola, estoy interesado en tu propiedad: " . $property->title,
                'type' => 'text'
            ]);
        }

        return response()->json([
            'success' => true,
            'conversation' => [
                'id' => $conversationId,
                'property_id' => $request->property_id,
                'other_user_id' => $receiverId
            ]
        ]);
    }

    /**
     * Obtener todas las conversaciones del usuario
     */
            // En app/Http/Controllers/MessageController.php - REEMPLAZAR método getConversations()
public function getConversations()
{
    try {
        \Log::info('Getting conversations for user: ' . Auth::id());

        $conversations = Auth::user()->getConversationsWith();

        \Log::info('Raw conversations: ', $conversations);

        // Cargar datos adicionales
        foreach ($conversations as &$conversation) {
            $conversation['other_user'] = User::find($conversation['other_user_id']);
            $conversation['property'] = Property::find($conversation['property_id']);
            $conversation['last_message'] = Auth::user()->getLastMessageWith(
                $conversation['other_user_id'],
                $conversation['property_id']
            );
            $conversation['unread_count'] = Auth::user()->receivedMessages()
                ->where('sender_id', $conversation['other_user_id'])
                ->where('property_id', $conversation['property_id'])
                ->whereNull('read_at')
                ->count();
        }

        \Log::info('Processed conversations: ', $conversations);

        return response()->json([
            'success' => true,
            'conversations' => $conversations
        ]);

    } catch (\Exception $e) {
        \Log::error('Error in getConversations: ' . $e->getMessage());
        \Log::error('Stack trace: ' . $e->getTraceAsString());

        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
}

    /**
     * ✅ NUEVO: Obtener mensajes por ID de conversación
     */
    public function getMessagesByConversationId($conversationId)
    {
        // Parsear el conversation ID: property_4_users_13_14
        if (!preg_match('/property_(\d+)_users_(\d+)_(\d+)/', $conversationId, $matches)) {
            return response()->json([
                'success' => false,
                'message' => 'ID de conversación inválido'
            ], 400);
        }

        $propertyId = $matches[1];
        $userId1 = $matches[2];
        $userId2 = $matches[3];
        $currentUserId = Auth::id();

        // Verificar que el usuario actual es parte de la conversación
        if ($currentUserId != $userId1 && $currentUserId != $userId2) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes acceso a esta conversación'
            ], 403);
        }

        // Obtener el otro usuario
        $otherUserId = ($currentUserId == $userId1) ? $userId2 : $userId1;

        // Obtener mensajes
        $messages = Message::forConversation($propertyId, $currentUserId, $otherUserId)
                           ->with(['sender', 'replyTo'])
                           ->orderBy('created_at', 'asc')
                           ->get()
                           ->map(function ($message) {
                               return [
                                   'id' => $message->id,
                                   'sender_id' => $message->sender_id,
                                   'receiver_id' => $message->receiver_id,
                                   'message' => $message->message,
                                   'type' => $message->type,
                                   'file_url' => $message->getFileUrl(),
                                   'file_name' => $message->file_name,
                                   'file_size_formatted' => $message->getFileSizeFormatted(),
                                   'reactions' => $message->reactions ?? [], // ✅ AGREGAR ESTO
                                   'read_at' => $message->read_at,
                                   'created_at' => $message->created_at,
                                   'sender' => $message->sender
                               ];
                           });

        return response()->json([
            'success' => true,
            'messages' => $messages
        ]);
    }

    /**
     * ✅ NUEVO: Marcar mensajes como leídos por conversación
     */
    public function markMessagesAsRead($conversationId)
    {
        // Parsear el conversation ID
        if (!preg_match('/property_(\d+)_users_(\d+)_(\d+)/', $conversationId, $matches)) {
            return response()->json([
                'success' => false,
                'message' => 'ID de conversación inválido'
            ], 400);
        }

        $propertyId = $matches[1];
        $userId1 = $matches[2];
        $userId2 = $matches[3];
        $currentUserId = Auth::id();

        // Obtener el otro usuario
        $otherUserId = ($currentUserId == $userId1) ? $userId2 : $userId1;

        // Marcar mensajes como leídos
        Message::where('property_id', $propertyId)
               ->where('sender_id', $otherUserId)
               ->where('receiver_id', $currentUserId)
               ->whereNull('read_at')
               ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }
}
