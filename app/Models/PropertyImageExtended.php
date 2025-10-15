<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PropertyImageExtended extends Model
{
    protected $table = 'property_images_extended';

    protected $fillable = [
        'property_id', 'original_filename', 'stored_filename', 'path', 'mime_type',
        'size', 'width', 'height', 'file_hash', 'is_duplicate', 'original_file_path',
        'duplicate_count', 'sort_order', 'is_primary', 'room_type', 'alt_text',
        'caption', 'metadata', 'disk', 'uploaded_by', 'upload_session_id'
    ];

    protected $casts = [
        'metadata' => 'array',
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'sort_order' => 'integer',
        'duplicate_count' => 'integer',
        'is_duplicate' => 'boolean',
        'is_primary' => 'boolean',
        'last_accessed_at' => 'datetime'
    ];

    // Relaciones
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // Métodos de deduplicación
    public static function findDuplicateByHash($hash)
    {
        return self::where('file_hash', $hash)
                   ->where('is_duplicate', false)
                   ->first();
    }

    public function getUrlAttribute()
    {
        $path = $this->is_duplicate ? $this->original_file_path : $this->path;
        return Storage::disk($this->disk)->url($path);
    }

    public static function cleanupOrphanedDuplicates()
    {
        return self::where('is_duplicate', true)
                   ->where('duplicate_count', 0)
                   ->delete();
    }
}
