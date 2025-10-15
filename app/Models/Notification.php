<?php
// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Notification extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'action_url',
        'action_text',
        'icon',
        'image_url',
        'read',
        'read_at',
        'priority',
        'source',
        'source_user_id'
    ];

    protected $casts = [
        'data' => 'array',
        'read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    // Relaciones
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sourceUser()
    {
        return $this->belongsTo(User::class, 'source_user_id');
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    public function scopeRead($query)
    {
        return $query->where('read', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', Carbon::now()->subDays($days));
    }

    public function scopeHighPriority($query)
    {
        return $query->where('priority', 'high');
    }

    // Métodos
    public function markAsRead()
    {
        $this->update([
            'read' => true,
            'read_at' => now()
        ]);
    }

    public function markAsUnread()
    {
        $this->update([
            'read' => false,
            'read_at' => null
        ]);
    }

    // Helper para tiempo relativo
    public function timeAgo()
    {
        return $this->created_at->diffForHumans();
    }

    // Helper para obtener color según tipo
    public function getColorClass()
    {
        return match($this->type) {
            'message' => 'blue',
            'property_recommendation' => 'green',
            'search_suggestion' => 'purple',
            'price_alert' => 'yellow',
            'new_property' => 'emerald',
            'favorite_update' => 'pink',
            'system' => 'gray',
            default => 'blue'
        };
    }

    // Helper para obtener icono
    public function getIconName()
    {
        return match($this->type) {
            'message' => 'MessageCircle',
            'property_recommendation' => 'Home',
            'search_suggestion' => 'Search',
            'price_alert' => 'DollarSign',
            'new_property' => 'Sparkles',
            'favorite_update' => 'Heart',
            'system' => 'Bell',
            default => 'Bell'
        };
    }
}
