<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comments extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'comunidad_id',
        'user_id',
        'parent_id',
        'content',
        'is_anonymous',
        'reactions_count',
    ];

    protected $casts = [
        'is_anonymous' => 'boolean',
        'reactions_count' => 'integer',
    ];

    // Relaciones
    public function comunidad()
    {
        return $this->belongsTo(Comunidad::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Comments::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(Comments::class, 'parent_id');
    }

    // Scopes útiles
    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeWithReplies($query)
    {
        return $query->with('replies.user', 'replies.replies');
    }

    // Métodos auxiliares
    public function isReply()
    {
        return !is_null($this->parent_id);
    }

    public function hasReplies()
    {
        return $this->replies()->count() > 0;
    }

    public function getDepthLevel()
    {
        $depth = 0;
        $parent = $this->parent;

        while ($parent) {
            $depth++;
            $parent = $parent->parent;
        }

        return $depth;
    }
}
