import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer, lazy, Suspense } from 'react';
import { useFloating, offset, flip, shift, size } from '@floating-ui/react';

// ============================================
// 🔧 LAZY LOADING DE COMPONENTES PESADOS
// ============================================
// NOTA: Estos componentes deben estar en archivos separados para que el lazy loading funcione
// Por ahora, los dejamos así pero en producción deberías separarlos
const EmojiPickerLazy = lazy(() => Promise.resolve({ default: EmojiPicker }));
const RatingModalLazy = lazy(() => Promise.resolve({ default: RatingModal }));
const DeleteChatModalLazy = lazy(() => Promise.resolve({ default: DeleteChatModal }));

// ============================================
// 🔧 HELPERS Y UTILIDADES
// ============================================

// Helper para obtener CSRF token de forma segura
const getCSRFToken = () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
        console.error('❌ CSRF token not found');
        throw new Error('CSRF token no encontrado. Por favor, recarga la página.');
    }
    return token;
};

// Helper para fetch con timeout
const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('La petición tardó demasiado tiempo. Verifica tu conexión.');
        }
        throw error;
    }
};

// Helper para formatear tiempo de forma segura
const formatTimeSafe = (timestamp) => {
    if (!timestamp) return '--:--';
    
    try {
        const date = new Date(timestamp);
        
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Invalid timestamp:', timestamp);
            return '--:--';
        }
        
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        return date.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        console.error('❌ Error formatting time:', error);
        return '--:--';
    }
};

// Cache keys
const CACHE_KEYS = {
    CONVERSATIONS: 'chat_conversations_cache',
    USER: 'chat_user_cache'
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const CACHE_VERSION = '1.0';

// Helper para obtener cache key con versión
const getCacheKey = (key) => `${key}_v${CACHE_VERSION}`;

// ============================================
// 🎨 COMPONENTE: AudioPlayer
// ============================================
const AudioPlayer = React.memo(({ message, isOwn }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(message.duration || 0);
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hasError, setHasError] = useState(false);
    const audioRef = useRef(null);

    // Validar que file_url existe
    useEffect(() => {
        if (!message.file_url) {
            console.error('❌ AudioPlayer: file_url is missing');
            setHasError(true);
        }
    }, [message.file_url]);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
            return '0:00';
        }
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const togglePlay = async () => {
        if (!audioRef.current) return;
        try {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                setIsLoading(true);
                await audioRef.current.play();
                setIsPlaying(true);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('❌ Error reproduciendo audio:', error);
            setIsLoading(false);
            setHasError(true);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current && (!message.duration || message.duration === 0)) {
            setDuration(audioRef.current.duration);
        }
        setHasError(false);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    };

    const handleError = (e) => {
        console.error('❌ Error loading audio:', e);
        setHasError(true);
        setIsLoading(false);
        setIsPlaying(false);
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    if (hasError) {
        return (
            <div className={`flex items-center space-x-2 p-4 rounded-2xl ${isOwn ? 'bg-red-500/20' : 'bg-red-500/10'}`}>
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-600 dark:text-red-400">Error al cargar el audio</span>
            </div>
        );
    }

    return (
        <div 
            className={`flex items-center space-x-2 sm:space-x-3 p-4 sm:p-5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] ${
                isOwn 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30' 
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white shadow-lg'
            }`}
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)}
        >
            <audio 
                ref={audioRef} 
                src={message.file_url} 
                onLoadedMetadata={handleLoadedMetadata} 
                onTimeUpdate={handleTimeUpdate} 
                onEnded={handleEnded}
                onError={handleError}
                preload="metadata" 
            />
            <button 
                onClick={togglePlay} 
                disabled={isLoading}
                aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
                className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 transform ${
                    isHovered ? 'scale-110' : 'scale-100'
                } ${
                    isOwn 
                        ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-2 border-white border-opacity-40 shadow-lg' 
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/40'
                } disabled:opacity-50 disabled:scale-100`}
            >
                {isLoading ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                ) : (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                )}
            </button>
            <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className={`transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                            <path d="M19 10v1a7 7 0 1 1-14 0v-1"/>
                            <path d="M12 18v4"/>
                            <path d="M8 22h8"/>
                        </svg>
                    </div>
                    <div 
                        className={`flex-1 h-3 rounded-full cursor-pointer relative transition-all duration-300 ${
                            isHovered ? 'h-4' : 'h-3'
                        } ${
                            isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        onClick={handleSeek}
                        role="slider"
                        aria-label="Barra de progreso de audio"
                        aria-valuemin="0"
                        aria-valuemax={duration}
                        aria-valuenow={currentTime}
                    >
                        <div 
                            className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
                                isOwn 
                                    ? 'bg-white bg-opacity-90 shadow-sm' 
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30'
                            }`}
                            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 ${isPlaying ? 'animate-pulse' : ''}`}></div>
                        </div>
                        {isHovered && duration > 0 && (
                            <div 
                                className={`absolute top-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-300 transform -translate-y-1/2 -translate-x-1/2 shadow-xl ${
                                    isOwn ? 'bg-white border-2 border-emerald-400' : 'bg-emerald-500 border-2 border-white'
                                }`}
                                style={{ left: `${(currentTime / duration) * 100}%` }}
                            />
                        )}
                    </div>
                    <div className={`text-sm sm:text-base font-mono flex-shrink-0 min-w-[4rem] sm:min-w-[5rem] text-right transition-all duration-300 ${
                        isOwn ? 'text-white text-opacity-90' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                        <span className="font-medium">{formatTime(currentTime)}</span>
                        <span className="opacity-60"> / </span>
                        <span className="opacity-80">{formatTime(duration)}</span>
                    </div>
                </div>
                {message.metadata && (
                    <div className={`text-sm flex items-center space-x-3 transition-all duration-300 ${
                        isOwn ? 'text-white text-opacity-70' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                        <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span>
                                {message.metadata.sample_rate && `${Math.round(message.metadata.sample_rate/1000)}kHz`}
                            </span>
                        </div>
                        {message.metadata.channels && (
                            <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                                </svg>
                                <span>{message.metadata.channels === 1 ? 'Mono' : 'Estéreo'}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

AudioPlayer.displayName = 'AudioPlayer';

// ============================================
// 🎨 COMPONENTE: EmojiPicker
// ============================================
const EmojiPicker = ({ messageId, onEmojiSelect, onClose, referenceElement }) => {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🤔', '🔥'];

    const { refs, floatingStyles } = useFloating({
        elements: {
            reference: referenceElement
        },
        placement: 'top-start',
        middleware: [
            offset(8),
            flip(),
            shift({ padding: 16 }),
            size({
                apply({ availableWidth, availableHeight, elements }) {
                    Object.assign(elements.floating.style, {
                        maxWidth: `${Math.min(availableWidth - 16, 208)}px`,
                        maxHeight: `${availableHeight - 16}px`,
                    });
                },
                padding: 16,
            }),
        ],
    });

    return (
        <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50 w-52 sm:w-56 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
            role="dialog"
            aria-label="Selector de emojis"
        >
            <div className="grid grid-cols-5 gap-2">
                {emojis.map((emoji, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            onEmojiSelect(messageId, emoji);
                            onClose();
                        }}
                        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                        aria-label={`Reaccionar con ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <button
                onClick={onClose}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
                Cerrar
            </button>
        </div>
    );
};

// ============================================
// 🎨 COMPONENTE: MessageReactions
// ============================================
const MessageReactions = React.memo(({ 
    message, 
    user, 
    hoveredMessage, 
    showReactionPicker, 
    setShowReactionPicker, 
    toggleReaction, 
    onEmojiPickerToggle 
}) => {
    const buttonRef = useRef(null);

    if (!user) {
        return null;
    }

    if (!((message.reactions && Object.keys(message.reactions).length > 0) || hoveredMessage === message.id)) {
        return null;
    }

    return (
        <div className="mt-3 -mb-1 relative">
            <div className="flex flex-wrap gap-2 max-w-[200px] sm:max-w-[280px] md:max-w-[350px]">
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    Object.entries(message.reactions).map(([emoji, userIds]) => {
                        const count = userIds.length;
                        const hasUserReacted = userIds.includes(user.id);
                        return (
                            <button
                                key={emoji}
                                onClick={() => toggleReaction(message.id, emoji)}
                                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm transition-all duration-300 transform hover:scale-105 shadow-md ${
                                    hasUserReacted
                                        ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-gray-200 dark:border-gray-600'
                                }`}
                                aria-label={`${emoji} - ${count} reacciones`}
                            >
                                <span className="text-base">{emoji}</span>
                                <span className="font-semibold text-xs">{count}</span>
                            </button>
                        );
                    })
                )}

                {hoveredMessage === message.id && (
                    <button
                        ref={buttonRef}
                        onClick={() => onEmojiPickerToggle(message.id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 rounded-full text-gray-600 dark:text-gray-400 transition-all duration-300 transform hover:scale-110 border border-gray-200 dark:border-gray-600 shadow-md"
                        aria-label="Agregar reacción"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                )}
            </div>

            {showReactionPicker === message.id && (
                <Suspense fallback={<div className="text-xs text-gray-500">Cargando...</div>}>
                    <EmojiPickerLazy
                        messageId={message.id}
                        onEmojiSelect={toggleReaction}
                        onClose={() => setShowReactionPicker(null)}
                        referenceElement={buttonRef.current}
                    />
                </Suspense>
            )}
        </div>
    );
});

MessageReactions.displayName = 'MessageReactions';

// ============================================
// 🎨 COMPONENTE: DeleteChatModal
// ============================================
const DeleteChatModal = ({ show, onConfirm, onCancel, otherUser, isDeleting }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (show && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTab = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape' && !isDeleting) {
                    onCancel();
                }
            };

            document.addEventListener('keydown', handleTab);
            document.addEventListener('keydown', handleEscape);
            firstElement?.focus();

            return () => {
                document.removeEventListener('keydown', handleTab);
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [show, isDeleting, onCancel]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div 
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100"
                role="dialog"
                aria-labelledby="delete-modal-title"
                aria-modal="true"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 id="delete-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        ¿Eliminar conversación?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Se eliminará toda la conversación con <span className="font-semibold">{otherUser?.name}</span>. Esta acción no se puede deshacer.
                    </p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Eliminando...
                            </>
                        ) : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// 🎨 COMPONENTE: RatingModal
// ============================================
const RatingModal = ({ show, onClose, userId, propertyId, otherUser, onRatingSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hoveredStar, setHoveredStar] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    // Trap focus y escape key
    useEffect(() => {
        if (show && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTab = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape' && !isSubmitting) {
                    onClose();
                }
            };

            document.addEventListener('keydown', handleTab);
            document.addEventListener('keydown', handleEscape);
            firstElement?.focus();

            return () => {
                document.removeEventListener('keydown', handleTab);
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [show, isSubmitting, onClose]);

    const submitRating = async () => {
        if (rating === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }
        
        setIsSubmitting(true);
        setError('');
        
        try {
            const response = await fetchWithTimeout('/api/ratings', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                },
                body: JSON.stringify({
                    rated_id: userId,
                    property_id: propertyId,
                    rating,
                    comment: comment.trim()
                })
            }, 30000);
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (onRatingSubmitted) {
                    onRatingSubmitted(data.rating);
                }
                onClose();
                setRating(0);
                setComment('');
            } else {
                setError(data.message || 'Error al enviar la calificación');
            }
        } catch (error) {
            console.error('❌ Error submitting rating:', error);
            setError(error.message || 'Error de conexión. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div 
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100"
                role="dialog"
                aria-labelledby="rating-modal-title"
                aria-modal="true"
            >
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-emerald-100 dark:ring-emerald-900/30">
                        <img src={otherUser?.avatar_url} alt={otherUser?.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 id="rating-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        ¿Cómo fue tu experiencia con {otherUser?.name}?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tu opinión ayuda a mejorar la comunidad
                    </p>
                </div>

                <div className="flex justify-center space-x-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="transition-all duration-200 transform hover:scale-110 focus:outline-none"
                            type="button"
                            aria-label={`Calificar con ${star} estrella${star > 1 ? 's' : ''}`}
                        >
                            <svg
                                className={`w-12 h-12 transition-colors duration-200 ${
                                    star <= (hoveredStar || rating)
                                        ? 'text-yellow-400 fill-current drop-shadow-lg'
                                        : 'text-gray-300 dark:text-gray-600'
                                }`}
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </button>
                    ))}
                </div>

                {rating > 0 && (
                    <div className="text-center mb-4">
                        <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                            {rating === 5 && '¡Excelente! 🎉'}
                            {rating === 4 && 'Muy buena experiencia 👍'}
                            {rating === 3 && 'Buena experiencia 👌'}
                            {rating === 2 && 'Puede mejorar 😐'}
                            {rating === 1 && 'Mala experiencia 😞'}
                        </p>
                    </div>
                )}

                <div className="mb-4">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Cuéntanos más sobre tu experiencia (opcional)"
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all duration-300"
                        rows="4"
                        maxLength="500"
                        aria-label="Comentario de calificación"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                        {comment.length}/500 caracteres
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        disabled={isSubmitting}
                    >
                        Ahora no
                    </button>
                    <button
                        onClick={submitRating}
                        disabled={rating === 0 || isSubmitting}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                            </span>
                        ) : 'Enviar Calificación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// 🎨 COMPONENTE: RatingNotification
// ============================================
const RatingNotification = ({ show, onRate, onDismiss, otherUser }) => {
    if (!show) return null;

    return (
        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl shadow-lg animate-slideDown">
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        ¿Qué tal tu conversación?
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Califica tu experiencia con {otherUser?.name}
                    </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                        onClick={onDismiss}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                        aria-label="Cerrar notificación"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <button
                        onClick={onRate}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                        Calificar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// 🎨 COMPONENTE: ImageWithLoading
// ============================================
const ImageWithLoading = React.memo(({ src, alt, className, style }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    return (
        <>
            {!loaded && (
                <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`} style={style} />
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                style={style}
            />
        </>
    );
});

ImageWithLoading.displayName = 'ImageWithLoading';

// ============================================
// 🎨 COMPONENTE: ConversationItem (Memoizado)
// ============================================
const ConversationItem = React.memo(({
    conversation,
    isActive,
    onSelect,
    onDelete,
    user,
    formatTime
}) => {
    if (!user) return null;

    return (
        <div
            onClick={() => onSelect(conversation)}
            className={`relative p-4 sm:p-5 border-b border-gray-200/30 dark:border-gray-700/30 cursor-pointer transition-all duration-300 flex items-center space-x-4 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-blue-50/50 dark:hover:from-emerald-900/10 dark:hover:to-blue-900/10 ${
                isActive 
                    ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 shadow-inner' 
                    : ''
            } group`}
        >
            <button
                onClick={(e) => onDelete(conversation, e)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 transform hover:scale-110"
                aria-label="Eliminar conversación"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>

            <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-600 shadow-lg">
                    <ImageWithLoading
                        src={conversation.other_user.avatar_url}
                        alt={conversation.other_user.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
            </div>
            
            <div className="flex-1 min-w-0 pr-8">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                        {conversation.other_user.name} {conversation.other_user.last_name}
                    </h4>
                    {conversation.last_message && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {formatTime(conversation.last_message.created_at)}
                        </span>
                    )}
                </div>
                {conversation.last_message && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                        {conversation.last_message.type === 'text' 
                            ? conversation.last_message.message 
                            : `📎 ${conversation.last_message.file_name || 'Archivo'}`
                        }
                    </p>
                )}
                {conversation.property && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                        {conversation.property.title}
                    </p>
                )}
            </div>
            
            {conversation.unread_count > 0 && (
                <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-lg animate-pulse">
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Comparación optimizada para evitar re-renders innecesarios
    return (
        prevProps.isActive === nextProps.isActive &&
        prevProps.conversation.id === nextProps.conversation.id &&
        prevProps.conversation.unread_count === nextProps.conversation.unread_count &&
        prevProps.conversation.last_message?.id === nextProps.conversation.last_message?.id &&
        prevProps.conversation.last_message?.created_at === nextProps.conversation.last_message?.created_at
    );
});

ConversationItem.displayName = 'ConversationItem';

// ============================================
// 🎨 COMPONENTE PRINCIPAL: Chat
// ============================================
function Chat() {
    // Estados básicos
    const [currentChat, setCurrentChat] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [user, setUser] = useState(null);
    
    // Estados de error (simplificados)
    const [errorMessage, setErrorMessage] = useState('');
    const [errorType, setErrorType] = useState('');
    
    const [targetConversationId, setTargetConversationId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [showFilePreview, setShowFilePreview] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceRecorder, setVoiceRecorder] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [hoveredMessage, setHoveredMessage] = useState(null);
    const [showReactionPicker, setShowReactionPicker] = useState(null);
    
    // ✅ MEJORA: Estados de responsive mejorados
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
    
    // Estados de rating
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showRatingNotification, setShowRatingNotification] = useState(false);
    const [ratingUserId, setRatingUserId] = useState(null);
    const [ratingPropertyId, setRatingPropertyId] = useState(null);
    const [canRate, setCanRate] = useState(false);
    const [hasCheckedRating, setHasCheckedRating] = useState(false);

    // Estados de delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estados de conectividad
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Estados de polling adaptativo
    const [pollInterval, setPollInterval] = useState(10000);
    const consecutiveEmptyPolls = useRef(0);

    // ✅ NUEVO: Rate limiting para mensajes
    const [lastMessageTime, setLastMessageTime] = useState(0);
    const MESSAGE_COOLDOWN = 1000; // 1 segundo entre mensajes

    // 🔒 NUEVOS ESTADOS: Límite de mensajes para no verificados
    const [messageLimit, setMessageLimit] = useState({
        remaining_messages: -1,
        total_sent: 0,
        limit: 5,
        is_verified: false
    });
    const [showVerificationBanner, setShowVerificationBanner] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const newMessageRef = useRef('');
    const isMountedRef = useRef(true);

    // Actualizar ref cuando cambia el mensaje
    useEffect(() => {
        newMessageRef.current = newMessage;
    }, [newMessage]);

    // ============================================
    // 🔧 DETECCIÓN DE MÓVIL Y RESIZE MEJORADA
    // ============================================
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            const wasMobile = isMobile;
            
            setIsMobile(mobile);
            
            // ✅ En desktop siempre visible, en móvil cerrado por defecto
            if (mobile !== wasMobile) {
                if (!mobile) {
                    // Cambió de móvil a desktop
                    setShowSidebar(true);
                } else {
                    // Cambió de desktop a móvil
                    setShowSidebar(false);
                }
            }
        };
        
        // Ejecutar inmediatamente
        handleResize();
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

    // ============================================
    // 🔧 DETECCIÓN DE CONECTIVIDAD
    // ============================================
    useEffect(() => {
        const handleOnline = () => {
            console.log('✅ Conexión restaurada');
            setIsOnline(true);
            setErrorMessage('');
            setErrorType('');
            // Refrescar datos cuando vuelva la conexión
            if (currentChat) {
                pollForNewMessages().catch(err => console.error('Error en polling:', err));
                pollForConversationUpdates().catch(err => console.error('Error en polling conversaciones:', err));
            } else {
                loadConversationsWithCache();
            }
        };
        
        const handleOffline = () => {
            console.warn('⚠️ Sin conexión a internet');
            setIsOnline(false);
            setErrorMessage('Sin conexión a internet');
            setErrorType('network');
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [currentChat]);

    // ============================================
    // 🔧 DEBOUNCE PARA BÚSQUEDA
    // ============================================
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ============================================
    // 🔧 VALIDACIÓN DE USUARIO CARGADO
    // ============================================
    useEffect(() => {
        if (!user && !isLoading) {
            console.error('❌ Usuario no cargado');
            setErrorMessage('No se pudo cargar la información del usuario. Por favor, recarga la página.');
            setErrorType('auth');
        }
    }, [user, isLoading]);

    // ============================================
    // 🔧 LIMPIEZA AL DESMONTAR
    // ============================================
    useEffect(() => {
        isMountedRef.current = true;
        
        return () => {
            console.log('🧹 Limpiando componente Chat...');
            isMountedRef.current = false;
            
            // Limpiar grabación de voz
            if (voiceRecorder) {
                if (voiceRecorder.state === 'recording') {
                    voiceRecorder.stop();
                }
                const stream = voiceRecorder.stream;
                if (stream) {
                    stream.getTracks().forEach(track => {
                        track.stop();
                        console.log('🎤 Stream de audio detenido');
                    });
                }
            }
        };
    }, [voiceRecorder]);

    // ============================================
    // 🔧 CARGA PARALELA DE DATOS INICIALES
    // ============================================
    useEffect(() => {
        const initializeChat = async () => {
            try {
                console.log('🚀 Inicializando Chat con carga paralela...');
                setIsLoading(true);
                
                // 1. Intentar cargar desde cache primero
                const cachedUser = localStorage.getItem(getCacheKey(CACHE_KEYS.USER));
                const cachedConversations = localStorage.getItem(getCacheKey(CACHE_KEYS.CONVERSATIONS));
                
                if (cachedUser && cachedConversations) {
                    try {
                        const { data: userData, timestamp: userTimestamp } = JSON.parse(cachedUser);
                        const { data: convData, timestamp: convTimestamp } = JSON.parse(cachedConversations);
                        
                        const now = Date.now();
                        
                        // Si ambos caches son recientes, usarlos inmediatamente
                        if (now - userTimestamp < CACHE_DURATION && now - convTimestamp < CACHE_DURATION) {
                            console.log('⚡ Cargando desde cache...');
                            setUser(userData);
                            setConversations(convData);
                            setIsLoading(false);
                            
                            // Actualizar en segundo plano
                            fetchDataInBackground();
                            return;
                        }
                    } catch (e) {
                        console.warn('⚠️ Cache inválido, cargando desde servidor...');
                    }
                }
                
                // 2. Si no hay cache válido, cargar en paralelo desde servidor
                const [userResponse, conversationsResponse] = await Promise.all([
                    fetchWithTimeout('/api/user', {
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-TOKEN': getCSRFToken()
                        }
                    }, 30000),
                    
                    fetchWithTimeout('/api/conversations', {
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-TOKEN': getCSRFToken()
                        }
                    }, 30000)
                ]);
                
                if (!userResponse.ok || !conversationsResponse.ok) {
                    throw new Error('Error al cargar datos iniciales');
                }
                
                const userData = await userResponse.json();
                const conversationsData = await conversationsResponse.json();
                
                // Guardar en cache
                localStorage.setItem(getCacheKey(CACHE_KEYS.USER), JSON.stringify({
                    data: userData.user,
                    timestamp: Date.now()
                }));
                
                localStorage.setItem(getCacheKey(CACHE_KEYS.CONVERSATIONS), JSON.stringify({
                    data: conversationsData.conversations || [],
                    timestamp: Date.now()
                }));
                
                // Actualizar estados
                setUser(userData.user);
                setConversations(conversationsData.conversations || []);
                
                console.log('✅ Datos iniciales cargados');
                
            } catch (error) {
                console.error('❌ Error loading initial data:', error);
                setErrorMessage(error.message || 'Error al cargar los datos iniciales');
                setErrorType('general');
            } finally {
                setIsLoading(false);
            }
        };
        
        initializeChat();
    }, []);

    // ============================================
    // 🔧 ACTUALIZACIÓN EN SEGUNDO PLANO
    // ============================================
    const fetchDataInBackground = async () => {
        try {
            console.log('🔄 Actualizando datos en segundo plano...');
            
            const [userResponse, conversationsResponse] = await Promise.all([
                fetchWithTimeout('/api/user', {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCSRFToken()
                    }
                }, 30000),
                
                fetchWithTimeout('/api/conversations', {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCSRFToken()
                    }
                }, 30000)
            ]);
            
            if (userResponse.ok && conversationsResponse.ok) {
                const userData = await userResponse.json();
                const conversationsData = await conversationsResponse.json();
                
                // Actualizar cache
                localStorage.setItem(getCacheKey(CACHE_KEYS.USER), JSON.stringify({
                    data: userData.user,
                    timestamp: Date.now()
                }));
                
                localStorage.setItem(getCacheKey(CACHE_KEYS.CONVERSATIONS), JSON.stringify({
                    data: conversationsData.conversations || [],
                    timestamp: Date.now()
                }));
                
                // Actualizar UI solo si hay cambios
                setUser(prevUser => {
                    if (JSON.stringify(prevUser) !== JSON.stringify(userData.user)) {
                        return userData.user;
                    }
                    return prevUser;
                });
                
                setConversations(prevConv => {
                    if (JSON.stringify(prevConv) !== JSON.stringify(conversationsData.conversations)) {
                        return conversationsData.conversations || [];
                    }
                    return prevConv;
                });
                
                console.log('✅ Datos actualizados en segundo plano');
            }
        } catch (error) {
            console.error('⚠️ Error en actualización de fondo:', error);
            // No mostrar error al usuario, solo log
        }
    };

    // ============================================
    // 🔧 CARGAR CONVERSACIONES CON CACHE
    // ============================================
    const loadConversationsWithCache = useCallback(async () => {
        try {
            // Intentar desde cache
            const cached = localStorage.getItem(getCacheKey(CACHE_KEYS.CONVERSATIONS));
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                
                if (Date.now() - timestamp < CACHE_DURATION) {
                    setConversations(data);
                    fetchDataInBackground();
                    return;
                }
            }
            
            // Si no hay cache válido, cargar desde servidor
            const response = await fetchWithTimeout('/api/conversations', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                }
            }, 30000);
            
            if (!response.ok) throw new Error('Error al cargar conversaciones');
            
            const data = await response.json();
            const conversations = data.conversations || [];
            
            // Actualizar cache
            localStorage.setItem(getCacheKey(CACHE_KEYS.CONVERSATIONS), JSON.stringify({
                data: conversations,
                timestamp: Date.now()
            }));
            
            setConversations(conversations);
            
        } catch (error) {
            console.error('❌ Error loading conversations:', error);
            setErrorMessage(error.message || 'Error al cargar las conversaciones');
            setErrorType('general');
        }
    }, []);

    // ============================================
    // 🔧 MARCAR MENSAJES COMO LEÍDOS
    // ============================================
    const markMessagesAsRead = useCallback(async (conversationId) => {
        if (!isMountedRef.current) return;
        
        try {
            await fetchWithTimeout(`/api/conversations/${conversationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                }
            }, 30000);
        } catch (error) {
            console.error('⚠️ Error marking messages as read:', error);
        }
    }, []);

    // ============================================
    // 🔧 CARGAR MENSAJES
    // ============================================
    const loadMessages = useCallback(async (conversationId) => {
        if (!isMountedRef.current) return;
        
        try {
            const response = await fetchWithTimeout(`/api/conversations/${conversationId}/messages`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                }
            }, 30000);
            
            if (!response.ok) throw new Error('Error al cargar mensajes');
            
            const data = await response.json();

            if (isMountedRef.current) {
                setMessages(data.messages || []);
                markMessagesAsRead(conversationId);

                // 🔒 Actualizar límite de mensajes si viene en la respuesta
                if (data.message_limit) {
                    setMessageLimit(data.message_limit);
                }
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            if (isMountedRef.current) {
                setErrorMessage(error.message || 'Error al cargar los mensajes');
                setErrorType('messages');
            }
        }
    }, [markMessagesAsRead]);

    // ============================================
    // 🔧 POLLING ADAPTATIVO DE MENSAJES
    // ============================================
    // ============================================
    // 🔔 NOTIFICACIONES DEL NAVEGADOR
    // ============================================
    const showMessageNotification = useCallback((message, senderName) => {
        // Solo mostrar notificación si:
        // 1. El usuario tiene permisos
        // 2. La ventana no está en foco
        // 3. El mensaje no es del usuario actual
        if ('Notification' in window &&
            Notification.permission === 'granted' &&
            document.hidden &&
            message.sender_id !== user?.id) {

            const messagePreview = message.type === 'text'
                ? message.message.substring(0, 50) + (message.message.length > 50 ? '...' : '')
                : message.type === 'audio'
                ? '🎤 Mensaje de voz'
                : message.type === 'file'
                ? `📎 ${message.file_name || 'Archivo'}`
                : 'Nuevo mensaje';

            const notification = new Notification(`💬 ${senderName}`, {
                body: messagePreview,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `chat-message-${message.id}`,
                requireInteraction: false,
                silent: false
            });

            // Click en la notificación para abrir el chat
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto cerrar después de 5 segundos
            setTimeout(() => notification.close(), 5000);
        }
    }, [user]);

    // Solicitar permisos de notificación al iniciar el componente
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('🔔 Permiso de notificaciones:', permission);
            });
        }
    }, []);

    const pollForNewMessages = useCallback(async () => {
        if (!currentChat || !user || !isMountedRef.current) return;

        try {
            const response = await fetchWithTimeout(`/api/conversations/${currentChat.id}/messages`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                }
            }, 30000);

            if (response.ok && isMountedRef.current) {
                const data = await response.json();
                const newMessages = data.messages || [];

                setMessages(prevMessages => {
                    // Si no hay mensajes locales, cargar los del servidor
                    if (prevMessages.length === 0) {
                        if (newMessages.length > 0) {
                            consecutiveEmptyPolls.current = 0;
                            setPollInterval(5000); // Conversación activa
                            markMessagesAsRead(currentChat.id);
                        }
                        return newMessages;
                    }

                    // Comparar con el último mensaje local
                    const lastLocalMessage = prevMessages[prevMessages.length - 1];
                    const lastServerMessage = newMessages[newMessages.length - 1];

                    // Si hay nuevos mensajes
                    if (newMessages.length > prevMessages.length) {
                        console.log('📬 Nuevos mensajes recibidos');
                        consecutiveEmptyPolls.current = 0;
                        setPollInterval(5000); // Aumentar frecuencia
                        markMessagesAsRead(currentChat.id);

                        // 🔔 MOSTRAR NOTIFICACIÓN para mensajes nuevos que no son del usuario
                        const newMessagesOnly = newMessages.slice(prevMessages.length);
                        newMessagesOnly.forEach(msg => {
                            if (msg.sender_id !== user.id && !msg.is_blocked) {
                                const senderName = msg.sender?.name
                                    ? `${msg.sender.name} ${msg.sender.last_name || ''}`.trim()
                                    : 'Usuario';
                                showMessageNotification(msg, senderName);
                            }
                        });

                        return newMessages;
                    }

                    // Si el último mensaje cambió (actualización)
                    if (lastServerMessage && lastLocalMessage &&
                        (lastServerMessage.id !== lastLocalMessage.id ||
                         lastServerMessage.updated_at !== lastLocalMessage.updated_at)) {
                        return newMessages;
                    }

                    // No hay cambios
                    consecutiveEmptyPolls.current++;

                    // Reducir frecuencia de polling si no hay actividad
                    if (consecutiveEmptyPolls.current > 3) {
                        setPollInterval(30000); // 30 segundos
                    } else if (consecutiveEmptyPolls.current > 6) {
                        setPollInterval(60000); // 1 minuto
                    }

                    return prevMessages;
                });
            }
        } catch (error) {
            console.error('⚠️ Error polling messages:', error);
        }
    }, [currentChat, user, markMessagesAsRead, showMessageNotification]);

    // ============================================
    // 🔧 POLLING DE CONVERSACIONES
    // ============================================
    const pollForConversationUpdates = useCallback(async () => {
        if (!user || !isMountedRef.current) return;

        try {
            const response = await fetchWithTimeout('/api/conversations', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                }
            }, 30000);

            if (response.ok && isMountedRef.current) {
                const data = await response.json();
                const newConversations = data.conversations || [];

                // Actualizar cache
                localStorage.setItem(getCacheKey(CACHE_KEYS.CONVERSATIONS), JSON.stringify({
                    data: newConversations,
                    timestamp: Date.now()
                }));

                // Actualizar solo si hay cambios
                setConversations(prevConv => {
                    // 🔔 DETECTAR NUEVOS MENSAJES EN CONVERSACIONES
                    if (prevConv.length > 0 && newConversations.length > 0) {
                        newConversations.forEach(newConv => {
                            const oldConv = prevConv.find(c => c.id === newConv.id);

                            // Si hay mensajes no leídos nuevos en una conversación que NO es la actual
                            if (oldConv &&
                                newConv.unread_count > 0 &&
                                newConv.unread_count > (oldConv.unread_count || 0) &&
                                (!currentChat || currentChat.id !== newConv.id)) {

                                // Mostrar notificación solo si la ventana no está en foco
                                if (document.hidden &&
                                    'Notification' in window &&
                                    Notification.permission === 'granted') {

                                    const lastMessage = newConv.last_message;
                                    const senderName = newConv.other_user?.name
                                        ? `${newConv.other_user.name} ${newConv.other_user.last_name || ''}`.trim()
                                        : 'Usuario';

                                    const messagePreview = lastMessage?.message && !lastMessage.is_blocked
                                        ? lastMessage.message.substring(0, 50) + (lastMessage.message.length > 50 ? '...' : '')
                                        : 'Nuevo mensaje';

                                    const notification = new Notification(`💬 ${senderName}`, {
                                        body: messagePreview,
                                        icon: '/favicon.ico',
                                        badge: '/favicon.ico',
                                        tag: `chat-conversation-${newConv.id}`,
                                        requireInteraction: false,
                                        silent: false
                                    });

                                    notification.onclick = () => {
                                        window.focus();
                                        notification.close();
                                    };

                                    setTimeout(() => notification.close(), 5000);
                                }
                            }
                        });
                    }

                    if (JSON.stringify(prevConv) !== JSON.stringify(newConversations)) {
                        return newConversations;
                    }
                    return prevConv;
                });
            }
        } catch (error) {
            console.error('⚠️ Error polling conversations:', error);
        }
    }, [user, currentChat]);

    // ============================================
    // 🔧 VERIFICAR SI MOSTRAR RATING
    // ============================================
    const checkShouldShowRating = useCallback(async () => {
        if (!currentChat || !user || hasCheckedRating || !isMountedRef.current) return;

        // 🔒 RESTRICCIÓN: No mostrar rating si el usuario no está verificado
        if (!user.is_identity_verified) {
            console.log('⚠️ Usuario no verificado, rating bloqueado');
            return;
        }

        try {
            const response = await fetchWithTimeout('/api/ratings/should-show-prompt', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                },
                body: JSON.stringify({
                    user_id: currentChat.other_user_id,
                    property_id: currentChat.property_id
                })
            }, 30000);
            
            const data = await response.json();
            
            if (data.success && data.should_show && isMountedRef.current) {
                setRatingUserId(currentChat.other_user_id);
                setRatingPropertyId(currentChat.property_id);
                setCanRate(true);
                setShowRatingNotification(true);
                setHasCheckedRating(true);
            }
        } catch (error) {
            console.error('⚠️ Error checking rating prompt:', error);
        }
    }, [currentChat, user, hasCheckedRating]);

    // ============================================
    // 🔧 DETECTAR KEYWORDS PARA RATING
    // ============================================
    const detectKeywords = useCallback(async (messageText) => {
        if (!messageText.trim() || !currentChat || !isMountedRef.current) return;
        
        try {
            const response = await fetchWithTimeout('/api/ratings/detect-keywords', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                },
                body: JSON.stringify({ message: messageText })
            }, 30000);
            
            const data = await response.json();
            
            if (data.success && data.should_show_rating && !hasCheckedRating && isMountedRef.current) {
                checkShouldShowRating();
            }
        } catch (error) {
            console.error('⚠️ Error detecting keywords:', error);
        }
    }, [currentChat, hasCheckedRating, checkShouldShowRating]);

    // ============================================
    // 🔧 ELIMINAR CHAT
    // ============================================
    const deleteChat = useCallback(async (conversation) => {
        if (!conversation || !user || !isMountedRef.current) return;
        
        try {
            setIsDeleting(true);
            console.log('🗑️ Eliminando conversación:', conversation);
            
            const conversationId = `property_${conversation.property_id}_users_${Math.min(conversation.other_user_id, user.id)}_${Math.max(conversation.other_user_id, user.id)}`;
            
            console.log('🔑 ID de conversación:', conversationId);
            
            const response = await fetchWithTimeout(`/api/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                }
            }, 30000);
            
            const data = await response.json();
            
            if (response.ok && data.success && isMountedRef.current) {
                console.log('✅ Conversación eliminada exitosamente');

                // ✅ Verificar si la conversación eliminada es la actual
                const isCurrentChat = currentChat?.id === conversationId ||
                                     (currentChat?.property_id === conversation.property_id &&
                                      currentChat?.other_user_id === conversation.other_user_id);

                console.log('🔍 Eliminando conversación:', {
                    conversationId,
                    currentChatId: currentChat?.id,
                    isCurrentChat,
                    propertyId: conversation.property_id,
                    otherUserId: conversation.other_user_id
                });

                // ✅ SIEMPRE limpiar el chat actual si coincide
                if (isCurrentChat) {
                    console.log('🧹 Limpiando chat actual...');
                    // Limpiar chat actual y todos los estados relacionados
                    setCurrentChat(null);
                    setMessages([]);
                    setNewMessage('');
                    newMessageRef.current = '';
                    setSelectedFile(null);
                    setShowFilePreview(false);
                    setErrorMessage('');
                    setErrorType('');
                    setShowRatingNotification(false);
                    setShowRatingModal(false);
                    setHasCheckedRating(false);
                    setRatingUserId(null);
                    setRatingPropertyId(null);
                    setCanRate(false);
                    setIsRecording(false);
                    setVoiceRecorder(null);
                    setHoveredMessage(null);
                    setShowReactionPicker(null);

                    // Limpiar input de archivo
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }

                // Actualizar lista de conversaciones
                setConversations(prev => prev.filter(conv => {
                    const convId = `property_${conv.property_id}_users_${Math.min(conv.other_user_id, user.id)}_${Math.max(conv.other_user_id, user.id)}`;
                    return convId !== conversationId;
                }));

                // Cerrar modal inmediatamente
                setShowDeleteModal(false);
                setChatToDelete(null);

                // ✅ Recargar conversaciones en background (no bloqueante)
                setTimeout(() => {
                    if (isMountedRef.current) {
                        loadConversationsWithCache().catch(err =>
                            console.error('Error recargando conversaciones:', err)
                        );
                    }
                }, 100);
            } else {
                console.error('❌ Error del servidor:', data.message);
                setErrorMessage(data.message || 'Error al eliminar la conversación');
                setErrorType('delete');
            }
            
        } catch (error) {
            console.error('❌ Error al eliminar chat:', error);
            if (isMountedRef.current) {
                setErrorMessage(error.message || 'Error de conexión al eliminar la conversación');
                setErrorType('delete');
            }
        } finally {
            if (isMountedRef.current) {
                setIsDeleting(false);
            }
        }
    }, [currentChat, user, loadConversationsWithCache]);

    // ============================================
    // 🔧 HANDLE DELETE CLICK
    // ============================================
    const handleDeleteClick = useCallback((conversation, e) => {
        e.stopPropagation();
        console.log('🗑️ Solicitando eliminación de:', conversation);
        setChatToDelete(conversation);
        setShowDeleteModal(true);
    }, []);

    // ============================================
    // 🔧 SELECCIONAR CONVERSACIÓN (MEJORADO)
    // ============================================
    const selectConversation = useCallback((conversation) => {
        if (!user) return;
        
        const conversationId = `property_${conversation.property_id}_users_${Math.min(conversation.other_user_id, user.id)}_${Math.max(conversation.other_user_id, user.id)}`;
        const conversationWithId = { 
            ...conversation, 
            id: conversationId,
            other_user_id: conversation.other_user.id
        };
        
        setCurrentChat(conversationWithId);
        loadMessages(conversationId);
        setErrorMessage('');
        setErrorType('');
        setHasCheckedRating(false);
        setShowRatingNotification(false);
        consecutiveEmptyPolls.current = 0;
        setPollInterval(10000);
        
        // ✅ MEJORA: SIEMPRE cerrar sidebar en móvil al seleccionar
        if (isMobile) {
            setShowSidebar(false);
        }
    }, [user, loadMessages, isMobile]);

    // ============================================
    // 🔧 ENVIAR MENSAJE (CON RATE LIMITING)
    // ============================================
    const sendMessage = useCallback(async (e) => {
        e.preventDefault();

        const messageText = newMessageRef.current.trim();

        if ((!messageText && !selectedFile) || !currentChat || isSending || !isMountedRef.current) return;

        // ✅ MEJORA: Rate limiting
        const now = Date.now();
        if (now - lastMessageTime < MESSAGE_COOLDOWN) {
            setErrorMessage('Por favor espera un momento antes de enviar otro mensaje');
            setErrorType('message');
            setTimeout(() => {
                if (isMountedRef.current) {
                    setErrorMessage('');
                    setErrorType('');
                }
            }, 2000);
            return;
        }
        setLastMessageTime(now);

        // ID temporal para optimistic update
        const tempId = `temp_${Date.now()}`;

        try {
            setIsSending(true);
            setErrorMessage('');
            setErrorType('');
            
            const formData = new FormData();
            formData.append('message', messageText || '');
            formData.append('receiver_id', currentChat.other_user_id);
            
            if (currentChat.property_id) {
                formData.append('property_id', currentChat.property_id);
            }
            
            if (selectedFile) {
                formData.append('file', selectedFile);
            }
            
            const response = await fetchWithTimeout('/api/messages', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                },
                body: formData
            }, 30000);

            if (!response.ok) {
                const errorData = await response.json();

                // 🔒 Manejo especial para límite de mensajes alcanzado
                if (errorData.error === 'MESSAGE_LIMIT_REACHED') {
                    if (isMountedRef.current) {
                        setMessageLimit(errorData.data);
                        setShowVerificationBanner(true);
                        setErrorMessage(errorData.message);
                        setErrorType('verification');
                    }
                    return; // No throw, solo mostrar banner
                }

                throw new Error(errorData.message || 'Error al enviar mensaje');
            }

            // ✅ OPTIMISTIC UPDATE: Crear mensaje temporal inmediatamente
            const optimisticMessage = {
                id: tempId,
                content: messageText || '',
                sender_id: user.id,
                receiver_id: currentChat.other_user_id,
                created_at: new Date().toISOString(),
                is_read: false,
                file_url: selectedFile ? URL.createObjectURL(selectedFile) : null,
                file_type: selectedFile?.type?.split('/')[0] || null,
                sender: {
                    id: user.id,
                    name: user.name,
                    avatar_url: user.avatar_url
                },
                _optimistic: true // Marca para identificar mensajes optimistas
            };

            // Mostrar mensaje inmediatamente
            if (isMountedRef.current) {
                setMessages(prev => [...prev, optimisticMessage]);
                setNewMessage('');
                newMessageRef.current = '';
                setSelectedFile(null);
                setShowFilePreview(false);

                // Limpiar input de archivo
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                if (messageText) {
                    detectKeywords(messageText);
                }
            }

            // Obtener respuesta del servidor
            const data = await response.json();

            // 🔒 Actualizar límite de mensajes con la respuesta
            if (data.message_limit && isMountedRef.current) {
                setMessageLimit(data.message_limit);

                // Mostrar banner si quedan pocos mensajes y no está verificado
                if (!data.message_limit.is_verified && data.message_limit.remaining_messages <= 2 && data.message_limit.remaining_messages > 0) {
                    setShowVerificationBanner(true);
                }
            }

            // Reemplazar mensaje optimista con el real del servidor
            if (isMountedRef.current) {
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? data.message : msg
                ));

                // Resetear polling a frecuencia alta (conversación activa)
                consecutiveEmptyPolls.current = 0;
                setPollInterval(5000);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            if (isMountedRef.current) {
                // Eliminar mensaje optimista si hay error
                setMessages(prev => prev.filter(msg => msg.id !== tempId));
                setErrorMessage(error.message);
                setErrorType('message');
            }
        } finally {
            if (isMountedRef.current) {
                setIsSending(false);
                messageInputRef.current?.focus();
            }
        }
    }, [selectedFile, currentChat, isSending, detectKeywords, lastMessageTime]);

    // ============================================
    // 🔧 VALIDACIÓN ROBUSTA DE ARCHIVOS
    // ============================================
    const handleFileSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Limpiar errores previos
        setErrorMessage('');
        setErrorType('');
        
        // 1. Validar tamaño máximo
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setErrorMessage(`El archivo no puede ser mayor a ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
            setErrorType('file');
            e.target.value = ''; // Limpiar input
            return;
        }
        
        // 2. Validar tamaño mínimo (evitar archivos vacíos)
        if (file.size === 0) {
            setErrorMessage('El archivo está vacío');
            setErrorType('file');
            e.target.value = '';
            return;
        }
        
        // 3. Validar tipo MIME
        const allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/webm',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            setErrorMessage(`Tipo de archivo no permitido: ${file.type}. Solo se permiten: imágenes, PDF, TXT, Word y audio.`);
            setErrorType('file');
            e.target.value = '';
            return;
        }
        
        // 4. Validar extensión (doble verificación)
        const allowedExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp',
            '.pdf', '.txt', '.doc', '.docx',
            '.webm', '.mp4', '.mp3', '.wav'
        ];
        
        const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            setErrorMessage(`Extensión de archivo no permitida: ${fileExtension || 'desconocida'}`);
            setErrorType('file');
            e.target.value = '';
            return;
        }
        
        // 5. Validar nombre de archivo
        if (file.name.length > 255) {
            setErrorMessage('El nombre del archivo es demasiado largo');
            setErrorType('file');
            e.target.value = '';
            return;
        }
        
        // 6. Validar caracteres especiales en nombre
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        if (dangerousChars.test(file.name)) {
            setErrorMessage('El nombre del archivo contiene caracteres no permitidos');
            setErrorType('file');
            e.target.value = '';
            return;
        }
        
        // 7. Todo OK
        setSelectedFile(file);
        setShowFilePreview(true);
        console.log('✅ Archivo seleccionado:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
    }, []);

    // ============================================
    // 🔧 REMOVER ARCHIVO
    // ============================================
    const removeFile = useCallback(() => {
        setSelectedFile(null);
        setShowFilePreview(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setErrorMessage('');
        setErrorType('');
    }, []);

    // ============================================
    // 🔧 GRABACIÓN DE VOZ
    // ============================================
    const startVoiceRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/mp4';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = '';
            }
            
            const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
            const audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                if (!isMountedRef.current) {
                    // Si el componente se desmontó, detener el stream y salir
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                
                const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
                let fileName = 'voice-message.webm';
                let fileType = mimeType || 'audio/webm';
                
                if (mimeType.includes('mp4')) {
                    fileName = 'voice-message.mp4';
                }
                
                const audioFile = new File([audioBlob], fileName, { type: fileType });
                setSelectedFile(audioFile);
                setShowFilePreview(true);
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            setIsRecording(true);
            setVoiceRecorder(mediaRecorder);
            
            // Detener automáticamente después de 60 segundos
            setTimeout(() => {
                if (mediaRecorder.state === 'recording' && isMountedRef.current) {
                    stopVoiceRecording();
                }
            }, 60000);
            
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            setErrorMessage('No se pudo acceder al micrófono. Verifica los permisos.');
            setErrorType('voice');
        }
    }, []);

    const stopVoiceRecording = useCallback(() => {
        if (voiceRecorder && voiceRecorder.state === 'recording') {
            voiceRecorder.stop();
            setIsRecording(false);
            setVoiceRecorder(null);
        }
    }, [voiceRecorder]);

    // ============================================
    // 🔧 REACCIONES
    // ============================================
    const addReaction = useCallback(async (messageId, emoji) => {
        if (!isMountedRef.current) return;
        
        try {
            const response = await fetchWithTimeout(`/messages/${messageId}/reactions`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                },
                body: JSON.stringify({ emoji })
            }, 30000);
            
            if (response.ok && isMountedRef.current) {
                const data = await response.json();
                setMessages(prevMessages => 
                    prevMessages.map(msg => 
                        msg.id === messageId 
                            ? { ...msg, reactions: data.reactions } 
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error('⚠️ Error adding reaction:', error);
        }
    }, []);

    const removeReaction = useCallback(async (messageId, emoji) => {
        if (!isMountedRef.current) return;
        
        try {
            const response = await fetchWithTimeout(`/messages/${messageId}/reactions`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCSRFToken()
                },
                body: JSON.stringify({ emoji })
            }, 30000);
            
            if (response.ok && isMountedRef.current) {
                const data = await response.json();
                setMessages(prevMessages => 
                    prevMessages.map(msg => 
                        msg.id === messageId 
                            ? { ...msg, reactions: data.reactions } 
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error('⚠️ Error removing reaction:', error);
        }
    }, []);

    const toggleReaction = useCallback(async (messageId, emoji) => {
        if (!user || !isMountedRef.current) return;
        
        const message = messages.find(msg => msg.id === messageId);
        if (!message) return;
        
        const reactions = message.reactions || {};
        const userIds = reactions[emoji] || [];
        const hasUserReacted = userIds.includes(user.id);
        
        if (hasUserReacted) {
            await removeReaction(messageId, emoji);
        } else {
            await addReaction(messageId, emoji);
        }
    }, [messages, user, addReaction, removeReaction]);

    // ============================================
    // 🔧 COMPARTIR UBICACIÓN
    // ============================================
    const shareLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setErrorMessage('La geolocalización no está soportada en este navegador');
            setErrorType('location');
            return;
        }
        
        setIsGettingLocation(true);
        setErrorMessage('');
        setErrorType('');
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    const formData = new FormData();
                    formData.append('receiver_id', currentChat.other_user_id);
                    formData.append('property_id', currentChat.property_id);
                    formData.append('message', `Ubicación compartida: ${latitude}, ${longitude}`);
                    formData.append('type', 'location');
                    formData.append('metadata', JSON.stringify({ 
                        latitude, 
                        longitude, 
                        accuracy: position.coords.accuracy 
                    }));
                    
                    const response = await fetchWithTimeout('/api/messages', {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-TOKEN': getCSRFToken()
                        },
                        body: formData
                    }, 30000);
                    
                    if (response.ok && isMountedRef.current) {
                        const data = await response.json();
                        setMessages(prev => [...prev, data.message]);
                    }
                } catch (error) {
                    console.error('❌ Error sending location:', error);
                    if (isMountedRef.current) {
                        setErrorMessage(error.message || 'Error al compartir ubicación');
                        setErrorType('location');
                    }
                } finally {
                    if (isMountedRef.current) {
                        setIsGettingLocation(false);
                    }
                }
            },
            (error) => {
                console.error('❌ Geolocation error:', error);
                if (isMountedRef.current) {
                    setErrorMessage('No se pudo obtener la ubicación. Verifica los permisos.');
                    setErrorType('location');
                    setIsGettingLocation(false);
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [currentChat]);

    // ============================================
    // 🔧 HANDLERS DE RATING
    // ============================================
    const handleOpenRatingModal = useCallback(() => {
        setShowRatingNotification(false);
        setShowRatingModal(true);
    }, []);

    const handleCloseRatingModal = useCallback(() => {
        setShowRatingModal(false);
    }, []);

    const handleDismissNotification = useCallback(() => {
        setShowRatingNotification(false);
        setHasCheckedRating(true);
    }, []);

    const handleRatingSubmitted = useCallback((ratingResult) => {
        console.log('✅ Calificación enviada:', ratingResult);
        setShowRatingModal(false);
        setShowRatingNotification(false);
        setHasCheckedRating(true);
    }, []);

    // ============================================
    // 🔧 FORMATEAR TIEMPO (Memoizado)
    // ============================================
    const formatTime = useCallback(formatTimeSafe, []);

    // ============================================
    // 🔧 CONVERSACIONES FILTRADAS (Memoizado con debounce)
    // ============================================
    const filteredConversations = useMemo(() => {
        if (!debouncedSearchTerm) return conversations;
        
        const searchLower = debouncedSearchTerm.toLowerCase();
        return conversations.filter(conv =>
            conv.other_user.name.toLowerCase().includes(searchLower) ||
            conv.other_user.last_name.toLowerCase().includes(searchLower)
        );
    }, [conversations, debouncedSearchTerm]);

    // ============================================
    // 🔧 CLASES CSS MEMOIZADAS
    // ============================================
    const messageClasses = useMemo(() => ({
        own: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-br-md shadow-xl shadow-emerald-500/30",
        other: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white rounded-bl-md shadow-lg"
    }), []);

    // ============================================
    // 🔧 CONVERSACIÓN DESDE URL
    // ============================================
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const conversationFromUrl = urlParams.get('conversation');
        if (conversationFromUrl) {
            setTargetConversationId(conversationFromUrl);
        }
    }, []);

    useEffect(() => {
        if (targetConversationId && conversations.length > 0 && !currentChat && user) {
            const foundConversation = conversations.find(conv => {
                const convId = `property_${conv.property_id}_users_${Math.min(conv.other_user.id, user.id)}_${Math.max(conv.other_user.id, user.id)}`;
                return convId === targetConversationId;
            });
            
            if (foundConversation) {
                selectConversation(foundConversation);
                window.history.replaceState({}, '', '/chat');
            }
        }
    }, [conversations, targetConversationId, currentChat, user, selectConversation]);

    // ============================================
    // 🔧 POLLING CON INTERVALO ADAPTATIVO (MEJORADO)
    // ============================================
    useEffect(() => {
        let messageInterval = null;
        let conversationInterval = null;
        
        if (currentChat && user && isMountedRef.current) {
            // Polling de mensajes con intervalo adaptativo
            messageInterval = setInterval(() => {
                if (isMountedRef.current) {
                    pollForNewMessages().catch(err => {
                        console.error('⚠️ Error en polling de mensajes:', err);
                    });
                }
            }, pollInterval);
            
            // Polling de conversaciones cada 30 segundos
            conversationInterval = setInterval(() => {
                if (isMountedRef.current) {
                    pollForConversationUpdates().catch(err => {
                        console.error('⚠️ Error en polling de conversaciones:', err);
                    });
                }
            }, 30000);
            
            console.log(`⏱️ Polling iniciado: mensajes cada ${pollInterval/1000}s`);
        }
        
        return () => {
            if (messageInterval) {
                clearInterval(messageInterval);
                messageInterval = null;
                console.log('🛑 Polling de mensajes detenido');
            }
            if (conversationInterval) {
                clearInterval(conversationInterval);
                conversationInterval = null;
                console.log('🛑 Polling de conversaciones detenido');
            }
        };
    }, [currentChat, user, pollInterval, pollForNewMessages, pollForConversationUpdates]);

    // ============================================
    // 🔧 POLLING AL HACER FOCUS EN LA VENTANA
    // ============================================
    useEffect(() => {
        const handleFocus = () => {
            if (isMountedRef.current) {
                console.log('👁️ Ventana en foco, actualizando datos...');
                if (currentChat) {
                    pollForNewMessages().catch(err => console.error('Error:', err));
                    pollForConversationUpdates().catch(err => console.error('Error:', err));
                } else {
                    loadConversationsWithCache();
                }
            }
        };
        
        const handleBlur = () => {
            console.log('👁️ Ventana sin foco');
        };
        
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, [currentChat, pollForNewMessages, pollForConversationUpdates, loadConversationsWithCache]);

    // ============================================
    // 🔧 VERIFICAR RATING DESPUÉS DE 8 MENSAJES
    // ============================================
    useEffect(() => {
        if (messages.length >= 8 && currentChat && user && !hasCheckedRating && isMountedRef.current) {
            checkShouldShowRating();
        }
    }, [messages.length, currentChat, user, hasCheckedRating, checkShouldShowRating]);

    // ============================================
    // 🔧 SCROLL AUTOMÁTICO AL FINAL
    // ============================================
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // ============================================
    // 🔧 AJUSTE DE VIEWPORT EN MÓVIL (Teclado)
    // ============================================
    useEffect(() => {
        if (!isMobile) return;
        
        const handleResize = () => {
            if (window.visualViewport) {
                const viewport = window.visualViewport;
                
                // Si el viewport se reduce significativamente (teclado apareció)
                if (viewport.height < window.innerHeight * 0.75) {
                    // Scroll al input
                    setTimeout(() => {
                        messageInputRef.current?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }, 100);
                }
            }
        };
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport.removeEventListener('resize', handleResize);
        }
    }, [isMobile]);

    // ============================================
    // 🔧 RESETEAR POLLING AL ESCRIBIR
    // ============================================
    const handleTyping = useCallback(() => {
        setPollInterval(5000); // Conversación activa
        consecutiveEmptyPolls.current = 0;
    }, []);

    // ============================================
    // 🔧 CERRAR SIDEBAR AL PRESIONAR ESCAPE
    // ============================================
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isMobile && showSidebar) {
                setShowSidebar(false);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMobile, showSidebar]);

    // ============================================
    // 🎨 LOADING STATE
    // ============================================
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="text-center">
                    <div className="relative mx-auto mb-6">
                        <div className="w-20 h-20 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-b-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent animate-pulse mb-2">
                        Cargando Chat
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Preparando tu experiencia de mensajería...</p>

                    <div className="flex justify-center space-x-2 mt-6">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.2}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // 🎨 RENDER PRINCIPAL
    // ============================================
    return (
        <div className="h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex overflow-hidden pt-16">
            {/* ✅ Indicador de conexión offline */}
            {!isOnline && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
                    ⚠️ Sin conexión a internet
                </div>
            )}

            {/* ✅ Overlay móvil mejorado */}
            {isMobile && showSidebar && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setShowSidebar(false)}
                    aria-label="Cerrar menú de conversaciones"
                />
            )}

            {/* ========================================== */}
            {/* ✅ SIDEBAR MEJORADO - LISTA DE CONVERSACIONES */}
            {/* ========================================== */}
            <div className={`
                ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'} 
                ${isMobile ? 'w-[85vw] max-w-sm' : 'w-80 lg:w-96'}
                ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
                ${isMobile ? 'z-50' : 'z-10'}
                bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm
                border-r border-gray-200/50 dark:border-gray-700/50 
                flex flex-col 
                transition-transform duration-300 ease-out
                shadow-2xl
                ${isMobile ? 'pt-16' : ''}
            `}>
                {/* Header del sidebar */}
                <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/80 to-emerald-50/80 dark:from-gray-800/80 dark:to-emerald-900/20">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent">
                                Mensajes
                            </h2>
                        </div>
                        {/* ✅ Botón de cerrar solo en móvil */}
                        {isMobile && (
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg active:scale-95"
                                aria-label="Cerrar menú"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    {/* Buscador */}
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Buscar conversaciones..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 shadow-sm group-hover:shadow-md"
                            aria-label="Buscar conversaciones"
                        />
                        <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
        
                {/* Lista de conversaciones */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
                            <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-sm">
                                {searchTerm ? 'No se encontraron conversaciones' : 'No tienes conversaciones aún'}
                            </p>
                        </div>
                    ) : (
                        filteredConversations
                            .filter(() => user !== null)
                            .map((conversation) => {
                                const conversationId = `property_${conversation.property_id}_users_${Math.min(conversation.other_user.id, user.id)}_${Math.max(conversation.other_user.id, user.id)}`;
                                
                                return (
                                    <ConversationItem
                                        key={conversationId}
                                        conversation={conversation}
                                        isActive={currentChat?.id === conversationId}
                                        onSelect={selectConversation}
                                        onDelete={handleDeleteClick}
                                        user={user}
                                        formatTime={formatTime}
                                    />
                                );
                            })
                    )}
                </div>
            </div>

            {/* ========================================== */}
            {/* ✅ ÁREA PRINCIPAL - CHAT MEJORADO */}
            {/* ========================================== */}
            <div className="flex-1 flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm min-w-0 shadow-xl">
                {currentChat ? (
                    <>
                        {/* Header del chat */}
                        <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/90 to-emerald-50/90 dark:from-gray-800/90 dark:to-emerald-900/20">
                            <div className="flex items-center space-x-4 sm:space-x-5">
                                {/* ✅ Botón hamburguesa solo en móvil */}
                                {isMobile && (
                                    <button
                                        onClick={() => setShowSidebar(true)}
                                        className="p-2.5 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg -ml-2 active:scale-95"
                                        aria-label="Abrir conversaciones"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </button>
                                )}
                                <div className="relative">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-700 shadow-lg">
                                        <ImageWithLoading
                                            src={currentChat.other_user.avatar_url}
                                            alt={currentChat.other_user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl truncate">
                                        {currentChat.other_user.name} {currentChat.other_user.last_name}
                                    </h3>
                                    {currentChat.property && (
                                        <p className="text-sm sm:text-base text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                            {currentChat.property.title}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Área de mensajes */}
                        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 px-4">
                                    <div>
                                        <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <p className="text-base sm:text-lg font-medium mb-2">No hay mensajes aún</p>
                                        <p className="text-sm">¡Envía el primer mensaje para comenzar la conversación!</p>
                                    </div>
                                </div>
                            ) : (
                                messages
                                    .filter(() => user !== null)
                                    .map((message, index) => {
                                        const isOwn = message.sender_id === user.id;
                                        const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                                        
                                        return (
                                            <div 
                                                key={message.id} 
                                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4 sm:mt-6' : 'mt-1'}`}
                                            >
                                                <div className={`flex items-end space-x-1 sm:space-x-2 max-w-[85%] sm:max-w-[75%] md:max-w-[60%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                    {!isOwn && showAvatar && (
                                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0">
                                                            <ImageWithLoading
                                                                src={currentChat.other_user.avatar_url}
                                                                alt={currentChat.other_user.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    {!isOwn && !showAvatar && <div className="w-6 sm:w-8" />}
                                                    
                                                    <div
                                                        className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-3 ${
                                                            message.reactions && Object.keys(message.reactions).length > 0 ? 'min-w-[160px] sm:min-w-[200px]' : ''
                                                        } ${isOwn ? messageClasses.own : messageClasses.other}`}
                                                        onMouseEnter={() => setHoveredMessage(message.id)}
                                                        onMouseLeave={() => setHoveredMessage(null)}
                                                        style={{ willChange: hoveredMessage === message.id ? 'transform' : 'auto' }}
                                                    >
                                                        {/* 🔒 MENSAJE BLOQUEADO - Usuario no verificado */}
                                                        {message.is_blocked ? (
                                                            <div className="flex flex-col items-center py-2 space-y-2">
                                                                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                    </svg>
                                                                    <span className="text-sm italic">Mensaje bloqueado</span>
                                                                </div>
                                                                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                                                    Verifica tu identidad para ver las respuestas
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Contenido del mensaje según tipo */}
                                                                {message.type === 'text' && (
                                                                    <p className="break-words text-sm sm:text-base whitespace-pre-wrap">{message.message}</p>
                                                                )}
                                                        
                                                        {message.type === 'image' && (
                                                            <div>
                                                                <ImageWithLoading
                                                                    src={message.file_url}
                                                                    alt={message.file_name}
                                                                    className="max-w-full h-auto rounded-lg mb-2 cursor-pointer"
                                                                    style={{ maxHeight: '300px' }}
                                                                />
                                                                {message.message && <p className="break-words text-sm sm:text-base mt-2">{message.message}</p>}
                                                            </div>
                                                        )}
                                                        
                                                        {message.type === 'file' && (
                                                            <div className="flex items-center space-x-2">
                                                                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                                                </svg>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-sm sm:text-base truncate">{message.file_name}</p>
                                                                    <p className="text-xs opacity-75">{message.file_size_formatted}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                                {message.type === 'voice' && (
                                                                    <Suspense fallback={<div className="animate-pulse text-sm">Cargando audio...</div>}>
                                                                        <AudioPlayer message={message} isOwn={isOwn} />
                                                                    </Suspense>
                                                                )}

                                                                {/* Reacciones */}
                                                                <MessageReactions
                                                                    message={message}
                                                                    user={user}
                                                                    hoveredMessage={hoveredMessage}
                                                                    showReactionPicker={showReactionPicker}
                                                                    setShowReactionPicker={setShowReactionPicker}
                                                                    toggleReaction={toggleReaction}
                                                                    onEmojiPickerToggle={(messageId) => setShowReactionPicker(showReactionPicker === messageId ? null : messageId)}
                                                                />

                                                                {/* Timestamp y estado de lectura */}
                                                                <div className="flex items-center justify-end mt-1 space-x-1">
                                                                    <span className="text-xs opacity-75">{formatTime(message.created_at)}</span>
                                                                    {isOwn && message.read_at && (
                                                                        <span className="text-xs opacity-75">✓✓</span>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input de mensaje */}
                        <div className="p-4 sm:p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/90 to-emerald-50/90 dark:from-gray-800/90 dark:to-emerald-900/20">
                            {/* Notificación de rating */}
                            {showRatingNotification && (
                                <RatingNotification
                                    show={showRatingNotification}
                                    onRate={handleOpenRatingModal}
                                    onDismiss={handleDismissNotification}
                                    otherUser={currentChat.other_user}
                                />
                            )}

                            {/* Preview de archivo */}
                            {showFilePreview && selectedFile && (
                                <div className="mb-4 sm:mb-5 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 flex items-center justify-between shadow-lg">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                {(selectedFile.size / 1024).toFixed(2)} KB - Listo para enviar
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={removeFile} 
                                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 flex-shrink-0 ml-2 active:scale-95"
                                        aria-label="Remover archivo"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* Mensaje de error */}
                            {errorMessage && (
                                <div className="mb-3 sm:mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg flex items-start space-x-2">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                        {errorType === 'message' && (
                                            <button
                                                onClick={() => {
                                                    setErrorMessage('');
                                                    setErrorType('');
                                                }}
                                                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 mt-1 underline"
                                            >
                                                Cerrar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 🔒 Banner de verificación para usuarios no verificados */}
                            {showVerificationBanner && !messageLimit.is_verified && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg">
                                    <div className="flex items-start space-x-3">
                                        <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                                                {messageLimit.remaining_messages === 0
                                                    ? '¡Límite de mensajes alcanzado!'
                                                    : `Te quedan ${messageLimit.remaining_messages} mensajes`}
                                            </h4>
                                            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                                                {messageLimit.remaining_messages === 0
                                                    ? 'Verifica tu identidad para enviar mensajes ilimitados y ver las respuestas.'
                                                    : 'Verifica tu identidad para enviar mensajes ilimitados.'}
                                            </p>
                                            <div className="flex items-center space-x-3">
                                                <a
                                                    href="/verification/identity"
                                                    className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Verificar Identidad
                                                </a>
                                                <button
                                                    onClick={() => setShowVerificationBanner(false)}
                                                    className="text-sm text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline"
                                                >
                                                    Cerrar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Formulario de envío */}
                            <form onSubmit={sendMessage} className="flex items-end space-x-2 sm:space-x-3">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileSelect} 
                                    className="hidden" 
                                    accept="image/*,.pdf,.doc,.docx,.txt,audio/*,.webm,.mp4" 
                                />

                                {/* Botones de acciones */}
                                <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className="p-2.5 sm:p-3 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl group active:scale-95"
                                        aria-label="Adjuntar archivo"
                                        disabled={isSending}
                                    >
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </button>
                                    
                                    <button 
                                        type="button" 
                                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording} 
                                        className={`p-2.5 sm:p-3 transition-all duration-300 rounded-xl group active:scale-95 ${
                                            isRecording 
                                                ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 animate-pulse' 
                                                : 'text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                        }`}
                                        aria-label={isRecording ? "Detener grabación" : "Grabar mensaje de voz"}
                                        disabled={isSending}
                                    >
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {isRecording ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>

                                {/* Textarea de mensaje */}
                                <div className="flex-1 min-w-0">
                                    <textarea
                                        ref={messageInputRef}
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        placeholder={isRecording ? "Grabando audio..." : "Escribe un mensaje..."}
                                        rows="1"
                                        disabled={isRecording || isSending}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !isSending && !isRecording) {
                                                e.preventDefault();
                                                sendMessage(e);
                                            }
                                        }}
                                        aria-label="Mensaje"
                                    />
                                </div>

                                {/* Botón de enviar */}
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !selectedFile) || isSending || isRecording}
                                    className="p-2.5 sm:p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 group"
                                    aria-label="Enviar mensaje"
                                >
                                    {isSending ? (
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 animate-spin">
                                            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    // ✅ Estado sin conversación seleccionada MEJORADO
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-4 sm:p-8">
                        {/* ✅ Botón flotante solo en móvil cuando no hay conversación */}
                        {isMobile && !showSidebar && (
                            <button
                                onClick={() => setShowSidebar(true)}
                                className="mb-8 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2 font-medium"
                                aria-label="Ver conversaciones"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span>Ver Conversaciones</span>
                            </button>
                        )}
                        
                        <div className="max-w-md">
                            <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20 mb-6 opacity-50 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                {isMobile ? 'Comienza a chatear' : 'Selecciona una conversación'}
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                                {isMobile 
                                    ? 'Toca el botón de arriba para ver tus conversaciones y comenzar a chatear' 
                                    : 'Elige una conversación del panel izquierdo para comenzar a chatear'}
                            </p>
                            
                            {/* ✅ Estadísticas o tips */}
                            {conversations.length > 0 && (
                                <div className="mt-8 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                        💬 Tienes {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''} activa{conversations.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* ✅ MODALES CON LAZY LOADING */}
            {/* ========================================== */}
            
            {/* Modal de Rating */}
            <Suspense fallback={null}>
                {showRatingModal && (
                    <RatingModalLazy
                        show={showRatingModal}
                        onClose={handleCloseRatingModal}
                        userId={ratingUserId}
                        propertyId={ratingPropertyId}
                        otherUser={currentChat?.other_user}
                        onRatingSubmitted={handleRatingSubmitted}
                    />
                )}
            </Suspense>

            {/* Modal de Eliminar Chat */}
            <Suspense fallback={null}>
                {showDeleteModal && (
                    <DeleteChatModalLazy
                        show={showDeleteModal}
                        onConfirm={() => deleteChat(chatToDelete)}
                        onCancel={() => {
                            setShowDeleteModal(false);
                            setChatToDelete(null);
                        }}
                        otherUser={chatToDelete?.other_user}
                        isDeleting={isDeleting}
                    />
                )}
            </Suspense>
        </div>
    );
}

export default Chat;