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
        'google_id',      // 🆕 AGREGADO
        'avatar',         // 🆕 AGREGADO
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
        'is_identity_verified',
        'verified_at',
        'verification_method',
        'suspended_at',
        'must_change_password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'suspended_at' => 'datetime',
            'verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'is_identity_verified' => 'boolean',
        ];
    }

    // ==========================================
    // RELACIONES EXISTENTES (Propiedades)
    // ==========================================

    public function properties()
    {
        return $this->hasMany(Property::class);
    }

    // ==========================================
    // RELACIONES DE MENSAJERÍA
    // ==========================================

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    // ==========================================
    // RELACIONES DE CALIFICACIONES
    // ==========================================

    public function ratingsGiven()
    {
        return $this->hasMany(UserRating::class, 'rater_id');
    }

    public function ratingsReceived()
    {
        return $this->hasMany(UserRating::class, 'rated_id');
    }

    // ==========================================
    // 🔥 NUEVAS RELACIONES DE VERIFICACIÓN
    // ==========================================

    /**
     * Todas las verificaciones de identidad de este usuario
     */
    public function verifications()
    {
        return $this->hasMany(UserVerification::class);
    }

    /**
     * Verificación activa actual (en progreso y no expirada)
     */
    public function activeVerification()
    {
        return $this->hasOne(UserVerification::class)
            ->where('status', 'in_progress')
            ->where('expires_at', '>', now())
            ->latest();
    }

    /**
     * Última verificación completada
     */
    public function completedVerification()
    {
        return $this->hasOne(UserVerification::class)
            ->where('status', 'completed')
            ->latest('completed_at');
    }

    // ==========================================
    // MÉTODOS DE MENSAJERÍA
    // ==========================================

    // 🔒 LÍMITE DE MENSAJES PARA NO VERIFICADOS
    const FREE_MESSAGE_LIMIT = 5;

    public function getUnreadMessagesCount(): int
    {
        return $this->receivedMessages()->unread($this->id)->count();
    }

    /**
     * 🔒 Obtener cantidad de mensajes enviados (solo si no está verificado)
     */
    public function getSentMessagesCount(): int
    {
        return $this->sentMessages()->count();
    }

    /**
     * 🔒 Verificar si puede enviar mensajes
     */
    public function canSendMessage(): bool
    {
        // Si está verificado, siempre puede enviar
        if ($this->is_identity_verified) {
            return true;
        }

        // Si no está verificado, verificar límite
        return $this->getSentMessagesCount() < self::FREE_MESSAGE_LIMIT;
    }

    /**
     * 🔒 Obtener mensajes restantes (solo para no verificados)
     */
    public function getRemainingMessages(): int
    {
        if ($this->is_identity_verified) {
            return -1; // -1 significa ilimitado
        }

        $remaining = self::FREE_MESSAGE_LIMIT - $this->getSentMessagesCount();
        return max(0, $remaining);
    }

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

            // Combinar arrays
            $allConversations = array_merge($sentConversations, $receivedConversations);

            // Eliminar duplicados
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

    // ==========================================
    // MÉTODOS DE CALIFICACIONES
    // ==========================================

    public function getAverageRating()
    {
        return $this->ratingsReceived()->avg('rating') ?? 0;
    }

    public function getTotalRatings()
    {
        return $this->ratingsReceived()->count();
    }

    public function hasRatedUser($userId, $propertyId)
    {
        return UserRating::hasRated($this->id, $userId, $propertyId);
    }

    public function getRatingFor($userId, $propertyId)
    {
        return $this->ratingsGiven()
                    ->where('rated_id', $userId)
                    ->where('property_id', $propertyId)
                    ->first();
    }

    public function getRatingDistribution()
    {
        return UserRating::getRatingDistribution($this->id);
    }

    public function getRecentRatings($limit = 5)
    {
        return $this->ratingsReceived()
                    ->with(['rater', 'property'])
                    ->latest()
                    ->limit($limit)
                    ->get();
    }

    // ==========================================
    // 🔥 NUEVOS MÉTODOS DE VERIFICACIÓN
    // ==========================================

    /**
     * Verificar si tiene una verificación activa
     */
    public function hasActiveVerification(): bool
    {
        return $this->activeVerification()->exists();
    }

    /**
     * Verificar si completó la verificación
     */
    public function hasCompletedVerification(): bool
    {
        return $this->completedVerification()->exists();
    }

    /**
     * Obtener progreso de verificación actual
     */
    public function getVerificationProgress(): ?array
    {
        $verification = $this->activeVerification()->first();
        
        if (!$verification) {
            return null;
        }
        
        return [
            'session_id' => $verification->session_id,
            'progress_percentage' => $verification->progress_percentage,
            'current_step' => $verification->current_step,
            'completed_steps' => $verification->completed_steps,
            'total_steps' => $verification->getTotalSteps(),
            'status' => $verification->status,
            'expires_at' => $verification->expires_at->toISOString(),
        ];
    }

    /**
     * Obtener todas las verificaciones completadas
     */
    public function getCompletedVerifications()
    {
        return $this->verifications()
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->get();
    }

    /**
     * Verificar si necesita completar verificación
     */
    public function needsVerification(): bool
    {
        // Si ya está verificado, no necesita
        if ($this->is_identity_verified) {
            return false;
        }

        // Si tiene una verificación activa, está en proceso
        if ($this->hasActiveVerification()) {
            return false;
        }

        // Necesita verificación
        return true;
    }

    /**
     * Obtener sesión de verificación actual o crear nueva
     */
    public function getOrCreateVerificationSession()
    {
        // Buscar sesión activa
        $session = $this->activeVerification()->first();
        
        if ($session) {
            return $session;
        }
        
        // No tiene sesión activa, retornar null
        // (la sesión se crea desde el controller)
        return null;
    }

    // ==========================================
    // MÉTODOS DE PROPIEDADES
    // ==========================================

    public function ownsProperty($propertyId): bool
    {
        return $this->properties()->where('id', $propertyId)->exists();
    }

    public function canContactProperty($propertyId): bool
    {
        // No puede contactar sus propias propiedades
        return !$this->ownsProperty($propertyId);
    }

    // ==========================================
    // ATRIBUTOS COMPUTADOS
    // ==========================================

    public function getFullNameAttribute(): string
    {
        return $this->name . ' ' . $this->last_name;
    }

    public function getAvatarUrlAttribute(): string
    {
        // 🔄 MODIFICADO: Priorizar avatar de Google sobre profile_photo
        if ($this->avatar) {
            return $this->avatar; // URL directa de Google
        }

        if ($this->profile_photo) {
            return asset('storage/' . $this->profile_photo);
        }

        // Avatar por defecto basado en iniciales
        $initials = strtoupper(substr($this->name, 0, 1) . substr($this->last_name, 0, 1));
        return "https://ui-avatars.com/api/?name={$initials}&background=10b981&color=ffffff&size=128";
    }


        public function favoriteProperties()
    {
        return $this->belongsToMany(
            Property::class,           // Modelo relacionado
            'property_favorites',      // Nombre de la tabla pivote
            'user_id',                 // Foreign key del usuario
            'property_id'              // Foreign key de la propiedad
        )->withTimestamps();
    }
}