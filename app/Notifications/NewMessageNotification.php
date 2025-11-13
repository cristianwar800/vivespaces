<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewMessageNotification extends Notification
{
    use Queueable;

    protected $data;

    /**
     * Create a new notification instance.
     */
    public function __construct($data = [])
    {
        $this->data = $data;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            // Datos principales
            'type' => 'message',
            'title' => $this->data['title'] ?? '💬 Nuevo mensaje',
            'message' => $this->data['message'] ?? 'Tienes un nuevo mensaje',

            // Datos de acción
            'action_url' => $this->data['action_url'] ?? null,
            'action_text' => $this->data['action_text'] ?? 'Ver mensaje',

            // Configuración visual
            'icon' => 'MessageCircle',
            'priority' => 'high',

            // Datos adicionales del mensaje
            'sender_id' => $this->data['sender_id'] ?? null,
            'sender_name' => $this->data['sender_name'] ?? null,
            'property_id' => $this->data['property_id'] ?? null,
            'property_title' => $this->data['property_title'] ?? null,
            'message_type' => $this->data['message_type'] ?? 'text',

            // Metadatos
            'generated_at' => now()->toDateTimeString(),
            'source' => 'chat',
            'notification_type' => 'message',
        ];
    }

    /**
     * Get the database representation of the notification.
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->toArray($notifiable);
    }
}
