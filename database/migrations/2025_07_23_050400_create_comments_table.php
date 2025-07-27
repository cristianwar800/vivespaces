<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();

            // Relaciones
            $table->foreignId('comunidad_id')->constrained('comunidad')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('comments')->onDelete('cascade');

            // Contenido
            $table->text('content');

            // Configuración
            $table->boolean('is_anonymous')->default(false);

            // Interacciones
            $table->integer('reactions_count')->default(0);

            // Timestamps y soft deletes
            $table->timestamps();
            $table->softDeletes();

            // Índices para optimización
            $table->index(['comunidad_id', 'created_at']);
            $table->index(['parent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
