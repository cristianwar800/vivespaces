<?php
// app/Models/EmailVerification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use Carbon\Carbon;

class EmailVerification extends Model
{
    protected $fillable = [
        'user_id',
        'email',
        'code',
        'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * Relación con el modelo User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Verificar si el código ha expirado
     */
    public function isExpired()
    {
        return $this->expires_at->isPast();
    }

    /**
     * Generar código de 6 dígitos
     */
    public static function generateCode()
    {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Crear código de verificación para un email
     */
    public static function createForEmail($email, $userId = null)
    {
        // Eliminar códigos anteriores para este email
        self::where('email', $email)->delete();

        return self::create([
            'user_id' => $userId,
            'email' => $email,
            'code' => self::generateCode(),
            'expires_at' => Carbon::now()->addMinutes(10), // Expira en 10 minutos
        ]);
    }

    /**
     * Buscar código válido
     */
    public static function findValidCode($email, $code)
    {
        return self::where('email', $email)
                   ->where('code', $code)
                   ->where('expires_at', '>', Carbon::now())
                   ->first();
    }

    /**
     * Limpiar códigos expirados (puedes llamarlo en un cron job)
     */
    public static function cleanExpiredCodes()
    {
        return self::where('expires_at', '<', Carbon::now())->delete();
    }
}
