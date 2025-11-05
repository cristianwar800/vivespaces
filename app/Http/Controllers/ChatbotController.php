<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Property;
use App\Models\User;
use App\Models\Message;

class ChatBotController extends Controller
{
    private $menuStructure;

    public function __construct()
    {
        $this->initializeMenuStructure();
    }

    /**
     * Estructura COMPLETA de menús del chatbot
     */
    private function initializeMenuStructure()
    {
        $this->menuStructure = [
            // ==========================================
            // 🏠 MENÚ PRINCIPAL
            // ==========================================
            'main' => [
                'text' => '👋 ¿En qué puedo ayudarte hoy?',
                'options' => [
                    ['id' => 'search_properties', 'text' => '🏠 Buscar Propiedades', 'icon' => '🏠'],
                    ['id' => 'publish_property', 'text' => '📝 Publicar Propiedad', 'icon' => '📝'],
                    ['id' => 'verification', 'text' => '✅ Verificación', 'icon' => '✅'],
                    ['id' => 'messages', 'text' => '💬 Mensajes', 'icon' => '💬'],
                    ['id' => 'my_account', 'text' => '👤 Mi Cuenta', 'icon' => '👤'],
                    ['id' => 'stats', 'text' => '📊 Estadísticas', 'icon' => '📊'],
                    ['id' => 'help', 'text' => '❓ Ayuda', 'icon' => '❓'],
                ]
            ],

            // ==========================================
            // 🏠 BUSCAR PROPIEDADES
            // ==========================================
            'search_properties' => [
                'text' => '🏠 **Buscar Propiedades**

¿Cómo quieres buscar?',
                'options' => [
                    ['id' => 'search_by_location', 'text' => '📍 Por Ubicación', 'icon' => '📍'],
                    ['id' => 'search_by_price', 'text' => '💰 Por Precio', 'icon' => '💰'],
                    ['id' => 'search_by_type', 'text' => '🏘️ Por Tipo', 'icon' => '🏘️'],
                    ['id' => 'search_by_rooms', 'text' => '🛏️ Por Habitaciones', 'icon' => '🛏️'],
                    ['id' => 'search_recent', 'text' => '🆕 Propiedades Nuevas', 'icon' => '🆕'],
                    ['id' => 'search_map', 'text' => '🗺️ Ver en Mapa', 'action' => 'url', 'url' => '/properties?view=map'],
                    ['id' => 'search_advanced', 'text' => '🔍 Búsqueda Avanzada', 'action' => 'url', 'url' => '/properties'],
                ],
                'back' => 'main'
            ],

            'search_by_location' => [
                'text' => '📍 **Buscar por Ubicación**

Selecciona una zona:',
                'options' => [
                    ['id' => 'location_centro', 'text' => 'Centro', 'action' => 'search', 'params' => ['city' => 'centro']],
                    ['id' => 'location_norte', 'text' => 'Zona Norte', 'action' => 'search', 'params' => ['city' => 'norte']],
                    ['id' => 'location_sur', 'text' => 'Zona Sur', 'action' => 'search', 'params' => ['city' => 'sur']],
                    ['id' => 'location_custom', 'text' => '✏️ Otra ubicación', 'action' => 'url', 'url' => '/properties'],
                ],
                'back' => 'search_properties'
            ],

            'search_by_price' => [
                'text' => '💰 **Buscar por Precio**

Selecciona tu presupuesto mensual:',
                'options' => [
                    ['id' => 'price_low', 'text' => '💵 Menos de $5,000', 'action' => 'search', 'params' => ['max_price' => 5000]],
                    ['id' => 'price_mid1', 'text' => '💵 $5,000 - $10,000', 'action' => 'search', 'params' => ['min_price' => 5000, 'max_price' => 10000]],
                    ['id' => 'price_mid2', 'text' => '💵 $10,000 - $15,000', 'action' => 'search', 'params' => ['min_price' => 10000, 'max_price' => 15000]],
                    ['id' => 'price_high', 'text' => '💎 Más de $15,000', 'action' => 'search', 'params' => ['min_price' => 15000]],
                    ['id' => 'price_custom', 'text' => '✏️ Rango personalizado', 'action' => 'url', 'url' => '/properties'],
                ],
                'back' => 'search_properties'
            ],

            'search_by_type' => [
                'text' => '🏘️ **Buscar por Tipo**

¿Qué tipo de propiedad buscas?',
                'options' => [
                    ['id' => 'type_casa', 'text' => '🏡 Casa', 'action' => 'search', 'params' => ['type' => 'casa']],
                    ['id' => 'type_departamento', 'text' => '🏢 Departamento', 'action' => 'search', 'params' => ['type' => 'departamento']],
                    ['id' => 'type_estudio', 'text' => '🏠 Estudio', 'action' => 'search', 'params' => ['type' => 'estudio']],
                    ['id' => 'type_habitacion', 'text' => '🚪 Habitación', 'action' => 'search', 'params' => ['type' => 'habitacion']],
                ],
                'back' => 'search_properties'
            ],

            'search_by_rooms' => [
                'text' => '🛏️ **Buscar por Habitaciones**

¿Cuántas habitaciones necesitas?',
                'options' => [
                    ['id' => 'rooms_1', 'text' => '1 Habitación', 'action' => 'search', 'params' => ['bedrooms' => 1]],
                    ['id' => 'rooms_2', 'text' => '2 Habitaciones', 'action' => 'search', 'params' => ['bedrooms' => 2]],
                    ['id' => 'rooms_3', 'text' => '3 Habitaciones', 'action' => 'search', 'params' => ['bedrooms' => 3]],
                    ['id' => 'rooms_4plus', 'text' => '4+ Habitaciones', 'action' => 'search', 'params' => ['min_bedrooms' => 4]],
                ],
                'back' => 'search_properties'
            ],

            'search_recent' => [
                'text' => '🆕 **Propiedades Nuevas**

¿De cuándo quieres ver?',
                'options' => [
                    ['id' => 'recent_today', 'text' => '⚡ Hoy', 'action' => 'search', 'params' => ['days' => 0]],
                    ['id' => 'recent_week', 'text' => '📅 Última semana', 'action' => 'search', 'params' => ['days' => 7]],
                    ['id' => 'recent_month', 'text' => '📆 Último mes', 'action' => 'search', 'params' => ['days' => 30]],
                ],
                'back' => 'search_properties'
            ],

            // ==========================================
            // 📝 PUBLICAR PROPIEDAD
            // ==========================================
            'publish_property' => [
                'text' => '📝 **Publicar Propiedad**

¿Qué necesitas saber?',
                'options' => [
                    ['id' => 'publish_how', 'text' => '❓ ¿Cómo publicar?', 'icon' => '❓'],
                    ['id' => 'publish_requirements', 'text' => '📋 Requisitos', 'icon' => '📋'],
                    ['id' => 'publish_photos', 'text' => '📸 Guía de fotos', 'icon' => '📸'],
                    ['id' => 'publish_costs', 'text' => '💰 ¿Tiene costo?', 'icon' => '💰'],
                    ['id' => 'publish_now', 'text' => '✅ Publicar ahora', 'action' => 'url', 'url' => '/properties/create'],
                ],
                'back' => 'main'
            ],

            'publish_how' => [
                'text' => '✅ **Cómo Publicar una Propiedad**

**Proceso paso a paso:**

1️⃣ **Verificar identidad** (con INE)
2️⃣ **Ir a "Publicar Propiedad"**
3️⃣ **Llenar información:**
   • Título atractivo
   • Ubicación exacta
   • Tipo de propiedad
   • Precio mensual
   • Habitaciones y baños
   • Área (m²)

4️⃣ **Subir fotos** (mínimo 5)
5️⃣ **Escribir descripción**
6️⃣ **Publicar**

⚡ Toma solo 10 minutos!',
                'options' => [
                    ['id' => 'publish_requirements', 'text' => '📋 Ver requisitos', 'icon' => '📋'],
                    ['id' => 'publish_photos', 'text' => '📸 Guía de fotos', 'icon' => '📸'],
                    ['id' => 'publish_now', 'text' => '✅ Publicar ahora', 'action' => 'url', 'url' => '/properties/create'],
                ],
                'back' => 'publish_property'
            ],

            'publish_requirements' => [
                'text' => '📋 **Requisitos para Publicar**

**Obligatorios:**
✅ Cuenta verificada con INE
✅ Ser propietario o tener autorización
✅ Información completa
✅ Mínimo 5 fotos
✅ Precio mensual
✅ Ubicación exacta
✅ Descripción detallada

💡 Propiedades completas se rentan 3x más rápido',
                'options' => [
                    ['id' => 'verification', 'text' => '✅ Verificar identidad', 'icon' => '✅'],
                    ['id' => 'publish_photos', 'text' => '📸 Guía de fotos', 'icon' => '📸'],
                    ['id' => 'publish_now', 'text' => '🚀 Publicar ahora', 'action' => 'url', 'url' => '/properties/create'],
                ],
                'back' => 'publish_property'
            ],

            'publish_photos' => [
                'text' => '📸 **Guía de Fotos**

**Fotos OBLIGATORIAS:**
1. Fachada/entrada
2. Sala principal
3. Cocina
4. Todas las habitaciones
5. Baños

**TIPS:**
✅ Luz natural (mañanas)
✅ Espacios limpios
✅ Ángulos amplios
✅ Alta resolución
✅ Horizontal
❌ Evita fotos borrosas
❌ Evita fotos oscuras

📱 Usa tu celular en modo HDR',
                'options' => [
                    ['id' => 'publish_requirements', 'text' => '📋 Requisitos', 'icon' => '📋'],
                    ['id' => 'publish_now', 'text' => '🚀 Publicar ahora', 'action' => 'url', 'url' => '/properties/create'],
                ],
                'back' => 'publish_property'
            ],

            'publish_costs' => [
                'text' => '💵 **Costos del Servicio**

🎉 **¡COMPLETAMENTE GRATIS!**

**Para PROPIETARIOS:**
✅ Publicar propiedades
✅ Gestionar anuncios
✅ Recibir mensajes
✅ Editar información
✅ Todas las funciones

**Para INQUILINOS:**
✅ Buscar propiedades
✅ Contactar propietarios
✅ Guardar favoritos
✅ Todas las funciones

**SIN:**
❌ Cargos ocultos
❌ Comisiones
❌ Límites

💡 100% gratuito, siempre',
                'options' => [
                    ['id' => 'publish_now', 'text' => '🚀 Publicar ahora', 'action' => 'url', 'url' => '/properties/create'],
                ],
                'back' => 'publish_property'
            ],

            // ==========================================
            // ✅ VERIFICACIÓN
            // ==========================================
            'verification' => [
                'text' => '✅ **Verificación de Identidad**

Verifica tu identidad para:
- Publicar propiedades
- Generar confianza
- Destacar en búsquedas

¿Qué necesitas saber?',
                'options' => [
                    ['id' => 'verification_what', 'text' => '❓ ¿Qué es?', 'icon' => '❓'],
                    ['id' => 'verification_how', 'text' => '🔧 ¿Cómo verificar?', 'icon' => '🔧'],
                    ['id' => 'verification_ocr', 'text' => '🤖 ¿Qué es OCR?', 'icon' => '🤖'],
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                    ['id' => 'verification_now', 'text' => '✅ Verificar ahora', 'action' => 'url', 'url' => '/verification/identity'],
                ],
                'back' => 'main'
            ],

            'verification_what' => [
                'text' => '✅ **¿Qué es la Verificación?**

Proceso donde confirmas tu identidad con INE/IFE.

**Beneficios:**
✅ Badge de "Usuario Verificado"
✅ Más confianza
✅ Puedes publicar propiedades
✅ Prioridad en búsquedas

**Tiempo:**
⚡ 2-3 minutos

💡 Rápido, fácil y seguro',
                'options' => [
                    ['id' => 'verification_how', 'text' => '🔧 ¿Cómo hacerlo?', 'icon' => '🔧'],
                    ['id' => 'verification_now', 'text' => '✅ Verificar ahora', 'action' => 'url', 'url' => '/verification/identity'],
                ],
                'back' => 'verification'
            ],

            'verification_how' => [
                'text' => '🔧 **Cómo Verificar**

**Pasos:**
1️⃣ Ten tu INE a la mano
2️⃣ Ve a "Verificar Identidad"
3️⃣ Sube foto del FRENTE
4️⃣ Sube foto del REVERSO
5️⃣ Sistema OCR lee datos
6️⃣ Confirma y ¡listo!

⚡ **Toma 2 minutos**

**Tips:**
✅ Foto horizontal
✅ INE completa
✅ Sin reflejos
✅ Buena resolución',
                'options' => [
                    ['id' => 'verification_ocr', 'text' => '🤖 ¿Qué es OCR?', 'icon' => '🤖'],
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                    ['id' => 'verification_now', 'text' => '✅ Verificar ahora', 'action' => 'url', 'url' => '/verification/identity'],
                ],
                'back' => 'verification'
            ],

            'verification_ocr' => [
                'text' => '🤖 **OCR - Reconocimiento Óptico**

**¿Qué es?**
IA que lee tu INE automáticamente.

**Lee:**
- Nombre completo
- CURP
- Fecha de nacimiento
- Domicilio
- Número de credencial

**Ventajas:**
✅ Instantáneo (segundos)
✅ No escribes nada
✅ Muy preciso (99%)
✅ Seguro y encriptado

💡 Tecnología de última generación',
                'options' => [
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                    ['id' => 'verification_now', 'text' => '✅ Verificar ahora', 'action' => 'url', 'url' => '/verification/identity'],
                ],
                'back' => 'verification'
            ],

            'verification_safe' => [
                'text' => '🔒 **Seguridad de tus Datos**

**100% Seguro:**
✅ Datos encriptados
✅ No compartimos información
✅ Cumplimos con GDPR
✅ Almacenamiento seguro
✅ Solo para verificación

**¿QUIÉN VE MIS DATOS?**
- Tú (siempre)
- Sistema automático
- Nadie más

**PÚBLICO:**
✅ Badge de "Verificado"
✅ Tu nombre (si autorizas)
❌ Número INE (nunca)
❌ CURP (nunca)
❌ Dirección (nunca)

💡 Tu privacidad es #1',
                'options' => [
                    ['id' => 'verification_now', 'text' => '✅ Entendido, verificar', 'action' => 'url', 'url' => '/verification/identity'],
                ],
                'back' => 'verification'
            ],

            // ==========================================
            // 💬 MENSAJES
            // ==========================================
            'messages' => [
                'text' => '💬 **Sistema de Mensajes**

¿Qué necesitas?',
                'options' => [
                    ['id' => 'messages_how', 'text' => '❓ ¿Cómo funciona?', 'icon' => '❓'],
                    ['id' => 'messages_view', 'text' => '📬 Ver mis mensajes', 'action' => 'url', 'url' => '/messages'],
                ],
                'back' => 'main'
            ],

            'messages_how' => [
                'text' => '💬 **Cómo Funciona el Chat**

**Contactar propietarios:**
1. Encuentra una propiedad
2. Abre los detalles
3. Clic en "Enviar Mensaje"
4. Escribe tu consulta
5. ¡Espera respuesta!

**Ver conversaciones:**
- Ve al menú "Mensajes"
- Todas tus conversaciones
- Notificaciones en tiempo real

💡 Mensajes nuevos con 🔴',
                'options' => [
                    ['id' => 'messages_view', 'text' => '📬 Ver mensajes', 'action' => 'url', 'url' => '/messages'],
                ],
                'back' => 'messages'
            ],

            // ==========================================
            // 👤 MI CUENTA
            // ==========================================
            'my_account' => [
                'text' => '👤 **Mi Cuenta**

¿Qué deseas hacer?',
                'options' => [
                    ['id' => 'account_profile', 'text' => '✏️ Editar perfil', 'action' => 'url', 'url' => '/profile'],
                    ['id' => 'account_properties', 'text' => '🏠 Mis propiedades', 'action' => 'url', 'url' => '/properties?owner=me'],
                    ['id' => 'account_password', 'text' => '🔑 Cambiar contraseña', 'icon' => '🔑'],
                ],
                'back' => 'main'
            ],

            'account_password' => [
                'text' => '🔑 **Cambiar Contraseña**

**Si conoces tu contraseña:**
1. Ve a "Mi Perfil"
2. "Editar Perfil"
3. "Cambiar Contraseña"
4. Ingresa actual y nueva
5. Guardar

**Si la olvidaste:**
1. Ve a Login
2. "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Revisa correo
5. Sigue el enlace',
                'options' => [
                    ['id' => 'account_profile', 'text' => '👤 Ir a perfil', 'action' => 'url', 'url' => '/profile'],
                ],
                'back' => 'my_account'
            ],

            // ==========================================
            // 📊 ESTADÍSTICAS
            // ==========================================
            'stats' => [
                'text' => '📊 **Estadísticas**

¿Qué te interesa?',
                'options' => [
                    ['id' => 'stats_properties', 'text' => '🏠 Propiedades disponibles', 'icon' => '🏠'],
                    ['id' => 'stats_prices', 'text' => '💰 Precios promedio', 'icon' => '💰'],
                ],
                'back' => 'main'
            ],

            // ==========================================
            // ❓ AYUDA
            // ==========================================
            'help' => [
                'text' => '❓ **Centro de Ayuda**

¿En qué necesitas ayuda?',
                'options' => [
                    ['id' => 'help_how_works', 'text' => '🚀 ¿Cómo funciona?', 'icon' => '🚀'],
                    ['id' => 'help_contact', 'text' => '📧 Contactar soporte', 'icon' => '📧'],
                ],
                'back' => 'main'
            ],

            'help_how_works' => [
                'text' => '🚀 **¿Cómo funciona ViveSpaces?**

**Para inquilinos:**
✅ Busca con filtros
✅ Contacta directamente
✅ Mapa interactivo
✅ Notificaciones

**Para propietarios:**
✅ Publica gratis
✅ Verificación rápida
✅ Gestiona mensajes
✅ Panel de control

**Todo 100% online y seguro 🔒**',
                'options' => [
                    ['id' => 'search_properties', 'text' => '🏠 Buscar', 'icon' => '🏠'],
                    ['id' => 'publish_property', 'text' => '📝 Publicar', 'icon' => '📝'],
                ],
                'back' => 'help'
            ],

            'help_contact' => [
                'text' => '📧 **Contactar Soporte**

**Email:** vivespacessoporte@gmail.com
**Horario:** Lun-Vie 9:00-18:00
**Respuesta:** 24-48 horas

💡 **Antes de contactar:**
- Describe el problema
- Incluye capturas
- Menciona tu dispositivo

¡Te ayudaremos pronto! 🚀',
                'options' => [
                    ['id' => 'contact_send', 'text' => '📧 Enviar email', 'action' => 'url', 'url' => 'mailto:vivespacessoporte@gmail.com'],
                ],
                'back' => 'help'
            ],
        ];
    }

    /**
     * Obtener mensaje de bienvenida
     */
    public function getWelcomeMessage(Request $request)
    {
        try {
            $user = Auth::user();
            $context = $request->input('context', []);
            
            $mainMenu = $this->getPersonalizedMainMenu($user);
            
            return response()->json([
                'success' => true,
                'message' => $mainMenu
            ]);

        } catch (\Exception $e) {
            Log::error('Error en getWelcomeMessage: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => [
                    'text' => '¡Hola! 👋 Soy tu asistente de ViveSpaces.',
                    'type' => 'menu',
                    'menu_id' => 'main',
                    'options' => $this->menuStructure['main']['options']
                ]
            ], 200);
        }
    }

    /**
     * Procesar selección de opción
     */
    public function processMessage(Request $request)
    {
        try {
            $optionId = $request->input('option_id');
            $menuId = $request->input('menu_id');
            $context = $request->input('context', []);

            if (empty($optionId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Opción no válida'
                ], 400);
            }

            $response = $this->processOption($optionId, $context);

            return response()->json([
                'success' => true,
                'response' => $response,
                'timestamp' => now()->toIso8601String()
            ]);

        } catch (\Exception $e) {
            Log::error('Error en processMessage: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error procesando mensaje',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Procesar opción seleccionada
     */
    private function processOption($optionId, $context)
    {
        if (isset($this->menuStructure[$optionId])) {
            $menu = $this->menuStructure[$optionId];
            
            return [
                'text' => $this->enrichText($menu['text']),
                'type' => 'menu',
                'menu_id' => $optionId,
                'options' => $menu['options'],
                'back' => $menu['back'] ?? null
            ];
        }

        if (strpos($optionId, 'search_') === 0 || strpos($optionId, 'location_') === 0 || 
            strpos($optionId, 'price_') === 0 || strpos($optionId, 'type_') === 0 ||
            strpos($optionId, 'rooms_') === 0 || strpos($optionId, 'recent_') === 0) {
            return $this->handleSearchAction($optionId);
        }

        if (strpos($optionId, 'stats_') === 0) {
            return $this->handleStatsAction($optionId);
        }

        return [
            'text' => '❌ Opción no encontrada. Volviendo al menú principal...',
            'type' => 'menu',
            'menu_id' => 'main',
            'options' => $this->menuStructure['main']['options']
        ];
    }

    /**
     * Manejar acciones de búsqueda
     */
    private function handleSearchAction($optionId)
    {
        $searchParams = [];
        $locationName = '';

        if (strpos($optionId, 'location_') === 0) {
            $location = str_replace('location_', '', $optionId);
            $searchParams['city'] = $location;
            $locationName = ucfirst($location);
        } elseif (strpos($optionId, 'price_') === 0) {
            $priceRanges = [
                'price_low' => ['max' => 5000, 'label' => 'menos de $5,000'],
                'price_mid1' => ['min' => 5000, 'max' => 10000, 'label' => '$5,000 - $10,000'],
                'price_mid2' => ['min' => 10000, 'max' => 15000, 'label' => '$10,000 - $15,000'],
                'price_high' => ['min' => 15000, 'label' => 'más de $15,000'],
            ];
            if (isset($priceRanges[$optionId])) {
                $range = $priceRanges[$optionId];
                if (isset($range['min'])) $searchParams['min_price'] = $range['min'];
                if (isset($range['max'])) $searchParams['max_price'] = $range['max'];
                $locationName = $range['label'];
            }
        } elseif (strpos($optionId, 'type_') === 0) {
            $type = str_replace('type_', '', $optionId);
            $searchParams['type'] = $type;
            $locationName = ucfirst($type);
        } elseif (strpos($optionId, 'rooms_') === 0) {
            if ($optionId === 'rooms_4plus') {
                $searchParams['min_bedrooms'] = 4;
                $locationName = '4+ habitaciones';
            } else {
                $rooms = str_replace('rooms_', '', $optionId);
                $searchParams['bedrooms'] = $rooms;
                $locationName = $rooms . ' habitación(es)';
            }
        } elseif (strpos($optionId, 'recent_') === 0) {
            $daysMap = [
                'recent_today' => 0,
                'recent_week' => 7,
                'recent_month' => 30,
            ];
            if (isset($daysMap[$optionId])) {
                $searchParams['days'] = $daysMap[$optionId];
                $labels = [
                    'recent_today' => 'hoy',
                    'recent_week' => 'última semana',
                    'recent_month' => 'último mes',
                ];
                $locationName = $labels[$optionId];
            }
        }

        $properties = $this->searchProperties($searchParams);

        $text = "🔍 **Resultados de Búsqueda**\n\n";
        
        if ($properties['count'] > 0) {
            $text .= "Encontré **{$properties['count']} propiedades** ";
            if ($locationName) {
                $text .= "en **{$locationName}**\n\n";
            } else {
                $text .= "\n\n";
            }
            
            $text .= "💡 Haz clic en el botón para ver todas.";
        } else {
            $text .= "No encontré propiedades con esos criterios.\n\n";
            $text .= "💡 **Intenta:**\n";
            $text .= "• Ampliar tu rango de precio\n";
            $text .= "• Buscar en otras zonas\n";
            $text .= "• Explorar otros tipos";
        }

        $queryString = http_build_query($searchParams);
        
        return [
            'text' => $text,
            'type' => 'result',
            'data' => [
                'count' => $properties['count'],
                'avg_price' => $properties['avg_price'],
                'min_price' => $properties['min_price'],
                'max_price' => $properties['max_price'],
            ],
            'options' => [
                [
                    'id' => 'view_results',
                    'text' => '👁️ Ver resultados (' . $properties['count'] . ')',
                    'action' => 'url',
                    'url' => '/properties?' . $queryString
                ],
                [
                    'id' => 'search_properties',
                    'text' => '🔄 Nueva búsqueda',
                    'icon' => '🔄'
                ],
                [
                    'id' => 'main',
                    'text' => '🏠 Menú principal',
                    'icon' => '🏠'
                ],
            ]
        ];
    }

    /**
     * Manejar estadísticas
     */
    private function handleStatsAction($optionId)
    {
        $user = Auth::user();

        switch ($optionId) {
            case 'stats_properties':
                $total = Property::where('is_active', true)->count();
                $recent = Property::where('is_active', true)
                    ->where('created_at', '>=', now()->subDays(7))
                    ->count();
                
                $text = "🏠 **Propiedades Disponibles**\n\n";
                $text .= "📊 **Total:** {$total} propiedades\n";
                $text .= "✨ **Nuevas (7 días):** {$recent} propiedades\n\n";
                $text .= "💡 ¡Explora todas nuestras opciones!";
                
                return [
                    'text' => $text,
                    'type' => 'stats',
                    'data' => [
                        'total' => $total,
                        'recent' => $recent
                    ],
                    'options' => [
                        [
                            'id' => 'search_properties',
                            'text' => '🔍 Buscar propiedades',
                            'icon' => '🔍'
                        ],
                        [
                            'id' => 'stats',
                            'text' => '⬅️ Volver',
                            'icon' => '⬅️'
                        ],
                    ]
                ];

            case 'stats_prices':
                $avgPrice = Property::where('is_active', true)->avg('price');
                $minPrice = Property::where('is_active', true)->min('price');
                $maxPrice = Property::where('is_active', true)->max('price');
                
                $text = "💰 **Precios Promedio**\n\n";
                $text .= "📊 **Promedio:** $" . number_format($avgPrice, 2) . "\n";
                $text .= "💵 **Mínimo:** $" . number_format($minPrice, 2) . "\n";
                $text .= "💎 **Máximo:** $" . number_format($maxPrice, 2) . "\n\n";
                $text .= "💡 Los precios varían según ubicación.";
                
                return [
                    'text' => $text,
                    'type' => 'stats',
                    'data' => [
                        'avg_price' => $avgPrice,
                        'min_price' => $minPrice,
                        'max_price' => $maxPrice
                    ],
                    'options' => [
                        [
                            'id' => 'search_by_price',
                            'text' => '💰 Buscar por precio',
                            'icon' => '💰'
                        ],
                        [
                            'id' => 'stats',
                            'text' => '⬅️ Volver',
                            'icon' => '⬅️'
                        ],
                    ]
                ];

            default:
                return [
                    'text' => 'Estadística no disponible',
                    'type' => 'error',
                    'options' => [
                        [
                            'id' => 'stats',
                            'text' => '⬅️ Volver',
                            'icon' => '⬅️'
                        ],
                    ]
                ];
        }
    }

    /**
     * Buscar propiedades según parámetros
     */
    private function searchProperties($params)
    {
        $query = Property::where('is_active', true);

        if (isset($params['city'])) {
            $query->where('city', 'LIKE', '%' . $params['city'] . '%');
        }

        if (isset($params['min_price'])) {
            $query->where('price', '>=', $params['min_price']);
        }

        if (isset($params['max_price'])) {
            $query->where('price', '<=', $params['max_price']);
        }

        if (isset($params['type'])) {
            $query->where('type', 'LIKE', '%' . $params['type'] . '%');
        }

        if (isset($params['bedrooms'])) {
            $query->where('bedrooms', $params['bedrooms']);
        }

        if (isset($params['min_bedrooms'])) {
            $query->where('bedrooms', '>=', $params['min_bedrooms']);
        }

        if (isset($params['days']) && $params['days'] >= 0) {
            if ($params['days'] == 0) {
                $query->whereDate('created_at', now()->toDateString());
            } else {
                $query->where('created_at', '>=', now()->subDays($params['days']));
            }
        }

        $count = $query->count();
        $avgPrice = $query->avg('price');
        $minPrice = $query->min('price');
        $maxPrice = $query->max('price');

        return [
            'count' => $count,
            'avg_price' => $avgPrice,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
        ];
    }

    /**
     * Enriquecer texto con datos dinámicos
     */
    private function enrichText($text)
    {
        $user = Auth::user();
        $text = str_replace('{user_name}', $user ? $user->name : 'Usuario', $text);
        return $text;
    }

    /**
     * Obtener menú principal personalizado
     */
    private function getPersonalizedMainMenu($user)
    {
        $greeting = "👋 ¡Hola";
        if ($user) {
            $greeting .= " {$user->name}";
        }
        $greeting .= "! Soy tu asistente de ViveSpaces.\n\n¿En qué puedo ayudarte?";

        $mainMenu = $this->menuStructure['main'];
        $mainMenu['text'] = $greeting;

        if ($user) {
            $unreadMessages = Message::where('receiver_id', $user->id)
                ->whereNull('read_at')
                ->count();
            
            if ($unreadMessages > 0) {
                foreach ($mainMenu['options'] as &$option) {
                    if ($option['id'] === 'messages') {
                        $option['text'] = "💬 Mensajes ({$unreadMessages})";
                        $option['badge'] = $unreadMessages;
                    }
                }
            }

            $userProperties = Property::where('user_id', $user->id)->count();
            if ($userProperties > 0) {
                foreach ($mainMenu['options'] as &$option) {
                    if ($option['id'] === 'my_account') {
                        $option['text'] = "👤 Mi Cuenta ({$userProperties})";
                    }
                }
            }
        }

        return [
            'text' => $mainMenu['text'],
            'type' => 'menu',
            'menu_id' => 'main',
            'options' => $mainMenu['options']
        ];
    }
}