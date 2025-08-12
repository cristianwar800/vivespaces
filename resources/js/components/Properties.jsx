import React, { useState, useEffect, useCallback, useMemo } from 'react';

const Toast = ({ message, type = 'success', isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const typeStyles = {
        success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
        error: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
        info: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
    };

    const icons = {
        success: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        )
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-2xl transform transition-all duration-500 ease-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${typeStyles[type]} max-w-sm backdrop-blur-sm`}>
            <div className="flex-shrink-0 mr-3">{icons[type]}</div>
            <div className="flex-1"><p className="font-medium">{message}</p></div>
            <button onClick={onClose} className="ml-3 flex-shrink-0 hover:bg-black/10 rounded-lg p-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

const useToast = () => {
    const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, isVisible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
    }, []);

    return { toast, showToast, hideToast };
};

const Button = ({ variant = 'primary', size = 'md', children, className = '', loading = false, ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group';

    const variants = {
        primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl focus:ring-emerald-500 transform hover:scale-105 active:scale-95',
        secondary: 'bg-transparent border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white focus:ring-emerald-500 transform hover:scale-105 active:scale-95',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500 transform hover:scale-105 active:scale-95',
        ghost: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base'
    };

    return (
        <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
            {loading && (
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
};

const LoadingSpinner = ({ message = 'Cargando...' }) => (
    <div className="flex flex-col items-center justify-center p-8">
        <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-100 animate-pulse"></div>
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
    </div>
);

function PropertyCard({ property, user, navigate, contactSeller, viewMode = 'grid' }) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const formatPrice = useCallback((price) => {
        return Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    }, []);

    const getPropertyTypeIcon = (type) => {
        const icons = { casa: '🏠', apartamento: '🏢', condominio: '🏘️', oficina: '🏢', local: '🏪', terreno: '🌳' };
        return icons[type] || '🏠';
    };

    if (viewMode === 'list') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group">
                <div className="flex flex-col md:flex-row">
                    <div className="relative md:w-80 h-64">
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse rounded-tl-2xl"></div>
                        )}
                        <img
                            src={property.image ? `/storage/${property.image}` : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"}
                            alt={property.title}
                            className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setImageLoaded(true)}
                        />
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                            <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                {getPropertyTypeIcon(property.type)} {property.type}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${property.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {property.is_active ? '✅ Disponible' : '❌ No disponible'}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 transition-colors">
                            {property.title}
                        </h3>

                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                            <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{property.address}, {property.city}, {property.state}</span>
                        </div>

                        <div className="flex items-center gap-6 mb-6">
                            <div className="flex items-center">
                                <span className="text-2xl mr-2">🛏️</span>
                                <span className="text-gray-600 dark:text-gray-400">{property.bedrooms || 0}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-2xl mr-2">🚿</span>
                                <span className="text-gray-600 dark:text-gray-400">{property.bathrooms || 0}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="text-2xl mr-2">📐</span>
                                <span className="text-gray-600 dark:text-gray-400">{property.area || 0} m²</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                ${formatPrice(property.price)}
                            </div>

                            <div className="flex gap-3">
                                <Button variant="primary" onClick={() => navigate('show', property.id)} size="sm">
                                    Ver Detalles
                                </Button>

                                {user && property.user_id !== user.id && (
                                    <Button variant="secondary" onClick={() => contactSeller(property.id, property.user_id)} size="sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        Contactar
                                    </Button>
                                )}

                                {user && property.user_id === user.id && (
                                    <Button variant="secondary" onClick={() => navigate('edit', property.id)} size="sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group transform hover:-translate-y-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative h-64 overflow-hidden">
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse"></div>
                )}
                <img
                    src={property.image ? `/storage/${property.image}` : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"}
                    alt={property.title}
                    className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isHovered ? 'scale-110' : 'scale-100'}`}
                    onLoad={() => setImageLoaded(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm">
                        {getPropertyTypeIcon(property.type)} {property.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm ${property.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {property.is_active ? '✅ Disponible' : '❌ No disponible'}
                    </span>
                </div>

                <div className="absolute top-4 right-4">
                    <button className="w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 group/heart">
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover/heart:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 transition-colors overflow-hidden line-clamp-2">
                    {property.title}
                </h3>

                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                    <svg className="w-5 h-5 mr-2 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{property.address}, {property.city}, {property.state}</span>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                            <span className="text-lg mr-1">🛏️</span>
                            <span className="text-sm font-medium">{property.bedrooms || 0}</span>
                        </div>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                            <span className="text-lg mr-1">🚿</span>
                            <span className="text-sm font-medium">{property.bathrooms || 0}</span>
                        </div>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                            <span className="text-lg mr-1">📐</span>
                            <span className="text-sm font-medium">{property.area || 0}m²</span>
                        </div>
                    </div>
                </div>

                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-6">
                    ${formatPrice(property.price)}
                </div>

                <div className="flex gap-3">
                    <Button variant="primary" onClick={() => navigate('show', property.id)} className="flex-1" size="sm">
                        Ver Detalles
                    </Button>

                    {user && property.user_id !== user.id && (
                        <Button variant="secondary" onClick={() => contactSeller(property.id, property.user_id)} size="sm" className="flex-1">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Contactar
                        </Button>
                    )}

                    {user && property.user_id === user.id && (
                        <Button variant="secondary" onClick={() => navigate('edit', property.id)} size="sm" className="px-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function PropertiesIndex({ properties, allProperties, user, searchTerm, setSearchTerm, typeFilter, setTypeFilter, roomsFilter, setRoomsFilter, navigate, contactSeller, showToast }) {
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid');

    const handleContactSeller = async (propertyId, sellerId) => {
        setIsLoading(true);
        showToast('Iniciando conversación...', 'info');

        try {
            await contactSeller(propertyId, sellerId);
            showToast('¡Conversación iniciada! Redirigiendo al chat...', 'success');
            setTimeout(() => {
                showToast('Redirigiendo...', 'info');
            }, 1500);
        } catch (error) {
            showToast('Error al iniciar la conversación', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <header className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-16 px-4 overflow-hidden">
                <div className="absolute inset-0 opacity-40" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                <div className="relative max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-6">
                        Nuestras Propiedades
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        Descubre tu hogar ideal en nuestra selección curada de propiedades excepcionales
                    </p>
                </div>
            </header>

            <section className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por título, ciudad o dirección..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 items-center">
                            <select
                                className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all duration-300"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="">Tipo de propiedad</option>
                                <option value="casa">🏠 Casa</option>
                                <option value="apartamento">🏢 Apartamento</option>
                                <option value="condominio">🏘️ Condominio</option>
                                <option value="oficina">🏢 Oficina</option>
                                <option value="local">🏪 Local Comercial</option>
                                <option value="terreno">🌳 Terreno</option>
                            </select>

                            <select
                                className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all duration-300"
                                value={roomsFilter}
                                onChange={(e) => setRoomsFilter(e.target.value)}
                            >
                                <option value="">Habitaciones</option>
                                <option value="1">1 hab</option>
                                <option value="2">2 hab</option>
                                <option value="3">3 hab</option>
                                <option value="4+">4+ hab</option>
                            </select>

                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>

                            {user && (
                                <Button variant="primary" onClick={() => navigate('create')} className="whitespace-nowrap">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Nueva Propiedad
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900 min-h-screen py-12">
                <div className="max-w-7xl mx-auto px-4">
                    {isLoading && <LoadingSpinner message="Iniciando conversación..." />}

                    {properties.length > 0 ? (
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
                            {properties.map(property => (
                                <PropertyCard
                                    key={property.id}
                                    property={property}
                                    user={user}
                                    navigate={navigate}
                                    contactSeller={handleContactSeller}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21l4-4 4 4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13v4" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {allProperties.length === 0 ? 'No hay propiedades disponibles' : 'No se encontraron propiedades'}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                {allProperties.length === 0
                                    ? 'Actualmente no tenemos propiedades registradas. Vuelve más tarde para ver nuevas opciones.'
                                    : 'Intenta con otros filtros de búsqueda.'
                                }
                            </p>
                            {user && (
                                <Button variant="primary" onClick={() => navigate('create')}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Registrar Propiedad
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}

function PropertyShow({ property, user, navigate, handleDelete, showToast }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const formatPrice = useCallback((price) => {
        return Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    }, []);

    const handleDeleteWithConfirmation = async (propertyId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.')) {
            try {
                showToast('Eliminando propiedad...', 'info');
                await handleDelete(propertyId);
                showToast('Propiedad eliminada exitosamente', 'success');
            } catch (error) {
                showToast('Error al eliminar la propiedad', 'error');
            }
        }
    };

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Propiedad no encontrada</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">La propiedad que buscas no existe o ha sido eliminada.</p>
                    <Button variant="primary" onClick={() => navigate('index')} className="w-full">
                        Volver a Propiedades
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <header className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
                <div className="max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('index')} className="mb-6">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a Propiedades
                    </Button>

                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                            {property.title}
                        </h1>
                        <div className="flex items-center justify-center text-gray-600 dark:text-gray-300 text-lg">
                            <svg className="w-6 h-6 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {property.address}, {property.city}, {property.state}
                        </div>
                    </div>
                </div>
            </header>

            <section className="bg-gray-50 dark:bg-gray-900 py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="relative h-96 lg:h-[500px] cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
                            <img
                                src={property.image ? `/storage/${property.image}` : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop"}
                                alt={property.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <div className="text-4xl font-bold mb-2">${formatPrice(property.price)} MXN</div>
                                <div className="flex items-center gap-4">
                                    <span className="bg-emerald-500 px-4 py-2 rounded-full text-sm font-medium">
                                        {property.type}
                                    </span>
                                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${property.is_active ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {property.is_active ? 'Disponible' : 'No disponible'}
                                    </span>
                                </div>
                            </div>
                            <div className="absolute top-6 right-6">
                                <button className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-all duration-300">
                                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-8 lg:p-12">
                            {property.description && (
                                <div className="mb-12">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                        <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">
                                            📝
                                        </span>
                                        Descripción
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg bg-gray-50 dark:bg-gray-700 p-6 rounded-2xl">
                                        {property.description}
                                    </p>
                                </div>
                            )}

                            <div className="mb-12">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                    <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">
                                        🏠
                                    </span>
                                    Características
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                                        <div className="text-3xl mb-3">🏠</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{property.type || 'No especificado'}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Tipo de Propiedad</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                                        <div className="text-3xl mb-3">🛏️</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{property.bedrooms || 0}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Habitaciones</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-800 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                                        <div className="text-3xl mb-3">🚿</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{property.bathrooms || 0}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Baños</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border border-orange-100 dark:border-orange-800 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                                        <div className="text-3xl mb-3">📐</div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{property.area || 0}m²</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Área Total</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-12">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                    <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">
                                        📍
                                    </span>
                                    Ubicación
                                </h3>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Dirección</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{property.address}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ciudad</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{property.city}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{property.state}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Código Postal</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{property.postal_code || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button variant="ghost" onClick={() => navigate('index')} className="flex-1 max-w-xs">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    Ver Más Propiedades
                                </Button>

                                {user && property.user_id === user.id && (
                                    <>
                                        <Button variant="primary" onClick={() => navigate('edit', property.id)} className="flex-1 max-w-xs">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Editar Propiedad
                                        </Button>
                                        <Button variant="danger" onClick={() => handleDeleteWithConfirmation(property.id)} className="flex-1 max-w-xs">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Eliminar Propiedad
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {isImageModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsImageModalOpen(false)}>
                    <div className="relative max-w-4xl max-h-full">
                        <img
                            src={property.image ? `/storage/${property.image}` : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop"}
                            alt={property.title}
                            className="max-w-full max-h-full object-contain rounded-2xl"
                        />
                        <button
                            onClick={() => setIsImageModalOpen(false)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function PropertyForm({ formData, handleInputChange, handleSubmit, loading, isEdit, navigate, errors, showToast }) {
    const [dragActive, setDragActive] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                handleInputChange({
                    target: {
                        name: 'image',
                        files: [file]
                    }
                });

                const reader = new FileReader();
                reader.onload = (e) => setPreviewImage(e.target.result);
                reader.readAsDataURL(file);
            } else {
                showToast('Por favor, selecciona solo archivos de imagen', 'error');
            }
        }
    }, [handleInputChange, showToast]);

    const handleImageChange = useCallback((e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => setPreviewImage(e.target.result);
            reader.readAsDataURL(file);
        }
        handleInputChange(e);
    }, [handleInputChange]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        showToast(isEdit ? 'Actualizando propiedad...' : 'Guardando propiedad...', 'info');
        await handleSubmit(e);
    };

    return (
        <>
            <header className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isEdit ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            )}
                        </svg>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                        {isEdit ? 'Editar Propiedad' : 'Nueva Propiedad'}
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        {isEdit ? 'Actualiza la información de tu propiedad' : 'Comparte tu propiedad con la comunidad'}
                    </p>
                </div>
            </header>

            <section className="bg-gray-50 dark:bg-gray-900 py-12">
                <div className="max-w-4xl mx-auto px-4">
                    <Button variant="ghost" onClick={() => navigate('index')} className="mb-8">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a Propiedades
                    </Button>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-8 lg:p-12">
                            {hasErrors && (
                                <div className="mb-8 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                                    <div className="flex items-center mb-4">
                                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Error en el formulario</h4>
                                    </div>
                                    <p className="text-red-700 dark:text-red-300 mb-4">Por favor corrige los siguientes errores:</p>
                                    <ul className="space-y-2">
                                        {Object.values(errors).flat().map((error, index) => (
                                            <li key={index} className="flex items-center text-red-700 dark:text-red-300">
                                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">ℹ️</span>
                                        Información Básica
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Título de la Propiedad *</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-lg"
                                            placeholder="Ej: Hermosa casa en Roma Norte con jardín privado"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Descripción</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 resize-none"
                                            placeholder="Describe las características principales, amenidades y lo que hace especial a tu propiedad..."
                                            rows="6"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">📍</span>
                                        Ubicación
                                    </h3>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Dirección *</label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Calle y número"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ciudad *</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Ciudad"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Estado</label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Estado"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">País</label>
                                            <input
                                                type="text"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="País"
                                            />
                                        </div>
                                    </div>

                                    <div className="lg:w-1/2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Código Postal</label>
                                        <input
                                            type="text"
                                            name="postal_code"
                                            value={formData.postal_code}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                            placeholder="Código postal"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">🏠</span>
                                        Detalles de la Propiedad
                                    </h3>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Precio (MXN) *</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg font-medium">$</span>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-8 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-lg"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tipo de Propiedad</label>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                            >
                                                <option value="">Selecciona el tipo</option>
                                                <option value="casa">🏠 Casa</option>
                                                <option value="apartamento">🏢 Apartamento</option>
                                                <option value="condominio">🏘️ Condominio</option>
                                                <option value="oficina">🏢 Oficina</option>
                                                <option value="local">🏪 Local Comercial</option>
                                                <option value="terreno">🌳 Terreno</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Habitaciones</label>
                                            <input
                                                type="number"
                                                name="bedrooms"
                                                value={formData.bedrooms}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Baños</label>
                                            <input
                                                type="number"
                                                name="bathrooms"
                                                value={formData.bathrooms}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="0"
                                                min="0"
                                                step="0.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Área (m²)</label>
                                            <input
                                                type="number"
                                                name="area"
                                                value={formData.area}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">📸</span>
                                        Imagen de la Propiedad
                                    </h3>

                                    <div className="space-y-4">
                                        <div
                                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                                                dragActive
                                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                        >
                                            <input
                                                type="file"
                                                name="image"
                                                onChange={handleImageChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                accept="image/*"
                                            />
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                                                        Arrastra una imagen aquí o haz clic para seleccionar
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                                        Formatos permitidos: JPG, PNG, GIF • Tamaño máximo: 5MB
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {previewImage && (
                                            <div className="relative">
                                                <img
                                                    src={previewImage}
                                                    alt="Vista previa"
                                                    className="w-full h-64 object-cover rounded-2xl shadow-lg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewImage(null)}
                                                    className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-3">⚙️</span>
                                        Configuración
                                    </h3>

                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-6">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={handleInputChange}
                                                className="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                                                id="is_active"
                                            />
                                            <label className="ml-4 block text-lg font-medium text-gray-900 dark:text-white" htmlFor="is_active">
                                                Propiedad disponible para renta
                                            </label>
                                        </div>
                                        <p className="ml-9 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Al activar esta opción, tu propiedad será visible para otros usuarios
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-8 border-t border-gray-200 dark:border-gray-700">
                                    <Button type="button" variant="ghost" onClick={() => navigate('index')} disabled={loading} className="sm:w-auto w-full">
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" loading={loading} disabled={loading} className="sm:w-auto w-full">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        {isEdit ? 'Actualizar Propiedad' : 'Guardar Propiedad'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

function Properties() {
    const { toast, showToast, hideToast } = useToast();

    // Leer datos reales de Laravel en lugar de usar datos mock
    const [appData, setAppData] = useState(() => {
        const dataElement = document.getElementById('properties-data');
        if (dataElement) {
            try {
                return JSON.parse(dataElement.textContent || dataElement.innerText);
            } catch (e) {
                console.error('Error parsing properties data:', e);
                return {};
            }
        }
        return {};
    });

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [roomsFilter, setRoomsFilter] = useState('');
    const [formData, setFormData] = useState({
        title: '', description: '', address: '', city: '', state: '', country: '', postal_code: '',
        price: '', type: '', bedrooms: '', bathrooms: '', area: '', image: null, is_active: true
    });

    useEffect(() => {
        if (appData.currentPage === 'edit' && appData.property) {
            setFormData(appData.property);
        }
    }, [appData.currentPage, appData.property]);

    const navigate = useCallback((page, propertyId = null) => {
        switch (page) {
            case 'index':
                window.location.href = appData.routes?.index || '/properties';
                break;
            case 'create':
                window.location.href = '/properties/create';
                break;
            case 'show':
                window.location.href = `/properties/${propertyId}`;
                break;
            case 'edit':
                window.location.href = `/properties/${propertyId}/edit`;
                break;
            default:
                console.warn(`Unknown navigation page: ${page}`);
        }
    }, [appData.routes]);

    const contactSeller = useCallback(async (propertyId, sellerId) => {
        try {
            console.log('Iniciando conversación...', { propertyId, sellerId });
            showToast('Iniciando conversación...', 'info');

            // Verificar que los IDs son válidos antes de enviar
            if (!propertyId || !sellerId) {
                throw new Error('IDs de propiedad o vendedor faltantes');
            }

            const response = await fetch('/api/conversations/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    property_id: propertyId,
                    receiver_id: sellerId
                })
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);

                // Mostrar errores más específicos
                if (errorData.errors) {
                    const errorMessages = Object.values(errorData.errors).flat();
                    throw new Error(errorMessages.join(', '));
                } else {
                    throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
                }
            }

            const data = await response.json();
            console.log('Success:', data);

            showToast('¡Conversación iniciada! Redirigiendo al chat...', 'success');

            // Redirigir al chat después de un pequeño delay
            setTimeout(() => {
                window.location.href = `/chat?conversation=${data.conversation.id}`;
            }, 1500);

        } catch (error) {
            console.error('Error completo:', error);
            showToast('Error: ' + error.message, 'error');
        }
    }, [showToast]);

    const handleInputChange = useCallback((e) => {
        const { name, value, type, checked, files } = e.target;
        setFormData(prev => {
            if (type === 'file') {
                return { ...prev, [name]: files[0] };
            } else if (type === 'checkbox') {
                return { ...prev, [name]: checked };
            } else {
                return { ...prev, [name]: value };
            }
        });
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // FIX: Definir isEdit dentro de la función
            const isEdit = appData.currentPage === 'edit';

            showToast(isEdit ? 'Actualizando propiedad...' : 'Guardando propiedad...', 'info');

            const formDataToSend = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== '') {
                    if (key === 'is_active') {
                        formDataToSend.append(key, formData[key] ? '1' : '0');
                    } else {
                        formDataToSend.append(key, formData[key]);
                    }
                }
            });

            const url = appData.currentPage === 'edit' ? appData.routes?.update : appData.routes?.store;
            const method = appData.currentPage === 'edit' ? 'PUT' : 'POST';

            if (method === 'PUT') {
                formDataToSend.append('_method', 'PUT');
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': appData.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                },
                body: formDataToSend
            });

            if (response.ok) {
                showToast('Propiedad guardada exitosamente', 'success');
                setTimeout(() => navigate('index'), 1500);
            } else {
                const errorData = await response.json();
                showToast('Error al guardar la propiedad', 'error');
                console.error('Error submitting form:', errorData);
            }
        } catch (error) {
            showToast('Error al guardar la propiedad', 'error');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [formData, appData.currentPage, appData.routes, appData.csrfToken, navigate, showToast]);


    const handleDelete = useCallback(async (propertyId) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            showToast('Eliminando propiedad...', 'info');

            const response = await fetch(appData.routes?.destroy, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': appData.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ _method: 'DELETE' })
            });

            if (response.ok) {
                showToast('Propiedad eliminada exitosamente', 'success');
                setTimeout(() => navigate('index'), 1500);
            } else {
                showToast('Error al eliminar la propiedad', 'error');
                console.error('Error deleting property');
            }
        } catch (error) {
            showToast('Error al eliminar la propiedad', 'error');
            console.error('Error deleting property:', error);
        }
    }, [appData.routes, appData.csrfToken, navigate, showToast]);

    const filteredProperties = useMemo(() => {
        return appData.properties?.filter(property => {
            const matchesSearch = !searchTerm ||
                property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                property.address.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = !typeFilter || property.type === typeFilter;
            const matchesRooms = !roomsFilter || (roomsFilter === '4+' ? property.bedrooms >= 4 : property.bedrooms == roomsFilter);

            return matchesSearch && matchesType && matchesRooms;
        }) || [];
    }, [appData.properties, searchTerm, typeFilter, roomsFilter]);

    const user = useMemo(() => {
        const userDataElement = document.getElementById('user-data');
        if (userDataElement) {
            try {
                return JSON.parse(userDataElement.textContent || userDataElement.innerText);
            } catch (e) {
                return null;
            }
        }
        return null;
    }, []);

    const renderPage = useCallback(() => {
        switch (appData.currentPage) {
            case 'index':
                return (
                    <PropertiesIndex
                        properties={filteredProperties}
                        allProperties={appData.properties || []}
                        user={user}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                        roomsFilter={roomsFilter}
                        setRoomsFilter={setRoomsFilter}
                        navigate={navigate}
                        contactSeller={contactSeller}
                        showToast={showToast}
                    />
                );
            case 'show':
                return (
                    <PropertyShow
                        property={appData.property}
                        user={user}
                        navigate={navigate}
                        handleDelete={handleDelete}
                        showToast={showToast}
                    />
                );
            case 'edit':
            case 'create':
                return (
                    <PropertyForm
                        formData={formData}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        loading={loading}
                        isEdit={appData.currentPage === 'edit'}
                        navigate={navigate}
                        errors={{}}
                        showToast={showToast}
                    />
                );
            default:
                return (
                    <PropertiesIndex
                        properties={filteredProperties}
                        allProperties={appData.properties || []}
                        user={user}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                        roomsFilter={roomsFilter}
                        setRoomsFilter={setRoomsFilter}
                        navigate={navigate}
                        contactSeller={contactSeller}
                        showToast={showToast}
                    />
                );
        }
    }, [appData.currentPage, filteredProperties, appData.properties, appData.property, user, searchTerm, typeFilter, roomsFilter, navigate, handleDelete, formData, handleInputChange, handleSubmit, loading, showToast, contactSeller]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
            {renderPage()}
        </div>
    );
}

export default Properties;
