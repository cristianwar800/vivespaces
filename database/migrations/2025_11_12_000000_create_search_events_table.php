<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabla para trackear eventos de búsqueda y comportamiento del usuario
     * Utilizada por el sistema de AI (ViveSpaces-AI) para análisis y recomendaciones
     */
    public function up(): void
    {
        Schema::create('search_events', function (Blueprint $table) {
            $table->id();

            // Identificación del usuario
            $table->unsignedBigInteger('user_id')->nullable()->comment('ID del usuario (null si no está autenticado)');
            $table->string('session_id', 100)->comment('ID de sesión única');

            // Datos de la búsqueda
            $table->text('search_query')->nullable()->comment('Query de búsqueda del usuario');
            $table->string('search_type', 50)->default('general')->comment('Tipo: general, form_submit, live_search, filter_change, etc.');
            $table->json('filters')->nullable()->comment('Filtros aplicados (tipo, ciudad, precio, etc.)');
            $table->integer('results_count')->default(0)->comment('Número de resultados encontrados');

            // Interacción del usuario
            $table->integer('click_position')->nullable()->comment('Posición del elemento clickeado en los resultados');
            $table->integer('time_spent')->nullable()->comment('Tiempo en segundos en la página');
            $table->integer('scroll_depth')->nullable()->comment('Profundidad de scroll (0-100%)');

            // Información de propiedad (si aplica)
            $table->unsignedBigInteger('property_id')->nullable()->comment('ID de propiedad vista/clickeada');
            $table->string('element_clicked')->nullable()->comment('Elemento HTML clickeado');
            $table->string('filter_changed')->nullable()->comment('Filtro que fue modificado');

            // Contexto técnico
            $table->string('device', 20)->default('unknown')->comment('Dispositivo: mobile, tablet, desktop');
            $table->string('page_url', 500)->nullable()->comment('URL de la página');
            $table->string('referrer', 500)->nullable()->comment('URL de referencia (de dónde viene)');

            // Timestamps
            $table->timestamps();

            // Índices para optimizar búsquedas
            $table->index('user_id', 'idx_search_events_user_id');
            $table->index('session_id', 'idx_search_events_session_id');
            $table->index('search_type', 'idx_search_events_search_type');
            $table->index('created_at', 'idx_search_events_created_at');
            $table->index(['user_id', 'created_at'], 'idx_search_events_user_date');

            // Foreign key (opcional - si quieres forzar integridad referencial)
            // $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            // $table->foreign('property_id')->references('id')->on('properties')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('search_events');
    }
};
