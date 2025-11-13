<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('address');
            $table->string('city');
            $table->string('state')->nullable();
            $table->string('country')->nullable();
            $table->string('postal_code')->nullable();
            $table->decimal('price', 12, 2);
            $table->integer('bedrooms')->nullable();
            $table->integer('bathrooms')->nullable();
            $table->integer('area')->nullable(); // metros cuadrados
            $table->string('type')->nullable(); // casa, departamento, etc.
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('user_id')->nullable(); // propietario
            $table->string('image')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            // 🐕 Política de mascotas
            $table->string('pets_allowed', 20)->default('negotiable'); // 'no_pets', 'pets_allowed', 'negotiable'
            $table->text('pets_details')->nullable(); // Detalles: "Solo perros pequeños (max 10kg)"

            $table->timestamps();

            // No se puede usar restricciones de clave foránea para esta lógica compleja,
            // así que no se define onDelete aquí. El control se debe hacer a nivel de aplicación.
            $table->foreign('user_id')->references('id')->on('users');

            // 🚀 ÍNDICES PARA BÚSQUEDA GEOGRÁFICA RÁPIDA
            $table->index(['latitude', 'longitude'], 'idx_location');
            $table->index(['is_active', 'latitude', 'longitude'], 'idx_active_location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
