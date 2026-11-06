<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('location_id')->constrained()->restrictOnDelete();
            $table->enum('type', ['lost', 'found']);
            $table->string('title', 80);
            $table->text('description');
            $table->date('date_reported');
            $table->string('contact_info', 120)->nullable();
            $table->string('image_path')->nullable();
            $table->enum('status', ['open', 'found', 'returned', 'closed'])->default('open');
            $table->text('admin_note')->nullable();
            $table->foreignId('matched_item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->string('delete_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index('date_reported');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
