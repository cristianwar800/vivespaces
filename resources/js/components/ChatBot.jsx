import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizado para hacer el botón arrastrable
 */
const useDraggable = (initialPosition) => {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStarted, setDragStarted] = useState(false);
    const elementRef = useRef(null);

    const magnetToEdge = useCallback((pos) => {
        const margin = 20;
        const buttonSize = 60;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let newX = pos.x < windowWidth / 2 ? margin : windowWidth - buttonSize - margin;
        let newY = Math.max(100, Math.min(pos.y, windowHeight - buttonSize - margin));
        
        return { x: newX, y: newY };
    }, []);

    const handleStart = useCallback((clientX, clientY) => {
        setIsDragging(true);
        setDragStarted(false);
    }, []);

    const handleMove = useCallback((clientX, clientY) => {
        if (!isDragging) return;
        setDragStarted(true);
        const buttonSize = 60;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let newX = clientX - buttonSize / 2;
        let newY = clientY - buttonSize / 2;

        // Restringir dentro de los límites de la ventana
        newX = Math.max(0, Math.min(newX, windowWidth - buttonSize));
        newY = Math.max(80, Math.min(newY, windowHeight - buttonSize));

        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleEnd = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            if (dragStarted) {
                setTimeout(() => setPosition(magnetToEdge(position)), 150);
            }
        }
    }, [isDragging, dragStarted, position, magnetToEdge]);

    useEffect(() => {
        if (isDragging) {
            const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
            const handleTouchMove = (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleEnd);

            // Prevenir selección de texto mientras se arrastra
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleEnd);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleEnd);
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleMove, handleEnd]);

    const dragHandlers = {
        onMouseDown: (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStart(e.clientX, e.clientY);
        },
        onTouchStart: (e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        }
    };

    return { position, isDragging, dragStarted, dragHandlers, elementRef };
};

/**
 * Componente principal del ChatBot - ASISTENCIAL
 */
function ChatBot({ user = null }) {
    // ============================================
    // ESTADOS
    // ============================================
    
    // Estados básicos
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [currentMenuId, setCurrentMenuId] = useState('main');
    const [breadcrumbs, setBreadcrumbs] = useState(['main']);
    const [isMinimized, setIsMinimized] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showQuickActions, setShowQuickActions] = useState(false);
    
    // Estados de configuración
    const [theme, setTheme] = useState('emerald');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    
    // Estados de características
    const [favorites, setFavorites] = useState([]);
    const [showFavorites, setShowFavorites] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    
    // Estados de conexión
    const [isConnected, setIsConnected] = useState(true);
    const [error, setError] = useState(null);

    // Estado para responsive (768px es el breakpoint estándar md: de Tailwind)
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Estado para detectar si el menú móvil del navbar está abierto
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Referencias
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Temas disponibles
    const themes = {
        emerald: 'from-emerald-500 via-teal-500 to-cyan-500',
        blue: 'from-blue-500 via-indigo-500 to-purple-500',
        purple: 'from-purple-500 via-pink-500 to-rose-500',
        orange: 'from-orange-500 via-amber-500 to-yellow-500',
        dark: 'from-gray-700 via-gray-800 to-gray-900'
    };

    const getInitialPosition = () => {
        const isMobileDevice = window.innerWidth <= 768;

        if (isMobileDevice) {
            // En móvil: posición fija en la esquina inferior derecha visible
            return {
                x: window.innerWidth - 80,  // 80px desde el borde derecho
                y: window.innerHeight - 100  // 100px desde el borde inferior (más margen)
            };
        } else {
            // En desktop: posición normal
            return {
                x: window.innerWidth - 80,
                y: window.innerHeight - 80
            };
        }
    };

    const { position, isDragging, dragStarted, dragHandlers, elementRef } = useDraggable(getInitialPosition());

    // ============================================
    // FUNCIONES DE UTILIDAD
    // ============================================

    /**
     * Sanitizar texto (prevención básica)
     */
    const sanitizeText = useCallback((text) => {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/`/g, '&#96;')
            .replace(/\\/g, '&#92;')
            .trim();
    }, []);

    /**
     * Validar URL
     */
    const isValidUrl = useCallback((url) => {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:', 'mailto:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }, []);

    /**
     * Fetch con timeout
     */
    const fetchWithTimeout = useCallback(async (url, options = {}, timeout = 10000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }, []);

    /**
     * Reproducir sonido usando Web Audio API
     */
    const playSound = useCallback((type = 'message') => {
        if (!soundEnabled) return;
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Frecuencias diferentes para cada tipo
            oscillator.frequency.value = type === 'message' ? 800 : 600;
            oscillator.type = 'sine';
            
            // Fade out para que suene más suave
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }, [soundEnabled]);

    /**
     * Headers de peticiones
     */
    const getHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
    }), []);

    /**
     * Contexto actual
     */
    const getCurrentContext = useCallback(() => ({
        current_path: window.location?.pathname || '/',
        timestamp: new Date().toISOString(),
        user_id: user?.id || null
    }), [user]);

    // ============================================
    // FUNCIONES DE FAVORITOS
    // ============================================

    /**
     * Toggle favorito
     */
    const toggleFavorite = useCallback((option) => {
        if (!option || typeof option !== 'object' || !option.id) {
            console.warn('Invalid favorite option');
            return;
        }

        setFavorites(prev => {
            const exists = prev.find(f => f.id === option.id);
            if (exists) {
                return prev.filter(f => f.id !== option.id);
            } else {
                if (!option.text) {
                    console.warn('Favorite missing text');
                    return prev;
                }
                return [...prev, option];
            }
        });
    }, []);

    /**
     * Verificar si es favorito
     */
    const isFavorite = useCallback((optionId) => {
        return favorites.some(f => f.id === optionId);
    }, [favorites]);

    // ============================================
    // FUNCIONES API
    // ============================================

    /**
     * Obtener mensaje de bienvenida
     */
    const getWelcomeMessage = useCallback(async () => {
        try {
            console.log('🔍 ChatBot - Solicitando mensaje de bienvenida');
            console.log('🔍 Usuario prop recibido:', user);
            
            const response = await fetchWithTimeout('/api/chatbot/welcome', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ 
                    context: getCurrentContext(),
                    user_id: user?.id || null
                }),
                credentials: 'include'
            }, 10000);

            if (!response.ok) {
                throw new Error('Error');
            }

            const data = await response.json();
            
            console.log('🔍 Respuesta del backend:', data);
            console.log('🔍 Usuario desde backend:', data.user);
            console.log('🔍 ¿Es invitado?:', data.is_guest);
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format');
            }

            setIsConnected(true);
            setError(null);
            
            if (data.is_guest) {
                console.log('⚠️ Usuario es INVITADO - Acceso limitado');
            } else if (data.user && data.user.name) {
                console.log('✅ Usuario AUTENTICADO:', data.user.name);
            }
            
            return data.success ? data.message : null;
        } catch (error) {
            console.error('❌ Error en getWelcomeMessage:', error);
            setIsConnected(false);

            return {
                text: `👋 ¡Hola! Soy tu asistente de ViveSpaces.\n\n❓ Como invitado, solo puedes acceder a la sección de Ayuda.`,
                type: 'menu',
                menu_id: 'guest',
                options: [
                    { id: 'help', text: '❓ Ayuda', icon: '❓' },
                    { id: 'login_prompt', text: '🔓 Iniciar Sesión', icon: '🔓', action: 'url', url: '/login' },
                ]
            };
        }
    }, [getHeaders, getCurrentContext, user, fetchWithTimeout]);

    /**
     * Enviar opción seleccionada
     */
    const sendOption = useCallback(async (optionId) => {
        if (!optionId || typeof optionId !== 'string') {
            setError('⚠️ Opción inválida');
            return null;
        }

        if (optionId.length > 200) {
            setError('⚠️ Opción demasiado larga');
            return null;
        }

        try {
            console.log('🔍 ChatBot - Enviando opción:', optionId);
            console.log('🔍 Usuario actual:', user);
            
            const response = await fetchWithTimeout('/api/chatbot/message', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    option_id: sanitizeText(optionId),
                    menu_id: sanitizeText(currentMenuId),
                    context: getCurrentContext(),
                    user_id: user?.id || null
                }),
                credentials: 'include'
            }, 10000);

            if (!response.ok) {
                throw new Error('Error');
            }

            const data = await response.json();
            
            console.log('🔍 Respuesta del backend:', data);
            console.log('🔍 Usuario desde backend:', data.user);
            console.log('🔍 ¿Es invitado?:', data.is_guest);
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format');
            }

            setIsConnected(true);
            setError(null);
            
            if (data.is_guest) {
                console.log('⚠️ Usuario es INVITADO - Mostrar restricción');
            } else if (data.user && data.user.name) {
                console.log('✅ Usuario AUTENTICADO:', data.user.name);
            }
            
            return data.success ? data.response : null;
        } catch (error) {
            console.error('❌ Error en sendOption:', error);
            setIsConnected(false);

            let errorMessage = "⚠️ Error de conexión. Por favor, intenta de nuevo.";
            
            if (error.message === 'Request timeout') {
                errorMessage = "⏱️ La solicitud tardó demasiado. Por favor intenta de nuevo.";
            }

            setError(errorMessage);

            return {
                text: errorMessage,
                type: 'error',
                options: [
                    { id: currentMenuId, text: '🔄 Reintentar', icon: '🔄' },
                    { id: 'main', text: '🏠 Menú Principal', icon: '🏠' }
                ]
            };
        }
    }, [currentMenuId, getHeaders, getCurrentContext, user, fetchWithTimeout, sanitizeText]);

    /**
     * Manejar clic en opción
     */
    const handleOptionClick = useCallback(async (option) => {
        if (!option || typeof option !== 'object' || !option.id || !option.text) {
            setError('⚠️ Opción inválida: datos incompletos');
            return;
        }

        if (typeof option.id !== 'string' || typeof option.text !== 'string') {
            setError('⚠️ Opción inválida: formato incorrecto');
            return;
        }

        // 🔒 VALIDACIÓN: Verificar identidad para "publicar propiedad"
        if (option.id === 'publish_property') {
            if (!user) {
                setError('⚠️ Debes iniciar sesión para publicar propiedades');
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }

            if (!user.is_identity_verified) {
                // Mostrar mensaje especial en el chat
                const verificationMessage = {
                    id: `bot_${Date.now()}`,
                    text: '⚠️ **Verificación Requerida**\n\nPara publicar propiedades necesitas verificar tu identidad primero.\n\n✅ Es rápido y seguro (menos de 5 minutos)\n📱 Solo necesitas: INE + Comprobante de domicilio\n\n¿Quieres verificar tu identidad ahora?',
                    sender: 'bot',
                    timestamp: new Date(),
                    options: [
                        { id: 'verification', text: '✅ Verificar Ahora', icon: '✅' },
                        { id: 'main', text: '⬅️ Volver al menú', icon: '⬅️' }
                    ]
                };
                setMessages(prev => [...prev, verificationMessage]);
                playSound('notification');
                return;
            }
        }

        // 🔥 Manejar acciones de URL (solo para enlaces esenciales)
        if (option.action === 'url' && option.url) {
            if (!isValidUrl(option.url)) {
                setError('⚠️ URL inválida');
                return;
            }

            if (option.url.startsWith('mailto:') || option.url.startsWith('http')) {
                window.open(option.url, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = option.url;
            }
            return;
        }

        setError(null);

        const sanitizedText = sanitizeText(option.text);
        const sanitizedId = sanitizeText(option.id);
        
        const userMessage = {
            id: `user_${Date.now()}`,
            text: sanitizedText,
            sender: 'user',
            timestamp: new Date(),
            icon: option.icon,
            optionId: sanitizedId
        };

        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        playSound('message');

        await new Promise(resolve => setTimeout(resolve, 600));

        const response = await sendOption(option.id);

        if (response) {
            const botMessage = {
                id: `bot_${Date.now()}`,
                text: sanitizeText(response.text || ''),
                sender: 'bot',
                timestamp: new Date(),
                type: response.type,
                menu_id: response.menu_id,
                options: response.options || [],
                back: response.back,
                data: response.data
            };

            setMessages(prev => [...prev, botMessage]);
            playSound('notification');

            if (response.menu_id && response.menu_id !== currentMenuId) {
                setCurrentMenuId(response.menu_id);
                setBreadcrumbs(prev => [...prev, response.menu_id]);
            }

            if (isMinimized) {
                setNotificationCount(prev => prev + 1);
            }
        }

        setIsTyping(false);
    }, [currentMenuId, sendOption, playSound, isMinimized, isValidUrl, sanitizeText]);

    /**
     * Volver al menú anterior
     */
    const handleBack = useCallback(() => {
        if (breadcrumbs.length > 1) {
            const newBreadcrumbs = breadcrumbs.slice(0, -1);
            const previousMenuId = newBreadcrumbs[newBreadcrumbs.length - 1];
            setBreadcrumbs(newBreadcrumbs);
            handleOptionClick({ id: previousMenuId, text: '⬅️ Volver', icon: '⬅️' });
        }
    }, [breadcrumbs, handleOptionClick]);

    /**
     * Búsqueda en mensajes
     */
    const filteredMessages = messages.filter(msg => {
        if (!searchQuery || msg.sender === 'user') return true;
        return msg.text.toLowerCase().includes(searchQuery.toLowerCase());
    });

    /**
     * Limpiar chat
     */
    const clearChat = useCallback(() => {
        setMessages([]);
        setCurrentMenuId('main');
        setBreadcrumbs(['main']);
        setSearchQuery('');
        setError(null);
        
        try {
            localStorage.removeItem('chatbot_messages');
            localStorage.removeItem('chatbot_user_id');
        } catch (e) {
            console.warn('Error limpiando localStorage:', e);
        }
        
        getWelcomeMessage().then(welcome => {
            if (welcome) {
                setMessages([{
                    id: 'welcome',
                    text: welcome.text,
                    sender: 'bot',
                    timestamp: new Date(),
                    type: welcome.type,
                    menu_id: welcome.menu_id,
                    options: welcome.options || []
                }]);
            }
        });
    }, [getWelcomeMessage]);

    // ============================================
    // EFFECTS
    // ============================================

    /**
     * Cargar datos guardados
     */
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('chatbot_favorites');
            if (savedFavorites) {
                const parsed = JSON.parse(savedFavorites);
                if (Array.isArray(parsed)) {
                    setFavorites(parsed);
                }
            }
        } catch (e) {
            console.warn('Error loading favorites:', e);
        }

        try {
            const savedTheme = localStorage.getItem('chatbot_theme');
            if (savedTheme && themes[savedTheme]) {
                setTheme(savedTheme);
            }
        } catch (e) {
            console.warn('Error loading theme:', e);
        }

        try {
            const savedMessages = localStorage.getItem('chatbot_messages');
            const savedUserId = localStorage.getItem('chatbot_user_id');
            const currentUserId = user?.id ? String(user.id) : 'guest';
            
            if (savedMessages && savedUserId === currentUserId) {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed)) {
                    setMessages(parsed.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    })));
                }
            } else {
                localStorage.removeItem('chatbot_messages');
                localStorage.removeItem('chatbot_user_id');
            }
        } catch (e) {
            console.warn('Error loading messages:', e);
        }
    }, [user]);

    /**
     * Guardar favoritos
     */
    useEffect(() => {
        try {
            localStorage.setItem('chatbot_favorites', JSON.stringify(favorites));
        } catch (error) {
            console.warn('Could not save favorites to localStorage:', error);
        }
    }, [favorites]);

    /**
     * Guardar mensajes en localStorage
     */
    useEffect(() => {
        if (messages.length > 0) {
            try {
                localStorage.setItem('chatbot_messages', JSON.stringify(messages));
                localStorage.setItem('chatbot_user_id', user?.id ? String(user.id) : 'guest');
            } catch (error) {
                console.warn('Could not save messages to localStorage:', error);
            }
        }
    }, [messages, user]);

    /**
     * Monitorear cambios en el usuario y LIMPIAR CHAT
     */
    useEffect(() => {
        console.log('🔍 ChatBot - Usuario prop cambió:', user);
        
        if (!isOpen) {
            return;
        }
        
        if (messages.length === 0) {
            return;
        }
        
        const savedUserId = localStorage.getItem('chatbot_user_id');
        const currentUserId = user?.id ? String(user.id) : 'guest';
        
        if (savedUserId !== currentUserId) {
            console.log('🧹 Usuario cambió de', savedUserId, 'a', currentUserId, '- Limpiando chat');
            
            try {
                localStorage.removeItem('chatbot_messages');
                localStorage.removeItem('chatbot_user_id');
            } catch (e) {
                console.warn('Error limpiando localStorage:', e);
            }
            
            setMessages([]);
            setCurrentMenuId('main');
            setBreadcrumbs(['main']);
            setSearchQuery('');
            setError(null);
            
            getWelcomeMessage().then(welcome => {
                if (welcome) {
                    setMessages([{
                        id: 'welcome',
                        text: welcome.text,
                        sender: 'bot',
                        timestamp: new Date(),
                        type: welcome.type,
                        menu_id: welcome.menu_id,
                        options: welcome.options || []
                    }]);
                }
            });
        }
    }, [user?.id, isOpen, messages.length, getWelcomeMessage]);

    /**
     * Inicializar chat
     */
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            console.log('🚀 Inicializando chat...');
            console.log('🔍 Usuario al inicializar:', user);
            
            const init = async () => {
                const welcome = await getWelcomeMessage();
                if (welcome) {
                    console.log('✅ Mensaje de bienvenida recibido:', welcome.text.substring(0, 50) + '...');
                    
                    setMessages([{
                        id: 'welcome',
                        text: welcome.text,
                        sender: 'bot',
                        timestamp: new Date(),
                        type: welcome.type,
                        menu_id: welcome.menu_id,
                        options: welcome.options || []
                    }]);
                    setCurrentMenuId(welcome.menu_id || 'main');
                }
            };
            init();
        }
    }, [isOpen, messages.length, getWelcomeMessage, user]);

    /**
     * Scroll automático
     */
    useEffect(() => {
        if (autoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, autoScroll]);

    /**
     * Cerrar con ESC
     */
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (showSettings || showFavorites) {
                    setShowSettings(false);
                    setShowFavorites(false);
                } else if (isOpen) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, showSettings, showFavorites]);

    /**
     * Resetear notificaciones al abrir
     */
    useEffect(() => {
        if (isOpen) {
            setNotificationCount(0);
        }
    }, [isOpen]);

    /**
     * Detectar cambios en el tamaño de pantalla para responsive
     */
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /**
     * Escuchar cuando se abre/cierra el menú móvil del navbar
     */
    useEffect(() => {
        const handleMobileMenuToggle = (event) => {
            setIsMobileMenuOpen(event.detail.isOpen);
        };

        window.addEventListener('mobile-menu-toggle', handleMobileMenuToggle);
        return () => window.removeEventListener('mobile-menu-toggle', handleMobileMenuToggle);
    }, []);

    // ============================================
    // RENDER
    // ============================================

    const calculateModalPosition = () => {
        if (isMobile) return { x: 0, y: 0 };

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const buttonSize = 60;
        const margin = 20;
        const navbarHeight = 80;

        const modalWidth = Math.min(450, windowWidth - 40);
        const modalHeight = Math.min(650, windowHeight - navbarHeight - 40);

        let modalX, modalY;

        // Posicionar a la izquierda o derecha según posición del botón
        if (position.x < windowWidth / 2) {
            modalX = position.x + buttonSize + margin;
            if (modalX + modalWidth > windowWidth - margin) {
                modalX = Math.max(margin, windowWidth - modalWidth - margin);
            }
        } else {
            modalX = position.x - modalWidth - margin;
            if (modalX < margin) {
                modalX = margin;
            }
        }

        // Posicionar verticalmente
        modalY = position.y;
        if (modalY + modalHeight > windowHeight - margin) {
            modalY = windowHeight - modalHeight - margin;
        }
        if (modalY < navbarHeight + margin) {
            modalY = navbarHeight + margin;
        }

        return { x: modalX, y: modalY };
    };

    const modalPosition = calculateModalPosition();

    const quickActions = [
        { id: 'search_properties', text: 'Buscar', icon: '🔍', color: 'bg-blue-500' },
        { id: 'publish_property', text: 'Publicar', icon: '📝', color: 'bg-green-500' },
        { id: 'messages', text: 'Mensajes', icon: '💬', color: 'bg-purple-500' },
        { id: 'stats', text: 'Estadísticas', icon: '📊', color: 'bg-orange-500' }
    ];

    return (
        <div
            ref={elementRef}
            style={
                isMobile && isOpen
                    ? { position: 'fixed', inset: 0, zIndex: 9999 }
                    : {
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        zIndex: 9999,
                        // En móvil, asegurar que el botón esté visible
                        ...(isMobile && !isOpen ? {
                            right: '20px',
                            bottom: '20px',
                            left: 'auto',
                            top: 'auto'
                        } : {})
                    }
            }
        >

            {/* QUICK ACTIONS */}
            {showQuickActions && !isOpen && !isMobile && (
                <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 flex space-x-2 animate-fadeIn">
                    {quickActions.map((action, idx) => (
                        <button
                            key={action.id}
                            onClick={() => {
                                setIsOpen(true);
                                setTimeout(() => handleOptionClick(action), 300);
                                setShowQuickActions(false);
                            }}
                            className={`${action.color} text-white p-3 rounded-full shadow-lg hover:scale-110 transition-all duration-200`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            title={action.text}
                        >
                            <span className="text-xl">{action.icon}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* MODAL DEL CHAT */}
            {isOpen && (
                <div
                    ref={chatContainerRef}
                    className={`fixed bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
                        isMobile
                            ? 'inset-0 rounded-none w-full h-full max-h-screen'
                            : `rounded-3xl ${isMinimized ? 'w-80 h-16' : 'w-[90vw] max-w-md'}`
                    }`}
                    style={isMobile ? { maxHeight: '100vh' } : {
                        left: `${modalPosition.x}px`,
                        top: `${modalPosition.y}px`,
                        maxHeight: isMinimized ? '64px' : 'min(650px, 80vh)'
                    }}
                >
                    {/* HEADER */}
                    <div className={`flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r ${themes[theme]} text-white relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }}></div>
                        </div>

                        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center animate-pulse flex-shrink-0">
                                <span className="text-xl sm:text-2xl">🤖</span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-xs sm:text-sm truncate">Asistente ViveSpaces</h3>
                                <div className="flex items-center space-x-1">
                                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'} flex-shrink-0`}></div>
                                    <p className="text-xs text-white/80 truncate">{isConnected ? 'En línea' : 'Sin conexión'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-0.5 sm:space-x-1 relative z-10 flex-shrink-0">
                            <button
                                onClick={() => {
                                    setShowFavorites(!showFavorites);
                                    setShowSettings(false);
                                }}
                                className={`p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition relative ${showFavorites ? 'bg-white/20' : ''}`}
                                title="Favoritos"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                {favorites.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {favorites.length}
                                    </span>
                                )}
                            </button>

                            {breadcrumbs.length > 1 && !isMinimized && (
                                <button
                                    onClick={handleBack}
                                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition"
                                    title="Volver"
                                >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                            )}

                            {!isMobile && (
                                <button
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition relative"
                                    title={isMinimized ? "Maximizar" : "Minimizar"}
                                >
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                    </svg>
                                    {isMinimized && notificationCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                                            {notificationCount}
                                        </span>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setShowSettings(!showSettings);
                                    setShowFavorites(false);
                                }}
                                className={`p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition ${showSettings ? 'bg-white/20' : ''}`}
                                title="Configuración"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm('¿Reiniciar conversación?')) {
                                        clearChat();
                                    }
                                }}
                                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition hidden sm:block"
                                title="Reiniciar"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition"
                                title="Cerrar"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* PANEL DE CONFIGURACIÓN */}
                    {!isMinimized && showSettings && (
                        <div className="absolute inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">⚙️ Configuración</h3>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Temas */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            🎨 Tema de Color
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {Object.keys(themes).map(themeKey => (
                                                <button
                                                    key={themeKey}
                                                    onClick={() => {
                                                        setTheme(themeKey);
                                                        try {
                                                            localStorage.setItem('chatbot_theme', themeKey);
                                                        } catch (error) {
                                                            console.warn('Could not save theme:', error);
                                                        }
                                                    }}
                                                    className={`p-3 rounded-lg border-2 ${
                                                        theme === themeKey
                                                            ? 'border-blue-500 scale-105'
                                                            : 'border-gray-200 dark:border-gray-700'
                                                    } transition-all duration-200`}
                                                >
                                                    <div className={`h-8 rounded bg-gradient-to-r ${themes[themeKey]}`}></div>
                                                    <p className="text-xs mt-1 text-center capitalize text-gray-700 dark:text-gray-300">{themeKey}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sonidos */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl">🔊</span>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sonidos</span>
                                        </div>
                                        <button
                                            onClick={() => setSoundEnabled(!soundEnabled)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                soundEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Auto Scroll */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl">↓</span>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Scroll</span>
                                        </div>
                                        <button
                                            onClick={() => setAutoScroll(!autoScroll)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                autoScroll ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    autoScroll ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Estado del sistema */}
                                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Estado del Sistema</h4>
                                        
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">Conexión:</span>
                                            <span className={`flex items-center space-x-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">Mensajes:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{messages.length}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">Usuario:</span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {user ? `${user.name} ✓` : 'Invitado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PANEL DE FAVORITOS */}
                    {!isMinimized && showFavorites && (
                        <div className="absolute inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">⭐ Favoritos</h3>
                                    <button
                                        onClick={() => setShowFavorites(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {favorites.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                        <p className="text-sm">No tienes favoritos aún</p>
                                        <p className="text-xs mt-1">Agrega opciones frecuentes aquí</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {favorites.map((fav, idx) => (
                                            <div
                                                key={`fav-${idx}`}
                                                className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                            >
                                                <button
                                                    onClick={() => {
                                                        handleOptionClick(fav);
                                                        setShowFavorites(false);
                                                    }}
                                                    className="flex-1 flex items-center space-x-2 text-left"
                                                >
                                                    {fav.icon && <span className="text-lg">{fav.icon}</span>}
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{fav.text}</span>
                                                </button>
                                                <button
                                                    onClick={() => toggleFavorite(fav)}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                                                >
                                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BARRA DE BÚSQUEDA */}
                    {!isMinimized && !showSettings && !showFavorites && (
                        <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="🔍 Buscar..."
                                    className="w-full pl-3 sm:pl-4 pr-10 py-1.5 sm:py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            
                            {/* Mostrar errores */}
                            {error && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2">
                                    <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                                    <button
                                        onClick={() => setError(null)}
                                        className="ml-auto text-red-400 hover:text-red-600"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ÁREA DE MENSAJES */}
                    {!isMinimized && !showSettings && !showFavorites && (
                        <>
                            <div className={`overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-gray-50 dark:bg-gray-800/50 ${
                                isMobile ? 'h-[calc(100vh-180px)]' : 'max-h-[calc(80vh-240px)] min-h-[300px]'
                            }`}>
                                {filteredMessages.length === 0 && messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${themes[theme]} flex items-center justify-center mb-3 animate-pulse`}>
                                            <span className="text-4xl">💬</span>
                                        </div>
                                        <p className="text-sm">Cargando asistente...</p>
                                    </div>
                                ) : filteredMessages.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <p className="text-sm">No se encontraron resultados</p>
                                    </div>
                                ) : (
                                    filteredMessages.map((message) => (
                                        <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
                                            <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-2.5 sm:p-3 shadow-md hover:shadow-lg transition-all duration-200 ${
                                                message.sender === 'user'
                                                    ? `bg-gradient-to-r ${themes[theme]} text-white`
                                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                            }`}>
                                                {message.icon && message.sender === 'user' && (
                                                    <span className="text-xl sm:text-2xl mb-1 sm:mb-2 block">{message.icon}</span>
                                                )}

                                                <p className={`text-xs sm:text-sm whitespace-pre-line leading-relaxed ${message.sender === 'bot' ? 'text-gray-700 dark:text-gray-300' : ''}`}>
                                                    {message.text}
                                                </p>

                                                {/* Opciones */}
                                                {message.options && message.options.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        {message.options.map((option, idx) => (
                                                            <div key={`opt-${idx}`} className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => handleOptionClick(option)}
                                                                    className="flex-1 flex items-center space-x-2 p-2.5 sm:p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left border border-gray-200 dark:border-gray-600 group min-h-[44px]"
                                                                >
                                                                    {option.icon && <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform flex-shrink-0">{option.icon}</span>}
                                                                    <span className="flex-1 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight break-words">{option.text}</span>
                                                                    {option.badge && (
                                                                        <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">{option.badge}</span>
                                                                    )}
                                                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleFavorite(option);
                                                                        playSound('notification');
                                                                    }}
                                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                                                                    title={isFavorite(option.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                                                                >
                                                                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite(option.id) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} fill={isFavorite(option.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Datos adicionales */}
                                                {message.data && (
                                                    <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                        <div className="flex items-center space-x-4 text-xs">
                                                            {message.data.total !== undefined && (
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{message.data.total}</span>
                                                                    <span className="text-blue-500 dark:text-blue-300">propiedades</span>
                                                                </div>
                                                            )}
                                                            {message.data.recent !== undefined && (
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="text-green-600 dark:text-green-400 font-bold">{message.data.recent}</span>
                                                                    <span className="text-green-500 dark:text-green-300">nuevas</span>
                                                                </div>
                                                            )}
                                                            {message.data.avg_price && (
                                                                <div className="flex items-center space-x-1">
                                                                    <span className="text-green-600 dark:text-green-400 font-bold">${Number(message.data.avg_price).toLocaleString()}</span>
                                                                    <span className="text-green-500 dark:text-green-300">promedio</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-2">
                                                    <span className={`text-xs ${
                                                        message.sender === 'user' ? 'text-white/70' : 'text-gray-400'
                                                    }`}>
                                                        {message.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Indicador de escritura */}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl shadow-md">
                                            <div className="flex items-center space-x-2">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                </div>
                                                <span className="text-xs text-gray-500">Escribiendo...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} />
                            </div>

                            {/* FOOTER */}
                            <div className="p-2 sm:p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                {breadcrumbs.length > 1 && (
                                    <div className="mb-2 flex items-center text-xs text-gray-500 dark:text-gray-400 overflow-x-auto scrollbar-hide pb-1">
                                        <span className="text-gray-400 mr-1 flex-shrink-0">📍</span>
                                        <div className="flex items-center whitespace-nowrap">
                                            {breadcrumbs.map((crumb, idx) => (
                                                <span key={crumb} className="flex items-center flex-shrink-0">
                                                    {idx > 0 && <span className="mx-1">›</span>}
                                                    <span className={`${idx === breadcrumbs.length - 1 ? 'font-semibold text-gray-700 dark:text-gray-300' : ''} truncate max-w-[80px]`}>
                                                        {crumb === 'main' ? 'Inicio' : crumb.replace(/_/g, ' ')}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1 flex-shrink-0">
                                        <span>✨</span>
                                        <span className="hidden sm:inline">Selecciona una opción</span>
                                    </p>
                                    <div className="flex items-center space-x-2 text-xs">
                                        {messages.length > 0 && (
                                            <span className="text-gray-400 hidden sm:inline">{messages.length} mensajes</span>
                                        )}
                                        {isConnected ? (
                                            <span className="flex items-center space-x-1 text-green-600">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="hidden xs:inline">Online</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center space-x-1 text-red-600">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                                <span className="hidden xs:inline">Offline</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* BOTÓN FLOTANTE */}
            <button
                    {...(!isMobile ? dragHandlers : {})}
                    onClick={() => {
                        if (!dragStarted || isMobile) {
                            setIsOpen(!isOpen);
                            setShowQuickActions(false);
                        }
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (!isMobile) {
                            setShowQuickActions(!showQuickActions);
                        }
                    }}
                    className={`${(isOpen && isMobile) || isMobileMenuOpen ? 'hidden' : ''} ${isOpen ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16'} bg-gradient-to-r ${themes[theme]} text-white rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group relative overflow-hidden ${
                        isDragging ? 'scale-110 cursor-grabbing' : 'cursor-pointer'
                    }`}
                >
                    {!isOpen && (
                        <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                    )}

                    <div className="relative z-10">
                        <span className={`${isOpen ? 'text-2xl' : 'text-3xl'} ${!isOpen && 'animate-bounce'}`}>💬</span>
                    </div>

                    {(notificationCount > 0 || messages.length > 0) && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                            {notificationCount > 0 ? notificationCount : '!'}
                        </div>
                    )}

                    {!isConnected && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}

                    {isDragging && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap">
                            ✋ Arrastrando...
                        </div>
                    )}
                </button>

            {/* TOOLTIP */}
            {!isOpen && !isDragging && !isMobile && (
                <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-bounce">
                    <div className="flex items-center space-x-2">
                        <span>💡</span>
                        <span>¿Necesitas ayuda?</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
            )}

            {/* INDICADOR DE QUICK ACTIONS */}
            {!isOpen && !showQuickActions && !isMobile && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap pointer-events-none">
                    <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-md border border-gray-200 dark:border-gray-700">
                        Click derecho = Accesos rápidos
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatBot;