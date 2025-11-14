<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Property;
use App\Models\User;
use App\Models\Message;
use App\Models\Chatbot;
use App\Models\SystemConfig;

class ChatbotController extends Controller
{
    private $menuStructure;

    public function __construct()
    {
        $this->initializeMenuStructure();
    }

    /**
     * Guardar interacción en la base de datos
     */
    private function logInteraction($data)
    {
        try {
            // Obtener o generar session_id para invitados
            $sessionId = null;
            if (!Auth::check()) {
                $sessionId = session('chatbot_session_id');
                if (!$sessionId) {
                    $sessionId = 'guest_' . Str::random(32);
                    session(['chatbot_session_id' => $sessionId]);
                }
            }

            // Obtener el último sequence_number para esta sesión/usuario
            $lastSequence = Chatbot::where(function($query) use ($sessionId) {
                if (Auth::check()) {
                    $query->where('user_id', Auth::id());
                } else {
                    $query->where('session_id', $sessionId);
                }
            })
            ->where('created_at', '>=', now()->subHours(24)) // Solo de las últimas 24h
            ->max('sequence_number') ?? 0;

            // Crear registro
            Chatbot::create([
                'user_id' => Auth::id(),
                'session_id' => $sessionId,
                'sequence_number' => $lastSequence + 1,
                'interaction_type' => $data['interaction_type'] ?? 'menu_click',
                'conversation_status' => $data['conversation_status'] ?? 'active',
                'current_menu_id' => $data['current_menu_id'] ?? null,
                'previous_menu_id' => $data['previous_menu_id'] ?? null,
                'user_input' => $data['user_input'] ?? null,
                'extracted_data' => $data['extracted_data'] ?? null,
                'bot_response' => $data['bot_response'] ?? null,
                'metadata' => $data['metadata'] ?? null,
            ]);

        } catch (\Exception $e) {
            // Log error pero no fallar la petición
            Log::error('Error guardando chatbot log: ' . $e->getMessage());
        }
    }

    /**
     * Estructura COMPLETA de menús del chatbot - MÁS ASISTENCIAL
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

Para buscar propiedades, puedes usar los filtros en la página principal. 

¿Qué tipo de búsqueda necesitas?',
                'options' => [
                    ['id' => 'search_by_location', 'text' => '📍 Por Ubicación', 'icon' => '📍'],
                    ['id' => 'search_by_price', 'text' => '💰 Por Precio', 'icon' => '💰'],
                    ['id' => 'search_by_type', 'text' => '🏘️ Por Tipo', 'icon' => '🏘️'],
                    ['id' => 'search_by_rooms', 'text' => '🛏️ Por Habitaciones', 'icon' => '🛏️'],
                    ['id' => 'search_recent', 'text' => '🆕 Propiedades Nuevas', 'icon' => '🆕'],
                    ['id' => 'search_how', 'text' => '❓ ¿Cómo buscar?', 'icon' => '❓'],
                ],
                'back' => 'main'
            ],

            'search_how' => [
                'text' => '🔍 **Cómo Buscar Propiedades**

**Pasos para buscar:**

1️⃣ Ve a la página principal (icono 🏠 en el menú)
2️⃣ Usa los filtros disponibles:
   • 📍 Ubicación/Ciudad
   • 💰 Rango de precio
   • 🏘️ Tipo de propiedad
   • 🛏️ Número de habitaciones
   • 🚿 Baños
   • 📐 Área (m²)

3️⃣ Haz clic en Buscar
4️⃣ Explora los resultados
5️⃣ Haz clic en una propiedad para ver detalles

💡 **Tips:**
✅ Usa el mapa para ver ubicaciones
✅ Guarda tus favoritos
✅ Contacta directamente al propietario',
                'options' => [
                    ['id' => 'search_properties', 'text' => '⬅️ Volver a búsquedas', 'icon' => '⬅️'],
                    ['id' => 'main', 'text' => '🏠 Menú principal', 'icon' => '🏠'],
                ],
                'back' => 'search_properties'
            ],

            'search_by_location' => [
                'text' => '📍 **Buscar por Ubicación**

Para buscar por ubicación:

1. Ve a la página de propiedades
2. En el filtro de Ciudad ingresa la ubicación
3. Presiona Buscar

🗺️ También puedes usar el **mapa interactivo** para explorar propiedades por zona.',
                'options' => [
                    ['id' => 'search_properties', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'search_properties'
            ],

            'search_by_price' => [
                'text' => '💰 **Buscar por Precio**

Para filtrar por precio:

1. Ve a la página de propiedades
2. Usa los campos de rango de precio:
   • **Precio mínimo**: Desde cuánto
   • **Precio máximo**: Hasta cuánto
3. Aplica los filtros

💡 **Rangos comunes:**
- 💵 Económicas: Menos de $5,000
- 💰 Medias: $5,000 - $15,000
- 💎 Premium: Más de $15,000',
                'options' => [
                    ['id' => 'stats_prices', 'text' => '📊 Ver precios promedio', 'icon' => '📊'],
                    ['id' => 'search_properties', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'search_properties'
            ],

            'search_by_type' => [
                'text' => '🏘️ **Buscar por Tipo**

**Tipos disponibles:**

🏡 **Casa** - Propiedad independiente con jardín
🏢 **Departamento** - Vivienda en edificio
🏠 **Estudio** - Espacio compacto, ideal para 1 persona
🚪 **Habitación** - Espacio en propiedad compartida

**Para filtrar:**
1. Ve a la página de propiedades
2. Selecciona el tipo en el menú desplegable
3. Aplica los filtros',
                'options' => [
                    ['id' => 'search_properties', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'search_properties'
            ],

            'search_by_rooms' => [
                'text' => '🛏️ **Buscar por Habitaciones**

Filtra propiedades según tus necesidades:

**Para filtrar:**
1. Ve a la página de propiedades
2. Selecciona número de habitaciones
3. También puedes filtrar por baños
4. Aplica los filtros

💡 Considera también el área (m²) para espacios más cómodos.',
                'options' => [
                    ['id' => 'search_properties', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'search_properties'
            ],

            'search_recent' => [
                'text' => '🆕 **Propiedades Nuevas**

Para ver las propiedades más recientes:

1. Ve a la página de propiedades
2. Ordena por Más recientes en el menú de orden
3. Las propiedades se mostrarán de más nueva a más antigua

⚡ Las propiedades nuevas tienen la etiqueta NUEVA para que las identifiques fácilmente.',
                'options' => [
                    ['id' => 'stats_properties', 'text' => '📊 Ver estadísticas', 'icon' => '📊'],
                    ['id' => 'search_properties', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'search_properties'
            ],

            // ==========================================
            // 📝 PUBLICAR PROPIEDAD
            // ==========================================
            'publish_property' => [
                'text' => '📝 **Publicar Propiedad**

Te guiaré paso a paso para publicar tu propiedad.

¿Qué necesitas saber?',
                'options' => [
                    ['id' => 'publish_how', 'text' => '❓ ¿Cómo publicar?', 'icon' => '❓'],
                    ['id' => 'publish_requirements', 'text' => '📋 Requisitos', 'icon' => '📋'],
                    ['id' => 'publish_photos', 'text' => '📸 Guía de fotos', 'icon' => '📸'],
                    ['id' => 'publish_costs', 'text' => '💰 ¿Tiene costo?', 'icon' => '💰'],
                ],
                'back' => 'main'
            ],

            'publish_how' => [
                'text' => '✅ **Cómo Publicar una Propiedad**

**Proceso paso a paso:**

1️⃣ **Verifica tu identidad** (obligatorio)
   • Ve a Verificación en el menú
   • Toma una selfie
   • Sube foto del FRENTE de tu INE
   • Aprobación automática (segundos)

2️⃣ **Prepara la información:**
   • Título atractivo (ej: Hermosa casa en zona norte)
   • Ubicación exacta
   • Tipo de propiedad
   • Precio mensual
   • Habitaciones y baños
   • Área en m²
   • Descripción detallada

3️⃣ **Prepara las fotos** (mínimo 5)
   • Fachada/entrada
   • Sala
   • Cocina
   • Habitaciones
   • Baños

4️⃣ **Publica:**
   • Ve al menú superior
   • Haz clic en Publicar Propiedad
   • Llena el formulario
   • Sube las fotos
   • ¡Publica!

⚡ **Tiempo estimado: 10-15 minutos**',
                'options' => [
                    ['id' => 'publish_requirements', 'text' => '📋 Ver requisitos', 'icon' => '📋'],
                    ['id' => 'publish_photos', 'text' => '📸 Guía de fotos', 'icon' => '📸'],
                    ['id' => 'verification', 'text' => '✅ Ir a verificación', 'icon' => '✅'],
                ],
                'back' => 'publish_property'
            ],

            'publish_requirements' => [
                'text' => '📋 **Requisitos para Publicar**

**OBLIGATORIOS:**
✅ Cuenta verificada con INE
✅ Ser propietario o tener autorización escrita
✅ Información completa y veraz
✅ Mínimo 5 fotos de calidad
✅ Precio mensual definido
✅ Ubicación exacta
✅ Descripción detallada (min. 100 caracteres)

**RECOMENDADO:**
⭐ Fotos profesionales o de alta calidad
⭐ Descripción completa de amenidades
⭐ Información sobre servicios incluidos
⭐ Reglas de la propiedad
⭐ Contacto disponible

💡 **Dato importante:** Propiedades completas se rentan 3x más rápido',
                'options' => [
                    ['id' => 'verification', 'text' => '✅ Verificar identidad', 'icon' => '✅'],
                    ['id' => 'publish_photos', 'text' => '📸 Guía de fotos', 'icon' => '📸'],
                    ['id' => 'publish_how', 'text' => '❓ Ver proceso completo', 'icon' => '❓'],
                ],
                'back' => 'publish_property'
            ],

            'publish_photos' => [
                'text' => '📸 **Guía de Fotos Profesionales**

**FOTOS OBLIGATORIAS (mínimo 5):**
1. 🏠 Fachada/entrada principal
2. 🛋️ Sala o espacio principal
3. 🍳 Cocina completa
4. 🛏️ Todas las habitaciones
5. 🚿 Baños

**TIPS PARA MEJORES FOTOS:**

✅ **Iluminación:**
- Toma fotos en la mañana (luz natural)
- Abre cortinas y persianas
- Enciende todas las luces

✅ **Preparación:**
- Limpia y ordena los espacios
- Retira objetos personales
- Arregla camas y cojines

✅ **Técnica:**
- Usa modo horizontal (landscape)
- Ángulos amplios (esquinas)
- No uses zoom, acércate
- Mantén el teléfono recto
- Usa modo HDR si está disponible

✅ **Calidad:**
- Resolución alta
- Sin filtros
- Sin marcas de agua
- Fotos nítidas (no borrosas)

❌ **EVITA:**
- Fotos oscuras
- Espacios desordenados
- Fotos borrosas o movidas
- Demasiado zoom
- Ángulos extraños

📱 **Consejo Pro:** Usa el modo retrato/paisaje de tu celular para mejores resultados.',
                'options' => [
                    ['id' => 'publish_requirements', 'text' => '📋 Ver requisitos', 'icon' => '📋'],
                    ['id' => 'publish_how', 'text' => '❓ Ver proceso completo', 'icon' => '❓'],
                ],
                'back' => 'publish_property'
            ],

            'publish_costs' => [
                'text' => '💵 **Costos del Servicio**

🎉 **¡COMPLETAMENTE GRATIS!**

**Para PROPIETARIOS:**
✅ Publicar propiedades ilimitadas
✅ Gestionar todos tus anuncios
✅ Recibir y responder mensajes
✅ Editar información cuando quieras
✅ Subir fotos ilimitadas
✅ Estadísticas de visualizaciones
✅ Todas las funciones de la plataforma

**Para INQUILINOS:**
✅ Buscar propiedades sin límites
✅ Contactar propietarios directamente
✅ Guardar favoritos
✅ Recibir notificaciones
✅ Usar filtros avanzados
✅ Ver en mapa interactivo
✅ Todas las funciones de búsqueda

**LO QUE NUNCA COBRAMOS:**
❌ Comisiones por renta
❌ Cargos ocultos
❌ Límites de publicaciones
❌ Costos por mensajes
❌ Tarifas de membresía

💡 **100% gratuito, siempre**

Nuestro objetivo es facilitar que encuentres o rentes tu propiedad sin intermediarios costosos.',
                'options' => [
                    ['id' => 'publish_how', 'text' => '📝 Ver cómo publicar', 'icon' => '📝'],
                ],
                'back' => 'publish_property'
            ],

            // ==========================================
            // ✅ VERIFICACIÓN
            // ==========================================
            'verification' => [
                'text' => '✅ **Verificación de Identidad**

La verificación te permite:
- Publicar propiedades
- Generar confianza con otros usuarios
- Badge de Usuario Verificado
- Destacar en búsquedas

¿Qué necesitas saber?',
                'options' => [
                    ['id' => 'verification_what', 'text' => '❓ ¿Qué es?', 'icon' => '❓'],
                    ['id' => 'verification_how', 'text' => '🔧 ¿Cómo verificar?', 'icon' => '🔧'],
                    ['id' => 'verification_ocr', 'text' => '🤖 ¿Qué es OCR?', 'icon' => '🤖'],
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                ],
                'back' => 'main'
            ],

            'verification_what' => [
                'text' => '✅ **¿Qué es la Verificación?**

Es un proceso donde confirmas tu identidad con tu INE/IFE.

**BENEFICIOS:**
✅ Badge visible de Usuario Verificado
✅ Genera más confianza
✅ Requisito para publicar propiedades
✅ Prioridad en resultados de búsqueda
✅ Acceso a funciones premium

**TIEMPO:**
⚡ 2-3 minutos en total
⏱️ Aprobación automática (segundos)

**PROCESO:**
Es completamente seguro y automático usando tecnología OCR (Reconocimiento Óptico de Caracteres).

💡 Rápido, fácil y 100% seguro',
                'options' => [
                    ['id' => 'verification_how', 'text' => '🔧 ¿Cómo hacerlo?', 'icon' => '🔧'],
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                ],
                'back' => 'verification'
            ],

            'verification_how' => [
                'text' => '🔧 **Cómo Verificar tu Identidad**

**PASOS DETALLADOS:**

1️⃣ **Prepara tu INE**
   • Ten a la mano tu credencial vigente
   • Limpia la superficie del FRENTE
   • Busca buena iluminación

2️⃣ **Accede a verificación**
   • Ve al menú superior
   • Haz clic en tu foto de perfil
   • Selecciona Verificar Identidad

3️⃣ **Toma tu SELFIE**
   • Permite acceso a cámara
   • Centra tu rostro
   • Busca buena iluminación
   • Toma la foto (sin lentes oscuros ni gorras)

4️⃣ **Sube foto del FRENTE de tu INE**
   • Coloca tu INE horizontal
   • Asegúrate que se vea completa
   • Sin reflejos ni sombras
   • Toma la foto

5️⃣ **Confirmación automática**
   • El sistema compara tu rostro con la foto de la INE
   • El OCR lee automáticamente tu nombre de la credencial
   • Validación instantánea
   • ¡Listo! Eres usuario verificado

⚡ **TIEMPO TOTAL: 2-3 minutos**

**TIPS IMPORTANTES:**
✅ Selfie sin lentes oscuros ni gorras
✅ Sube solo el FRENTE de la INE
✅ INE debe verse completa y legible
✅ Sin reflejos ni brillos
✅ Buena iluminación natural
✅ Foto nítida (no borrosa)
✅ INE vigente',
                'options' => [
                    ['id' => 'verification_ocr', 'text' => '🤖 ¿Qué es OCR?', 'icon' => '🤖'],
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                ],
                'back' => 'verification'
            ],

            'verification_ocr' => [
                'text' => '🤖 **OCR - Reconocimiento Óptico de Caracteres**

**¿QUÉ ES?**
Es tecnología de Inteligencia Artificial que lee automáticamente el texto de tu INE sin que tengas que escribir nada.

**¿QUÉ VALIDAMOS?**
📄 El sistema verifica:
- ✅ **Tu nombre completo** - Se compara con tu perfil
- ✅ **Tu foto en la INE** - Se compara con tu selfie usando reconocimiento facial
- ✅ **Credencial válida** - Verifica que sea una INE oficial

**VENTAJAS:**
✅ **Instantáneo** - Validación en segundos
✅ **Sin errores** - No escribes manualmente
✅ **Muy preciso** - Reconocimiento facial avanzado
✅ **Seguro** - Datos encriptados
✅ **Automático** - Sin intervención humana

**¿CÓMO FUNCIONA?**
1. Tomas una selfie
2. Subes la foto del FRENTE de tu INE
3. La IA compara tu rostro con la foto de la INE
4. El OCR lee tu nombre de la credencial
5. Valida que tu nombre coincida con tu perfil
6. ¡Verificación completada!

💡 Es la misma tecnología de reconocimiento facial que usan bancos y aeropuertos.',
                'options' => [
                    ['id' => 'verification_safe', 'text' => '🔒 ¿Es seguro?', 'icon' => '🔒'],
                    ['id' => 'verification_how', 'text' => '🔧 Ver proceso completo', 'icon' => '🔧'],
                ],
                'back' => 'verification'
            ],

            'verification_safe' => [
                'text' => '🔒 **Seguridad de tus Datos**

**100% SEGURO - TE LO GARANTIZAMOS**

🛡️ **Protección de Datos:**
✅ Encriptación de nivel bancario (AES-256)
✅ Cumplimiento con GDPR y LFPDPPP
✅ Servidores seguros
✅ No compartimos tu información con terceros
✅ Uso exclusivo para verificación de identidad

**¿QUIÉN VE MIS DATOS?**
👁️ **TÚ** - Siempre tienes acceso completo
🤖 **Sistema automático** - Solo para validación
❌ **Nadie más** - Ni staff, ni otros usuarios

**¿QUÉ ES VISIBLE PÚBLICAMENTE?**
✅ Badge de "Usuario Verificado"
✅ Tu nombre en el perfil
❌ Tu selfie de verificación (NUNCA)
❌ Foto de tu INE (NUNCA)
❌ Datos extraídos de la INE (NUNCA)
❌ Resultados de la verificación facial (NUNCA)

**DERECHOS SOBRE TUS DATOS:**
📝 Ver tus datos cuando quieras
✏️ Corregir información
🗑️ Eliminar tu cuenta y datos
📧 Exportar tu información

**SEGURIDAD ADICIONAL:**
🔐 Autenticación de dos factores disponible
🚨 Alertas de acceso sospechoso
📱 Verificación por email
🔄 Respaldo automático encriptado

💡 **Tu privacidad es nuestra prioridad #1**

Para más información sobre protección de datos, consulta nuestra Política de Privacidad.',
                'options' => [
                    ['id' => 'verification_how', 'text' => '✅ Entiendo, ¿cómo empiezo?', 'icon' => '✅'],
                    ['id' => 'verification', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'verification'
            ],

            // ==========================================
            // 💬 MENSAJES
            // ==========================================
            'messages' => [
                'text' => '💬 **Sistema de Mensajes**

El sistema de mensajes te permite comunicarte directamente con propietarios o inquilinos.

¿Qué necesitas?',
                'options' => [
                    ['id' => 'messages_how', 'text' => '❓ ¿Cómo funciona?', 'icon' => '❓'],
                    ['id' => 'messages_contact', 'text' => '📧 ¿Cómo contactar?', 'icon' => '📧'],
                    ['id' => 'messages_tips', 'text' => '💡 Tips de comunicación', 'icon' => '💡'],
                ],
                'back' => 'main'
            ],

            'messages_how' => [
                'text' => '💬 **Cómo Funciona el Sistema de Mensajes**

**ENVIAR MENSAJE:**
1. Busca una propiedad que te interese
2. Abre los detalles de la propiedad
3. Haz clic en Contactar al propietario
4. Escribe tu mensaje
5. Envía
6. ¡Espera la respuesta!

**VER TUS CONVERSACIONES:**
1. Ve al menú superior
2. Haz clic en el icono de mensajes 💬
3. Verás todas tus conversaciones
4. Haz clic en una para ver el historial completo

**CARACTERÍSTICAS:**
✅ Mensajes en tiempo real
✅ Notificaciones instantáneas
✅ Historial completo
✅ Indicador de mensajes nuevos 🔴
✅ Marca de leído/no leído
✅ Sistema seguro y privado

**PRIVACIDAD:**
🔒 Tus conversaciones son privadas
🔒 No compartimos tu información
🔒 Puedes bloquear usuarios si es necesario',
                'options' => [
                    ['id' => 'messages_tips', 'text' => '💡 Tips de comunicación', 'icon' => '💡'],
                    ['id' => 'messages', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'messages'
            ],

            'messages_contact' => [
                'text' => '📧 **Cómo Contactar a un Propietario**

**PASO A PASO:**

1️⃣ **Encuentra la propiedad**
   • Busca propiedades que te interesen
   • Aplica filtros según tus necesidades

2️⃣ **Ve los detalles**
   • Haz clic en la propiedad
   • Revisa fotos, precio, ubicación

3️⃣ **Inicia el contacto**
   • Botón Contactar al propietario
   • Se abre el chat

4️⃣ **Escribe tu mensaje**
   • Preséntate brevemente
   • Menciona qué te interesa
   • Haz preguntas específicas
   • Sé cordial y claro

5️⃣ **Envía y espera**
   • El propietario recibirá notificación
   • Tiempo de respuesta: 24-48 horas típicamente
   • Recibirás notificación de respuesta

💡 Tip: Revisa la sección de Tips de comunicación para mensajes efectivos.',
                'options' => [
                    ['id' => 'messages_tips', 'text' => '💡 Ver tips', 'icon' => '💡'],
                    ['id' => 'messages', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'messages'
            ],

            'messages_tips' => [
                'text' => '💡 **Tips para Comunicación Efectiva**

**PARA INQUILINOS:**

✅ **Preséntate:**
Hola, mi nombre es [nombre]. Me interesa tu propiedad...

✅ **Sé específico:**
- Fecha de mudanza deseada
- Cuántas personas
- Mascotas (si aplica)
- Presupuesto

✅ **Haz preguntas relevantes:**
- ¿Servicios incluidos?
- ¿Depósito requerido?
- ¿Cuándo puedo ver la propiedad?
- ¿Hay estacionamiento?

❌ **Evita:**
- Mensajes muy cortos (ej: ¿disponible?)
- Regatear inmediatamente
- Solicitar datos bancarios
- Lenguaje informal excesivo

**PARA PROPIETARIOS:**

✅ **Responde rápido:**
Inquilinos serios deciden en 24-48 horas

✅ **Sé profesional:**
- Información completa
- Responde todas las preguntas
- Sugiere horarios para visitas

✅ **Sé claro:**
- Requisitos de renta
- Servicios incluidos/no incluidos
- Reglas de la propiedad
- Proceso de aplicación

❌ **Evita:**
- Solicitar pagos fuera de la plataforma
- Dar datos bancarios en mensajes
- Presionar al inquilino

🛡️ **SEGURIDAD:**
- Usa solo el sistema de mensajes de la plataforma
- No compartas datos bancarios
- Reporta comportamiento sospechoso',
                'options' => [
                    ['id' => 'messages_how', 'text' => '❓ Ver cómo funciona', 'icon' => '❓'],
                    ['id' => 'messages', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'messages'
            ],

            // ==========================================
            // 👤 MI CUENTA
            // ==========================================
            'my_account' => [
                'text' => '👤 **Mi Cuenta**

Administra tu perfil y configuración.

¿Qué deseas hacer?',
                'options' => [
                    ['id' => 'account_profile', 'text' => '✏️ ¿Cómo editar perfil?', 'icon' => '✏️'],
                    ['id' => 'account_properties', 'text' => '🏠 Mis propiedades', 'icon' => '🏠'],
                    ['id' => 'account_password', 'text' => '🔑 Cambiar contraseña', 'icon' => '🔑'],
                    ['id' => 'account_privacy', 'text' => '🔒 Privacidad', 'icon' => '🔒'],
                ],
                'back' => 'main'
            ],

            'account_profile' => [
                'text' => '✏️ **Editar tu Perfil**

**PASOS:**
1. Haz clic en tu foto de perfil (esquina superior derecha)
2. Selecciona Mi Perfil
3. Haz clic en Editar Perfil
4. Actualiza la información:
   • Nombre
   • Email
   • Teléfono
   • Foto de perfil
   • Biografía
5. Guarda los cambios

**INFORMACIÓN QUE PUEDES EDITAR:**
📝 Nombre completo
📧 Email (requiere verificación)
📞 Teléfono
📸 Foto de perfil
✍️ Biografía breve
🏠 Ciudad

💡 Mantén tu perfil actualizado para generar confianza.',
                'options' => [
                    ['id' => 'account_privacy', 'text' => '🔒 Privacidad', 'icon' => '🔒'],
                    ['id' => 'my_account', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'my_account'
            ],

            'account_properties' => [
                'text' => '🏠 **Mis Propiedades**

**ADMINISTRAR TUS PUBLICACIONES:**

1. Ve al menú superior
2. Haz clic en Mis Propiedades
3. Verás todas tus publicaciones

**ACCIONES DISPONIBLES:**
✏️ **Editar** - Actualizar información
👁️ **Ver** - Como lo ven los inquilinos
📊 **Estadísticas** - Visualizaciones y contactos
🔄 **Activar/Desactivar** - Control de visibilidad
🗑️ **Eliminar** - Borrar publicación

**TIPS:**
- Mantén fotos actualizadas
- Actualiza disponibilidad
- Responde mensajes rápido
- Edita precio si es necesario

💡 Propiedades activas y con buenas fotos reciben 5x más contactos.',
                'options' => [
                    ['id' => 'publish_property', 'text' => '📝 Publicar nueva', 'icon' => '📝'],
                    ['id' => 'my_account', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'my_account'
            ],

            'account_password' => [
                'text' => '🔑 **Cambiar Contraseña**

**SI CONOCES TU CONTRASEÑA ACTUAL:**
1. Ve a "Mi Perfil"
2. Haz clic en "Editar Perfil"
3. Busca la sección Cambiar Contraseña
4. Ingresa contraseña actual
5. Ingresa nueva contraseña
6. Confirma nueva contraseña
7. Guarda los cambios

**SI OLVIDASTE TU CONTRASEÑA:**
1. Ve a la página de Login
2. Haz clic en ¿Olvidaste tu contraseña?
3. Ingresa tu email
4. Revisa tu correo
5. Haz clic en el enlace recibido
6. Crea tu nueva contraseña

**CONTRASEÑA SEGURA:**
✅ Mínimo 8 caracteres
✅ Combina mayúsculas y minúsculas
✅ Incluye números
✅ Incluye símbolos (@, #, $, etc.)
❌ No uses palabras comunes
❌ No uses fechas de nacimiento
❌ No la compartas con nadie',
                'options' => [
                    ['id' => 'account_privacy', 'text' => '🔒 Seguridad y privacidad', 'icon' => '🔒'],
                    ['id' => 'my_account', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'my_account'
            ],

            'account_privacy' => [
                'text' => '🔒 **Privacidad y Seguridad**

**TU INFORMACIÓN ESTÁ PROTEGIDA:**

🛡️ **Datos Privados (nunca visibles):**
- Email completo
- Teléfono completo
- Datos de verificación
- Mensajes privados
- Historial de búsquedas

👁️ **Datos Públicos (visibles):**
- Nombre
- Foto de perfil
- Biografía (si la agregas)
- Ciudad
- Badge de verificación

**CONFIGURACIÓN DE PRIVACIDAD:**
1. Ve a Mi Perfil
2. Sección Privacidad
3. Ajusta qué información mostrar

**OPCIONES:**
✅ Mostrar u ocultar email
✅ Mostrar u ocultar teléfono
✅ Permitir o bloquear mensajes de desconocidos
✅ Notificaciones personalizadas

**REPORTAR PROBLEMAS:**
Si encuentras contenido inapropiado o usuarios sospechosos, repórtalos inmediatamente.

💡 Revisa regularmente tu configuración de privacidad.',
                'options' => [
                    ['id' => 'help_contact', 'text' => '📧 Contactar soporte', 'icon' => '📧'],
                    ['id' => 'my_account', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'my_account'
            ],

            // ==========================================
            // 📊 ESTADÍSTICAS
            // ==========================================
            'stats' => [
                'text' => '📊 **Estadísticas**

Información actualizada sobre el mercado.

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
                    ['id' => 'help_how_works', 'text' => '🚀 ¿Cómo funciona ViveSpaces?', 'icon' => '🚀'],
                    ['id' => 'help_faq', 'text' => '❓ Preguntas frecuentes', 'icon' => '❓'],
                    ['id' => 'help_contact', 'text' => '📧 Contactar soporte', 'icon' => '📧'],
                ],
                'back' => 'main'
            ],

            'help_how_works' => [
                'text' => '🚀 **¿Cómo funciona ViveSpaces?**

**PARA INQUILINOS:**

1️⃣ **Busca**
   • Usa filtros avanzados
   • Explora el mapa interactivo
   • Guarda tus favoritos

2️⃣ **Contacta**
   • Mensajes directos
   • Sin intermediarios
   • Comunicación segura

3️⃣ **Visita**
   • Coordina visitas
   • Conoce la propiedad
   • Toma tu decisión

**PARA PROPIETARIOS:**

1️⃣ **Verifica**
   • Confirma tu identidad
   • Genera confianza
   • Acceso a publicar

2️⃣ **Publica**
   • Sube tu propiedad
   • Fotos de calidad
   • Información completa

3️⃣ **Administra**
   • Gestiona mensajes
   • Actualiza información
   • Ve estadísticas

**TODO 100% GRATIS Y SEGURO 🔒**

Sin comisiones, sin intermediarios, directo y confiable.',
                'options' => [
                    ['id' => 'help_faq', 'text' => '❓ Ver preguntas frecuentes', 'icon' => '❓'],
                    ['id' => 'help', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'help'
            ],

            'help_faq' => [
                'text' => '❓ **Preguntas Frecuentes**

**¿Es gratis usar ViveSpaces?**
✅ Sí, 100% gratuito para todos.

**¿Necesito verificarme?**
Solo si quieres publicar propiedades.

**¿Cómo contacto a un propietario?**
Sistema de mensajes integrado.

**¿Puedo publicar varias propiedades?**
Sí, sin límite.

**¿Cómo actualizo mi perfil?**
Ve a Mi Cuenta → Editar Perfil.

**¿Es segura mi información?**
Sí, encriptación bancaria.

**¿Cuánto tarda la verificación?**
2-5 minutos automático.

**¿Puedo editar mi propiedad publicada?**
Sí, cuando quieras.

**¿Cómo elimino mi cuenta?**
Contacta a soporte.

**¿Hay app móvil?**
La web es responsiva, funciona en móvil.',
                'options' => [
                    ['id' => 'help_contact', 'text' => '📧 Más preguntas', 'icon' => '📧'],
                    ['id' => 'help', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
                ],
                'back' => 'help'
            ],

            'help_contact' => [
                'text' => '📧 **Contactar Soporte**

**INFORMACIÓN DE CONTACTO:**

📧 **Email:** vivespacessoporte@gmail.com
⏰ **Horario:** Lun-Vie 9:00-18:00 (hora central)
⏱️ **Tiempo de respuesta:** 24-48 horas

**ANTES DE CONTACTAR:**

✅ **Prepara esta información:**
- Descripción detallada del problema
- Capturas de pantalla (si aplica)
- Dispositivo que usas (móvil/PC)
- Navegador (Chrome, Safari, etc.)
- Tu nombre de usuario/email

💡 **Consejo:** Revisa primero las preguntas frecuentes, tal vez tu duda ya está respondida.

**PARA REPORTES URGENTES:**
Si encuentras contenido inapropiado o usuarios sospechosos, menciona URGENTE en el asunto del correo.

**NOS COMPROMETEMOS A:**
✅ Responder en máximo 48 horas
✅ Resolver tu problema efectivamente
✅ Mantener tu información confidencial
✅ Seguimiento hasta resolución

¡Estamos aquí para ayudarte! 🚀',
                'options' => [
                    ['id' => 'contact_send', 'text' => '📧 Enviar email ahora', 'action' => 'url', 'url' => 'mailto:vivespacessoporte@gmail.com'],
                    ['id' => 'help', 'text' => '⬅️ Volver', 'icon' => '⬅️'],
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
            // 🔥 IMPORTANTE: Obtener usuario autenticado CORRECTAMENTE
            $user = Auth::user();
            
            // 🔥 VERIFICAR que no haya problemas de caché
            if ($user) {
                $user->refresh();
            }
            
            $context = $request->input('context', []);
            
            // 🔥 LOG para debugging - IMPORTANTE
            Log::info('ChatBot - Welcome Message Request', [
                'is_authenticated' => Auth::check(),
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'user_email' => $user?->email,
                'session_id' => session()->getId(),
            ]);
            
            // 🔥 VALIDACIÓN ESTRICTA: Si no hay usuario autenticado
            if (!Auth::check() || !$user || !$user->id) {
                Log::info('ChatBot - Usuario no autenticado, mostrando menú de invitado');
                
                return response()->json([
                    'success' => true,
                    'message' => [
                        'text' => "👋 ¡Hola! Soy tu asistente de ViveSpaces.\n\n🔍 **Como invitado** solo puedes consultar información de ayuda.\n\n🔐 **Inicia sesión** para acceder a todas las funciones.\n\n¿En qué puedo ayudarte?",
                        'type' => 'menu',
                        'menu_id' => 'guest',
                        'options' => [
                            ['id' => 'help', 'text' => '❓ Ayuda', 'icon' => '❓'],
                            ['id' => 'login_prompt', 'text' => '🔓 Iniciar Sesión', 'icon' => '🔓', 'action' => 'url', 'url' => '/login'],
                            ['id' => 'register_prompt', 'text' => '📝 Registrarse', 'icon' => '📝', 'action' => 'url', 'url' => '/register'],
                        ]
                    ],
                    'user' => null,
                    'is_guest' => true
                ]);
            }
            
            // Usuario autenticado - Menú completo
            $mainMenu = $this->getPersonalizedMainMenu($user);
            
            // 🔥 GUARDAR inicio de conversación
            $this->logInteraction([
                'interaction_type' => 'conversation_start',
                'conversation_status' => 'active',
                'current_menu_id' => 'main',
                'user_input' => [
                    'type' => 'conversation_start',
                    'context' => $context
                ],
                'bot_response' => [
                    'type' => 'menu',
                    'text' => $mainMenu['text'],
                    'menu_id' => 'main',
                    'options_count' => count($mainMenu['options'])
                ],
                'metadata' => [
                    'user_agent' => $request->userAgent(),
                    'ip_hash' => hash('sha256', $request->ip()),
                    'authenticated' => true
                ]
            ]);
            
            return response()->json([
                'success' => true,
                'message' => $mainMenu,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email
                ],
                'is_guest' => false
            ]);

        } catch (\Exception $e) {
            Log::error('Error en getWelcomeMessage: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);

            // Fallback para invitados en caso de error
            return response()->json([
                'success' => true,
                'message' => [
                    'text' => '👋 ¡Hola! Soy tu asistente de ViveSpaces.\n\n❓ Como invitado, solo puedes acceder a la sección de Ayuda.',
                    'type' => 'menu',
                    'menu_id' => 'guest',
                    'options' => [
                        ['id' => 'help', 'text' => '❓ Ayuda', 'icon' => '❓'],
                        ['id' => 'login_prompt', 'text' => '🔓 Iniciar Sesión', 'icon' => '🔓', 'action' => 'url', 'url' => '/login'],
                    ]
                ],
                'user' => null,
                'is_guest' => true
            ], 200);
        }
    }

    /**
     * Procesar selección de opción
     */
    public function processMessage(Request $request)
    {
        try {
            // 🔥 Validación mejorada
            $request->validate([
                'option_id' => 'required|string|max:200',
                'menu_id' => 'nullable|string|max:200',
                'context' => 'nullable|array'
            ]);

            $optionId = $request->input('option_id');
            $menuId = $request->input('menu_id');
            $context = $request->input('context', []);
            
            // 🔥 Obtener usuario autenticado
            $user = Auth::user();
            if ($user) {
                $user->refresh();
            }

            // 🔥 LOG detallado
            Log::info('ChatBot - Process Message', [
                'is_authenticated' => Auth::check(),
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'option_id' => $optionId,
                'menu_id' => $menuId,
                'session_id' => session()->getId()
            ]);

            if (empty($optionId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Opción no válida'
                ], 400);
            }

            // 🔥 VALIDACIÓN ESTRICTA: Opciones permitidas para invitados
            $guestAllowedOptions = [
                'help',
                'help_how_works',
                'help_faq',
                'help_contact',
                'contact_send'
            ];

            // 🔥 Si no está autenticado y intenta acceder a algo que NO es ayuda
            if ((!Auth::check() || !$user || !$user->id) && !in_array($optionId, $guestAllowedOptions)) {
                Log::warning('ChatBot - Invitado intentando acceder a opción restringida', [
                    'option_id' => $optionId,
                    'ip' => $request->ip()
                ]);

                return response()->json([
                    'success' => true,
                    'response' => [
                        'text' => "🔐 **Acceso Restringido**\n\nEsta función solo está disponible para usuarios registrados.\n\n✨ **Beneficios de crear una cuenta:**\n• Buscar y contactar propiedades\n• Publicar tus propiedades\n• Sistema de mensajería\n• Verificación de identidad\n• Y mucho más...\n\n¿Qué deseas hacer?",
                        'type' => 'auth_required',
                        'menu_id' => 'guest',
                        'options' => [
                            ['id' => 'login_prompt', 'text' => '🔓 Iniciar Sesión', 'icon' => '🔓', 'action' => 'url', 'url' => '/login'],
                            ['id' => 'register_prompt', 'text' => '📝 Registrarse Gratis', 'icon' => '📝', 'action' => 'url', 'url' => '/register'],
                            ['id' => 'help', 'text' => '❓ Ver Ayuda', 'icon' => '❓'],
                        ]
                    ],
                    'timestamp' => now()->toIso8601String(),
                    'user' => null,
                    'is_guest' => true
                ]);
            }

            $startTime = microtime(true);
            $response = $this->processOption($optionId, $context);
            $responseTime = (microtime(true) - $startTime) * 1000;

            // 🔥 GUARDAR interacción de clic en menú
            $this->logInteraction([
                'interaction_type' => 'menu_click',
                'conversation_status' => 'active',
                'current_menu_id' => $response['menu_id'] ?? $optionId,
                'previous_menu_id' => $menuId,
                'user_input' => [
                    'type' => 'button',
                    'option_id' => $optionId,
                    'from_menu' => $menuId
                ],
                'bot_response' => [
                    'type' => $response['type'] ?? 'menu',
                    'text' => substr($response['text'] ?? '', 0, 200),
                    'menu_id' => $response['menu_id'] ?? null,
                    'options_count' => count($response['options'] ?? []),
                    'has_data' => isset($response['data'])
                ],
                'metadata' => [
                    'response_time_ms' => round($responseTime, 2),
                    'authenticated' => Auth::check()
                ]
            ]);

            return response()->json([
                'success' => true,
                'response' => $response,
                'timestamp' => now()->toIso8601String(),
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email
                ] : null,
                'is_guest' => !Auth::check()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('Error en processMessage: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);

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

            // Personalizar texto dinámicamente basado en configuración del sistema
            $text = $this->enrichText($menu['text']);

            // Si es la sección de "publish_how" o "publish_requirements", ajustar según configuración
            if ($optionId === 'publish_how' && !SystemConfig::isVerificationRequiredForPublish()) {
                $text = '✅ **Cómo Publicar una Propiedad**

**Proceso paso a paso:**

1️⃣ **Prepara la información:**
   • Título atractivo (ej: Hermosa casa en zona norte)
   • Ubicación exacta
   • Tipo de propiedad
   • Precio mensual
   • Habitaciones y baños
   • Área en m²
   • Descripción detallada

2️⃣ **Prepara las fotos** (mínimo 5)
   • Fachada/entrada
   • Sala
   • Cocina
   • Habitaciones
   • Baños

3️⃣ **Publica:**
   • Ve al menú superior
   • Haz clic en Publicar Propiedad
   • Llena el formulario
   • Sube las fotos
   • ¡Publica!

⚡ **Tiempo estimado: 10-15 minutos**';
            } elseif ($optionId === 'publish_requirements' && !SystemConfig::isVerificationRequiredForPublish()) {
                $text = '📋 **Requisitos para Publicar**

**OBLIGATORIOS:**
✅ Ser propietario o tener autorización escrita
✅ Información completa y veraz
✅ Mínimo 5 fotos de calidad
✅ Precio mensual definido
✅ Ubicación exacta
✅ Descripción detallada (min. 100 caracteres)

**RECOMENDADO:**
⭐ Fotos profesionales o de alta calidad
⭐ Descripción completa de amenidades
⭐ Información sobre servicios incluidos
⭐ Reglas de la propiedad
⭐ Contacto disponible

💡 **Dato importante:** Propiedades completas se rentan 3x más rápido';
            }

            return [
                'text' => $text,
                'type' => 'menu',
                'menu_id' => $optionId,
                'options' => $menu['options'],
                'back' => $menu['back'] ?? null
            ];
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
                $text .= "📊 **Total:** {$total} propiedades activas\n";
                $text .= "✨ **Nuevas (últimos 7 días):** {$recent} propiedades\n\n";
                $text .= "💡 **¿Sabías que?**\n";
                $text .= "• Nuevas propiedades se publican diariamente\n";
                $text .= "• Usa los filtros para encontrar lo que buscas\n";
                $text .= "• Guarda tus favoritas para compararlas después\n\n";
                $text .= "¡Explora todas nuestras opciones!";
                
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
                
                $text = "💰 **Análisis de Precios**\n\n";
                $text .= "📊 **Precio promedio:** $" . number_format($avgPrice, 2) . " MXN\n";
                $text .= "💵 **Precio mínimo:** $" . number_format($minPrice, 2) . " MXN\n";
                $text .= "💎 **Precio máximo:** $" . number_format($maxPrice, 2) . " MXN\n\n";
                $text .= "💡 **Nota importante:**\n";
                $text .= "Los precios varían significativamente según:\n";
                $text .= "• Ubicación de la propiedad\n";
                $text .= "• Tamaño y número de habitaciones\n";
                $text .= "• Amenidades incluidas\n";
                $text .= "• Estado de la propiedad\n\n";
                $text .= "Usa los filtros de precio para encontrar opciones en tu presupuesto.";
                
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
        // 🔥 VALIDACIÓN ESTRICTA: Verificar que el usuario sea válido
        if (!$user || !$user->id) {
            Log::warning('getPersonalizedMainMenu llamado sin usuario válido');
            
            // Retornar menú de invitado
            return [
                'text' => "👋 ¡Hola! Soy tu asistente de ViveSpaces.\n\n🔐 Inicia sesión para acceder a todas las funciones.",
                'type' => 'menu',
                'menu_id' => 'guest',
                'options' => [
                    ['id' => 'help', 'text' => '❓ Ayuda', 'icon' => '❓'],
                    ['id' => 'login_prompt', 'text' => '🔓 Iniciar Sesión', 'icon' => '🔓', 'action' => 'url', 'url' => '/login'],
                ]
            ];
        }

        $greeting = "👋 ¡Hola";
        
        // Verificación estricta del nombre
        if ($user->name) {
            $greeting .= " " . trim($user->name);
        }
        
        $greeting .= "! Soy tu asistente de ViveSpaces.\n\n¿En qué puedo ayudarte?";

        $mainMenu = $this->menuStructure['main'];
        $mainMenu['text'] = $greeting;

        // Solo personalizar si hay usuario autenticado
        try {
            // Mensajes sin leer
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

            // Propiedades del usuario
            $userProperties = Property::where('user_id', $user->id)
                ->where('is_active', true)
                ->count();

            if ($userProperties > 0) {
                foreach ($mainMenu['options'] as &$option) {
                    if ($option['id'] === 'my_account') {
                        $option['text'] = "👤 Mi Cuenta ({$userProperties})";
                    }
                }
            }

            // 🔒 Indicar si el usuario NO está verificado en opción "Publicar" (solo si la verificación está habilitada)
            if (SystemConfig::isVerificationRequiredForPublish() && !$user->is_identity_verified) {
                foreach ($mainMenu['options'] as &$option) {
                    if ($option['id'] === 'publish_property') {
                        $option['text'] = "📝 Publicar Propiedad 🔒";
                        $option['notice'] = 'Requiere verificación';
                    }
                }
            }

        } catch (\Exception $e) {
            Log::warning('Error personalizando menú: ' . $e->getMessage());
        }

        return [
            'text' => $mainMenu['text'],
            'type' => 'menu',
            'menu_id' => 'main',
            'options' => $mainMenu['options']
        ];
    }
}