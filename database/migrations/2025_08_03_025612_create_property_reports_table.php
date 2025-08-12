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
        Schema::create('property_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('reporter_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');

            // Categorización
            $table->enum('category', [
                'fake_photos',
                'wrong_price',
                'false_information',
                'duplicate_listing',
                'scam_suspicion',
                'inappropriate_content',
                'other'
            ]);
            $table->string('reason'); // Título corto
            $table->text('description')->nullable();

            // Estados y prioridad
            $table->enum('status', ['pending', 'in_review', 'resolved', 'dismissed'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');

            // Metadatos
            $table->json('evidence')->nullable(); // URLs de pruebas, screenshots, etc.
            $table->text('admin_notes')->nullable(); // Notas del administrador
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            // Índices para performance
            $table->index(['status', 'priority']);
            $table->index(['property_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_reports');
    }
};
