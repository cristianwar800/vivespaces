<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();

            // Relaciones básicas
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('receiver_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('reply_to_id')->nullable()->constrained('messages')->onDelete('set null');

            // Contenido del mensaje
            $table->text('message')->nullable();
            $table->enum('type', [
                'text',
                'image',
                'file',
                'voice',
                'location',
                'system'
            ])->default('text');

            // Archivos multimedia
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->integer('duration')->nullable(); // para audios en segundos

            // Metadatos (ubicación, dimensiones, etc.)
            $table->json('metadata')->nullable();

            // Estados y reacciones
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->json('reactions')->nullable(); // {'👍': [user_id1, user_id2], '❤️': [user_id3]}

            $table->timestamps();

            // Índices para optimización
            $table->index(['property_id', 'created_at']);
            $table->index(['sender_id', 'receiver_id']);
            $table->index(['property_id', 'sender_id', 'receiver_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
