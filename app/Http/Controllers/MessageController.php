<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function __construct()
    {
        // NO DESCOMENTAR ESTE MIDDELWARE PORQUE NO CARGAN LOS MENSAJES
    }

    // Mostrar todas las conversaciones del usuario
    public function index()
    {
        $conversations = Auth::user()->getConversationsWith();

        // Cargar datos adicionales
        foreach ($conversations as &$conversation) {
            $otherUser = User::select('id', 'name', 'last_name', 'profile_photo')->find($conversation['other_user_id']);

            if ($otherUser) {
                $otherUser->avatar_url = $otherUser->avatar_url;
                $conversation['other_user'] = $otherUser;
            } else {
                $conversation['other_user'] = null;
            }

            $conversation['property'] = Property::select('id', 'title')->find($conversation['property_id']);
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
        $otherUser = User::select('id', 'name', 'last_name', 'profile_photo')->findOrFail($userId);

        $otherUser->avatar_url = $otherUser->avatar_url;

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

    public function store(Request $request)
    {
        \Log::info('🚀🚀🚀 CÓDIGO NUEVO EJECUTÁNDOSE - VERSIÓN ACTUALIZADA 🚀🚀🚀');

        // 🔒 VALIDACIÓN DE LÍMITE DE MENSAJES PARA NO VERIFICADOS
        $user = Auth::user();

        if (!$user->is_identity_verified && !$user->canSendMessage()) {
            \Log::warning('⚠️ Usuario no verificado alcanzó límite de mensajes', [
                'user_id' => $user->id,
                'sent_messages' => $user->getSentMessagesCount(),
                'limit' => User::FREE_MESSAGE_LIMIT
            ]);

            return response()->json([
                'success' => false,
                'error' => 'MESSAGE_LIMIT_REACHED',
                'message' => 'Has alcanzado el límite de ' . User::FREE_MESSAGE_LIMIT . ' mensajes. Verifica tu identidad para enviar mensajes ilimitados.',
                'data' => [
                    'sent_messages' => $user->getSentMessagesCount(),
                    'limit' => User::FREE_MESSAGE_LIMIT,
                    'remaining' => 0,
                    'is_verified' => false,
                    'verification_url' => route('verification.identity')
                ]
            ], 403);
        }

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
            'has_file' => $request->hasFile('file'),
            'user_verified' => $user->is_identity_verified,
            'messages_sent' => $user->getSentMessagesCount(),
            'remaining_messages' => $user->getRemainingMessages()
        ]);

        // ✅ VALIDACIÓN ACTUALIZADA PARA AUDIO
        $validator = Validator::make($request->all(), [
            'property_id' => 'required|exists:properties,id',
            'receiver_id' => 'required|exists:users,id',
            'message' => 'nullable|string|max:1000',
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

        if (empty($request->message) && !$request->hasFile('file') && $request->type !== 'location') {
            return response()->json([
                'success' => false,
                'message' => 'Debes enviar un mensaje, un archivo o compartir ubicación',
                'errors' => ['message' => ['Debes enviar un mensaje, un archivo o compartir ubicación']]
            ], 422);
        }

        try {
            $property = Property::findOrFail($request->property_id);

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

                if (str_starts_with($file->getMimeType(), 'image/')) {
                    $messageData['type'] = 'image';
                    \Log::info('🖼️ Detectado como imagen');
                }
                elseif (
                    str_starts_with($file->getMimeType(), 'audio/') ||
                    $file->getMimeType() === 'video/webm' ||
                    in_array(strtolower($file->getExtension()), ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac']) ||
                    $file->getClientOriginalName() === 'voice-message.webm'
                ) {
                    $messageData['type'] = 'voice';
                    \Log::info('🎵 Detectado como audio/voz');

                    try {
                        \Log::info('🎵 Analizando audio con getID3...');
                        \Log::info('📁 Archivo a analizar: ' . $fullPath);

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

                            if ($file->getMimeType() === 'video/webm' && isset($fileInfo['filesize'])) {
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

                        if (isset($fileInfo['audio'])) {
                            $audioInfo = [
                                'bitrate' => $fileInfo['audio']['bitrate'] ?? null,
                                'sample_rate' => $fileInfo['audio']['sample_rate'] ?? null,
                                'channels' => $fileInfo['audio']['channels'] ?? null,
                            ];

                            $messageData['metadata'] = $audioInfo;
                            \Log::info('🎵 Info del audio:', $audioInfo);
                        } elseif (isset($fileInfo['video'])) {
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

                        if ($file->getMimeType() === 'video/webm' || $file->getClientOriginalName() === 'voice-message.webm') {
                            $messageData['duration'] = 10;
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
            $message->load(['sender:id,name,last_name,profile_photo', 'replyTo']);

            if ($message->sender) {
                $message->sender->avatar_url = $message->sender->avatar_url;
            }

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

            // 🔔 CREAR NOTIFICACIÓN para el receptor
            try {
                $receiver = \App\Models\User::find($message->receiver_id);
                $property = \App\Models\Property::find($message->property_id);

                if ($receiver && $property) {
                    $messagePreview = $message->type === 'text'
                        ? \Illuminate\Support\Str::limit($message->message, 50)
                        : ($message->type === 'audio' ? '🎤 Mensaje de voz' : '📎 ' . ($message->file_name ?? 'Archivo'));

                    $receiver->notify(new \App\Notifications\NewMessageNotification([
                        'type' => 'message',
                        'title' => "💬 Nuevo mensaje de {$user->name}",
                        'message' => $messagePreview,
                        'action_url' => "/chat?conversation=property_{$property->id}_users_{$user->id}_{$receiver->id}",
                        'action_text' => 'Ver mensaje',
                        'sender_id' => $user->id,
                        'sender_name' => $user->name . ' ' . ($user->last_name ?? ''),
                        'property_id' => $property->id,
                        'property_title' => $property->title,
                        'message_type' => $message->type
                    ]));

                    \Log::info('🔔 Notificación de mensaje enviada', [
                        'receiver_id' => $receiver->id,
                        'sender_id' => $user->id
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('❌ Error enviando notificación de mensaje:', [
                    'error' => $e->getMessage()
                ]);
                // No fallar el mensaje si la notificación falla
            }

            // 🔒 Información de límite de mensajes
            $messageLimit = [
                'remaining_messages' => $user->getRemainingMessages(),
                'total_sent' => $user->getSentMessagesCount(),
                'limit' => User::FREE_MESSAGE_LIMIT,
                'is_verified' => $user->is_identity_verified
            ];

            return response()->json([
                'success' => true,
                'message' => $formattedMessage,
                'message_limit' => $messageLimit
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

    public function markAsRead($messageId)
    {
        $message = Message::findOrFail($messageId);

        if ($message->receiver_id === Auth::id()) {
            $message->update(['read_at' => now()]);

            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false], 403);
    }

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

    public function removeReaction(Request $request, $messageId)
    {
        $validator = Validator::make($request->all(), [
            'emoji' => 'required|string|max:10'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $message = Message::findOrFail($messageId);

        if (!in_array(Auth::id(), $message->reactions[$request->emoji] ?? [])) {
            return response()->json(['success' => false], 403);
        }

        $message->removeReaction($request->emoji, Auth::id());

        return response()->json([
            'success' => true,
            'reactions' => $message->fresh()->reactions
        ]);
    }

    public function destroy($messageId)
    {
        $message = Message::findOrFail($messageId);

        if ($message->sender_id === Auth::id()) {
            $message->update(['is_deleted' => true, 'deleted_at' => now()]);

            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false], 403);
    }

    public function getMessages($propertyId, $userId)
    {
        $messages = Message::forConversation($propertyId, Auth::id(), $userId)
                           ->with(['sender', 'replyTo'])
                           ->orderBy('created_at', 'asc')
                           ->get();

        return response()->json(['messages' => $messages]);
    }

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

        if ($property->user_id === $senderId) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes contactarte a ti mismo'
            ], 422);
        }

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

        $conversationId = 'property_' . $request->property_id . '_users_' . min($senderId, $receiverId) . '_' . max($senderId, $receiverId);

        if (!$existingMessage) {
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

                    public function getConversations()
{
    try {
        $currentUserId = Auth::id();
        
        \Log::info('📥 ========== INICIO getConversations ==========');
        \Log::info('👤 Usuario actual:', ['user_id' => $currentUserId]);

        $conversations = Auth::user()->getConversationsWith();

        \Log::info('🔍 Conversaciones encontradas (raw):', [
            'count' => count($conversations),
            'conversations' => $conversations
        ]);

        $filteredConversations = [];
        $conversationIndex = 0;

        foreach ($conversations as $conversation) {
            $conversationIndex++;
            
            \Log::info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            \Log::info("🔍 Procesando conversación #{$conversationIndex}", [
                'property_id' => $conversation['property_id'],
                'other_user_id' => $conversation['other_user_id']
            ]);
            
            $otherUserId = $conversation['other_user_id'];
            
            // Contar TODOS los mensajes de esta conversación
            $allMessagesCount = Message::where('property_id', $conversation['property_id'])
                ->where(function($query) use ($currentUserId, $otherUserId) {
                    $query->where(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $currentUserId)
                          ->where('receiver_id', $otherUserId);
                    })->orWhere(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $otherUserId)
                          ->where('receiver_id', $currentUserId);
                    });
                })
                ->count();
            
            \Log::info("📊 Total de mensajes en conversación:", ['count' => $allMessagesCount]);
            
            // Obtener mensajes con deleted_by para debug
            $messagesWithDeletedBy = Message::where('property_id', $conversation['property_id'])
                ->where(function($query) use ($currentUserId, $otherUserId) {
                    $query->where(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $currentUserId)
                          ->where('receiver_id', $otherUserId);
                    })->orWhere(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $otherUserId)
                          ->where('receiver_id', $currentUserId);
                    });
                })
                ->select('id', 'sender_id', 'receiver_id', 'deleted_by', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($msg) use ($currentUserId) {
                    return [
                        'id' => $msg->id,
                        'sender_id' => $msg->sender_id,
                        'receiver_id' => $msg->receiver_id,
                        'deleted_by' => $msg->deleted_by,
                        'current_user_deleted' => in_array($currentUserId, $msg->deleted_by ?? []),
                    ];
                });
            
            \Log::info("🗂️ Últimos 5 mensajes con deleted_by:", [
                'messages' => $messagesWithDeletedBy->toArray()
            ]);
            
            // Verificar si hay mensajes visibles (no eliminados por este usuario)
            $visibleMessagesQuery = Message::where('property_id', $conversation['property_id'])
                ->where(function($query) use ($currentUserId, $otherUserId) {
                    $query->where(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $currentUserId)
                          ->where('receiver_id', $otherUserId);
                    })->orWhere(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $otherUserId)
                          ->where('receiver_id', $currentUserId);
                    });
                });
            
            \Log::info("🔍 Query ANTES de notDeletedBy:", [
                'sql' => $visibleMessagesQuery->toSql(),
                'bindings' => $visibleMessagesQuery->getBindings()
            ]);
            
            $visibleMessagesQuery->notDeletedBy($currentUserId);
            
            \Log::info("🔍 Query DESPUÉS de notDeletedBy:", [
                'sql' => $visibleMessagesQuery->toSql(),
                'bindings' => $visibleMessagesQuery->getBindings()
            ]);
            
            $visibleMessagesCount = $visibleMessagesQuery->count();
            $hasVisibleMessages = $visibleMessagesCount > 0;

            \Log::info("📊 Resultado de verificación:", [
                'property_id' => $conversation['property_id'],
                'visible_messages_count' => $visibleMessagesCount,
                'hasVisibleMessages' => $hasVisibleMessages,
                'current_user_id' => $currentUserId
            ]);

            // Si no hay mensajes visibles, omitir esta conversación
            if (!$hasVisibleMessages) {
                \Log::info("⏭️ ❌ Conversación OMITIDA (sin mensajes visibles)", [
                    'property_id' => $conversation['property_id'],
                    'other_user_id' => $conversation['other_user_id'],
                    'reason' => 'No hay mensajes visibles para este usuario'
                ]);
                continue;
            }

            \Log::info("✅ Conversación INCLUIDA (tiene mensajes visibles)");

            // 🔒 RESTRICCIÓN: Si el usuario no está verificado, verificar si tiene mensajes recibidos
            $currentUser = Auth::user();
            if (!$currentUser->is_identity_verified) {
                // Contar mensajes ENVIADOS por este usuario en esta conversación
                $sentMessagesCount = Message::where('property_id', $conversation['property_id'])
                    ->where('sender_id', $currentUserId)
                    ->where('receiver_id', $otherUserId)
                    ->notDeletedBy($currentUserId)
                    ->count();

                // Contar mensajes RECIBIDOS en esta conversación
                $receivedMessagesCount = Message::where('property_id', $conversation['property_id'])
                    ->where('sender_id', $otherUserId)
                    ->where('receiver_id', $currentUserId)
                    ->notDeletedBy($currentUserId)
                    ->count();

                // Si solo tiene mensajes enviados y ninguno recibido, omitir conversación
                if ($sentMessagesCount > 0 && $receivedMessagesCount === 0) {
                    \Log::info("⏭️ ❌ Conversación OMITIDA (usuario no verificado sin respuestas)", [
                        'property_id' => $conversation['property_id'],
                        'sent_messages' => $sentMessagesCount,
                        'received_messages' => $receivedMessagesCount,
                        'reason' => 'Usuario no verificado sin respuestas'
                    ]);
                    continue;
                }
            }

            $otherUser = User::select('id', 'name', 'last_name', 'profile_photo')
                ->find($conversation['other_user_id']);

            if ($otherUser) {
                $otherUser->avatar_url = $otherUser->avatar_url;
                $conversation['other_user'] = $otherUser;
            } else {
                $conversation['other_user'] = null;
            }

            $conversation['property'] = Property::select('id', 'title')
                ->find($conversation['property_id']);

            // Obtener último mensaje NO eliminado
            $lastMessage = Message::where('property_id', $conversation['property_id'])
                ->where(function($query) use ($currentUserId, $otherUserId) {
                    $query->where(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $currentUserId)
                          ->where('receiver_id', $otherUserId);
                    })->orWhere(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $otherUserId)
                          ->where('receiver_id', $currentUserId);
                    });
                })
                ->notDeletedBy($currentUserId)
                ->orderBy('created_at', 'desc')
                ->first();
                
            \Log::info("📨 Último mensaje visible:", [
                'message_id' => $lastMessage?->id,
                'message_text' => $lastMessage?->message,
                'created_at' => $lastMessage?->created_at
            ]);

            // 🔒 BLOQUEAR contenido del último mensaje si es del otro usuario y el usuario actual no está verificado
            if ($lastMessage && !$currentUser->is_identity_verified && $lastMessage->sender_id !== $currentUserId) {
                // Crear una copia del mensaje con contenido bloqueado
                $blockedMessage = clone $lastMessage;
                $blockedMessage->message = '🔒 Verifica tu identidad para ver este mensaje';
                $blockedMessage->is_blocked = true;
                $conversation['last_message'] = $blockedMessage;
            } else {
                $conversation['last_message'] = $lastMessage;
            }
            
            // Contar mensajes no leídos y no eliminados
            $unreadCount = Auth::user()->receivedMessages()
                ->where('sender_id', $conversation['other_user_id'])
                ->where('property_id', $conversation['property_id'])
                ->whereNull('read_at')
                ->notDeletedBy($currentUserId)
                ->count();
                
            \Log::info("📬 Mensajes no leídos:", ['count' => $unreadCount]);
                
            $conversation['unread_count'] = $unreadCount;

            $filteredConversations[] = $conversation;
            
            \Log::info("➕ Conversación agregada al resultado final");
        }

        \Log::info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        \Log::info('✅ ========== FIN getConversations ==========');
        \Log::info('📊 Resumen final:', [
            'conversaciones_raw' => count($conversations),
            'conversaciones_filtradas' => count($filteredConversations)
        ]);

        return response()->json([
            'success' => true,
            'conversations' => $filteredConversations
        ]);

    } catch (\Exception $e) {
        \Log::error('❌ ========== ERROR en getConversations ==========');
        \Log::error('💥 Error:', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        \Log::error('📍 Stack trace:', ['trace' => $e->getTraceAsString()]);
        
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function getMessagesByConversationId($conversationId)
    {
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
        $currentUser = Auth::user();

        if ($currentUserId != $userId1 && $currentUserId != $userId2) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes acceso a esta conversación'
            ], 403);
        }

        $otherUserId = ($currentUserId == $userId1) ? $userId2 : $userId1;

        $messages = Message::forConversation($propertyId, $currentUserId, $otherUserId)
                            ->notDeletedBy($currentUserId) // 🆕 Filtrar mensajes eliminados por este usuario
                            ->with(['sender:id,name,last_name,profile_photo', 'replyTo'])
                        ->orderBy('created_at', 'asc')
                        ->get()
                        ->each(function ($message) {
                            if ($message->sender) {
                                $message->sender->avatar_url = $message->sender->avatar_url;
                            }
                        })
                        ->map(function ($message) use ($currentUserId, $currentUser) {
                            // 🔒 RESTRICCIÓN: Si no está verificado, bloquear mensajes recibidos
                            $isBlocked = false;
                            if (!$currentUser->is_identity_verified && $message->sender_id !== $currentUserId) {
                                $isBlocked = true;
                            }

                            return [
                                'id' => $message->id,
                                'sender_id' => $message->sender_id,
                                'receiver_id' => $message->receiver_id,
                                'message' => $isBlocked ? null : $message->message,
                                'type' => $message->type,
                                'file_url' => $isBlocked ? null : $message->getFileUrl(),
                                'file_name' => $isBlocked ? null : $message->file_name,
                                'file_size_formatted' => $isBlocked ? null : $message->getFileSizeFormatted(),
                                'reactions' => $message->reactions ?? [],
                                'read_at' => $message->read_at,
                                'created_at' => $message->created_at,
                                'sender' => $message->sender,
                                'is_blocked' => $isBlocked // 🆕 Indica si está bloqueado
                            ];
                        });

        // 🔒 Información de límite de mensajes
        $messageLimit = [
            'remaining_messages' => $currentUser->getRemainingMessages(),
            'total_sent' => $currentUser->getSentMessagesCount(),
            'limit' => User::FREE_MESSAGE_LIMIT,
            'is_verified' => $currentUser->is_identity_verified
        ];

        return response()->json([
            'success' => true,
            'messages' => $messages,
            'message_limit' => $messageLimit
        ]);
    }

    public function markMessagesAsRead($conversationId)
    {
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

        $otherUserId = ($currentUserId == $userId1) ? $userId2 : $userId1;

        Message::where('property_id', $propertyId)
               ->where('sender_id', $otherUserId)
               ->where('receiver_id', $currentUserId)
               ->whereNull('read_at')
               ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    // ========================================
    // 🆕 NUEVO MÉTODO: ELIMINAR CONVERSACIÓN
    // ========================================
    
        /**
 * 🗑️ Eliminar conversación (soft delete por usuario)
 */
    public function deleteConversation($conversationId)
    {
        try {
            \Log::info('🗑️ Iniciando eliminación de conversación', [
                'conversation_id' => $conversationId,
                'user_id' => Auth::id()
            ]);

            // Validar formato del ID
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

            // Verificar permisos
            if ($currentUserId != $userId1 && $currentUserId != $userId2) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes acceso a esta conversación'
                ], 403);
            }

            $otherUserId = ($currentUserId == $userId1) ? $userId2 : $userId1;

            // Obtener todos los mensajes de la conversación
            $messages = Message::where('property_id', $propertyId)
                ->where(function($query) use ($currentUserId, $otherUserId) {
                    $query->where(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $currentUserId)
                        ->where('receiver_id', $otherUserId);
                    })->orWhere(function($q) use ($currentUserId, $otherUserId) {
                        $q->where('sender_id', $otherUserId)
                        ->where('receiver_id', $currentUserId);
                    });
                })
                ->get();

            if ($messages->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron mensajes en esta conversación'
                ], 404);
            }

            $updatedCount = 0;
            $deletedPermanentlyCount = 0;

            // Procesar cada mensaje
            foreach ($messages as $message) {
                $deletedBy = $message->deleted_by ?? [];
                
                // Si el usuario actual ya eliminó este mensaje, skip
                if (in_array($currentUserId, $deletedBy)) {
                    continue;
                }

                // Agregar usuario actual a deleted_by
                $deletedBy[] = $currentUserId;
                $message->deleted_by = $deletedBy;
                $message->save();
                $updatedCount++;

                \Log::info('📝 Mensaje marcado como eliminado', [
                    'message_id' => $message->id,
                    'deleted_by' => $deletedBy,
                    'deleted_by_count' => count($deletedBy)
                ]);

                // Si ambos usuarios eliminaron, borrar permanentemente
                if (count($deletedBy) >= 2) {
                    \Log::info('🗑️ Eliminando mensaje permanentemente', [
                        'message_id' => $message->id,
                        'reason' => 'Ambos usuarios eliminaron'
                    ]);
                    $message->delete();
                    $deletedPermanentlyCount++;
                }
            }

            \Log::info('✅ Conversación procesada', [
                'conversation_id' => $conversationId,
                'messages_marked_deleted' => $updatedCount,
                'messages_deleted_permanently' => $deletedPermanentlyCount,
                'user_id' => $currentUserId,
                'other_user_id' => $otherUserId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Conversación eliminada exitosamente',
                'updated_count' => $updatedCount,
                'deleted_permanently_count' => $deletedPermanentlyCount
            ]);

        } catch (\Exception $e) {
            \Log::error('❌ Error eliminando conversación', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la conversación: ' . $e->getMessage()
            ], 500);
        }
    }
}