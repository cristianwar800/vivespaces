// resources/js/components/NotificationPanel.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Bell,
    X,
    Check,
    Trash2,
    MessageCircle,
    Home,
    Search,
    DollarSign,
    Sparkles,
    Heart,
    CheckCheck,
    Loader,
    AlertCircle,
    Filter,
    Archive,
    TrendingUp,
    Clock,
    ChevronRight,
    Zap,
    Star,
    Trash,
    RefreshCw
} from 'lucide-react';

const NotificationPanel = ({ asPage = false }) => {
    // Estados
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [newNotificationAlert, setNewNotificationAlert] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ==================== TIEMPO REAL ====================

    // Cargar notificaciones solo al montar el componente
    useEffect(() => {
        if (asPage) {
            loadNotifications();
        }
        loadUnreadCount();

        // Solo verificar contador de no leídas cada 5 minutos (muy esporádico)
        const interval = setInterval(() => {
            loadUnreadCount();
        }, 300000); // 5 minutos - solo para contador badge

        return () => clearInterval(interval);
    }, []); // Solo se ejecuta al montar

    // Cargar notificaciones solo cuando cambia filter o selectedType (no cuando isOpen cambia)
    useEffect(() => {
        if (isOpen || asPage) {
            loadNotifications();
        }
    }, [filter, selectedType]); // Removido isOpen y asPage de las dependencias

    // Cargar al abrir el panel por primera vez
    useEffect(() => {
        if (isOpen && notifications.length === 0) {
            loadNotifications();
        }
    }, [isOpen]);

    // Detectar nuevas notificaciones
    useEffect(() => {
        const previousCount = parseInt(localStorage.getItem('notificationCount') || '0');

        if (unreadCount > previousCount && previousCount > 0) {
            setNewNotificationAlert(true);
            playNotificationSound();
            showBrowserNotification();

            setTimeout(() => {
                setNewNotificationAlert(false);
            }, 5000);
        }

        localStorage.setItem('notificationCount', unreadCount.toString());
    }, [unreadCount]);

    // ==================== API CALLS ====================

    const apiCall = async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                    ...options.headers
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    };

    const loadNotifications = async (manual = false) => {
        if (manual) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const endpoint = filter === 'unread'
                ? '/notifications/api/unread'
                : '/notifications/api/all';

            const data = await apiCall(endpoint);

            if (data.success) {
                const notifs = data.notifications.data || data.notifications;
                let mappedNotifications = notifs.map(n => ({
                    id: n.id,
                    type: n.data?.type || 'system',
                    title: n.data?.title || 'Notificación',
                    message: n.data?.message || '',
                    action_url: n.data?.action_url,
                    action_text: n.data?.action_text,
                    read: n.read_at !== null,
                    read_at: n.read_at,
                    created_at: n.created_at,
                    data: n.data
                }));

                if (selectedType !== 'all') {
                    mappedNotifications = mappedNotifications.filter(n => n.type === selectedType);
                }

                setNotifications(mappedNotifications);
                setUnreadCount(data.unread_count || 0);
            }
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        } finally {
            if (manual) {
                setIsRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    // 🔥 NUEVA: Función para recarga manual
    const handleManualRefresh = () => {
        loadNotifications(true);
        loadUnreadCount();
    };

    const loadUnreadCount = async () => {
        try {
            const data = await apiCall('/notifications/api/count');
            if (data.success) {
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error('Error cargando contador:', error);
        }
    };

    const markAsRead = async (id) => {
        try {
            const data = await apiCall(`/notifications/${id}/read`, {
                method: 'POST'
            });

            if (data.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date() } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marcando como leída:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const data = await apiCall('/notifications/mark-all-read', {
                method: 'POST'
            });

            if (data.success) {
                setNotifications(prev =>
                    prev.map(n => ({ ...n, read: true, read_at: new Date() }))
                );
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marcando todas como leídas:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const data = await apiCall(`/notifications/${id}`, {
                method: 'DELETE'
            });

            if (data.success) {
                setNotifications(prev => prev.filter(n => n.id !== id));
                const notification = notifications.find(n => n.id === id);
                if (!notification?.read) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (error) {
            console.error('Error eliminando notificación:', error);
        }
    };

    const deleteAllNotifications = async () => {
        setIsDeleting(true);
        try {
            const data = await apiCall('/notifications/delete-all', {
                method: 'POST'
            });

            if (data.success) {
                setNotifications([]);
                setUnreadCount(0);
                setShowDeleteConfirm(false);
            }
        } catch (error) {
            console.error('Error eliminando todas las notificaciones:', error);
            alert('Hubo un error al eliminar las notificaciones. Por favor intenta de nuevo.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        if (notification.action_url) {
            window.location.href = notification.action_url;
        }
    };

    const goToAllNotifications = () => {
        window.location.href = '/notifications';
    };

    // ==================== NOTIFICACIONES DEL NAVEGADOR ====================

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    const showBrowserNotification = () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = notifications[0];
            if (notification && !notification.read) {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: notification.id,
                    requireInteraction: false
                });
            }
        }
    };

    const playNotificationSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Primer tono (más alto)
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        oscillator1.frequency.value = 800;
        oscillator1.type = 'sine';
        gainNode1.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.15);

        // Segundo tono (más bajo, después de 0.1s)
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);
            oscillator2.frequency.value = 600;
            oscillator2.type = 'sine';
            gainNode2.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.15);
        }, 100);
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // ==================== HELPERS ====================

    const getIcon = (type) => {
        const icons = {
            message: MessageCircle,
            property_recommendation: Home,
            search_suggestion: Search,
            price_alert: DollarSign,
            new_property: Sparkles,
            favorite_update: Heart,
            system: Bell
        };
        const Icon = icons[type] || Bell;
        return <Icon className={asPage ? "w-6 h-6" : "w-5 h-5"} />;
    };

    const getColorClass = (type) => {
        const colors = {
            message: 'from-blue-500 via-blue-600 to-indigo-600',
            property_recommendation: 'from-green-500 via-emerald-600 to-teal-600',
            search_suggestion: 'from-purple-500 via-purple-600 to-pink-600',
            price_alert: 'from-yellow-500 via-orange-500 to-red-500',
            new_property: 'from-emerald-500 via-teal-500 to-cyan-600',
            favorite_update: 'from-pink-500 via-rose-600 to-red-600',
            system: 'from-gray-500 via-gray-600 to-slate-600'
        };
        return colors[type] || 'from-blue-500 to-blue-600';
    };

    const getBorderColorClass = (type) => {
        const colors = {
            message: 'border-blue-400',
            property_recommendation: 'border-green-400',
            search_suggestion: 'border-purple-400',
            price_alert: 'border-yellow-400',
            new_property: 'border-emerald-400',
            favorite_update: 'border-pink-400',
            system: 'border-gray-400'
        };
        return colors[type] || 'border-blue-400';
    };

    const getGlowClass = (type) => {
        const colors = {
            message: 'shadow-blue-500/50',
            property_recommendation: 'shadow-green-500/50',
            search_suggestion: 'shadow-purple-500/50',
            price_alert: 'shadow-yellow-500/50',
            new_property: 'shadow-emerald-500/50',
            favorite_update: 'shadow-pink-500/50',
            system: 'shadow-gray-500/50'
        };
        return colors[type] || 'shadow-blue-500/50';
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Ahora mismo';
        if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
        if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const getTypeLabel = (type) => {
        const labels = {
            message: 'Mensajes',
            property_recommendation: 'Recomendaciones',
            search_suggestion: 'Sugerencias',
            price_alert: 'Alertas de precio',
            new_property: 'Nuevas propiedades',
            favorite_update: 'Favoritos',
            system: 'Sistema'
        };
        return labels[type] || 'Notificación';
    };

    const notificationTypes = ['all', ...new Set(notifications.map(n => n.type))];
    const getTypeCount = (type) => {
        if (type === 'all') return notifications.length;
        return notifications.filter(n => n.type === type).length;
    };

    // ==================== RENDER COMO PÁGINA ====================

    if (asPage) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 pt-24 pb-12 relative overflow-hidden">
                {/* 🎨 PARTÍCULAS ANIMADAS MEJORADAS */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-float-delayed"></div>
                    <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-float-slow"></div>
                    
                    {/* Partículas flotantes adicionales */}
                    <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-full blur-2xl animate-pulse-slow"></div>
                    <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-gradient-to-r from-rose-400/10 to-red-400/10 rounded-full blur-2xl animate-pulse-slower"></div>
                </div>

                {/* 🔔 ALERT DE NUEVA NOTIFICACIÓN MEJORADO */}
                {newNotificationAlert && (
                    <div className="fixed top-24 right-4 z-50 animate-slideInRight">
                        <div className="relative group">
                            {/* Glow effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl blur opacity-75 group-hover:opacity-100 animate-pulse-glow"></div>
                            
                            <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-sm">
                                <div className="relative">
                                    <Zap className="w-6 h-6 animate-wiggle" />
                                    <div className="absolute inset-0 blur-lg bg-white/50 animate-ping"></div>
                                </div>
                                <div>
                                    <p className="font-bold text-lg">¡Nueva notificación!</p>
                                    <p className="text-sm text-white/90">Tienes {unreadCount} sin leer</p>
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🗑️ MODAL DE CONFIRMACIÓN MEJORADO */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center animate-fadeIn">
                        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 max-w-md mx-4 animate-scaleInBounce relative overflow-hidden">
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-pink-500/5 pointer-events-none"></div>
                            
                            <div className="text-center mb-6 relative z-10">
                                <div className="relative inline-block mb-4">
                                    <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                                    <div className="relative w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center animate-wiggle">
                                        <Trash className="w-10 h-10 text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    ¿Borrar todas las notificaciones?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Esta acción no se puede deshacer. Se eliminarán <span className="font-bold text-red-600 dark:text-red-400">{notifications.length}</span> notificaciones.
                                </p>
                            </div>
                            <div className="flex gap-3 relative z-10">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={deleteAllNotifications}
                                    disabled={isDeleting}
                                    className="group relative flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold overflow-hidden transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative flex items-center justify-center gap-2">
                                        {isDeleting ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Borrando...
                                            </>
                                        ) : (
                                            <>
                                                <Trash className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                Borrar todas
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    {/* 🎨 HEADER CON EFECTOS GLASS MEJORADOS */}
                    <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/30 dark:border-gray-700/50 p-8 mb-8 transform transition-all hover:shadow-3xl relative overflow-hidden">
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-shimmerSlow pointer-events-none"></div>

                        {/* Glow effect en hover */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-[2rem] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="relative group/icon">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover/icon:opacity-100 transition-all duration-300 animate-pulse-glow"></div>
                                    <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl transform group-hover/icon:rotate-12 group-hover/icon:scale-110 transition-all duration-300">
                                        <Bell className="w-8 h-8 text-white animate-wiggle-slow" />
                                    </div>
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-2 -right-2">
                                            <span className="relative flex h-7 w-7">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-7 w-7 bg-gradient-to-br from-red-500 to-pink-500 items-center justify-center text-white text-xs font-bold shadow-lg ring-4 ring-white dark:ring-gray-800">
                                                    {unreadCount}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm animate-gradientShift">
                                        Notificaciones
                                    </h1>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1 flex items-center gap-2">
                                        <Clock className="w-4 h-4 animate-tick" />
                                        {unreadCount > 0 ? (
                                            <span className="flex items-center gap-2">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{unreadCount}</span> sin leer
                                            </span>
                                        ) : (
                                            <span className="animate-fadeIn">✨ Todo al día</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleManualRefresh}
                                    disabled={isRefreshing}
                                    className="group/btn relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg overflow-hidden transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    title="Recargar notificaciones"
                                >
                                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                    <RefreshCw className={`w-5 h-5 relative z-10 transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover/btn:rotate-180'}`} />
                                    <span className="relative z-10">{isRefreshing ? 'Recargando...' : 'Recargar'}</span>
                                </button>

                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="group/btn relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg overflow-hidden transition-all transform hover:scale-105 active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                        <CheckCheck className="w-5 h-5 group-hover/btn:rotate-12 transition-transform relative z-10" />
                                        <span className="relative z-10">Marcar todas leídas</span>
                                    </button>
                                )}

                                {notifications.length > 0 && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="group/btn relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg overflow-hidden transition-all transform hover:scale-105 active:scale-95"
                                    >
                                        <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-pink-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                        <Trash className="w-5 h-5 group-hover/btn:rotate-12 transition-transform relative z-10" />
                                        <span className="relative z-10">Borrar todas</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 🎨 FILTROS PRINCIPALES MEJORADOS */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            {[
                                { value: 'all', icon: TrendingUp, label: 'Todas', gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
                                { value: 'unread', icon: Bell, label: 'No leídas', gradient: 'from-blue-500 via-indigo-500 to-purple-500', badge: unreadCount }
                            ].map(({ value, icon: Icon, label, gradient, badge }) => (
                                <button
                                    key={value}
                                    onClick={() => setFilter(value)}
                                    className={`group/filter relative px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 overflow-hidden ${
                                        filter === value
                                            ? `bg-gradient-to-r ${gradient} text-white shadow-xl`
                                            : 'bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-600'
                                    }`}
                                >
                                    {filter === value && (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmerFast"></div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl"></div>
                                        </>
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Icon className={`w-4 h-4 ${filter === value ? 'animate-wiggle' : ''}`} />
                                        {label}
                                        {badge > 0 && (
                                            <span className="relative">
                                                <span className="px-2 py-0.5 bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold animate-pulse">
                                                    {badge}
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* 🎨 FILTRO POR TIPO MEJORADO */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 animate-pulse-slow" />
                            {notificationTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`group/type flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 relative overflow-hidden ${
                                        selectedType === type
                                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg'
                                            : 'bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-600'
                                    }`}
                                >
                                    {selectedType === type && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmerFast"></div>
                                    )}
                                    <span className="relative z-10">
                                        {type === 'all' ? '🌟 Todas' : getTypeLabel(type)}
                                        <span className="ml-2 text-xs opacity-75">
                                            ({getTypeCount(type)})
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 📋 LISTA DE NOTIFICACIONES */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative">
                                    <Loader className="w-16 h-16 animate-spin text-emerald-500" />
                                    <div className="absolute inset-0 w-16 h-16 animate-ping opacity-20">
                                        <Loader className="w-16 h-16 text-emerald-500" />
                                    </div>
                                    <div className="absolute inset-0 blur-xl bg-emerald-500/30 animate-pulse"></div>
                                </div>
                                <p className="mt-6 text-gray-600 dark:text-gray-400 font-semibold text-lg animate-pulse">
                                    Cargando notificaciones...
                                </p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl rounded-[2rem] shadow-xl border border-white/30 dark:border-gray-700/50 p-16 text-center transform transition-all hover:scale-[1.02] relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5"></div>
                                <div className="relative inline-block mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur-2xl opacity-20 animate-pulse-glow"></div>
                                    <AlertCircle className="relative w-24 h-24 text-gray-300 dark:text-gray-600 animate-wiggle-slow" />
                                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                                        <Check className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3 animate-gradientShift">
                                    {filter === 'unread' ? '¡Genial! 🎉' : '✨ Sin notificaciones'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">
                                    {filter === 'unread'
                                        ? 'Todas tus notificaciones están al día. ¡Sigue así!'
                                        : 'Aquí aparecerán tus notificaciones importantes'}
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification, index) => (
                                <div
                                    key={notification.id}
                                    className={`group bg-white/80 dark:bg-gray-800/80 backdrop-blur-3xl rounded-2xl shadow-lg hover:shadow-2xl border transition-all duration-500 cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden ${
                                        !notification.read
                                            ? `border-l-[6px] ${getBorderColorClass(notification.type)} ${getGlowClass(notification.type)} shadow-2xl`
                                            : 'border border-gray-200/50 dark:border-gray-700/50'
                                    }`}
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animation: 'slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                                    }}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    {/* Animated gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-shimmerSlow"></div>

                                    {/* Glow effect para no leídas */}
                                    {!notification.read && (
                                        <div className={`absolute -inset-0.5 bg-gradient-to-r ${getColorClass(notification.type)} rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300`}></div>
                                    )}

                                    <div className="flex gap-4 p-6 relative z-10">
                                        {/* 🎨 ICONO MEJORADO */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${getColorClass(notification.type)} rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-all duration-300 animate-pulse-slow`}></div>
                                            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${getColorClass(notification.type)} text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                                                {getIcon(notification.type)}
                                            </div>
                                            {!notification.read && (
                                                <>
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></div>
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
                                                </>
                                            )}
                                        </div>

                                        {/* 📝 CONTENIDO */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                                                    {notification.title}
                                                </h3>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap flex items-center gap-1 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm px-3 py-1 rounded-lg">
                                                        <Clock className="w-3 h-3 animate-tick" />
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                                                {notification.message}
                                            </p>

                                            <div className="flex items-center gap-2 mb-3">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r ${getColorClass(notification.type)} text-white shadow-md transform group-hover:scale-105 transition-transform`}>
                                                    {getIcon(notification.type)}
                                                    {getTypeLabel(notification.type)}
                                                </span>
                                            </div>

                                            {notification.action_text && (
                                                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-xl font-bold text-sm shadow-lg group-hover:shadow-xl transform group-hover:scale-105 transition-all relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                                    <Star className="w-4 h-4 relative z-10 animate-wiggle-slow" />
                                                    <span className="relative z-10">{notification.action_text}</span>
                                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                                                </div>
                                            )}
                                        </div>

                                        {/* ⚙️ ACCIONES MEJORADAS */}
                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            {!notification.read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notification.id);
                                                    }}
                                                    className="group/action relative p-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl shadow-lg overflow-hidden transform hover:scale-110 hover:rotate-6 transition-all active:scale-95"
                                                    title="Marcar como leída"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-700 opacity-0 group-hover/action:opacity-100 transition-opacity"></div>
                                                    <Check className="w-5 h-5 relative z-10" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="group/action relative p-3 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-xl shadow-lg overflow-hidden transform hover:scale-110 hover:rotate-6 transition-all active:scale-95"
                                                title="Eliminar"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-pink-700 opacity-0 group-hover/action:opacity-100 transition-opacity"></div>
                                                <Trash2 className="w-5 h-5 relative z-10" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 🎨 CSS PARA ANIMACIONES MEJORADAS */}
                <style jsx>{`
                    @keyframes slideInUp {
                        from {
                            opacity: 0;
                            transform: translateY(30px) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }

                    @keyframes slideInRight {
                        0% {
                            opacity: 0;
                            transform: translateX(100%) scale(0.9);
                        }
                        60% {
                            opacity: 1;
                            transform: translateX(-10px) scale(1.05);
                        }
                        80% {
                            transform: translateX(5px) scale(0.98);
                        }
                        100% {
                            transform: translateX(0) scale(1);
                        }
                    }

                    @keyframes shimmerFast {
                        0% { transform: translateX(-100%) skewX(-12deg); }
                        100% { transform: translateX(200%) skewX(-12deg); }
                    }

                    @keyframes shimmerSlow {
                        0% { transform: translateX(-100%) skewX(-12deg); }
                        100% { transform: translateX(200%) skewX(-12deg); }
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes scaleInBounce {
                        0% {
                            opacity: 0;
                            transform: scale(0.8);
                        }
                        50% {
                            opacity: 1;
                            transform: scale(1.05);
                        }
                        100% {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }

                    @keyframes wiggle {
                        0%, 100% { transform: rotate(0deg); }
                        25% { transform: rotate(-10deg); }
                        75% { transform: rotate(10deg); }
                    }

                    @keyframes wiggleSlow {
                        0%, 100% { transform: rotate(0deg); }
                        25% { transform: rotate(-5deg); }
                        75% { transform: rotate(5deg); }
                    }

                    @keyframes float {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        33% { transform: translateY(-20px) translateX(10px); }
                        66% { transform: translateY(10px) translateX(-10px); }
                    }

                    @keyframes floatDelayed {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        33% { transform: translateY(15px) translateX(-15px); }
                        66% { transform: translateY(-10px) translateX(10px); }
                    }

                    @keyframes floatSlow {
                        0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
                        50% { transform: translateY(-15px) translateX(15px) rotate(5deg); }
                    }

                    @keyframes pulseSlow {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.05); }
                    }

                    @keyframes pulseSlower {
                        0%, 100% { opacity: 0.2; transform: scale(1); }
                        50% { opacity: 0.4; transform: scale(1.1); }
                    }

                    @keyframes pulseGlow {
                        0%, 100% { opacity: 0.5; }
                        50% { opacity: 1; }
                    }

                    @keyframes tick {
                        0%, 100% { transform: rotate(0deg); }
                        10%, 30% { transform: rotate(5deg); }
                        20% { transform: rotate(-5deg); }
                    }

                    @keyframes gradientShift {
                        0%, 100% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                    }

                    .animate-shimmerFast {
                        animation: shimmerFast 1.5s infinite;
                    }

                    .animate-shimmerSlow {
                        animation: shimmerSlow 3s infinite;
                    }

                    .animate-slideInRight {
                        animation: slideInRight 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }

                    .animate-fadeIn {
                        animation: fadeIn 0.3s ease-out;
                    }

                    .animate-scaleInBounce {
                        animation: scaleInBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }

                    .animate-wiggle {
                        animation: wiggle 0.5s ease-in-out;
                    }

                    .animate-wiggle-slow {
                        animation: wiggleSlow 3s ease-in-out infinite;
                    }

                    .animate-float {
                        animation: float 8s ease-in-out infinite;
                    }

                    .animate-float-delayed {
                        animation: floatDelayed 10s ease-in-out infinite;
                        animation-delay: 2s;
                    }

                    .animate-float-slow {
                        animation: floatSlow 12s ease-in-out infinite;
                        animation-delay: 1s;
                    }

                    .animate-pulse-slow {
                        animation: pulseSlow 4s ease-in-out infinite;
                    }

                    .animate-pulse-slower {
                        animation: pulseSlower 6s ease-in-out infinite;
                    }

                    .animate-pulse-glow {
                        animation: pulseGlow 2s ease-in-out infinite;
                    }

                    .animate-tick {
                        animation: tick 1s ease-in-out infinite;
                    }

                    .animate-gradientShift {
                        background-size: 200% 200%;
                        animation: gradientShift 3s ease infinite;
                    }

                    .scrollbar-thin::-webkit-scrollbar {
                        height: 6px;
                        width: 6px;
                    }

                    .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
                        background-color: #d1d5db;
                        border-radius: 3px;
                    }

                    .scrollbar-track-transparent::-webkit-scrollbar-track {
                        background-color: transparent;
                    }

                    .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
                        background-color: #4b5563;
                    }

                    /* Smooth scrolling */
                    * {
                        scroll-behavior: smooth;
                    }
                `}</style>
            </div>
        );
    }

    // ==================== RENDER COMO PANEL FLOTANTE ====================

    return (
        <div className="relative">
            {/* 🔔 BOTÓN MEJORADO CON ANIMACIONES */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all transform hover:scale-110 active:scale-95 group"
            >
                <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:rotate-12 transition-transform duration-300" />

                {unreadCount > 0 && (
                    <>
                        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-bounce z-10">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                        <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 animate-ping opacity-75"></span>
                    </>
                )}

                {newNotificationAlert && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-ping"></span>
                )}
            </button>

            {/* 📱 PANEL FLOTANTE MEJORADO */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed right-4 top-20 w-[420px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/50 z-50 max-h-[700px] flex flex-col animate-slideInRight overflow-hidden">
                        {/* Header mejorado */}
                        <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmerSlow"></div>
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>

                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform">
                                        <Bell className="w-5 h-5 animate-wiggle-slow" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">
                                            Notificaciones
                                        </h3>
                                        <p className="text-xs text-white/90 font-medium flex items-center gap-1">
                                            {unreadCount > 0 ? (
                                                <>
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                                    </span>
                                                    {unreadCount} nuevas
                                                </>
                                            ) : (
                                                '✨ Todo al día'
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all transform hover:rotate-90 backdrop-blur-sm active:scale-90"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Filtros integrados mejorados */}
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                                            filter === 'all'
                                                ? 'bg-white text-emerald-600 shadow-lg'
                                                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                                        }`}
                                    >
                                        Todas
                                    </button>
                                    <button
                                        onClick={() => setFilter('unread')}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 relative ${
                                            filter === 'unread'
                                                ? 'bg-white text-emerald-600 shadow-lg'
                                                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                                        }`}
                                    >
                                        Nuevas ({unreadCount})
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleManualRefresh}
                                        disabled={isRefreshing}
                                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all transform hover:scale-110 active:scale-90 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        title="Recargar notificaciones"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </button>

                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all transform hover:scale-110 active:scale-90 backdrop-blur-sm"
                                            title="Marcar todas como leídas"
                                        >
                                            <CheckCheck className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lista de notificaciones mejorada */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="relative">
                                        <Loader className="w-10 h-10 animate-spin text-emerald-500" />
                                        <div className="absolute inset-0 animate-ping opacity-20">
                                            <Loader className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <div className="absolute inset-0 blur-xl bg-emerald-500/30 animate-pulse"></div>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-medium">Cargando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-2xl opacity-20 animate-pulse-glow"></div>
                                        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center">
                                            <AlertCircle className="w-10 h-10 text-emerald-500 animate-wiggle-slow" />
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                                        {filter === 'unread' ? '¡Todo limpio! ✨' : 'Sin notificaciones'}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {filter === 'unread'
                                            ? 'No tienes notificaciones pendientes'
                                            : 'Aquí aparecerán tus notificaciones'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y dark:divide-gray-700">
                                    {notifications.map((notification, index) => (
                                        <div
                                            key={notification.id}
                                            className={`group p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent dark:hover:from-gray-700/50 dark:hover:to-transparent transition-all cursor-pointer relative ${
                                                !notification.read ? 'bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent' : ''
                                            }`}
                                            style={{
                                                animationDelay: `${index * 50}ms`,
                                                animation: 'slideInUp 0.5s ease-out forwards'
                                            }}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {!notification.read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/50"></div>
                                            )}

                                            <div className="flex gap-3">
                                                {/* Icono compacto mejorado */}
                                                <div className="relative flex-shrink-0">
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${getColorClass(notification.type)} rounded-xl blur-md opacity-50 group-hover:opacity-100 transition-all duration-300`}></div>
                                                    <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${getColorClass(notification.type)} text-white shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                                                        {getIcon(notification.type)}
                                                    </div>
                                                </div>

                                                {/* Contenido */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                            {notification.title}
                                                        </h4>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <Clock className="w-3 h-3 animate-tick" />
                                                            {formatTime(notification.created_at)}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>

                                                    {notification.action_text && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
                                                            <Star className="w-3 h-3 animate-wiggle-slow" />
                                                            {notification.action_text}
                                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Acciones compactas mejoradas */}
                                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                markAsRead(notification.id);
                                                            }}
                                                            className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-all transform hover:scale-110 active:scale-90"
                                                            title="Marcar como leída"
                                                        >
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification.id);
                                                        }}
                                                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all transform hover:scale-110 active:scale-90"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer mejorado */}
                        {notifications.length > 0 && (
                            <div className="p-4 border-t dark:border-gray-700 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-700/30 dark:to-transparent backdrop-blur-sm">
                                <button
                                    onClick={goToAllNotifications}
                                    className="group w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    <span className="relative z-10">Ver todas las notificaciones</span>
                                    <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slideInRight {
                    0% {
                        opacity: 0;
                        transform: translateX(100%) scale(0.9);
                    }
                    60% {
                        opacity: 1;
                        transform: translateX(-10px) scale(1.02);
                    }
                    80% {
                        transform: translateX(5px) scale(0.98);
                    }
                    100% {
                        transform: translateX(0) scale(1);
                    }
                }

                @keyframes shimmerSlow {
                    0% { transform: translateX(-100%) skewX(-12deg); }
                    100% { transform: translateX(200%) skewX(-12deg); }
                }

                @keyframes wiggleSlow {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-5deg); }
                    75% { transform: rotate(5deg); }
                }

                @keyframes pulseGlow {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }

                @keyframes tick {
                    0%, 100% { transform: rotate(0deg); }
                    10%, 30% { transform: rotate(5deg); }
                    20% { transform: rotate(-5deg); }
                }

                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }

                .animate-slideInRight {
                    animation: slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .animate-shimmerSlow {
                    animation: shimmerSlow 3s infinite;
                }

                .animate-wiggle-slow {
                    animation: wiggleSlow 3s ease-in-out infinite;
                }

                .animate-pulse-glow {
                    animation: pulseGlow 2s ease-in-out infinite;
                }

                .animate-tick {
                    animation: tick 1s ease-in-out infinite;
                }

                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                }

                .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
                    background-color: #d1d5db;
                    border-radius: 3px;
                }

                .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
                    background-color: #4b5563;
                }
            `}</style>
        </div>
    );
};

export default NotificationPanel;