<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemConfig extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
        'is_public',
    ];

    /**
     * Obtener un valor de configuración con caché
     */
    public static function get(string $key, $default = null)
    {
        return Cache::remember("system_config_{$key}", 3600, function () use ($key, $default) {
            $config = self::where('key', $key)->first();

            if (!$config) {
                return $default;
            }

            return self::castValue($config->value, $config->type);
        });
    }

    /**
     * Establecer un valor de configuración
     */
    public static function set(string $key, $value, string $type = 'string', string $description = null): void
    {
        $config = self::updateOrCreate(
            ['key' => $key],
            [
                'value' => is_bool($value) ? ($value ? 'true' : 'false') : (string) $value,
                'type' => $type,
                'description' => $description,
            ]
        );

        // Limpiar caché
        Cache::forget("system_config_{$key}");
    }

    /**
     * Convertir valor según el tipo
     */
    private static function castValue($value, string $type)
    {
        switch ($type) {
            case 'boolean':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'integer':
                return (int) $value;
            case 'float':
                return (float) $value;
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }

    /**
     * Obtener todas las configuraciones públicas
     */
    public static function getPublicConfigs(): array
    {
        return Cache::remember('public_system_configs', 3600, function () {
            $configs = self::where('is_public', true)->get();

            $result = [];
            foreach ($configs as $config) {
                $result[$config->key] = self::castValue($config->value, $config->type);
            }

            return $result;
        });
    }

    /**
     * Limpiar toda la caché de configuración
     */
    public static function clearCache(): void
    {
        Cache::forget('public_system_configs');

        // Limpiar cachés individuales
        $keys = self::pluck('key');
        foreach ($keys as $key) {
            Cache::forget("system_config_{$key}");
        }
    }

    /**
     * Helper: Verificación habilitada
     */
    public static function isVerificationEnabled(): bool
    {
        return self::get('verification_enabled', true);
    }

    /**
     * Helper: Verificación requerida para publicar
     */
    public static function isVerificationRequiredForPublish(): bool
    {
        return self::get('verification_required_for_publish', true);
    }

    /**
     * Helper: Face verification habilitado
     */
    public static function isFaceVerificationEnabled(): bool
    {
        return self::get('face_verification_enabled', true);
    }

    /**
     * Helper: Obtener threshold de Face ID
     */
    public static function getFaceVerificationThreshold(): int
    {
        return self::get('face_verification_threshold', 85);
    }
}
