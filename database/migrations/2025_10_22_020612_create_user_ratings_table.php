<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_ratings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rater_id'); // Usuario que califica
            $table->unsignedBigInteger('rated_id'); // Usuario calificado
            $table->unsignedBigInteger('property_id'); // Propiedad donde conversaron
            $table->integer('rating')->comment('Calificación de 1 a 5 estrellas');
            $table->text('comment')->nullable(); // Comentario opcional
            $table->timestamps();

            // Foreign keys
            $table->foreign('rater_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('rated_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');

            // Un usuario solo puede calificar UNA VEZ a otro usuario por propiedad
            $table->unique(['rater_id', 'rated_id', 'property_id']);

            // Índices
            $table->index('rated_id');
            $table->index('rating');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_ratings');
    }
};