<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'rater_id',
        'rated_id',
        'property_id',
        'rating',
        'comment'
    ];

    protected $casts = [
        'rating' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Relaciones
    public function rater()
    {
        return $this->belongsTo(User::class, 'rater_id');
    }

    public function rated()
    {
        return $this->belongsTo(User::class, 'rated_id');
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    // Scopes
    public function scopeForUser($query, $userId)
    {
        return $query->where('rated_id', $userId);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('rater_id', $userId);
    }

    // Métodos estáticos útiles
    public static function hasRated($raterId, $ratedId, $propertyId)
    {
        return self::where('rater_id', $raterId)
                   ->where('rated_id', $ratedId)
                   ->where('property_id', $propertyId)
                   ->exists();
    }

    public static function getAverageRating($userId)
    {
        return self::where('rated_id', $userId)->avg('rating') ?? 0;
    }

    public static function getTotalRatings($userId)
    {
        return self::where('rated_id', $userId)->count();
    }

    public static function getRatingDistribution($userId)
    {
        return [
            5 => self::where('rated_id', $userId)->where('rating', 5)->count(),
            4 => self::where('rated_id', $userId)->where('rating', 4)->count(),
            3 => self::where('rated_id', $userId)->where('rating', 3)->count(),
            2 => self::where('rated_id', $userId)->where('rating', 2)->count(),
            1 => self::where('rated_id', $userId)->where('rating', 1)->count(),
        ];
    }
}