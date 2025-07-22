<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

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
    ];

    /**
     * Relación: Una propiedad pertenece a un usuario (propietario)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
