<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Events\NotificationSent; // ⬅️ AGREGAR

class NotificationController extends Controller
{
    /**
     * Obtener todas las notificaciones del usuario
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $notifications = $user->notifications()->paginate(20);

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $user->unreadNotifications()->count()
        ]);
    }

    /**
     * Obtener solo no leídas
     */
    public function unread()
    {
        $user = auth()->user();

        $notifications = $user->unreadNotifications()
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'notifications' => $notifications->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->data['type'] ?? 'system',
                    'title' => $notification->data['title'] ?? 'Notificación',
                    'message' => $notification->data['message'] ?? '',
                    'action_url' => $notification->data['action_url'] ?? null,
                    'action_text' => $notification->data['action_text'] ?? null,
                    'read' => $notification->read_at !== null,
                    'read_at' => $notification->read_at,
                    'created_at' => $notification->created_at,
                    'data' => $notification->data
                ];
            }),
            'count' => $notifications->count()
        ]);
    }

    /**
     * Obtener contador de no leídas
     */
    public function count()
    {
        $count = auth()->user()->unreadNotifications()->count();

        return response()->json([
            'success' => true,
            'count' => $count
        ]);
    }

    /**
     * Marcar como leída
     */
    public function markAsRead($id)
    {
        $notification = auth()->user()
            ->notifications()
            ->where('id', $id)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notificación no encontrada'
            ], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notificación marcada como leída',
            'notification' => $notification
        ]);
    }

    /**
     * Marcar todas como leídas
     */
    public function markAllAsRead()
    {
        $user = auth()->user();

        $user->unreadNotifications->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Todas las notificaciones marcadas como leídas'
        ]);
    }

    /**
     * Eliminar notificación
     */
    public function destroy($id)
    {
        $notification = auth()->user()
            ->notifications()
            ->where('id', $id)
            ->first();

        if (!$notification) {
            return response()->json([
                'success' => false,
                'message' => 'Notificación no encontrada'
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notificación eliminada'
        ]);
    }

    /**
     * Eliminar todas las notificaciones leídas
     */
    public function clearRead()
    {
        $user = auth()->user();

        $deleted = $user->readNotifications()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notificaciones leídas eliminadas',
            'deleted_count' => $deleted
        ]);
    }

    /**
     * Crear notificación de prueba CON TIEMPO REAL 🔥
     */
    public function createTestNotification()
    {
        $user = auth()->user();

        // Crear la notificación
        $user->notify(new \App\Notifications\TestNotification([
            'type' => 'system',
            'title' => '🎉 Notificación de prueba',
            'message' => 'Esta es una notificación de prueba del sistema',
            'action_url' => '/profile',
            'action_text' => 'Ver perfil'
        ]));

        // Obtener la última notificación creada
        $notification = $user->notifications()->latest()->first();

        // 🔥 DISPARAR EVENTO PARA TIEMPO REAL
        if ($notification) {
            broadcast(new NotificationSent($notification, $user->id));
        }

        return response()->json([
            'success' => true,
            'message' => 'Notificación de prueba creada y transmitida en tiempo real'
        ]);
    }
}
