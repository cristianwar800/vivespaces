<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TestNotification extends Notification
{
    use Queueable;

    protected $data;

    /**
     * Create a new notification instance.
     */
    public function __construct($data = [])
    {
        // Guardar los datos personalizados que queremos mostrar
        $this->data = $data;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Cambiar a 'database' para que aparezca en el panel de notificaciones
        return ['database'];
    }

    /**
     * Get the mail representation of the notification.
     * (Opcional - solo si quieres enviar emails también)
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->data['title'] ?? 'Nueva notificación')
            ->line($this->data['message'] ?? 'Tienes una nueva notificación.')
            ->action($this->data['action_text'] ?? 'Ver', url($this->data['action_url'] ?? '/'))
            ->line('¡Gracias por usar ViveSpaces!');
    }

    /**
     * Get the array representation of the notification.
     * Este método define lo que se guarda en la base de datos.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            // Datos principales de la notificación
            'type' => $this->data['type'] ?? 'system',
            'title' => $this->data['title'] ?? '🔔 Notificación del sistema',
            'message' => $this->data['message'] ?? 'Tienes una nueva notificación',

            // Datos de acción
            'action_url' => $this->data['action_url'] ?? null,
            'action_text' => $this->data['action_text'] ?? 'Ver más',

            // Configuración visual
            'icon' => $this->data['icon'] ?? 'Bell',
            'priority' => $this->data['priority'] ?? 'medium',

            // Datos adicionales (puedes agregar lo que quieras)
            'image_url' => $this->data['image_url'] ?? null,
            'sender_id' => $this->data['sender_id'] ?? null,
            'property_id' => $this->data['property_id'] ?? null,
            'custom_data' => $this->data['custom_data'] ?? null,

            // Metadatos
            'generated_at' => now()->toDateTimeString(),
            'source' => $this->data['source'] ?? 'system',

            // Campos para columnas personalizadas (si las agregaste)
            'notification_type' => $this->data['type'] ?? 'system',
        ];
    }

    /**
     * Get the database representation of the notification (alias de toArray).
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->toArray($notifiable);
    }
}
