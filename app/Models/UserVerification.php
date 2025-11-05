<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class UserVerification extends Model
{
    use HasFactory;

    protected $table = 'user_verifications';

    protected $fillable = [
        'user_id',
        'session_id',
        'current_step',
        'completed_steps',
        'steps_data',
        'status',
        'progress_percentage',
        'last_activity_at',
        'completed_at',
        'expires_at'
    ];

    protected $casts = [
        'completed_steps' => 'array',
        'steps_data' => 'array',
        'current_step' => 'integer',
        'progress_percentage' => 'integer',
        'last_activity_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime'
    ];

    // ==========================================
    // RELACIONES
    // ==========================================

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopeActive($query)
    {
        return $query->where('status', 'in_progress')
                    ->where('expires_at', '>', Carbon::now());
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'in_progress')
                    ->where('expires_at', '<', Carbon::now());
    }

    // ==========================================
    // MÉTODOS DE ESTADO
    // ==========================================

    public function isExpired()
    {
        return Carbon::now()->isAfter($this->expires_at);
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function isInProgress()
    {
        return $this->status === 'in_progress';
    }

    public function isCancelled()
    {
        return $this->status === 'cancelled';
    }

    // ==========================================
    // MÉTODOS DE PROGRESO
    // ==========================================

    public function getTotalSteps()
    {
        // Ajusta según tu flujo (2 para Face ID + Comprobante)
        return 2;
    }

    public function getCompletedStepsCount()
    {
        return count($this->completed_steps ?? []);
    }

    public function calculateProgress()
    {
        $total = $this->getTotalSteps();
        if ($total === 0) return 0;
        
        $completed = $this->getCompletedStepsCount();
        return round(($completed / $total) * 100);
    }

    // ==========================================
    // MÉTODOS DE PASOS
    // ==========================================

    public function isStepCompleted($stepNumber)
    {
        return in_array($stepNumber, $this->completed_steps ?? []);
    }

    public function getStepData($stepNumber)
    {
        $stepsData = $this->steps_data ?? [];
        return $stepsData["step_{$stepNumber}"] ?? null;
    }

    public function markStepCompleted($stepNumber, $data = [])
    {
        $completedSteps = $this->completed_steps ?? [];
        
        if (!in_array($stepNumber, $completedSteps)) {
            $completedSteps[] = $stepNumber;
        }
        
        $stepsData = $this->steps_data ?? [];
        $stepsData["step_{$stepNumber}"] = $data;
        
        $this->completed_steps = $completedSteps;
        $this->steps_data = $stepsData;
        $this->progress_percentage = $this->calculateProgress();
        $this->last_activity_at = now();
        
        // Si completó todos los pasos
        if ($this->getCompletedStepsCount() >= $this->getTotalSteps()) {
            $this->status = 'completed';
            $this->completed_at = now();
        }
        
        $this->save();
    }

    // ==========================================
    // 🔥 MÉTODOS PARA ADMIN (Resetear/Cancelar)
    // ==========================================

    /**
     * Resetear verificación (para admin)
     */
    public function reset()
    {
        $this->current_step = 1;
        $this->completed_steps = [];
        $this->steps_data = [];
        $this->status = 'in_progress';
        $this->progress_percentage = 0;
        $this->completed_at = null;
        $this->last_activity_at = now();
        $this->expires_at = now()->addHours(2);
        $this->save();
    }

    /**
     * Cancelar verificación (para admin)
     */
    public function cancel($reason = null)
    {
        $this->status = 'cancelled';
        
        if ($reason) {
            $stepsData = $this->steps_data ?? [];
            $stepsData['cancellation_reason'] = $reason;
            $stepsData['cancelled_at'] = now()->toISOString();
            $this->steps_data = $stepsData;
        }
        
        $this->save();
    }

    /**
     * Eliminar paso específico (para admin)
     */
    public function removeStep($stepNumber)
    {
        $completedSteps = $this->completed_steps ?? [];
        $stepsData = $this->steps_data ?? [];
        
        // Remover del array de completados
        $completedSteps = array_values(array_filter($completedSteps, function($s) use ($stepNumber) {
            return $s !== $stepNumber;
        }));
        
        // Remover los datos del paso
        unset($stepsData["step_{$stepNumber}"]);
        
        $this->completed_steps = $completedSteps;
        $this->steps_data = $stepsData;
        $this->progress_percentage = $this->calculateProgress();
        $this->last_activity_at = now();
        
        // Si quitamos pasos y estaba completado, volver a in_progress
        if ($this->status === 'completed' && $this->getCompletedStepsCount() < $this->getTotalSteps()) {
            $this->status = 'in_progress';
            $this->completed_at = null;
        }
        
        $this->save();
    }

    /**
     * Extender tiempo de expiración (para admin)
     */
    public function extend($hours = 2)
    {
        $this->expires_at = Carbon::now()->addHours($hours);
        $this->last_activity_at = now();
        $this->save();
    }
}