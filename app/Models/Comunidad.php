<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comunidad extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'comunidad';

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'zone',
        'subzone',
        'post_type',
        'topic',
        'is_pinned',
        'allow_comments',
        'is_anonymous',
        'attachments',
        'reactions_count',
        'comments_count',
        'shares_count',
        'deleted_by',
        'deletion_reason',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
        'allow_comments' => 'boolean',
        'is_anonymous' => 'boolean',
        'attachments' => 'array',
        'reactions_count' => 'integer',
        'comments_count' => 'integer',
        'shares_count' => 'integer',
    ];

    // Relaciones
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function deletedBy()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function comments()
    {
        return $this->hasMany(ComunidadComment::class);
    }

    public function topLevelComments()
    {
        return $this->hasMany(ComunidadComment::class)->topLevel();
    }
}
