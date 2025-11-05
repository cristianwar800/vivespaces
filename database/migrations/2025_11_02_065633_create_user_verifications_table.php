<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_verifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('session_id')->unique()->index();
            
            // Estado del proceso
            $table->integer('current_step')->default(1);
            $table->json('completed_steps')->nullable(); // [1, 2]
            $table->json('steps_data')->nullable(); // Datos de cada paso
            
            // Metadata
            $table->enum('status', ['in_progress', 'completed', 'expired', 'cancelled'])->default('in_progress');
            $table->integer('progress_percentage')->default(0);
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at');
            
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Índices para búsquedas rápidas
            $table->index(['user_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_verifications');
    }
};