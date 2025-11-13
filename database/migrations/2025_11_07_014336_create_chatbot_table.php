<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('session_id', 100)->nullable()->index();
            $table->integer('sequence_number')->default(1);
            $table->enum('interaction_type', [
                'menu_click',
                'search_text',
                'back_button',
                'external_link',
                'conversation_start',
                'conversation_end'
            ])->default('menu_click');
            $table->enum('conversation_status', ['active', 'completed', 'abandoned'])->default('active');
            $table->string('current_menu_id', 50)->nullable();
            $table->string('previous_menu_id', 50)->nullable();
            $table->json('user_input')->nullable();
            $table->json('extracted_data')->nullable();
            $table->json('bot_response')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->softDeletes();
            
            $table->index(['user_id', 'created_at']);
            $table->index(['session_id', 'created_at']);
            $table->index('interaction_type');
            $table->index('conversation_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot');
    }
};