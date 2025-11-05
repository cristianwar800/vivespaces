<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Cristian',
                'last_name' => 'Lopez',
                'email' => 'criswar800@gmail.com',
                'phone' => '3312345678',
                'address' => 'Francisco Gonzalez Bocanegra 685',
                'city' => 'Guadalajara',
                'state' => 'Jalisco',
                'country' => 'México',
                'postal_code' => '44100',
                'role' => 'admin',
                'is_active' => true,
                'profile_photo' => null,
                'email_verified_at' => now(),
                'suspended_at' => null,
                'must_change_password' => false,
                'password' => Hash::make('password123'),
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'María',
                'last_name' => 'García',
                'email' => 'maria.garcia@example.com',
                'phone' => '3398765432',
                'address' => 'Av. Vallarta 2500',
                'city' => 'Guadalajara',
                'state' => 'Jalisco',
                'country' => 'México',
                'postal_code' => '44130',
                'role' => 'user',
                'is_active' => true,
                'profile_photo' => null,
                'email_verified_at' => now(),
                'suspended_at' => null,
                'must_change_password' => false,
                'password' => Hash::make('password123'),
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Juan',
                'last_name' => 'Martínez',
                'email' => 'juan.martinez@example.com',
                'phone' => '3387654321',
                'address' => 'Av. Chapultepec 123',
                'city' => 'Guadalajara',
                'state' => 'Jalisco',
                'country' => 'México',
                'postal_code' => '44600',
                'role' => 'landlord',
                'is_active' => true,
                'profile_photo' => null,
                'email_verified_at' => now(),
                'suspended_at' => null,
                'must_change_password' => false,
                'password' => Hash::make('password123'),
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Ana',
                'last_name' => 'Rodríguez',
                'email' => 'ana.rodriguez@example.com',
                'phone' => '3376543210',
                'address' => 'Calle Independencia 456',
                'city' => 'Zapopan',
                'state' => 'Jalisco',
                'country' => 'México',
                'postal_code' => '45100',
                'role' => 'user',
                'is_active' => true,
                'profile_photo' => null,
                'email_verified_at' => now(),
                'suspended_at' => null,
                'must_change_password' => false,
                'password' => Hash::make('password123'),
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Pedro',
                'last_name' => 'Hernández',
                'email' => 'pedro.hernandez@example.com',
                'phone' => '3365432109',
                'address' => 'Av. Patria 890',
                'city' => 'Zapopan',
                'state' => 'Jalisco',
                'country' => 'México',
                'postal_code' => '45030',
                'role' => 'landlord', // Cambiado de 'moderator' a 'landlord'
                'is_active' => true,
                'profile_photo' => null,
                'email_verified_at' => now(),
                'suspended_at' => null,
                'must_change_password' => false,
                'password' => Hash::make('password123'),
                'remember_token' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Insertar solo si el email no existe
        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                $user
            );
        }
    }
}