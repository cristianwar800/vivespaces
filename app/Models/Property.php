<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;
use App\Models\PropertyImageExtended;

class Property extends Model
{
    // Especificar los campos que se pueden asignar masivamente
    protected $fillable = [
        'title',
        'description',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'price',
        'bedrooms',
        'bathrooms',
        'area',
        'type',
        'is_active',
        'user_id',
        'image',
        'latitude',
        'longitude',
        'pets_allowed',
        'pets_details',
    ];

    // Casts DEBE ir aquí, antes de los métodos
    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // Métodos van después
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function photos()
    {
        return $this->hasMany(PropertyImageExtended::class);
    }

    public function primaryPhoto()
    {
        return $this->hasOne(PropertyImageExtended::class)->where('is_primary', true);
    }

    public function getPhotosAttribute()
    {
        return $this->photos()->orderBy('sort_order')->get();
    }

    
        public function favoritedBy()
    {
        return $this->belongsToMany(User::class, 'property_favorites')
                    ->withTimestamps();
    }
}

