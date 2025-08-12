<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropertyReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'reporter_user_id',
        'reviewed_by',
        'category',
        'reason',
        'description',
        'status',
        'priority',
        'evidence',
        'admin_notes',
        'reviewed_at',
    ];

    protected $casts = [
        'evidence' => 'array',
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Constantes para categorías
    const CATEGORIES = [
        'fake_photos' => 'Fotos Falsas',
        'wrong_price' => 'Precio Incorrecto',
        'false_information' => 'Información Falsa',
        'duplicate_listing' => 'Publicación Duplicada',
        'scam_suspicion' => 'Sospecha de Estafa',
        'inappropriate_content' => 'Contenido Inapropiado',
        'other' => 'Otro'
    ];

    // Constantes para estados
    const STATUSES = [
        'pending' => 'Pendiente',
        'in_review' => 'En Revisión',
        'resolved' => 'Resuelto',
        'dismissed' => 'Desestimado'
    ];

    // Constantes para prioridades
    const PRIORITIES = [
        'low' => 'Baja',
        'medium' => 'Media',
        'high' => 'Alta',
        'critical' => 'Crítica'
    ];

    /**
     * Relación con la propiedad reportada
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Relación con el usuario que reporta
     */
    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_user_id');
    }

    /**
     * Relación con el administrador que revisa
     */
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Scope para reportes pendientes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope para reportes en revisión
     */
    public function scopeInReview($query)
    {
        return $query->where('status', 'in_review');
    }

    /**
     * Scope para reportes por prioridad
     */
    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope para reportes críticos
     */
    public function scopeCritical($query)
    {
        return $query->where('priority', 'critical');
    }

    /**
     * Scope para ordenar por prioridad y fecha
     */
    public function scopeOrderByPriority($query)
    {
        return $query->orderByRaw("
            CASE priority
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END ASC
        ")->orderBy('created_at', 'desc');
    }

    /**
     * Obtener la etiqueta de la categoría
     */
    public function getCategoryLabelAttribute()
    {
        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    /**
     * Obtener la etiqueta del estado
     */
    public function getStatusLabelAttribute()
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Obtener la etiqueta de la prioridad
     */
    public function getPriorityLabelAttribute()
    {
        return self::PRIORITIES[$this->priority] ?? $this->priority;
    }

    /**
     * Verificar si el reporte está pendiente
     */
    public function isPending()
    {
        return $this->status === 'pending';
    }

    /**
     * Verificar si el reporte está en revisión
     */
    public function isInReview()
    {
        return $this->status === 'in_review';
    }

    /**
     * Verificar si el reporte está resuelto
     */
    public function isResolved()
    {
        return $this->status === 'resolved';
    }

    /**
     * Verificar si el reporte fue desestimado
     */
    public function isDismissed()
    {
        return $this->status === 'dismissed';
    }

    /**
     * Verificar si es un reporte crítico
     */
    public function isCritical()
    {
        return $this->priority === 'critical';
    }

    /**
     * Marcar como en revisión
     */
    public function markAsInReview($reviewerId = null)
    {
        $this->update([
            'status' => 'in_review',
            'reviewed_by' => $reviewerId ?: auth()->id(),
            'reviewed_at' => now()
        ]);
    }

    /**
     * Marcar como resuelto
     */
    public function markAsResolved($notes = null)
    {
        $this->update([
            'status' => 'resolved',
            'admin_notes' => $notes ? $this->admin_notes . "\n" . $notes : $this->admin_notes,
            'reviewed_at' => now()
        ]);
    }

    /**
     * Marcar como desestimado
     */
    public function markAsDismissed($notes = null)
    {
        $this->update([
            'status' => 'dismissed',
            'admin_notes' => $notes ? $this->admin_notes . "\n" . $notes : $this->admin_notes,
            'reviewed_at' => now()
        ]);
    }

    /**
     * Cambiar prioridad
     */
    public function changePriority($priority, $notes = null)
    {
        $oldPriority = $this->priority;
        $this->update([
            'priority' => $priority,
            'admin_notes' => $notes ?
                $this->admin_notes . "\nPrioridad cambiada de {$oldPriority} a {$priority}: " . $notes :
                $this->admin_notes . "\nPrioridad cambiada de {$oldPriority} a {$priority}"
        ]);
    }

    /**
     * Agregar nota del administrador
     */
    public function addAdminNote($note)
    {
        $timestamp = now()->format('Y-m-d H:i:s');
        $adminName = auth()->user()->name ?? 'Admin';
        $formattedNote = "[{$timestamp}] {$adminName}: {$note}";

        $this->update([
            'admin_notes' => $this->admin_notes ?
                $this->admin_notes . "\n" . $formattedNote :
                $formattedNote
        ]);
    }

    /**
     * Obtener color para la prioridad (útil para UI)
     */
    public function getPriorityColorAttribute()
    {
        return match($this->priority) {
            'critical' => 'red',
            'high' => 'orange',
            'medium' => 'yellow',
            'low' => 'green',
            default => 'gray'
        };
    }

    /**
     * Obtener color para el estado (útil para UI)
     */
    public function getStatusColorAttribute()
    {
        return match($this->status) {
            'pending' => 'yellow',
            'in_review' => 'blue',
            'resolved' => 'green',
            'dismissed' => 'gray',
            default => 'gray'
        };
    }
}
