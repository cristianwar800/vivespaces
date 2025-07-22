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
import Email from './components/Email'; // ← NUEVO componente agregado
import Chat from './components/Chat'; // ← Agregar esta línea
import TestOCR from './components/TestOCR';
import PhotoVerification from './components/PhotoVerification';



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

    // Navbar siempre presente (layout)
    const navbarContainer = document.getElementById('navbar-root');
    if (navbarContainer) {
        const userData = getUserData();
        const root = createRoot(navbarContainer);
        root.render(<Navbar user={userData} />);
    }

    // Welcome content (sin navbar - ya está en layout)
    const welcomeContainer = document.getElementById('welcome-content');
    if (welcomeContainer) {
        const userData = getUserData();
        const root = createRoot(welcomeContainer);
        root.render(<Welcome user={userData} />);
        return;
    }

    // Login page (sin navbar - ya está en layout)
    const loginContainer = document.getElementById('login-root');
    if (loginContainer) {
        const root = createRoot(loginContainer);
        root.render(<Login />);
        return;
    }

    // Register page (sin navbar - ya está en layout)
    const registerContainer = document.getElementById('register-root');
    if (registerContainer) {
        const root = createRoot(registerContainer);
        root.render(<Register />);
        return;
    }

    // Profile page (sin navbar - ya está en layout)
    const profileContainer = document.getElementById('profile-root');
    if (profileContainer) {
        const userData = getUserData();
        const root = createRoot(profileContainer);
        root.render(<Profile user={userData} />);
        return;
    }

    // Properties page (sin navbar - ya está en layout)
    const propertiesContainer = document.getElementById('properties-root');
    if (propertiesContainer) {
        const root = createRoot(propertiesContainer);
        root.render(<Properties />);
        return;
    }

    // Email verification page (sin navbar - ya está en layout) ← NUEVO
    const emailContainer = document.getElementById('email-root');
    if (emailContainer) {
        const root = createRoot(emailContainer);
        root.render(<Email />);
        return;
    }

    // Chat page (sin navbar - ya está en layout) ← NUEVO
    const chatContainer = document.getElementById('chat-root');
    if (chatContainer) {
        const userData = getUserData();
        const root = createRoot(chatContainer);
        root.render(<Chat user={userData} />);
        return;
    }
    //
    const testOCRContainer = document.getElementById('test-ocr-root');
    if (testOCRContainer) {
        const userData = getUserData();
        const root = createRoot(testOCRContainer);
        root.render(<TestOCR user={userData} />);
        return;
    }

    const photoVerificationContainer = document.getElementById('photo-verification-root');
    if (photoVerificationContainer) {
        const userData = getUserData();
        const root = createRoot(photoVerificationContainer);
        root.render(<PhotoVerification user={userData} />);
        return;
    }

});
