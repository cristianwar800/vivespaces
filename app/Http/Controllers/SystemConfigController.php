<?php

namespace App\Http\Controllers;

use App\Models\SystemConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SystemConfigController extends Controller
{
    /**
     * Obtener todas las configuraciones (solo admin)
     */
    public function index()
    {
        try {
            $configs = SystemConfig::all();

            return response()->json([
                'success' => true,
                'configs' => $configs,
            ]);
        } catch (\Exception $e) {
            Log::error('Error obteniendo configuraciones', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener configuraciones',
            ], 500);
        }
    }

    /**
     * Obtener configuraciones públicas (accesible sin auth)
     */
    public function getPublicConfigs()
    {
        try {
            $configs = SystemConfig::getPublicConfigs();

            return response()->json([
                'success' => true,
                'configs' => $configs,
            ]);
        } catch (\Exception $e) {
            Log::error('Error obteniendo configuraciones públicas', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener configuraciones',
            ], 500);
        }
    }

    /**
     * Actualizar una configuración
     */
    public function update(Request $request)
    {
        try {
            $request->validate([
                'key' => 'required|string',
                'value' => 'required',
            ]);

            $config = SystemConfig::where('key', $request->key)->first();

            if (!$config) {
                return response()->json([
                    'success' => false,
                    'error' => 'Configuración no encontrada',
                ], 404);
            }

            // Convertir valor según el tipo
            $value = $request->value;
            if ($config->type === 'boolean') {
                $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
            }

            $config->update(['value' => $value]);

            // Limpiar caché
            SystemConfig::clearCache();

            Log::info('Configuración actualizada', [
                'key' => $request->key,
                'value' => $value,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Configuración actualizada correctamente',
                'config' => $config,
            ]);
        } catch (\Exception $e) {
            Log::error('Error actualizando configuración', [
                'error' => $e->getMessage(),
                'key' => $request->key ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar configuración',
            ], 500);
        }
    }

    /**
     * Actualizar múltiples configuraciones de una vez
     */
    public function updateBatch(Request $request)
    {
        try {
            $request->validate([
                'configs' => 'required|array',
                'configs.*.key' => 'required|string',
                'configs.*.value' => 'required',
            ]);

            $updated = [];

            foreach ($request->configs as $configData) {
                $config = SystemConfig::where('key', $configData['key'])->first();

                if ($config) {
                    $value = $configData['value'];
                    if ($config->type === 'boolean') {
                        $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                    }

                    $config->update(['value' => $value]);
                    $updated[] = $config;
                }
            }

            // Limpiar caché
            SystemConfig::clearCache();

            Log::info('Configuraciones actualizadas en batch', [
                'count' => count($updated),
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => count($updated) . ' configuraciones actualizadas',
                'updated' => $updated,
            ]);
        } catch (\Exception $e) {
            Log::error('Error actualizando configuraciones en batch', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar configuraciones',
            ], 500);
        }
    }
}
