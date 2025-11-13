<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class PasswordReset extends Model
{
    protected $fillable = [
        'email',
        'code',
        'expires_at',
        'attempts'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * Generar código aleatorio de 6 dígitos
     */
    public static function generateCode(): string
    {
        return str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Crear código de recuperación para un email
     */
    public static function createForEmail(string $email): self
    {
        // Eliminar códigos anteriores del mismo email
        self::where('email', $email)->delete();

        // Crear nuevo código
        $code = self::generateCode();

        Log::info('🔑 Código de recuperación creado', [
            'email' => $email,
            'code' => $code
        ]);

        return self::create([
            'email' => $email,
            'code' => $code,
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0
        ]);
    }

    /**
     * Buscar código válido
     */
    public static function findValidCode(string $email, string $code): ?self
    {
        return self::where('email', $email)
            ->where('code', $code)
            ->where('expires_at', '>', now())
            ->first();
    }

    /**
     * Verificar si el código está expirado
     */
    public function isExpired(): bool
    {
        return $this->expires_at < now();
    }

    /**
     * Incrementar intentos fallidos
     */
    public function incrementAttempts(): void
    {
        $this->increment('attempts');

        Log::warning('⚠️ Intento fallido de recuperación', [
            'email' => $this->email,
            'attempts' => $this->attempts
        ]);

        // Si supera 5 intentos, eliminar el código
        if ($this->attempts >= 5) {
            Log::error('🚫 Código bloqueado por intentos excesivos', [
                'email' => $this->email
            ]);
            $this->delete();
        }
    }

    /**
     * Limpiar códigos expirados (para cron job)
     */
    public static function cleanExpired(): int
    {
        $count = self::where('expires_at', '<', now())->delete();

        if ($count > 0) {
            Log::info('🧹 Códigos de recuperación expirados eliminados', [
                'count' => $count
            ]);
        }

        return $count;
    }
}