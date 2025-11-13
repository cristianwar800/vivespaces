<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('system_configs', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, boolean, integer, json
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false); // Si es accesible sin autenticación
            $table->timestamps();
        });

        // Insertar configuraciones por defecto
        DB::table('system_configs')->insert([
            [
                'key' => 'verification_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Sistema de verificación de identidad habilitado',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'verification_required_for_publish',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Verificación obligatoria para publicar propiedades',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'face_verification_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Verificación facial habilitada (CompreFace)',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'face_verification_threshold',
                'value' => '85',
                'type' => 'integer',
                'description' => 'Threshold de confianza para Face ID (0-100)',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'ocr_validation_enabled',
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'Validación OCR de documentos habilitada',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_configs');
    }
};
