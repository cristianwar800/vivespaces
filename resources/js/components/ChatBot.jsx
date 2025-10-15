import React, { useState, useEffect, useRef, useCallback } from 'react';

const useDraggable = (initialPosition, iconId) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStarted, setDragStarted] = useState(false);
  const elementRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  const magnetToEdge = useCallback((pos) => {
    const margin = 20;
    const elementWidth = 56;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 80;

    let newX = pos.x;
    let newY = pos.y;

    if (pos.x < windowWidth / 2) {
      newX = margin;
    } else {
      newX = windowWidth - elementWidth - margin;
    }

    newY = Math.max(navbarHeight + margin, Math.min(pos.y, windowHeight - elementWidth - margin));
    return { x: newX, y: newY };
  }, []);

  const handleStart = useCallback((clientX, clientY) => {
    setIsMouseDown(true);
    setDragStarted(false);
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });
  }, [position]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!isMouseDown) return;

    const newPosition = {
      x: clientX - startPos.x,
      y: clientY - startPos.y
    };

    const threshold = 5;
    const distance = Math.abs(newPosition.x - position.x) + Math.abs(newPosition.y - position.y);

    if (distance > threshold && !dragStarted) {
      setIsDragging(true);
      setDragStarted(true);
      document.body.style.userSelect = 'none';
      document.body.style.overflow = 'hidden';
    }

    if (!dragStarted) return;

    const elementWidth = 56;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 80;

    newPosition.x = Math.max(0, Math.min(newPosition.x, windowWidth - elementWidth));
    newPosition.y = Math.max(navbarHeight, Math.min(newPosition.y, windowHeight - elementWidth));

    setPosition(newPosition);
  }, [isMouseDown, startPos, position, dragStarted]);

  const handleEnd = useCallback(() => {
    setIsMouseDown(false);
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.overflow = '';

    const wasDragging = dragStarted;
    setDragStarted(false);

    if (wasDragging) {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      dragTimeoutRef.current = setTimeout(() => {
        const magnetizedPosition = magnetToEdge(position);
        setPosition(magnetizedPosition);
      }, 150);
    }
  }, [dragStarted, position, magnetToEdge]);

  useEffect(() => {
    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => handleEnd();

    if (isMouseDown) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMouseDown, handleMove, handleEnd]);

  useEffect(() => {
    const handleResize = () => {
      const magnetizedPosition = magnetToEdge(position);
      setPosition(magnetizedPosition);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, magnetToEdge]);

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

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

  return {
    position,
    isDragging,
    elementRef,
    dragHandlers,
    wasDragged: dragStarted
  };
};

function ChatBot({ user = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [isHidden, setIsHidden] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const responseTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    const messageQueueRef = useRef([]);
    const processingRef = useRef(false);
    const lastSentMessageRef = useRef('');

    const getInitialPosition = useCallback(() => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const buttonSize = 56;
        const margin = 20;

        return {
            x: windowWidth - buttonSize - margin,
            y: windowHeight - buttonSize - margin
        };
    }, []);

    const [initialPosition] = useState(getInitialPosition);

    const { position, isDragging, elementRef, dragHandlers, wasDragged } = useDraggable(
        initialPosition,
        'chatbot-button'
    );

    const calculateModalPosition = useCallback(() => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const modalWidth = 384;
        const modalHeight = 500;
        const buttonSize = 56;
        const margin = 20;
        const navbarHeight = 80;

        let modalX, modalY;

        if (position.x < windowWidth / 2) {
            modalX = position.x + buttonSize + margin;
            if (modalX + modalWidth > windowWidth - margin) {
                modalX = position.x - modalWidth - margin;
                if (modalX < margin) {
                    modalX = Math.max(margin, (windowWidth - modalWidth) / 2);
                }
            }
        } else {
            modalX = position.x - modalWidth - margin;
            if (modalX < margin) {
                modalX = position.x + buttonSize + margin;
                if (modalX + modalWidth > windowWidth - margin) {
                    modalX = Math.max(margin, windowWidth - modalWidth - margin);
                }
            }
        }

        modalY = position.y - modalHeight + buttonSize;

        if (modalY < navbarHeight + margin) {
            modalY = position.y + buttonSize + margin;
            if (modalY + modalHeight > windowHeight - margin) {
                modalY = Math.max(navbarHeight + margin, (windowHeight - modalHeight) / 2);
            }
        }

        modalX = Math.max(margin, Math.min(modalX, windowWidth - modalWidth - margin));
        modalY = Math.max(navbarHeight + margin, Math.min(modalY, windowHeight - modalHeight - margin));

        return { x: modalX, y: modalY };
    }, [position]);

    const getCSRFToken = useCallback(() => {
        const tokenElement = document.querySelector('meta[name="csrf-token"]');
        if (tokenElement) {
            return tokenElement.getAttribute('content');
        }

        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'XSRF-TOKEN') {
                return decodeURIComponent(value);
            }
        }

        try {
            const stored = localStorage.getItem('csrf_token');
            return stored || '';
        } catch (error) {
            console.warn('Error accessing localStorage for CSRF token:', error);
            return '';
        }
    }, []);

    const getHeaders = useCallback(() => {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        const csrfToken = getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }

        return headers;
    }, [getCSRFToken]);

    const getCurrentContext = useCallback(() => {
        try {
            if (typeof window === 'undefined') {
                return {
                    current_path: '/',
                    timestamp: new Date().toISOString()
                };
            }

            return {
                current_path: window.location?.pathname || '/',
                user_agent: navigator?.userAgent || '',
                screen_width: window.innerWidth || 1920,
                screen_height: window.innerHeight || 1080,
                timestamp: new Date().toISOString(),
                referrer: document.referrer || null,
                language: navigator?.language || 'es-MX'
            };
        } catch (error) {
            console.warn('Error getting context:', error);
            return {
                current_path: '/',
                timestamp: new Date().toISOString()
            };
        }
    }, []);

    // Validación mejorada - más permisiva
    const validateMessage = useCallback((message) => {
        if (!message) {
            return { valid: false, error: 'El mensaje no puede estar vacío' };
        }

        const messageStr = String(message);
        const trimmed = messageStr.trim();

        if (trimmed.length < 1) {
            return { valid: false, error: 'El mensaje no puede estar vacío' };
        }

        if (trimmed.length > 1000) {
            return { valid: false, error: 'El mensaje es demasiado largo (máximo 1000 caracteres)' };
        }

        // Validación más permisiva - acepta casi cualquier carácter unicode
        const hasValidContent = /\S/.test(trimmed);

        if (!hasValidContent) {
            return { valid: false, error: 'El mensaje debe contener texto válido' };
        }

        return { valid: true, message: trimmed };
    }, []);

    const generateConversationId = useCallback(() => {
        try {
            const stored = localStorage.getItem('chatbot_conversation_id');
            if (stored && stored.length > 0) {
                return stored;
            }
        } catch (error) {
            console.warn('Error accessing localStorage:', error);
        }

        const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            localStorage.setItem('chatbot_conversation_id', newId);
        } catch (error) {
            console.warn('Error setting localStorage:', error);
        }

        return newId;
    }, []);

    const checkConnection = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/chatbot/welcome', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    context: getCurrentContext()
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const isOk = response.ok;
            setIsConnected(isOk);
            return isOk;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Connection check failed:', error);
            }
            setIsConnected(false);
            return false;
        }
    }, [getHeaders, getCurrentContext]);

    const getWelcomeMessage = useCallback(async () => {
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            const context = getCurrentContext();

            const response = await fetch('/api/chatbot/welcome', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ context }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setIsConnected(true);
                return data.message;
            } else {
                throw new Error('Error al obtener mensaje de bienvenida');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return null;
            }

            console.error('Error getting welcome message:', error);
            setIsConnected(false);

            return {
                text: "¡Hola! Soy tu asistente de ViveSpaces. ¿En qué puedo ayudarte?\n\n⚠️ Modo offline - Funcionalidad limitada",
                type: 'welcome',
                suggestions: [
                    'Buscar propiedades',
                    'Ver ayuda',
                    'Contactar soporte'
                ]
            };
        }
    }, [getHeaders, getCurrentContext]);

    const getBotResponse = useCallback(async (message) => {
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            const context = getCurrentContext();
            const conversationId = generateConversationId();

            const requestData = {
                message: message,
                context: context,
                conversation_id: conversationId
            };

            console.log('Enviando mensaje al backend:', requestData);

            const response = await fetch('/api/chatbot/message', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(requestData),
                signal: abortControllerRef.current.signal
            });

            console.log('Respuesta del servidor:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error del servidor:', errorText);
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Datos recibidos:', data);

            if (data.success) {
                setIsConnected(true);
                return {
                    ...data.response,
                    intent: data.intent,
                    timestamp: data.timestamp
                };
            } else {
                throw new Error(data.message || 'Error del servidor');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }

            console.error('Error getting bot response:', error);
            setIsConnected(false);
            throw error;
        }
    }, [getCurrentContext, generateConversationId, getHeaders]);

    const getFallbackResponse = useCallback((message) => {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('hola') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
            return {
                text: "¡Hola! 😊 Estoy en modo offline, pero puedo ayudarte con información básica.",
                type: 'fallback',
                suggestions: ['Ver propiedades', 'Contactar soporte']
            };
        }

        if (lowerMessage.includes('propiedad') || lowerMessage.includes('casa') || lowerMessage.includes('departamento')) {
            return {
                text: "🏠 Puedes explorar nuestras propiedades en la sección de búsqueda. Usa los filtros para encontrar lo que necesitas.",
                type: 'fallback',
                actions: [
                    {
                        text: 'Ver Propiedades',
                        url: '/properties'
                    }
                ]
            };
        }

        return {
            text: "🔌 Estoy en modo offline. Para una mejor experiencia, verifica tu conexión o contacta soporte.",
            type: 'fallback',
            actions: [
                {
                    text: 'Contactar Soporte',
                    url: 'mailto:soporte@vivespaces.com'
                }
            ]
        };
    }, []);

    const processMessageQueue = useCallback(async () => {
        if (processingRef.current || messageQueueRef.current.length === 0) {
            return;
        }

        processingRef.current = true;
        const messageData = messageQueueRef.current.shift();

        try {
            setIsTyping(true);
            setIsLoading(true);

            let botResponseData;

            try {
                if (!isConnected) {
                    const connectionOk = await checkConnection();
                    if (!connectionOk) {
                        throw new Error('No hay conexión');
                    }
                }

                botResponseData = await getBotResponse(messageData.text);
            } catch (error) {
                if (error.name === 'AbortError') {
                    processingRef.current = false;
                    setIsTyping(false);
                    setIsLoading(false);
                    setIsSending(false);
                    return;
                }
                console.error('Error obteniendo respuesta:', error);
                botResponseData = getFallbackResponse(messageData.text);
            }

            const baseDelay = 600;
            const lengthDelay = Math.min(messageData.text.length * 20, 1500);
            const randomDelay = Math.random() * 300;
            const totalDelay = baseDelay + lengthDelay + randomDelay;

            if (responseTimeoutRef.current) {
                clearTimeout(responseTimeoutRef.current);
            }

            responseTimeoutRef.current = setTimeout(() => {
                const botResponse = {
                    id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: botResponseData.text,
                    sender: 'bot',
                    timestamp: new Date(),
                    type: botResponseData.type || 'response',
                    intent: botResponseData.intent || 'general',
                    suggestions: botResponseData.suggestions || [],
                    actions: botResponseData.actions || [],
                    data: botResponseData.data || null
                };

                setMessages(prev => [...prev, botResponse]);
                setIsTyping(false);
                setIsLoading(false);
                setIsSending(false);
                processingRef.current = false;

                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                }

                // Procesar siguiente mensaje en cola
                if (messageQueueRef.current.length > 0) {
                    setTimeout(() => processMessageQueue(), 300);
                }
            }, totalDelay);

        } catch (error) {
            console.error('Error procesando mensaje:', error);

            const errorMessage = {
                id: `error_${Date.now()}`,
                text: "Lo siento, hubo un problema procesando tu mensaje. Por favor, intenta de nuevo.",
                sender: 'bot',
                timestamp: new Date(),
                type: 'error',
                actions: [
                    {
                        text: 'Reintentar',
                        message: messageData.text
                    }
                ]
            };

            setMessages(prev => [...prev, errorMessage]);
            setIsTyping(false);
            setIsLoading(false);
            setIsSending(false);
            processingRef.current = false;

            if (messageQueueRef.current.length > 0) {
                setTimeout(() => processMessageQueue(), 300);
            }
        }
    }, [isConnected, isOpen, checkConnection, getBotResponse, getFallbackResponse]);

    const handleSendMessage = useCallback(async () => {
        if (isSending || isLoading) {
            console.log('Ya hay un mensaje en proceso');
            return;
        }

        const validation = validateMessage(inputMessage);

        if (!validation.valid) {
            console.warn('Validación falló:', validation.error);
            return;
        }

        // Evitar mensajes duplicados
        if (validation.message === lastSentMessageRef.current) {
            console.log('Mensaje duplicado, ignorando');
            return;
        }

        lastSentMessageRef.current = validation.message;
        setIsSending(true);

        const userMessage = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: validation.message,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        messageQueueRef.current.push(userMessage);

        // Resetear después de un delay
        setTimeout(() => {
            lastSentMessageRef.current = '';
        }, 1000);

        processMessageQueue();
    }, [inputMessage, isSending, isLoading, validateMessage, processMessageQueue]);

    const handleSuggestionClick = useCallback((suggestion) => {
        console.log('Clic en sugerencia:', suggestion);

        if (!suggestion || typeof suggestion !== 'string') {
            console.warn('Sugerencia inválida');
            return;
        }

        const trimmed = suggestion.trim();

        if (!trimmed) {
            console.warn('Sugerencia vacía');
            return;
        }

        // Establecer el mensaje y enviarlo
        setInputMessage(trimmed);

        setTimeout(() => {
            const syntheticMessage = trimmed;
            const validation = validateMessage(syntheticMessage);

            if (!validation.valid) {
                console.warn('Validación de sugerencia falló:', validation.error);
                return;
            }

            if (isSending || isLoading) {
                console.log('Ya hay un mensaje en proceso, esperando...');
                return;
            }

            if (validation.message === lastSentMessageRef.current) {
                console.log('Sugerencia duplicada, ignorando');
                return;
            }

            lastSentMessageRef.current = validation.message;
            setIsSending(true);

            const userMessage = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: validation.message,
                sender: 'user',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, userMessage]);
            setInputMessage('');

            messageQueueRef.current.push(userMessage);

            setTimeout(() => {
                lastSentMessageRef.current = '';
            }, 1000);

            processMessageQueue();
        }, 100);
    }, [validateMessage, isSending, isLoading, processMessageQueue]);

    const handleActionClick = useCallback(async (action) => {
        console.log('Clic en acción:', action);

        if (action.message) {
            const trimmed = String(action.message).trim();

            if (!trimmed) {
                console.warn('Mensaje de acción vacío');
                return;
            }

            setInputMessage(trimmed);

            setTimeout(() => {
                const validation = validateMessage(trimmed);

                if (!validation.valid) {
                    console.warn('Validación de acción falló:', validation.error);
                    return;
                }

                if (isSending || isLoading) {
                    console.log('Ya hay un mensaje en proceso, esperando...');
                    return;
                }

                if (validation.message === lastSentMessageRef.current) {
                    console.log('Acción duplicada, ignorando');
                    return;
                }

                lastSentMessageRef.current = validation.message;
                setIsSending(true);

                const userMessage = {
                    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: validation.message,
                    sender: 'user',
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, userMessage]);
                setInputMessage('');

                messageQueueRef.current.push(userMessage);

                setTimeout(() => {
                    lastSentMessageRef.current = '';
                }, 1000);

                processMessageQueue();
            }, 100);
        } else if (action.url) {
            if (action.url.startsWith('mailto:') || action.url.startsWith('https://') || action.url.startsWith('http://') || action.url.startsWith('tel:')) {
                window.open(action.url, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = action.url;
            }
        } else if (action.action) {
            switch (action.action) {
                case 'open_search':
                    window.location.href = '/properties';
                    break;
                case 'open_map':
                    window.location.href = '/properties?view=map';
                    break;
                case 'close_chat':
                    setIsOpen(false);
                    break;
                case 'clear_chat':
                    setMessages([]);
                    setIsInitialized(false);
                    messageQueueRef.current = [];
                    processingRef.current = false;
                    lastSentMessageRef.current = '';
                    if (responseTimeoutRef.current) {
                        clearTimeout(responseTimeoutRef.current);
                    }
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    setIsTyping(false);
                    setIsLoading(false);
                    setIsSending(false);
                    break;
                case 'reload_chat':
                    window.location.reload();
                    break;
                case 'check_connection':
                    await checkConnection();
                    break;
                default:
                    console.log('Acción no implementada:', action.action);
            }
        }
    }, [validateMessage, isSending, isLoading, processMessageQueue, checkConnection]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const formatTime = useCallback((date) => {
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    useEffect(() => {
        if (isOpen && !isInitialized) {
            const initializeChat = async () => {
                try {
                    const welcomeMessageData = await getWelcomeMessage();

                    if (!welcomeMessageData) {
                        return;
                    }

                    const welcomeMessage = {
                        id: `welcome_${Date.now()}`,
                        text: welcomeMessageData.text,
                        sender: 'bot',
                        timestamp: new Date(),
                        type: welcomeMessageData.type || 'welcome',
                        suggestions: welcomeMessageData.suggestions || [],
                        actions: welcomeMessageData.actions || []
                    };

                    setMessages([welcomeMessage]);
                    setIsInitialized(true);
                } catch (error) {
                    console.error('Error inicializando chat:', error);
                }
            };

            initializeChat();
        }
    }, [isOpen, isInitialized, getWelcomeMessage]);

    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    useEffect(() => {
        const handleKeyPress = (event) => {
            const isTyping = event.target.tagName === 'INPUT' ||
                            event.target.tagName === 'TEXTAREA' ||
                            event.target.contentEditable === 'true';

            if (event.key.toLowerCase() === 'c' && !isTyping && isHidden) {
                setIsHidden(false);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [isHidden]);

    useEffect(() => {
        const handleGlobalKeyPress = (event) => {
            const isTyping = event.target.tagName === 'INPUT' ||
                            event.target.tagName === 'TEXTAREA' ||
                            event.target.contentEditable === 'true';

            if (event.key === 'Escape' && !isTyping && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyPress);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyPress);
        };
    }, [isOpen]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (responseTimeoutRef.current) {
                clearTimeout(responseTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const renderMessage = useCallback((message) => (
        <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}
        >
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-md transition-all duration-200 group-hover:shadow-lg ${
                message.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : `bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 ${
                        message.type === 'error' ? 'border-red-200 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' : ''
                    } ${
                        message.type === 'fallback' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' : ''
                    }`
            }`}>

                <p className="text-sm whitespace-pre-line leading-relaxed">{message.text}</p>

                {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                            <button
                                key={`suggestion-${index}-${suggestion}`}
                                onClick={() => handleSuggestionClick(suggestion)}
                                disabled={isSending || isLoading}
                                className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}

                {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {message.actions.map((action, index) => (
                            <button
                                key={`action-${index}-${action.text}`}
                                onClick={() => handleActionClick(action)}
                                disabled={isSending || isLoading}
                                className={`block w-full px-3 py-2 text-xs rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                    action.message
                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                }`}
                            >
                                {action.text}
                            </button>
                        ))}
                    </div>
                )}

                {message.data && (
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                            {message.type === 'properties' && message.data.total !== undefined && (
                                <div>
                                    📊 Estadísticas: {message.data.total} total, {message.data.recent || 0} nuevas
                                </div>
                            )}
                            {message.type === 'pricing' && message.data.min_price !== undefined && (
                                <div>
                                    💰 Rango: ${message.data.min_price?.toLocaleString()} - ${message.data.max_price?.toLocaleString()}
                                </div>
                            )}
                            {message.type === 'profile' && message.data.properties_count !== undefined && (
                                <div>
                                    👤 Actividad: {message.data.properties_count} propiedades, {message.data.unread_messages || 0} sin leer
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <span className={`text-xs mt-2 block ${
                    message.sender === 'user'
                        ? 'text-emerald-100'
                        : 'text-gray-500 dark:text-gray-400'
                }`}>
                    {formatTime(message.timestamp)}
                </span>
            </div>
        </div>
    ), [formatTime, handleSuggestionClick, handleActionClick, isSending, isLoading]);

    const modalPosition = calculateModalPosition();

    if (isHidden) {
        return (
            <div className="fixed bottom-4 right-4 z-30">
                <div className="bg-gray-900/80 dark:bg-gray-700/80 text-white text-xs px-3 py-2 rounded-lg shadow-lg opacity-90 animate-pulse pointer-events-none">
                    Presiona C para mostrar chat
                </div>
            </div>
        );
    }

    return (
        <div ref={elementRef}
             style={{
                 position: 'fixed',
                 left: `${position.x}px`,
                 top: `${position.y}px`,
                 zIndex: 50
             }}
        >
            {!isOpen && unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg z-10">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </div>
            )}

            <div
                className={`absolute w-80 sm:w-96 bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 transition-all duration-300 ${
                    isOpen ? 'opacity-100 visible scale-100 translate-y-0' : 'opacity-0 invisible scale-95 translate-y-4'
                }`}
                style={{
                    left: `${modalPosition.x - position.x}px`,
                    top: `${modalPosition.y - position.y}px`,
                }}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-t-2xl">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">🤖</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Asistente ViveSpaces</h3>
                            <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${
                                    isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                                }`}></div>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {isLoading ? 'Escribiendo...' : isConnected ? 'En línea' : 'Modo offline'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={checkConnection}
                            title="Verificar conexión"
                            disabled={isLoading}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleActionClick({ action: 'clear_chat' })}
                            title="Limpiar chat"
                            disabled={isLoading || messages.length === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setIsHidden(true)}
                            title="Ocultar chatbot"
                            className="p-1 text-gray-400 hover:text-orange-500 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            title="Cerrar chat"
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg group"
                        >
                            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50/30 dark:bg-gray-800/30 scrollbar-thin scrollbar-thumb-emerald-500 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                    {messages.length === 0 && (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                                </svg>
                                <p className="text-sm">Iniciando conversación...</p>
                            </div>
                        </div>
                    )}

                    {messages.map(renderMessage)}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl shadow-md">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/98 dark:bg-gray-900/98 rounded-b-2xl">
                    <div className="flex items-center space-x-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={isConnected ? "Escribe tu mensaje..." : "Modo offline - Funcionalidad limitada"}
                            disabled={isSending || isLoading}
                            maxLength={1000}
                            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 border border-transparent focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isSending || isLoading}
                            className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-emerald-500/30"
                        >
                            {isSending || isLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isSending || isLoading ? 'Procesando mensaje...' : inputMessage.length > 0 ? `${inputMessage.length}/1000` : 'Presiona Enter para enviar'}
                        </p>

                        {!isConnected && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Offline
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <button
                {...dragHandlers}
                onClick={(e) => {
                    if (!wasDragged && !isDragging) {
                        setIsOpen(!isOpen);
                    }
                }}
                className={`w-14 h-14 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-full shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group relative overflow-hidden ${
                    isDragging ? 'scale-110 shadow-2xl rotate-3' : ''
                }`}
            >
                <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>

                {!isConnected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white animate-pulse"></div>
                )}

                <div className="relative z-10">
                    <svg className={`w-6 h-6 transition-all duration-300 ${isOpen ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                    <svg className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                {isDragging && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Arrastrando...
                    </div>
                )}
            </button>

            {!isOpen && messages.length === 0 && !isDragging && (
                <div className="absolute bottom-16 right-16 bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg animate-pulse pointer-events-none">
                    ¿Necesitas ayuda?
                    <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
            )}
        </div>
    );
}

export default ChatBot;
