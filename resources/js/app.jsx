// resources/js/app.jsx
import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';

// Importar componentes
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';
import Navbar from './components/Navbar';
import Profile from './components/Profile';
import Properties from './components/Properties';
import Email from './components/Email';
import Chat from './components/Chat';
import TestOCR from './components/TestOCR';
import Comunidad from './components/Comunidad';
import AdminPanel from './components/AdminPanel';
import TestAI from './components/TestAI';
import ChatBot from './components/ChatBot';
import Contacto from './components/Contacto';
import Search from './components/Search';
import LayoutMap from './components/LayoutMap';
import FastApiRecomendador from './components/FastApiRecomendador';
import NotificationPanel from './components/NotificationPanel';
import VerificationFlow from './components/verification/VerificationFlow';
import FavoritesPage from './components/Favorites';

// ==================== 🎯 CONTROL DE WIDGETS ====================
/**
 * Determina si los widgets globales (ChatBot y LayoutMap) deben mostrarse
 * según la ruta actual
 */
function shouldShowGlobalWidgets() {
    const currentPath = window.location.pathname;
    
    // Lista de rutas/patrones donde NO queremos mostrar los widgets
    const hiddenRoutes = [
        '/properties/',          // Detalles de propiedades (ej: /properties/1)
        '/admin',                // Panel de administración
        '/messages',             // Mensajes de usuario
        '/chat',                 // Chat
        '/profile',              // Perfil de usuario
        '/verification',         // Todo el flujo de verificación
        '/verify',               // Rutas de verificación
        '/photo-verification',   // Verificación de foto
        '/test-ocr',            // Test OCR
        '/my-properties',        // Mis propiedades
        '/user/properties',      // Propiedades del usuario
    ];
    
    // Verificar si la ruta actual coincide con alguna ruta oculta
    const shouldHide = hiddenRoutes.some(route => currentPath.includes(route));
    
    // También ocultar si estamos en un contenedor específico de verificación
    const verificationContainer = document.getElementById('verification-router-root');
    const testOCRContainer = document.getElementById('test-ocr-root');
    const chatContainer = document.getElementById('chat-root');
    const adminPanelContainer = document.getElementById('admin-panel-root');
    const profileContainer = document.getElementById('profile-root');
    
    if (verificationContainer || testOCRContainer || 
        chatContainer || adminPanelContainer || profileContainer) {
        return false;
    }
    
    return !shouldHide;
}

// Función para obtener datos del usuario desde Laravel
function getUserData() {
    const userDataElement = document.getElementById('user-data');
    if (userDataElement) {
        try {
            const content = userDataElement.textContent || userDataElement.innerText;
            const parsed = content ? JSON.parse(content) : null;
            console.log('🔍 getUserData() llamado, resultado:', parsed);
            return parsed;
        } catch (e) {
            console.error('❌ Error parsing user data:', e);
            return null;
        }
    }
    console.log('⚠️ No se encontró #user-data element');
    return null;
}

// 🔥 NUEVO: Variables globales para mantener referencias a los roots de React
let chatbotRoot = null;
let layoutMapRoot = null;
let navbarRoot = null;

// 🔥 NUEVO: Función para actualizar el ChatBot cuando cambia la sesión
function updateChatBot() {
    const chatbotContainer = document.getElementById('chatbot-root');
    const showWidgets = shouldShowGlobalWidgets();
    
    if (chatbotContainer && showWidgets) {
        const userData = getUserData();
        console.log('🔄 Actualizando ChatBot con usuario:', userData);
        
        // Si ya existe un root, solo hacer re-render
        if (chatbotRoot) {
            chatbotRoot.render(<ChatBot user={userData} key={userData?.id || 'guest'} />);
        } else {
            // Crear root si no existe
            chatbotRoot = createRoot(chatbotContainer);
            chatbotRoot.render(<ChatBot user={userData} key={userData?.id || 'guest'} />);
        }
        console.log('✅ ChatBot actualizado');
    }
}

// 🔥 NUEVO: Función para actualizar el LayoutMap cuando cambia la sesión
function updateLayoutMap() {
    const layoutMapContainer = document.getElementById('layout-map-root');
    const showWidgets = shouldShowGlobalWidgets();
    
    if (layoutMapContainer && showWidgets) {
        const userData = getUserData();
        console.log('🔄 Actualizando LayoutMap con usuario:', userData);
        
        // Si ya existe un root, solo hacer re-render
        if (layoutMapRoot) {
            layoutMapRoot.render(<LayoutMap user={userData} key={userData?.id || 'guest'} />);
        } else {
            // Crear root si no existe
            layoutMapRoot = createRoot(layoutMapContainer);
            layoutMapRoot.render(<LayoutMap user={userData} key={userData?.id || 'guest'} />);
        }
        console.log('✅ LayoutMap actualizado');
    }
}

// 🔥 NUEVO: Función para actualizar el Navbar cuando cambia la sesión
function updateNavbar() {
    const navbarContainer = document.getElementById('navbar-root');
    
    if (navbarContainer) {
        const userData = getUserData();
        console.log('🔄 Actualizando Navbar con usuario:', userData);
        
        // Si ya existe un root, solo hacer re-render
        if (navbarRoot) {
            navbarRoot.render(<Navbar user={userData} key={userData?.id || 'guest'} />);
        } else {
            // Crear root si no existe
            navbarRoot = createRoot(navbarContainer);
            navbarRoot.render(<Navbar user={userData} key={userData?.id || 'guest'} />);
        }
        console.log('✅ Navbar actualizado');
    }
}

// 🔥 NUEVO: Escuchar cambios en el DOM (cuando Laravel actualiza #user-data)
function observeUserDataChanges() {
    const userDataElement = document.getElementById('user-data');
    
    if (userDataElement) {
        // Usar MutationObserver para detectar cambios en el contenido
        const observer = new MutationObserver((mutations) => {
            console.log('🔔 Cambio detectado en #user-data');
            updateChatBot();
            updateLayoutMap();
            updateNavbar();
        });
        
        observer.observe(userDataElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
        
        console.log('👀 Observer activo en #user-data');
    }
}

// 🔥 NUEVO: Escuchar eventos personalizados de logout/login
window.addEventListener('user-session-changed', function(e) {
    console.log('🔔 Evento user-session-changed recibido:', e.detail);
    updateChatBot();
    updateLayoutMap();
    updateNavbar();
});

// Renderizar según el contenedor disponible
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, iniciando renderizado de componentes');

    // Verificar si debemos mostrar widgets globales
    const showWidgets = shouldShowGlobalWidgets();
    console.log(`🎯 Widgets globales: ${showWidgets ? 'VISIBLES' : 'OCULTOS'} en ${window.location.pathname}`);

    // Navbar siempre presente (layout) - Ahora incluye NotificationPanel dentro
    const navbarContainer = document.getElementById('navbar-root');
    if (navbarContainer) {
        const userData = getUserData();
        navbarRoot = createRoot(navbarContainer);
        navbarRoot.render(<Navbar user={userData} key={userData?.id || 'guest'} />);
        console.log('✅ Navbar renderizado (incluye NotificationPanel)');
    }

    // ChatBot condicional según la ruta
    const chatbotContainer = document.getElementById('chatbot-root');
    if (chatbotContainer && showWidgets) {
        const userData = getUserData();
        chatbotRoot = createRoot(chatbotContainer);
        chatbotRoot.render(<ChatBot user={userData} key={userData?.id || 'guest'} />);
        console.log('✅ ChatBot renderizado');
    } else if (chatbotContainer && !showWidgets) {
        console.log('⛔ ChatBot NO renderizado (ruta oculta)');
    }

    // LayoutMap condicional según la ruta
    const layoutMapContainer = document.getElementById('layout-map-root');
    if (layoutMapContainer && showWidgets) {
        const userData = getUserData();
        layoutMapRoot = createRoot(layoutMapContainer);
        layoutMapRoot.render(<LayoutMap user={userData} key={userData?.id || 'guest'} />);
        console.log('✅ LayoutMap renderizado');
    } else if (layoutMapContainer && !showWidgets) {
        console.log('⛔ LayoutMap NO renderizado (ruta oculta)');
    }

    // 🔥 Activar observer para detectar cambios en user-data
    observeUserDataChanges();

    // Welcome content
    const welcomeContainer = document.getElementById('welcome-content');
    if (welcomeContainer) {
        const userData = getUserData();
        const root = createRoot(welcomeContainer);
        root.render(<Welcome user={userData} />);
        console.log('✅ Welcome renderizado');
        return;
    }

    // Login page
    const loginContainer = document.getElementById('login-root');
    if (loginContainer) {
        const root = createRoot(loginContainer);
        root.render(<Login />);
        console.log('✅ Login renderizado');
        return;
    }

    // Register page
    const registerContainer = document.getElementById('register-root');
    if (registerContainer) {
        const root = createRoot(registerContainer);
        root.render(<Register />);
        console.log('✅ Register renderizado');
        return;
    }

    // Profile page
    const profileContainer = document.getElementById('profile-root');
    if (profileContainer) {
        const userData = getUserData();
        const root = createRoot(profileContainer);
        root.render(<Profile user={userData} />);
        console.log('✅ Profile renderizado');
        return;
    }

    // Properties page
    const propertiesContainer = document.getElementById('properties-root');
    if (propertiesContainer) {
        const root = createRoot(propertiesContainer);
        root.render(<Properties />);
        console.log('✅ Properties renderizado');
        return;
    }

    // Email verification page
    const emailContainer = document.getElementById('email-root');
    if (emailContainer) {
        const root = createRoot(emailContainer);
        root.render(<Email />);
        console.log('✅ Email renderizado');
        return;
    }

    // Chat page
    const chatContainer = document.getElementById('chat-root');
    if (chatContainer) {
        const userData = getUserData();
        const root = createRoot(chatContainer);
        root.render(<Chat user={userData} />);
        console.log('✅ Chat renderizado');
        return;
    }

    // Test OCR
    const testOCRContainer = document.getElementById('test-ocr-root');
    if (testOCRContainer) {
        const userData = getUserData();
        const root = createRoot(testOCRContainer);
        root.render(<TestOCR user={userData} />);
        console.log('✅ TestOCR renderizado');
        return;
    }

    // Verification Flow
    const verificationRouterContainer = document.getElementById('verification-router-root');
    if (verificationRouterContainer) {
        const userData = getUserData();
        const root = createRoot(verificationRouterContainer);
        root.render(<VerificationFlow user={userData} />);
        console.log('✅ VerificationFlow renderizado');
        return;
    }

    // Comunidad
    const comunidadContainer = document.getElementById('comunidad-root');
    if (comunidadContainer) {
        const userData = getUserData();
        const root = createRoot(comunidadContainer);
        root.render(<Comunidad user={userData} />);
        console.log('✅ Comunidad renderizado');
        return;
    }

    // Admin Panel
    const adminPanelContainer = document.getElementById('admin-panel-root');
    if (adminPanelContainer) {
        const userData = getUserData();
        const root = createRoot(adminPanelContainer);
        root.render(<AdminPanel user={userData} />);
        console.log('✅ AdminPanel renderizado');
        return;
    }

    // Test AI
    const testAiContainer = document.getElementById('test-ai-root');
    if (testAiContainer) {
        const userData = getUserData();
        const root = createRoot(testAiContainer);
        root.render(<TestAI user={userData} />);
        console.log('✅ TestAI renderizado');
        return;
    }

    // Contacto
    const contactoContainer = document.getElementById('contacto-root');
    if (contactoContainer) {
        const userData = getUserData();
        const root = createRoot(contactoContainer);
        root.render(<Contacto user={userData} />);
        console.log('✅ Contacto renderizado');
        return;
    }

    // Search page
    const searchContainer = document.getElementById('search-root');
    if (searchContainer) {
        const userData = getUserData();
        const root = createRoot(searchContainer);
        root.render(<Search user={userData} />);
        console.log('✅ Search renderizado');
        return;
    }

    // FastAPI Recomendador
    const recomendadorRoot = document.getElementById('fastapi-recomendador-root');
    if (recomendadorRoot) {
        const root = createRoot(recomendadorRoot);
        root.render(<FastApiRecomendador />);
        console.log('✅ FastApiRecomendador renderizado');
        return;
    }

    // Notification Panel Page
    const notificationsPageContainer = document.getElementById('notifications-page-root');
    if (notificationsPageContainer) {
        const userData = getUserData();
        const root = createRoot(notificationsPageContainer);
        root.render(<NotificationPanel asPage={true} />);
        console.log('✅ NotificationPanel (página) renderizado');
        return;
    }

    // Favorites Page
    const favoritesContainer = document.getElementById('favorites-root');
    if (favoritesContainer) {
        const userData = getUserData();
        const root = createRoot(favoritesContainer);
        root.render(<FavoritesPage user={userData} />);
        console.log('✅ FavoritesPage renderizado');
        return;
    }

    console.log('🔄 Renderizado de componentes completado');
});