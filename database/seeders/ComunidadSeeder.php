<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Comunidad;
use App\Models\User;
use Carbon\Carbon;

class ComunidadSeeder extends Seeder
{
    public function run()
    {
        // Asegurarnos de tener usuarios
        $userIds = User::pluck('id')->toArray();

        if (empty($userIds)) {
            $this->command->error('No hay usuarios en la base de datos. Ejecuta UserSeeder primero.');
            return;
        }

        $posts = [
            [
                'user_id' => $userIds[array_rand($userIds)],
                'title' => '⚠️ Alerta de seguridad en Providencia',
                'content' => 'Vecinos, se reportaron intentos de robo anoche sobre Av. Rubén Darío. Los sospechosos iban en moto negra sin placas. Por favor estén alertas.',
                'zone' => 'Providencia',
                'subzone' => null,
                'post_type' => 'alert',
                'topic' => 'security',
                'is_pinned' => true,
                'allow_comments' => true,
                'is_anonymous' => false,
                'attachments' => null,  // Sin archivos adjuntos
                'reactions_count' => 15,
                'comments_count' => 5,
                'shares_count' => 3,
                'created_at' => Carbon::now()->subHours(2),
                'updated_at' => Carbon::now()->subHours(2),
            ],
            [
                'user_id' => $userIds[array_rand($userIds)],
                'title' => '🐕 Perro perdido en Chapalita',
                'content' => 'Se perdió un Golden Retriever en la zona de Chapalita. Responde al nombre de Max. Si lo ven por favor contacten al 33-1234-5678.',
                'zone' => 'Chapalita',
                'subzone' => null,
                'post_type' => 'lost_found',
                'topic' => 'pets',
                'is_pinned' => false,
                'allow_comments' => true,
                'is_anonymous' => false,
                'attachments' => null,
                'reactions_count' => 8,
                'comments_count' => 12,
                'shares_count' => 5,
                'created_at' => Carbon::now()->subDays(1),
                'updated_at' => Carbon::now()->subDays(1),
            ],
            [
                'user_id' => $userIds[array_rand($userIds)],
                'title' => 'Corte de agua programado',
                'content' => 'SIAPA informa corte de agua mañana de 9 AM a 4 PM en toda la colonia Americana. Se recomienda almacenar agua.',
                'zone' => 'Americana',
                'subzone' => null,
                'post_type' => 'alert',
                'topic' => 'maintenance',
                'is_pinned' => true,
                'allow_comments' => true,
                'is_anonymous' => false,
                'attachments' => null,
                'reactions_count' => 20,
                'comments_count' => 3,
                'shares_count' => 8,
                'created_at' => Carbon::now()->subHours(5),
                'updated_at' => Carbon::now()->subHours(5),
            ],
            [
                'user_id' => $userIds[array_rand($userIds)],
                'title' => 'Venta de garage este sábado',
                'content' => 'Venta de garage este sábado en Lomas del Valle. Muebles, ropa, electrónicos y más. De 9 AM a 2 PM. Calle Loma Bonita #123.',
                'zone' => 'Lomas del Valle',
                'subzone' => null,
                'post_type' => 'sale',
                'topic' => 'marketplace',
                'is_pinned' => false,
                'allow_comments' => true,
                'is_anonymous' => false,
                'attachments' => null,
                'reactions_count' => 5,
                'comments_count' => 7,
                'shares_count' => 2,
                'created_at' => Carbon::now()->subDays(2),
                'updated_at' => Carbon::now()->subDays(2),
            ],
            [
                'user_id' => $userIds[array_rand($userIds)],
                'title' => 'Problema con alumbrado público',
                'content' => 'Llevamos una semana con las lámparas fundidas en la calle principal. Ya se reportó pero no han venido. ¿Alguien tiene otro número para reportar?',
                'zone' => 'Ciudad del Sol',
                'subzone' => null,
                'post_type' => 'general',
                'topic' => 'maintenance',
                'is_pinned' => false,
                'allow_comments' => true,
                'is_anonymous' => false,
                'attachments' => null,
                'reactions_count' => 10,
                'comments_count' => 8,
                'shares_count' => 1,
                'created_at' => Carbon::now()->subDays(3),
                'updated_at' => Carbon::now()->subDays(3),
            ],
        ];

        // Insertar todos los posts
        foreach ($posts as $post) {
            Comunidad::create($post);
        }

        $this->command->info('✅ Se han creado ' . count($posts) . ' posts de comunidad.');
    }
}
