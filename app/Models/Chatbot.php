<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Chatbot extends Model
{
    use SoftDeletes;

    /**
     * Nombre de la tabla
     */
    protected $table = 'chatbot';

    /**
     * Campos que se pueden llenar masivamente
     */
    protected $fillable = [
        'user_id',
        'session_id',
        'sequence_number',
        'interaction_type',
        'conversation_status',
        'current_menu_id',
        'previous_menu_id',
        'user_input',
        'extracted_data',
        'bot_response',
        'metadata',
    ];

    /**
     * Campos que son JSON (Laravel los convierte automáticamente a arrays)
     */
    protected $casts = [
        'user_input' => 'array',
        'extracted_data' => 'array',
        'bot_response' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Timestamps automáticos habilitados
     */
    public $timestamps = true;

    /**
     * Relación: Pertenece a un usuario
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope: Solo registros de un usuario específico
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Solo registros de una sesión específica
     */
    public function scopeForSession($query, $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    /**
     * Scope: Solo búsquedas con texto
     */
    public function scopeSearches($query)
    {
        return $query->where('interaction_type', 'search_text');
    }

    /**
     * Scope: Solo clics en menú
     */
    public function scopeMenuClicks($query)
    {
        return $query->where('interaction_type', 'menu_click');
    }

    /**
     * Scope: Conversaciones activas
     */
    public function scopeActive($query)
    {
        return $query->where('conversation_status', 'active');
    }
}