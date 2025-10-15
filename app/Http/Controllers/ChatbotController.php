<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Property;
use App\Models\User;
use App\Models\Message;
use App\Models\Comunidad;

class ChatBotController extends Controller
{
   /**
    * Procesar mensaje del chatbot y generar respuesta
    */
   public function processMessage(Request $request)
   {
       try {
           $request->validate([
               'message' => 'required|string|min:1|max:1000',
               'context' => 'nullable|array',
               'context.current_path' => 'nullable|string|max:255',
               'conversation_id' => 'nullable|string|max:100',
           ]);

           $userMessage = trim($request->message);
           $context = $request->context ?? [];
           $user = Auth::user();
           $conversationId = $request->conversation_id;

           // Log para debugging
           Log::info('ChatBot - Mensaje recibido:', [
               'user_id' => $user ? $user->id : 'guest',
               'message' => $userMessage,
               'context' => $context,
               'conversation_id' => $conversationId,
           ]);

           // Detectar patrones e intención
           $intent = $this->detectIntent($userMessage, $context, $user);

           // Generar respuesta basada en la intención
           $response = $this->generateIntelligentResponse($userMessage, $intent, $context, $user);

           // Guardar interacción para análisis
           $this->logChatbotInteraction($user, $userMessage, $response, $intent, $conversationId);

           return response()->json([
               'success' => true,
               'response' => $response,
               'intent' => $intent,
               'timestamp' => now()->toISOString(),
           ]);

       } catch (\Illuminate\Validation\ValidationException $e) {
           return response()->json([
               'success' => false,
               'response' => [
                   'text' => 'Por favor, ingresa un mensaje válido.',
                   'type' => 'error',
               ],
           ], 422);

       } catch (\Illuminate\Database\QueryException $e) {
           Log::error('ChatBot - Error de base de datos:', [
               'error' => $e->getMessage(),
               'trace' => $e->getTraceAsString(),
           ]);

           return response()->json([
               'success' => false,
               'response' => [
                   'text' => 'Error en la base de datos. Por favor, intenta de nuevo más tarde.',
                   'type' => 'error',
               ],
           ], 500);

       } catch (\Exception $e) {
           Log::error('ChatBot - Error inesperado:', [
               'error' => $e->getMessage(),
               'trace' => $e->getTraceAsString(),
           ]);

           return response()->json([
               'success' => false,
               'response' => [
                   'text' => 'Lo siento, hubo un error procesando tu mensaje. Por favor, intenta de nuevo.',
                   'type' => 'error',
               ],
           ], 500);
       }
   }

   /**
    * Detectar la intención del usuario usando patrones avanzados
    */
    private function detectIntent($message, $context = [], $user = null)
    {
        $lowerMessage = strtolower(trim($message));

        // Patrones de intención - ORDEN CORREGIDO (más específicos primero)
        $patterns = [
            'publish' => [
                'patterns' => [
                    '/\b(publicar|subir|agregar|anunciar|promocionar)\s+(propiedad|casa|departamento|inmueble)\b/i',
                    '/\b(vender|alquilar|rentar)\s+mi\s+(propiedad|casa|departamento)\b/i',
                    '/\b(crear\s+anuncio|nueva\s+propiedad|poner\s+en\s+venta|poner\s+en\s+renta)\b/i',
                    '/\bquiero\s+(publicar|subir|vender|rentar)\b/i',
                ],
                'weight' => 1.0
            ],
            'pricing' => [
                'patterns' => [
                    '/\b(precio|costo|cuanto|dinero|presupuesto|información.*precio)\b/i',
                    '/\b(barato|caro|económico)\b/i',
                    '/\b(ver\s+precios|precios\s+actuales|consultar\s+precios)\b/i',
                    '/\b(rango\s+de\s+precio|cuánto\s+cuesta)\b/i',
                    '/\bfiltrar.*precio\b/i',
                ],
                'weight' => 0.95
            ],
            'greeting' => [
                'patterns' => ['/\b(hola|hi|hello|buenos\s+días|buenas\s+tardes|buenas\s+noches)\b/i'],
                'weight' => 1.0
            ],
            'property_search' => [
                'patterns' => [
                    '/\b(buscar|encontrar|necesito|ver|mostrar).*(propiedad|casa|departamento)\b/i',
                    '/\b(propiedad|casa|departamento).*(en|cerca|por|disponible)\b/i',
                    '/\b(renta|alquiler|comprar|venta)\s+(de\s+)?(propiedad|casa)\b/i',
                    '/\b(explorar|buscar)\s+propiedades\b/i',
                ],
                'weight' => 0.8
            ],
            'location' => [
                'patterns' => [
                    '/\b(ubicación|zona|donde|guadalajara|zapopan|tlaquepaque|tonalá|tlajomulco)\b/i',
                    '/\b(cerca\s+de|en\s+la\s+zona|qué\s+ubicaciones|explorar\s+ubicaciones)\b/i',
                    '/\b(ubicaciones.*disponibles|zonas\s+disponibles|dónde\s+hay)\b/i',
                ],
                'weight' => 0.85
            ],
            'platform_help' => [
                'patterns' => [
                    '/\b(cómo\s+funciona|como\s+funciona|funcionamiento|usar\s+la\s+plataforma)\b/i',
                    '/\b(guía|tutorial|instrucciones|primeros\s+pasos|empezar)\b/i',
                    '/\b(qué\s+puedo\s+hacer|cómo\s+usar|ayuda\s+general)\b/i',
                ],
                'weight' => 0.85
            ],
            'user_profile' => [
                'patterns' => [
                    '/\b(mi\s+perfil|mis\s+datos|mi\s+cuenta|configuración)\b/i',
                    '/\b(cambiar|actualizar|editar).*(perfil|datos)\b/i',
                ],
                'weight' => 0.75
            ],
            'favorites' => [
                'patterns' => [
                    '/\b(favorito|favoritos|guardados|lista\s+deseos|mis\s+propiedades\s+guardadas)\b/i',
                ],
                'weight' => 0.75
            ],
            'messages' => [
                'patterns' => [
                    '/\b(mensaje|mensajes|conversación|chat|contactar|hablar\s+con)\b/i',
                    '/\b(mis\s+conversaciones|mis\s+mensajes)\b/i',
                ],
                'weight' => 0.7
            ],
            'support' => [
                'patterns' => [
                    '/\b(ayuda|soporte|problema|error|duda|no\s+funciona|no\s+puedo)\b/i',
                    '/\b(contactar\s+soporte|necesito\s+ayuda|tengo\s+un\s+problema)\b/i',
                ],
                'weight' => 0.65
            ],
            'community' => [
                'patterns' => [
                    '/\b(comunidad|foro|preguntar|opinión|otros\s+usuarios|vecinos)\b/i',
                    '/\b(participar\s+en|unirse\s+a)\b/i',
                ],
                'weight' => 0.6
            ],
        ];

        $detectedIntents = [];

        foreach ($patterns as $intent => $config) {
            foreach ($config['patterns'] as $pattern) {
                if (preg_match($pattern, $lowerMessage)) {
                    $detectedIntents[$intent] = $config['weight'];
                    break; // Solo necesitamos una coincidencia por intención
                }
            }
        }

        // Ajustar pesos por contexto
        $validPaths = ['/properties', '/profile', '/chat', '/comunidad'];
        if (isset($context['current_path']) && in_array($context['current_path'], $validPaths)) {
            switch ($context['current_path']) {
                case '/properties':
                    $detectedIntents['property_search'] = ($detectedIntents['property_search'] ?? 0) + 0.2;
                    break;
                case '/profile':
                    $detectedIntents['user_profile'] = ($detectedIntents['user_profile'] ?? 0) + 0.2;
                    break;
                case '/chat':
                    $detectedIntents['messages'] = ($detectedIntents['messages'] ?? 0) + 0.2;
                    break;
                case '/comunidad':
                    $detectedIntents['community'] = ($detectedIntents['community'] ?? 0) + 0.2;
                    break;
            }
        }

        // Debug logging
        Log::info('Intent Detection:', [
            'message' => $lowerMessage,
            'detected_intents' => $detectedIntents,
            'highest_intent' => !empty($detectedIntents) ? array_keys($detectedIntents, max($detectedIntents))[0] : 'general'
        ]);

        if (empty($detectedIntents)) {
            return 'general';
        }

        return array_keys($detectedIntents, max($detectedIntents))[0];
    }

   /**
    * Generar respuesta inteligente basada en la intención
    */
   private function generateIntelligentResponse($message, $intent, $context = [], $user = null)
   {
       switch ($intent) {
           case 'greeting':
               return $this->handleGreeting($user, $context);

           case 'property_search':
               return $this->handlePropertySearch($message, $user);

           case 'pricing':
               return $this->handlePricing($message, $user);

           case 'location':
               return $this->handleLocation($message, $user);

           case 'platform_help':
               return $this->handlePlatformHelp($user);

           case 'user_profile':
               return $this->handleUserProfile($user);

           case 'favorites':
               return $this->handleFavorites($user);

           case 'messages':
               return $this->handleMessages($user);

           case 'support':
               return $this->handleSupport($message, $user);

           case 'community':
               return $this->handleCommunity($user);

           case 'publish':
               return $this->handlePublish($user);

           default:
               return $this->handleGeneral($message, $user);
       }
   }

   /**
    * Generar respuesta para usuarios no autenticados
    */
   private function requireAuthResponse()
   {
       return [
           'text' => "🔑 Para continuar, necesitas iniciar sesión o registrarte.",
           'type' => 'auth',
           'actions' => [
               ['text' => 'Iniciar Sesión', 'url' => '/login'],
               ['text' => 'Registrarse', 'url' => '/register']
           ]
       ];
   }

   /**
    * Manejar saludos con datos personalizados
    */
   private function handleGreeting($user, $context = [])
   {
       $greeting = $user ? "¡Hola {$user->name}!" : "¡Hola!";

       $suggestions = [
           'Buscar propiedades',
           'Ver precios actuales',
           'Explorar ubicaciones',
           'Cómo funciona la plataforma',
           'Contactar soporte'
       ];

       $actions = [
           [
               'text' => '🏠 Explorar Propiedades',
               'url' => '/properties'
           ],
           [
               'text' => '💰 Consultar Precios',
               'message' => 'Quiero información sobre precios'
           ],
           [
               'text' => '📍 Ver Ubicaciones',
               'message' => 'Qué ubicaciones tienen propiedades disponibles'
           ]
       ];

       // Personalizar según el usuario
       if ($user) {
           $unreadMessages = $user->getUnreadMessagesCount();
           if ($unreadMessages > 0) {
               $greeting .= " Tienes {$unreadMessages} mensaje(s) sin leer.";
               $suggestions[] = 'Ver mis mensajes';
               $actions[] = [
                   'text' => '💬 Ver Mensajes (' . $unreadMessages . ')',
                   'url' => '/chat'
               ];
           }

           $recentProperties = Property::where('created_at', '>=', now()->subDays(7))->count();
           if ($recentProperties > 0) {
               $suggestions[] = 'Ver propiedades nuevas';
               $actions[] = [
                   'text' => '✨ Nuevas (' . $recentProperties . ')',
                   'message' => 'Mostrar propiedades nuevas de esta semana'
               ];
           }

           $userProperties = $user->properties()->count();
           if ($userProperties > 0) {
               $actions[] = [
                   'text' => '🏡 Mis Propiedades (' . $userProperties . ')',
                   'url' => '/properties?owner=me'
               ];
           } else {
               $actions[] = [
                   'text' => '📝 Publicar Propiedad',
                   'message' => 'Quiero publicar una propiedad'
               ];
           }
       } else {
           $actions[] = [
               'text' => '🔑 Iniciar Sesión',
               'url' => '/login'
           ];
       }

       return [
           'text' => "$greeting 😊 Soy tu asistente de ViveSpaces. ¿En qué puedo ayudarte hoy?",
           'type' => 'greeting',
           'suggestions' => $suggestions,
           'actions' => $actions
       ];
   }

   /**
    * Manejar información sobre cómo funciona la plataforma
    */
   private function handlePlatformHelp($user)
   {
       $text = "🚀 **¡Te ayudo a usar ViveSpaces!**\n\n";

       if ($user) {
           $text .= "**Como usuario registrado puedes:**\n";
           $text .= "🏠 **Buscar propiedades** - Usa filtros por precio, ubicación y tipo\n";
           $text .= "📝 **Publicar tu propiedad** - Crea anuncios con fotos y detalles\n";
           $text .= "💬 **Contactar propietarios** - Envía mensajes directos\n";
           $text .= "⭐ **Guardar favoritos** - Marca propiedades que te interesen\n";
           $text .= "👥 **Participar en comunidad** - Haz preguntas y comparte experiencias\n";
           $text .= "🔍 **Verificar tu identidad** - Aumenta la confianza con otros usuarios\n\n";

           $text .= "**¿Qué te gustaría hacer primero?**";

           $suggestions = [
               'Buscar una propiedad',
               'Publicar mi propiedad',
               'Ver mis mensajes',
               'Configurar mi perfil',
               'Explorar la comunidad'
           ];

           $actions = [
               [
                   'text' => '🔍 Buscar Propiedades',
                   'url' => '/properties'
               ],
               [
                   'text' => '📝 Publicar Propiedad',
                   'url' => '/properties/create'
               ],
               [
                   'text' => '💬 Mis Mensajes',
                   'url' => '/chat'
               ],
               [
                   'text' => '👤 Mi Perfil',
                   'url' => '/profile'
               ],
               [
                   'text' => '👥 Comunidad',
                   'url' => '/comunidad'
               ],
               [
                   'text' => '✅ Verificar Identidad',
                   'url' => '/verification/identity'
               ]
           ];

       } else {
           $text .= "**Para comenzar necesitas:**\n";
           $text .= "1️⃣ **Registrarte** - Crea tu cuenta gratuita\n";
           $text .= "2️⃣ **Explorar propiedades** - Navega sin restricciones\n";
           $text .= "3️⃣ **Contactar propietarios** - Regístrate para enviar mensajes\n\n";

           $text .= "**¡También puedes empezar explorando!**";

           $suggestions = [
               'Ver propiedades disponibles',
               'Información de precios',
               'Ubicaciones disponibles',
               'Registrarme ahora'
           ];

           $actions = [
               [
                   'text' => '🔑 Registrarse',
                   'url' => '/register'
               ],
               [
                   'text' => '🔓 Iniciar Sesión',
                   'url' => '/login'
               ],
               [
                   'text' => '🏠 Ver Propiedades',
                   'url' => '/properties'
               ],
               [
                   'text' => '💰 Ver Precios',
                   'message' => 'Quiero información sobre precios'
               ]
           ];
       }

       return [
           'text' => $text,
           'type' => 'platform_help',
           'suggestions' => $suggestions,
           'actions' => $actions
       ];
   }

   /**
    * Manejar búsqueda de propiedades con datos reales
    */
   private function handlePropertySearch($message, $user)
   {
       // Extraer ubicación del mensaje
       $extractedLocation = $this->extractLocationFromMessage($message);

       // Estadísticas de propiedades
       $stats = $this->getPropertyStats($extractedLocation);

       $text = "🏠 ";
       if ($extractedLocation) {
           $text .= "Para {$extractedLocation}, ";
       }

       if ($stats['available'] === 0) {
           $text .= "no hay propiedades disponibles en este momento.";
       } else {
           $text .= "tenemos {$stats['available']} propiedades disponibles";
           if ($stats['recent'] > 0) {
               $text .= " (¡{$stats['recent']} nuevas esta semana!)";
           }
           $text .= "\n\n**Rangos de precio:**\n";
           $text .= "• Desde \$" . number_format($stats['min_price'], 0, '.', ',') . " hasta \$" . number_format($stats['max_price'], 0, '.', ',') . "\n";
           $text .= "• Precio promedio: \$" . number_format($stats['avg_price'], 0, '.', ',');
       }

       $suggestions = [
           'Filtrar por precio',
           'Buscar por tipo',
           'Ver propiedades nuevas'
       ];

       if ($extractedLocation) {
           $suggestions[] = "Más opciones en {$extractedLocation}";
       }

       $actions = [
           [
               'text' => '🏠 Ver Propiedades',
               'url' => '/properties' . ($extractedLocation ? '?location=' . urlencode($extractedLocation) : '')
           ],
           [
               'text' => '🔍 Filtrar por Precio',
               'message' => 'Filtrar propiedades por precio'
           ],
           [
               'text' => '✨ Ver Nuevas',
               'message' => 'Mostrar propiedades nuevas'
           ]
       ];

       return [
           'text' => $text,
           'type' => 'properties',
           'data' => $stats,
           'suggestions' => $suggestions,
           'actions' => $actions
       ];
   }

   /**
    * Manejar consultas de precios con datos reales
    */
   private function handlePricing($message, $user)
   {
       $priceData = DB::table('properties')
           ->where('is_active', true)
           ->selectRaw('
               MIN(price) as min_price,
               MAX(price) as max_price,
               AVG(price) as avg_price,
               COUNT(*) as total_properties,
               COUNT(CASE WHEN price < 5000 THEN 1 END) as economicas,
               COUNT(CASE WHEN price BETWEEN 5000 AND 15000 THEN 1 END) as medias,
               COUNT(CASE WHEN price > 15000 THEN 1 END) as premium
           ')
           ->first();

       if (!$priceData->total_properties) {
           return [
               'text' => "💰 No hay propiedades disponibles para mostrar precios en este momento.",
               'type' => 'pricing',
               'data' => [],
               'suggestions' => ['Buscar propiedades', 'Contactar soporte'],
               'actions' => [
                   ['text' => '🏠 Buscar Propiedades', 'url' => '/properties'],
                   ['text' => '📞 Soporte', 'url' => '/faq']
               ]
           ];
       }

       $text = "💰 **Información de precios actual:**\n\n";
       $text .= "• Desde \$" . number_format($priceData->min_price, 0, '.', ',') . " hasta \$" . number_format($priceData->max_price, 0, '.', ',') . "\n";
       $text .= "• Precio promedio: \$" . number_format($priceData->avg_price, 0, '.', ',') . "\n\n";
       $text .= "**Distribución:**\n";
       $text .= "• Económicas (< \$5,000): {$priceData->economicas} propiedades\n";
       $text .= "• Rango medio (\$5,000-\$15,000): {$priceData->medias} propiedades\n";
       $text .= "• Premium (> \$15,000): {$priceData->premium} propiedades";

       return [
           'text' => $text,
           'type' => 'pricing',
           'data' => (array)$priceData,
           'suggestions' => [
               'Propiedades económicas (menos de $5,000)',
               'Rango medio ($5,000-$15,000)',
               'Propiedades premium (más de $15,000)',
               'Calcular presupuesto',
               'Tips para negociar precio'
           ],
           'actions' => [
               [
                   'text' => '💸 Ver Económicas',
                   'url' => '/properties?max_price=5000'
               ],
               [
                   'text' => '🏠 Rango Medio',
                   'url' => '/properties?min_price=5000&max_price=15000'
               ],
               [
                   'text' => '💎 Premium',
                   'url' => '/properties?min_price=15000'
               ],
               [
                   'text' => '📊 Comparar Precios',
                   'message' => 'Quiero comparar precios por zona'
               ],
               [
                   'text' => '💡 Consejos de Precios',
                   'message' => 'Dame consejos para negociar precios'
               ]
           ]
       ];
   }

   /**
    * Manejar consultas de ubicación con datos reales
    */
   private function handleLocation($message, $user)
   {
       $locationStats = DB::table('properties')
           ->where('is_active', true)
           ->select('city', 'state', DB::raw('COUNT(*) as count'), DB::raw('AVG(price) as avg_price'))
           ->groupBy('city', 'state')
           ->orderBy('count', 'desc')
           ->limit(8)
           ->get();

       $text = "📍 **Ubicaciones disponibles:**\n\n";
       if ($locationStats->isEmpty()) {
           $text .= "No hay ubicaciones con propiedades disponibles en este momento.";
       } else {
           foreach ($locationStats as $location) {
               $text .= "• **{$location->city}, {$location->state}**: {$location->count} propiedades (promedio \$" . number_format($location->avg_price, 0, '.', ',') . ")\n";
           }
       }

       return [
           'text' => $text,
           'type' => 'location',
           'data' => $locationStats->toArray(),
           'suggestions' => array_merge(
               $locationStats->take(4)->pluck('city')->toArray(),
               ['Cerca del centro', 'Con transporte público', 'Zonas seguras']
           ),
           'actions' => [
               [
                   'text' => '🗺️ Ver Mapa Interactivo',
                   'url' => '/properties?view=map'
               ],
               [
                   'text' => '🚇 Cerca del Metro',
                   'message' => 'Buscar propiedades cerca del transporte público'
               ],
               [
                   'text' => '🏢 Zona Comercial',
                   'message' => 'Propiedades en zonas comerciales'
               ],
               [
                   'text' => '🌳 Zonas Residenciales',
                   'message' => 'Buscar en zonas residenciales tranquilas'
               ],
               [
                   'text' => '📍 Ubicación Específica',
                   'message' => 'Buscar en una dirección específica'
               ]
           ]
       ];
   }

   /**
    * Manejar información del perfil del usuario
    */
   private function handleUserProfile($user)
   {
       if (!$user) {
           return $this->requireAuthResponse();
       }

       $userStats = [
           'properties_count' => $user->properties()->count(),
           'messages_count' => $user->sentMessages()->count() + $user->receivedMessages()->count(),
           'unread_messages' => $user->getUnreadMessagesCount(),
           'member_since' => $user->created_at->format('M Y'),
       ];

       $text = "👤 **Tu perfil, {$user->name}:**\n\n";
       $text .= "• Propiedades publicadas: {$userStats['properties_count']}\n";
       $text .= "• Mensajes totales: {$userStats['messages_count']}\n";
       $text .= "• Mensajes sin leer: {$userStats['unread_messages']}\n";
       $text .= "• Miembro desde: {$userStats['member_since']}";

       return [
           'text' => $text,
           'type' => 'profile',
           'data' => $userStats,
           'actions' => [
               ['text' => 'Editar Perfil', 'url' => '/profile'],
               ['text' => 'Ver Mis Propiedades', 'url' => '/properties?owner=me']
           ]
       ];
   }

   /**
    * Manejar favoritos del usuario
    */
   private function handleFavorites($user)
   {
       if (!$user) {
           return $this->requireAuthResponse();
       }

       $favoritesCount = $user->favorites()->count();

       $text = "⭐ Tienes {$favoritesCount} propiedades en favoritos.";
       if ($favoritesCount > 0) {
           $text .= " ¿Quieres revisarlas?";
       } else {
           $text .= " ¡Empieza a guardar propiedades que te gusten!";
       }

       return [
           'text' => $text,
           'type' => 'favorites',
           'data' => ['count' => $favoritesCount],
           'actions' => [
               ['text' => 'Ver Favoritos', 'url' => '/favorites'],
               ['text' => 'Buscar Propiedades', 'url' => '/properties']
           ]
       ];
   }

   /**
    * Manejar mensajes del usuario
    */
   private function handleMessages($user)
   {
       if (!$user) {
           return $this->requireAuthResponse();
       }

       $messageStats = [
           'total' => $user->sentMessages()->count() + $user->receivedMessages()->count(),
           'unread' => $user->getUnreadMessagesCount(),
           'conversations' => count($user->getConversationsWith()),
       ];

       $text = "💬 **Tus mensajes:**\n\n";
       $text .= "• Conversaciones activas: {$messageStats['conversations']}\n";
       $text .= "• Mensajes sin leer: {$messageStats['unread']}\n";
       $text .= "• Total de mensajes: {$messageStats['total']}";

       return [
           'text' => $text,
           'type' => 'messages',
           'data' => $messageStats,
           'actions' => [
               ['text' => 'Ver Mensajes', 'url' => '/chat'],
               ['text' => 'Contactar Propietario', 'url' => '/properties']
           ]
       ];
   }

   /**
    * Manejar consultas de soporte
    */
   /**
    * Manejar consultas de soporte
    */
    private function handleSupport($message, $user)
    {
        $lowerMessage = strtolower($message);

        // Si pregunta específicamente sobre funcionamiento, redirigir
        if (preg_match('/\b(cómo\s+funciona|como\s+funciona|usar\s+la\s+plataforma)\b/i', $message)) {
            return $this->handlePlatformHelp($user);
        }

        return [
            'text' => "📞 **Estoy aquí para ayudarte:**\n\n• Resolución de problemas técnicos\n• Ayuda con búsquedas y filtros\n• Contacto con soporte especializado\n• Guías de uso de la plataforma",
            'type' => 'support',
            'suggestions' => [
                'Problema técnico',
                'No puedo enviar mensajes',
                'Error al subir fotos',
                'Cómo funciona la plataforma'
            ],
            'actions' => [
                [
                    'text' => '📧 Correo Soporte',
                    'url' => 'mailto:soporte@vivespaces.com'
                ],
                [
                    'text' => '📱 WhatsApp',
                    'url' => 'https://wa.me/5233123456789'
                ],
                [
                    'text' => '❓ FAQ',
                    'url' => '/faq'
                ],
                [
                    'text' => '🚀 Guía de Uso',
                    'message' => 'Cómo funciona la plataforma'
                ]
            ]
        ];
    }

    /**
     * Manejar comunidad
     */
    private function handleCommunity($user)
    {
        $communityStats = [
            'total_posts' => Comunidad::count(),
            'recent_posts' => Comunidad::where('created_at', '>=', now()->subDays(7))->count(),
            'popular_zones' => Comunidad::select('zone', DB::raw('COUNT(*) as count'))
                ->groupBy('zone')
                ->orderBy('count', 'desc')
                ->limit(3)
                ->pluck('zone')
                ->toArray()
        ];

        $text = "👥 **Comunidad ViveSpaces:**\n\n";
        $text .= "• {$communityStats['total_posts']} publicaciones totales\n";
        $text .= "• {$communityStats['recent_posts']} nuevas esta semana\n";
        $text .= "• Zonas más activas: " . implode(', ', $communityStats['popular_zones']);

        return [
            'text' => $text,
            'type' => 'community',
            'data' => $communityStats,
            'actions' => [
                ['text' => 'Ver Comunidad', 'url' => '/comunidad'],
                ['text' => 'Hacer Pregunta', 'url' => '/comunidad/create']
            ]
        ];
    }

    /**
     * Manejar publicación de propiedades
     */
    private function handlePublish($user)
    {
        if (!$user) {
            return $this->requireAuthResponse();
        }

        $userProperties = $user->properties()->count();

        $text = "🏡 **Publicar una propiedad es fácil:**\n\n";
        $text .= "1. Completa los detalles básicos\n";
        $text .= "2. Agrega fotos de calidad\n";
        $text .= "3. Establece el precio\n";
        $text .= "4. ¡Publica y recibe contactos!\n\n";
        $text .= "Ya tienes {$userProperties} propiedad(es) publicada(s).";

        return [
            'text' => $text,
            'type' => 'publish',
            'data' => ['user_properties' => $userProperties],
            'actions' => [
                ['text' => 'Publicar Ahora', 'url' => '/properties/create'],
                ['text' => 'Ver Mis Propiedades', 'url' => '/properties?owner=me']
            ]
        ];
    }

    /**
     * Respuesta general para mensajes no clasificados
     */
    private function handleGeneral($message, $user)
    {
        return [
            'text' => "🤔 No estoy seguro de qué necesitas exactamente. Te puedo ayudar con:",
            'type' => 'general',
            'suggestions' => [
                'Buscar propiedades',
                'Ver precios',
                'Información de ubicaciones',
                'Mi perfil',
                'Contactar soporte'
            ]
        ];
    }

    /**
     * Obtener estadísticas de propiedades
     */
    private function getPropertyStats($location = null)
    {
        $query = Property::where('is_active', true);

        if ($location) {
            $location = trim(strip_tags($location));
            $query->where(function($q) use ($location) {
                $q->where('city', 'like', "%{$location}%")
                  ->orWhere('state', 'like', "%{$location}%")
                  ->orWhere('address', 'like', "%{$location}%");
            });
        }

        $stats = $query->select(
            DB::raw('COUNT(*) as total'),
            DB::raw('COUNT(*) as available'),
            DB::raw('MIN(price) as min_price'),
            DB::raw('MAX(price) as max_price'),
            DB::raw('AVG(price) as avg_price')
        )->first();

        $recent = Property::where('is_active', true)
            ->where('created_at', '>=', now()->subDays(7));

        if ($location) {
            $recent->where(function($q) use ($location) {
                $q->where('city', 'like', "%{$location}%")
                  ->orWhere('state', 'like', "%{$location}%");
            });
        }

        $stats->recent = $recent->count();

        return [
            'total' => $stats->total ?? 0,
            'available' => $stats->available ?? 0,
            'recent' => $stats->recent ?? 0,
            'min_price' => (int)($stats->min_price ?? 0),
            'max_price' => (int)($stats->max_price ?? 0),
            'avg_price' => (int)($stats->avg_price ?? 0),
        ];
    }

    /**
     * Extraer ubicación del mensaje
     */
    private function extractLocationFromMessage($message)
    {
        $cities = ['guadalajara', 'zapopan', 'tlaquepaque', 'tonalá', 'tlajomulco'];

        foreach ($cities as $city) {
            if (stripos($message, $city) !== false) {
                return ucfirst($city);
            }
        }

        return null;
    }

    /**
     * Log de interacciones para análisis
     */
    private function logChatbotInteraction($user, $message, $response, $intent, $conversationId)
    {
        Log::info('ChatBot Interaction:', [
            'user_id' => $user ? $user->id : null,
            'conversation_id' => $conversationId,
            'message' => $message,
            'intent' => $intent,
            'response_type' => $response['type'],
            'timestamp' => now(),
        ]);
    }

    /**
     * Obtener mensaje de bienvenida contextual
     */
    public function getWelcomeMessage(Request $request)
    {
        try {
            $request->validate([
                'context' => 'nullable|array',
                'context.current_path' => 'nullable|string|max:255',
            ]);

            $context = $request->input('context', []);
            $user = Auth::user();

            // Generar mensaje de bienvenida contextual
            $welcomeMessage = $this->handleGreeting($user, $context);

            return response()->json([
                'success' => true,
                'message' => $welcomeMessage,
                'timestamp' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('ChatBot - Error en mensaje de bienvenida:', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => [
                    'text' => 'Error al cargar el mensaje de bienvenida.',
                    'type' => 'error',
                ],
            ], 500);
        }
    }
 }
