<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('property_images_extended', function (Blueprint $table) {
            $table->id();

            // 🏠 INFORMACIÓN DE LA PROPIEDAD
            $table->foreignId('property_id')->constrained()->onDelete('cascade');

            // 📸 INFORMACIÓN DE LA IMAGEN
            $table->string('original_filename'); // casa_fachada.jpg
            $table->string('stored_filename');   // uuid_generated.jpg
            $table->string('path');              // properties/2024/12/uuid.jpg
            $table->string('mime_type');         // image/jpeg
            $table->bigInteger('size');          // bytes
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();

            // 🔥 SISTEMA DE DEDUPLICACIÓN
            $table->string('file_hash', 64)->index(); // SHA256 para detectar duplicados
            $table->boolean('is_duplicate')->default(false); // ¿Es un archivo reutilizado?
            $table->string('original_file_path')->nullable(); // Path del archivo físico original
            $table->integer('duplicate_count')->default(0); // Cuántas veces se usa este hash

            // 🎨 ORGANIZACIÓN Y METADATA
            $table->integer('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->string('room_type')->nullable(); // bedroom, kitchen, bathroom, exterior, etc
            $table->string('alt_text')->nullable();
            $table->string('caption')->nullable(); // "Vista desde la sala"

            // 📊 INFORMACIÓN ADICIONAL
            $table->json('metadata')->nullable(); // camera_info, filters_applied, etc
            $table->string('disk')->default('public'); // local, s3, cloudinary
            $table->timestamp('last_accessed_at')->nullable(); // Para cleanup automático

            // 👤 AUDITORÍA
            $table->foreignId('uploaded_by')->nullable()->constrained('users');
            $table->string('upload_session_id')->nullable(); // Para agrupar uploads

            $table->timestamps();

            // 🚀 ÍNDICES PARA PERFORMANCE
            $table->index(['property_id', 'sort_order']); // Ordenar imágenes por propiedad
            $table->index(['file_hash', 'size']); // Detectar duplicados rápido
            $table->index(['property_id', 'is_primary']); // Encontrar imagen principal
            $table->index(['property_id', 'room_type']); // Filtrar por tipo de habitación
            $table->index('duplicate_count'); // Para estadísticas
            $table->index('last_accessed_at'); // Para limpieza automática

            // 🔒 CONSTRAINTS
            $table->unique(['property_id', 'file_hash']); // Evitar subir el mismo archivo 2 veces en la misma propiedad
        });
    }

    public function down()
    {
        Schema::dropIfExists('property_images_extended');
    }
};
