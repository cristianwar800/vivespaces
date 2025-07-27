<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comunidad', function (Blueprint $table) {
            $table->id();

            // Autor
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Contenido
            $table->string('title', 200);
            $table->text('content');

            // Zona
            $table->string('zone'); // "Colonia Roma", "Fraccionamiento Las Flores"
            $table->string('subzone')->nullable(); // "Sector A", "Manzana 5"

            // Tipo de post
            $table->enum('post_type', [
                'general',      // Post normal
                'alert',        // Alerta importante
                'question',     // Pregunta a vecinos
                'sale',         // Venta/intercambio
                'service',      // Ofrezco/busco servicio
                'event',        // Evento vecinal
                'lost_found'    // Perdidos y encontrados
            ])->default('general');

            // Tema
            $table->enum('topic', [
                'security',     // Seguridad
                'maintenance',  // Mantenimiento
                'social',       // Social/eventos
                'services',     // Servicios
                'marketplace',  // Compra/venta
                'pets',         // Mascotas
                'transportation', // Transporte
                'other'
            ])->default('other');

            // Configuración
            $table->boolean('is_pinned')->default(false); // Post fijo
            $table->boolean('allow_comments')->default(true);
            $table->boolean('is_anonymous')->default(false);

            // Multimedia
            $table->json('attachments')->nullable(); // Fotos, videos

            // Interacciones
            $table->integer('reactions_count')->default(0);
            $table->integer('comments_count')->default(0);
            $table->integer('shares_count')->default(0);

            // Auditoría de eliminación
            $table->foreignId('deleted_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('deletion_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['zone', 'post_type']);
            $table->index(['topic', 'created_at']);
            $table->index(['deleted_by', 'deleted_at']); // Índice para auditoría
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comunidad');
    }
};
