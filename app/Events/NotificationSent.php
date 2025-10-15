<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;
    public $userId;

    /**
     * Create a new event instance.
     */
    public function __construct($notification, $userId)
    {
        $this->notification = [
            'id' => $notification->id,
            'type' => $notification->data['type'] ?? 'system',
            'title' => $notification->data['title'] ?? 'Notificación',
            'message' => $notification->data['message'] ?? '',
            'action_url' => $notification->data['action_url'] ?? null,
            'action_text' => $notification->data['action_text'] ?? null,
            'created_at' => $notification->created_at->toISOString(),
        ];
        $this->userId = $userId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('user.' . $this->userId),
        ];
    }

    /**
     * El nombre del evento en el frontend
     */
    public function broadcastAs(): string
    {
        return 'notification.new';
    }

    /**
     * Los datos que se enviarán al frontend
     */
    public function broadcastWith(): array
    {
        return [
            'notification' => $this->notification,
            'unread_count' => auth()->user()->unreadNotifications()->count() ?? 0,
        ];
    }
}
