<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Message extends Model
{
    protected $fillable = [
        'property_id',
        'sender_id',
        'receiver_id',
        'reply_to_id',
        'message',
        'type',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
        'duration',
        'metadata',
        'read_at',
        'is_edited',
        'edited_at',
        'is_deleted',
        'reactions',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'edited_at' => 'datetime',
        'is_edited' => 'boolean',
        'is_deleted' => 'boolean',
        'metadata' => 'array',
        'reactions' => 'array',
    ];

    // Relaciones
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id');
    }

    public function replies()
    {
        return $this->hasMany(Message::class, 'reply_to_id');
    }

    // Métodos para archivos
    public function isImage(): bool
    {
        return $this->type === 'image';
    }

    public function isFile(): bool
    {
        return $this->type === 'file';
    }

    public function isVoice(): bool
    {
        return $this->type === 'voice';
    }

    public function isLocation(): bool
    {
        return $this->type === 'location';
    }

    public function getFileUrl(): ?string
    {
        return $this->file_path ? Storage::url($this->file_path) : null;
    }

    public function getFileSizeFormatted(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }

    // Métodos para reacciones
    public function addReaction(string $emoji, int $userId): void
    {
        $reactions = $this->reactions ?? [];

        if (!isset($reactions[$emoji])) {
            $reactions[$emoji] = [];
        }

        if (!in_array($userId, $reactions[$emoji])) {
            $reactions[$emoji][] = $userId;
        }

        $this->update(['reactions' => $reactions]);
    }

    public function removeReaction(string $emoji, int $userId): void
    {
        $reactions = $this->reactions ?? [];

        if (isset($reactions[$emoji])) {
            $reactions[$emoji] = array_diff($reactions[$emoji], [$userId]);
            if (empty($reactions[$emoji])) {
                unset($reactions[$emoji]);
            }
        }

        $this->update(['reactions' => $reactions]);
    }

    public function getReactionCount(string $emoji): int
    {
        return count($this->reactions[$emoji] ?? []);
    }

    // Scopes útiles
    public function scopeForConversation($query, $propertyId, $userId1, $userId2)
    {
        return $query->where('property_id', $propertyId)
                    ->where(function($q) use ($userId1, $userId2) {
                        $q->where(function($subQ) use ($userId1, $userId2) {
                            $subQ->where('sender_id', $userId1)
                                 ->where('receiver_id', $userId2);
                        })->orWhere(function($subQ) use ($userId1, $userId2) {
                            $subQ->where('sender_id', $userId2)
                                 ->where('receiver_id', $userId1);
                        });
                    })
                    ->where('is_deleted', false);
    }

    public function scopeUnread($query, $userId)
    {
        return $query->where('receiver_id', $userId)
                    ->whereNull('read_at');
    }

            // En app/Models/Message.php

public function getDurationFormattedAttribute()
{
    if (!$this->duration) {
        return null;
    }

    $minutes = floor($this->duration / 60);
    $seconds = $this->duration % 60;

    return sprintf('%d:%02d', $minutes, $seconds);
}

    public function getAudioInfoAttribute()
    {
        if ($this->type !== 'voice' || !$this->metadata) {
            return null;
        }

        return [
            'duration' => $this->duration,
            'duration_formatted' => $this->duration_formatted,
            'bitrate' => $this->metadata['bitrate'] ?? null,
            'sample_rate' => $this->metadata['sample_rate'] ?? null,
            'channels' => $this->metadata['channels'] ?? null,
        ];
    }
}
