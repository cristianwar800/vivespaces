<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'last_name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'role',
        'is_active',
        'profile_photo',
        'password',
        'is_identity_verified',    // 🆕 NUEVO
        'verified_at',             // 🆕 NUEVO
        'verification_method',     // 🆕 NUEVO
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    // Relación existente
    public function properties()
    {
        return $this->hasMany(Property::class);
    }

    // 🆕 NUEVAS RELACIONES PARA MENSAJERÍA
    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    // 🆕 MÉTODOS ÚTILES PARA MENSAJERÍA
    public function getUnreadMessagesCount(): int
    {
        return $this->receivedMessages()->unread($this->id)->count();
    }

    // ✅ MÉTODO CORREGIDO
        // En app/Models/User.php - REEMPLAZAR el método getConversationsWith() COMPLETO
public function getConversationsWith(): array
{
    $userId = $this->id;

    try {
        // Obtener conversaciones de mensajes enviados
        $sentConversations = \DB::table('messages')
            ->select('property_id', 'receiver_id as other_user_id')
            ->selectRaw('MAX(created_at) as last_activity')
            ->where('sender_id', $userId)
            ->where('is_deleted', false)
            ->groupBy('property_id', 'receiver_id')
            ->get()
            ->toArray();

        // Obtener conversaciones de mensajes recibidos
        $receivedConversations = \DB::table('messages')
            ->select('property_id', 'sender_id as other_user_id')
            ->selectRaw('MAX(created_at) as last_activity')
            ->where('receiver_id', $userId)
            ->where('is_deleted', false)
            ->groupBy('property_id', 'sender_id')
            ->get()
            ->toArray();

        // Combinar arrays simples
        $allConversations = array_merge($sentConversations, $receivedConversations);

        // Crear array asociativo para eliminar duplicados
        $uniqueConversations = [];

        foreach ($allConversations as $conv) {
            $key = $conv->property_id . '-' . $conv->other_user_id;

            if (!isset($uniqueConversations[$key]) ||
                $conv->last_activity > $uniqueConversations[$key]['last_activity']) {
                $uniqueConversations[$key] = [
                    'property_id' => $conv->property_id,
                    'other_user_id' => $conv->other_user_id,
                    'last_activity' => $conv->last_activity
                ];
            }
        }

        // Ordenar por última actividad
        usort($uniqueConversations, function($a, $b) {
            return strtotime($b['last_activity']) - strtotime($a['last_activity']);
        });

        return $uniqueConversations;

    } catch (\Exception $e) {
        \Log::error('Error in getConversationsWith: ' . $e->getMessage());
        return [];
    }
}

    public function hasUnreadMessagesFromUser($userId): bool
    {
        return $this->receivedMessages()
                   ->where('sender_id', $userId)
                   ->unread($this->id)
                   ->exists();
    }

    public function getLastMessageWith($userId, $propertyId = null)
    {
        $query = Message::where(function($q) use ($userId) {
            $q->where('sender_id', $this->id)->where('receiver_id', $userId);
        })->orWhere(function($q) use ($userId) {
            $q->where('sender_id', $userId)->where('receiver_id', $this->id);
        });

        if ($propertyId) {
            $query->where('property_id', $propertyId);
        }

        return $query->latest()->first();
    }

    // 🆕 MÉTODO PARA OBTENER NOMBRE COMPLETO
    public function getFullNameAttribute(): string
    {
        return $this->name . ' ' . $this->last_name;
    }

    // 🆕 MÉTODO PARA AVATAR/FOTO DE PERFIL
    public function getAvatarUrlAttribute(): string
    {
        if ($this->profile_photo) {
            return asset('storage/' . $this->profile_photo);
        }

        // Avatar por defecto basado en iniciales
        $initials = strtoupper(substr($this->name, 0, 1) . substr($this->last_name, 0, 1));
        return "https://ui-avatars.com/api/?name={$initials}&background=10b981&color=ffffff&size=128";
    }

    // 🆕 VERIFICAR SI ES PROPIETARIO DE UNA PROPIEDAD
    public function ownsProperty($propertyId): bool
    {
        return $this->properties()->where('id', $propertyId)->exists();
    }

    // 🆕 VERIFICAR SI PUEDE CONTACTAR UNA PROPIEDAD
    public function canContactProperty($propertyId): bool
    {
        // No puede contactar sus propias propiedades
        return !$this->ownsProperty($propertyId);
    }
}
