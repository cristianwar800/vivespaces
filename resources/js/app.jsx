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
import PhotoVerification from './components/PhotoVerification';
import Comunidad from './components/Comunidad';
import AdminPanel from './components/AdminPanel';
import TestAI from './components/TestAI';
import ChatBot from './components/ChatBot';
import Contacto from './components/Contacto';
import Search from './components/Search';
import LayoutMap from './components/LayoutMap';
import FastApiRecomendador from './components/FastApiRecomendador';
// ❌ ELIMINAR ESTA LÍNEA - Ya no se necesita importar aquí
import NotificationPanel from './components/NotificationPanel';

// Función para obtener datos del usuario desde Laravel
function getUserData() {
    const userDataElement = document.getElementById('user-data');
    if (userDataElement) {
        try {
            const content = userDataElement.textContent || userDataElement.innerText;
            return content ? JSON.parse(content) : null;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return null;
}

// Renderizar según el contenedor disponible
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, iniciando renderizado de componentes');

    // Navbar siempre presente (layout) - Ahora incluye NotificationPanel dentro
    const navbarContainer = document.getElementById('navbar-root');
    if (navbarContainer) {
        const userData = getUserData();
        const root = createRoot(navbarContainer);
        root.render(<Navbar user={userData} />);
        console.log('✅ Navbar renderizado (incluye NotificationPanel)');
    }

    // ❌ ELIMINAR ESTE BLOQUE COMPLETO - NotificationPanel ahora está dentro del Navbar
    // const notificationPanelRoot = document.getElementById('notification-panel-root');
    // if (notificationPanelRoot) {
    //     const root = createRoot(notificationPanelRoot);
    //     root.render(<NotificationPanel />);
    //     console.log('✅ NotificationPanel renderizado');
    // }

    // ChatBot siempre presente (layout)
    const chatbotContainer = document.getElementById('chatbox-root');
    if (chatbotContainer) {
        const userData = getUserData();
        const root = createRoot(chatbotContainer);
        root.render(<ChatBot user={userData} />);
        console.log('✅ ChatBot renderizado');
    }

    // LayoutMap siempre presente (layout)
    const layoutMapContainer = document.getElementById('layout-map-root');
    if (layoutMapContainer) {
        const userData = getUserData();
        const root = createRoot(layoutMapContainer);
        root.render(<LayoutMap user={userData} />);
        console.log('✅ LayoutMap renderizado');
    }

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

    // Photo Verification
    const photoVerificationContainer = document.getElementById('photo-verification-root');
    if (photoVerificationContainer) {
        const userData = getUserData();
        const root = createRoot(photoVerificationContainer);
        root.render(<PhotoVerification user={userData} />);
        console.log('✅ PhotoVerification renderizado');
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

        const notificationsPageContainer = document.getElementById('notifications-page-root');
    if (notificationsPageContainer) {
        const userData = getUserData();
        const root = createRoot(notificationsPageContainer);
        root.render(<NotificationPanel asPage={true} />);
        console.log('✅ NotificationPanel (página) renderizado');
        return;
    }

    console.log('🔄 Renderizado de componentes completado');
});
