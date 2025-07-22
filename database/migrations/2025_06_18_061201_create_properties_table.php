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
            $table->timestamps();

            // No se puede usar restricciones de clave foránea para esta lógica compleja,
            // así que no se define onDelete aquí. El control se debe hacer a nivel de aplicación.
            $table->foreign('user_id')->references('id')->on('users');
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
