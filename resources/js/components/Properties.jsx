import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        )
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-lg transform transition-all duration-300 ease-out ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'} ${typeStyles[type]} max-w-sm`}>
            <div className="flex-shrink-0 mr-3">{icons[type]}</div>
            <div className="flex-1"><p className="font-medium text-sm">{message}</p></div>
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
    const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group active:scale-95';

    const variants = {
        primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg focus:ring-emerald-500',
        secondary: 'bg-white dark:bg-gray-800 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 focus:ring-emerald-500',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg focus:ring-red-500',
        ghost: 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
    };

    const sizes = {
        sm: 'px-4 py-2.5 text-sm',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base'
    };

    return (
        <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
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
        <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">{message}</p>
    </div>
);

function PropertyCard({ property, user, navigate, contactSeller, viewMode = 'grid', currentPage }) {
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Obtener imagen principal o primera imagen
    const getMainImage = useCallback(() => {
        if (property.photos && property.photos.length > 0) {
            // Buscar imagen principal
            const primaryPhoto = property.photos.find(photo => photo.is_primary);
            if (primaryPhoto) {
                return primaryPhoto.url || `/storage/${primaryPhoto.path}`;
            }
            // Si no hay principal, usar la primera
            return property.photos[0].url || `/storage/${property.photos[0].path}`;
        }
        // Fallback a imagen legacy
        if (property.image) {
            return `/storage/${property.image}`;
        }
        // Placeholder
        return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop";
    }, [property]);

    // Obtener todas las imágenes para preview
    const getAllImages = useCallback(() => {
        const images = [];

        if (property.photos && property.photos.length > 0) {
            property.photos.forEach(photo => {
                images.push(photo.url || `/storage/${photo.path}`);
            });
        } else if (property.image) {
            images.push(`/storage/${property.image}`);
        }

        return images.length > 0 ? images : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"];
    }, [property]);

    const formatPrice = useCallback((price) => {
        return Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    }, []);

    const getPropertyTypeIcon = (type) => {
        const icons = { casa: '🏠', apartamento: '🏢', condominio: '🏘️', oficina: '🏢', local: '🏪', terreno: '🌳' };
        return icons[type] || '🏠';
    };

    const shouldShowContactButton = () => {
        return user && property.user_id !== user.id && currentPage !== 'my-properties';
    };

    const shouldShowOwnerButtons = () => {
        return user && property.user_id === user.id;
    };

    const totalImages = getAllImages().length;

    // Auto-cambiar imagen en hover (solo si hay múltiples imágenes)
    useEffect(() => {
        let interval;
        if (isHovered && totalImages > 1) {
            interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % totalImages);
            }, 1500); // Cambiar cada 1.5 segundos
        } else {
            setCurrentImageIndex(0);
        }
        return () => clearInterval(interval);
    }, [isHovered, totalImages]);

    if (viewMode === 'list') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row">
                    <div className="relative md:w-72 h-48 md:h-56 overflow-hidden">
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse"></div>
                        )}
                        <img
                            src={getMainImage()}
                            alt={property.title}
                            className={`w-full h-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
                            onLoad={() => setImageLoaded(true)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        {/* Contador de imágenes */}
                        {totalImages > 1 && (
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {totalImages}
                            </div>
                        )}

                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                            <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium">
                                {getPropertyTypeIcon(property.type)} {property.type}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${property.is_active ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                {property.is_active ? 'Disponible' : 'No disponible'}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 p-5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                            {property.title}
                        </h3>

                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                            <svg className="w-4 h-4 mr-2 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate text-sm">{property.address}, {property.city}, {property.state}</span>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                                <span className="text-sm mr-1">🛏️</span>
                                <span className="text-sm font-medium">{property.bedrooms || 0}</span>
                            </div>
                            <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                                <span className="text-sm mr-1">🚿</span>
                                <span className="text-sm font-medium">{property.bathrooms || 0}</span>
                            </div>
                            <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                                <span className="text-sm mr-1">📐</span>
                                <span className="text-sm font-medium">{property.area || 0} m²</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                ${formatPrice(property.price)}
                            </div>

                            <div className="flex gap-2">
                                <Button variant="primary" onClick={() => navigate('show', property.id)} size="sm">
                                    Ver Detalles
                                </Button>

                                {shouldShowContactButton() && (
                                    <Button variant="secondary" onClick={() => contactSeller(property.id, property.user_id)} size="sm">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        Contactar
                                    </Button>
                                )}

                                {shouldShowOwnerButtons() && (
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

    // VISTA GRID
    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100 dark:border-gray-700 hover:-translate-y-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative h-48 overflow-hidden">
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse"></div>
                )}

                {/* Imagen con transición al hacer hover */}
                <img
                    src={totalImages > 1 && isHovered ? getAllImages()[currentImageIndex] : getMainImage()}
                    alt={property.title}
                    className={`w-full h-full object-cover transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isHovered ? 'scale-110' : 'scale-100'}`}
                    onLoad={() => setImageLoaded(true)}
                />

                {/* Indicadores de navegación de imágenes */}
                {totalImages > 1 && isHovered && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {getAllImages().map((_, index) => (
                            <div
                                key={index}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    index === currentImageIndex
                                        ? 'bg-white w-3'
                                        : 'bg-white/50'
                                }`}
                            />
                        ))}
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                {/* Contador de imágenes */}
                {totalImages > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {totalImages}
                    </div>
                )}

                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium">
                        {getPropertyTypeIcon(property.type)} {property.type}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${property.is_active ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                        {property.is_active ? 'Disponible' : 'No disponible'}
                    </span>
                </div>
            </div>

            <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
                    {property.title}
                </h3>

                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                    <svg className="w-4 h-4 mr-2 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate text-sm">{property.address}, {property.city}, {property.state}</span>
                </div>

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                            <span className="text-sm mr-1">🛏️</span>
                            <span className="text-sm font-medium">{property.bedrooms || 0}</span>
                        </div>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                            <span className="text-sm mr-1">🚿</span>
                            <span className="text-sm font-medium">{property.bathrooms || 0}</span>
                        </div>
                        <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                            <span className="text-sm mr-1">📐</span>
                            <span className="text-sm font-medium">{property.area || 0}m²</span>
                        </div>
                    </div>
                </div>

                <div className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
                    ${formatPrice(property.price)}
                </div>

                <div className="flex gap-2">
                    <Button variant="primary" onClick={() => navigate('show', property.id)} className="flex-1" size="sm">
                        Ver Detalles
                    </Button>

                    {shouldShowContactButton() && (
                        <Button variant="secondary" onClick={() => contactSeller(property.id, property.user_id)} size="sm" className="flex-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Contactar
                        </Button>
                    )}

                    {shouldShowOwnerButtons() && (
                        <Button variant="secondary" onClick={() => navigate('edit', property.id)} size="sm" className="px-3">
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

function PropertiesIndex({ properties, allProperties, user, searchTerm, setSearchTerm, typeFilter, setTypeFilter, roomsFilter, setRoomsFilter, navigate, contactSeller, showToast, currentPage }) {
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

    const getPageTitle = () => {
        if (currentPage === 'my-properties') {
            return 'Mis Propiedades';
        }
        return 'Explora Propiedades';
    };

    const getPageDescription = () => {
        if (currentPage === 'my-properties') {
            return 'Gestiona y edita tus propiedades publicadas';
        }
        return 'Encuentra tu hogar ideal entre nuestra selección de propiedades';
    };

    const getEmptyStateMessage = () => {
        if (currentPage === 'my-properties') {
            return {
                title: 'No tienes propiedades publicadas',
                description: 'Comienza publicando tu primera propiedad para empezar a recibir inquilinos.',
                buttonText: 'Publicar Mi Primera Propiedad'
            };
        }
        return {
            title: allProperties.length === 0 ? 'No hay propiedades disponibles' : 'No se encontraron propiedades',
            description: allProperties.length === 0
                ? 'Actualmente no tenemos propiedades registradas. Vuelve más tarde para ver nuevas opciones.'
                : 'Intenta con otros filtros de búsqueda.',
            buttonText: 'Registrar Propiedad'
        };
    };

    return (
        <>
            <header className="relative bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-200 rounded-full blur-xl"></div>
                    <div className="absolute top-32 right-20 w-16 h-16 bg-teal-200 rounded-full blur-xl"></div>
                    <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-cyan-200 rounded-full blur-xl"></div>
                </div>
                <div className="relative max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                        {getPageTitle()}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {getPageDescription()}
                    </p>
                </div>
            </header>

            <section className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por título, ciudad o dirección..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 items-center">
                            <select
                                className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-all duration-300 text-sm"
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
                                className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-all duration-300 text-sm"
                                value={roomsFilter}
                                onChange={(e) => setRoomsFilter(e.target.value)}
                            >
                                <option value="">Habitaciones</option>
                                <option value="1">1 hab</option>
                                <option value="2">2 hab</option>
                                <option value="3">3 hab</option>
                                <option value="4+">4+ hab</option>
                            </select>

                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </button>
                            </div>

                            {user && (
                                <Button variant="primary" onClick={() => navigate('create')} className="whitespace-nowrap" size="sm">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Nueva Propiedad
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
                <div className="max-w-7xl mx-auto px-4">
                    {isLoading && <LoadingSpinner message="Iniciando conversación..." />}

                    {properties.length > 0 ? (
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
                            {properties.map(property => (
                                <PropertyCard
                                    key={property.id}
                                    property={property}
                                    user={user}
                                    navigate={navigate}
                                    contactSeller={handleContactSeller}
                                    viewMode={viewMode}
                                    currentPage={currentPage}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21l4-4 4 4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13v4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {getEmptyStateMessage().title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                {getEmptyStateMessage().description}
                            </p>
                            {user && (
                                <Button variant="primary" onClick={() => navigate('create')}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    {getEmptyStateMessage().buttonText}
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
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    // Obtener todas las imágenes (photos del modelo + imagen legacy si existe)
    const getAllImages = useMemo(() => {
        const images = [];

        // Primero agregar la imagen principal si existe
        if (property?.photos && property.photos.length > 0) {
            // Ordenar por is_primary primero, luego por sort_order
            const sortedPhotos = [...property.photos].sort((a, b) => {
                if (a.is_primary && !b.is_primary) return -1;
                if (!a.is_primary && b.is_primary) return 1;
                return (a.sort_order || 0) - (b.sort_order || 0);
            });

            sortedPhotos.forEach(photo => {
                images.push({
                    url: photo.url || `/storage/${photo.path}`,
                    title: photo.caption || property.title,
                    isPrimary: photo.is_primary,
                    roomType: photo.room_type,
                    id: photo.id
                });
            });
        }

        // Si no hay fotos nuevas pero hay imagen legacy, usarla
        if (images.length === 0 && property?.image) {
            images.push({
                url: `/storage/${property.image}`,
                title: property.title,
                isPrimary: true,
                roomType: 'exterior',
                id: 'legacy'
            });
        }

        // Si no hay ninguna imagen, usar placeholder
        if (images.length === 0) {
            images.push({
                url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop",
                title: "Sin imagen",
                isPrimary: true,
                roomType: 'exterior',
                id: 'placeholder'
            });
        }

        return images;
    }, [property]);

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

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % getAllImages.length);
    };

    const previousImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + getAllImages.length) % getAllImages.length);
    };

    const selectImage = (index) => {
        setCurrentImageIndex(index);
    };

    const getRoomTypeLabel = (type) => {
        const labels = {
            exterior: '🏠 Exterior',
            living_room: '🛋️ Sala',
            kitchen: '🍳 Cocina',
            bedroom: '🛏️ Recámara',
            bathroom: '🚿 Baño',
            other: '📷 Otros'
        };
        return labels[type] || '📷 Foto';
    };

    const getMapboxToken = async () => {
        try {
            const response = await fetch('/api/map-config', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.mapboxToken;
            }
        } catch (error) {
            console.error('Error obteniendo token desde API:', error);
        }
        return null;
    };

    useEffect(() => {
        if (property && property.latitude && property.longitude) {
            loadMapbox();
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }
        };
    }, [property]);

    const loadMapbox = async () => {
        try {
            const mapboxToken = await getMapboxToken();

            if (!mapboxToken) {
                setMapError('Token de Mapbox no encontrado.');
                return;
            }

            if (!document.querySelector('link[href*="mapbox-gl"]')) {
                const mapboxCSS = document.createElement('link');
                mapboxCSS.rel = 'stylesheet';
                mapboxCSS.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
                document.head.appendChild(mapboxCSS);
            }

            if (!window.mapboxgl) {
                const script = document.createElement('script');
                script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
                script.onload = () => initializeMap(mapboxToken);
                script.onerror = () => setMapError('Error al cargar Mapbox GL JS');
                document.head.appendChild(script);
            } else {
                initializeMap(mapboxToken);
            }
        } catch (error) {
            setMapError('Error al cargar el mapa: ' + error.message);
        }
    };

    const initializeMap = (token) => {
        if (!mapRef.current || mapInstanceRef.current || !property.latitude || !property.longitude) {
            return;
        }

        try {
            const mapboxgl = window.mapboxgl;
            mapboxgl.accessToken = token;

            const propertyCoords = [parseFloat(property.longitude), parseFloat(property.latitude)];

            const map = new mapboxgl.Map({
                container: mapRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: propertyCoords,
                zoom: 16
            });

            map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
            map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');

            mapInstanceRef.current = map;

            map.on('load', () => {
                addPropertyMarker(propertyCoords);
                setMapLoaded(true);
            });

            map.on('error', (e) => {
                console.error('Error del mapa:', e);
                setMapError('Error al cargar el mapa: ' + e.error.message);
            });

        } catch (error) {
            console.error('Error inicializando mapa:', error);
            setMapError('Error al inicializar el mapa: ' + error.message);
        }
    };

    const addPropertyMarker = (coords) => {
        if (!mapInstanceRef.current) return;

        const mapboxgl = window.mapboxgl;

        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
            <div style="
                width: 45px;
                height: 45px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: 4px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 6px 12px rgba(0,0,0,0.2);
                animation: bounce 2s infinite;
            ">🏠</div>
            <style>
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }
            </style>
        `;

        const marker = new mapboxgl.Marker({
            element: markerElement,
            anchor: 'bottom'
        })
        .setLngLat(coords)
        .addTo(mapInstanceRef.current);

        const popupContent = `
            <div style="font-family: Inter, sans-serif; min-width: 280px; padding: 8px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                    ${property.title}
                </h3>
                <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                    <p style="margin: 0; font-weight: bold; color: #065f46; font-size: 20px; text-align: center;">
                        $${Number(property.price).toLocaleString('es-MX')}
                    </p>
                </div>
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    📍 ${property.address}, ${property.city}${property.state ? ', ' + property.state : ''}
                </p>
            </div>
        `;

        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
            maxWidth: '320px'
        }).setHTML(popupContent);

        marker.setPopup(popup);
        markerRef.current = marker;

        setTimeout(() => {
            popup.addTo(mapInstanceRef.current);
        }, 500);
    };

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Propiedad no encontrada</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">La propiedad que buscas no existe o ha sido eliminada.</p>
                    <Button variant="primary" onClick={() => navigate('index')} className="w-full">
                        Volver a Propiedades
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-emerald-500/20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => navigate('index')} size="sm" className="text-gray-300 hover:text-white">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver
                        </Button>

                        {user && property.user_id === user.id && (
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => navigate('edit', property.id)} size="sm">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editar
                                </Button>
                                <Button variant="danger" onClick={() => handleDeleteWithConfirmation(property.id)} size="sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-emerald-500/20 overflow-hidden mb-8">
                        <div className="lg:flex">
                            {/* GALERÍA DE IMÁGENES */}
                            <div className="lg:w-3/5 relative">
                                <div className="relative h-96 lg:h-[500px] bg-gray-900">
                                    {/* Imagen principal */}
                                    <img
                                        src={getAllImages[currentImageIndex].url}
                                        alt={getAllImages[currentImageIndex].title}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={() => setIsImageModalOpen(true)}
                                    />

                                    {/* Overlay con gradiente */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

                                    {/* Contador de imágenes */}
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-medium">
                                        {currentImageIndex + 1} / {getAllImages.length}
                                    </div>

                                    {/* Tipo de habitación */}
                                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-medium">
                                        {getRoomTypeLabel(getAllImages[currentImageIndex].roomType)}
                                    </div>

                                    {/* Indicador de imagen principal */}
                                    {getAllImages[currentImageIndex].isPrimary && (
                                        <div className="absolute top-16 left-4 bg-yellow-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-bold">
                                            ⭐ Principal
                                        </div>
                                    )}

                                    {/* Botones de navegación */}
                                    {getAllImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={previousImage}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-white"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-white"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </>
                                    )}

                                    {/* Precio overlay */}
                                    <div className="absolute bottom-6 left-6 right-6">
                                        <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                            <div className="text-3xl font-bold text-white mb-1">
                                                ${formatPrice(property.price)}
                                            </div>
                                            <div className="text-emerald-300 text-sm font-medium">
                                                MXN • {property.area ? `${Math.round(property.price / property.area).toLocaleString()} por m²` : 'Precio total'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Thumbnails */}
                                {getAllImages.length > 1 && (
                                    <div className="bg-gray-900 p-4">
                                        <div className="flex gap-2 overflow-x-auto">
                                            {getAllImages.map((image, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => selectImage(index)}
                                                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                                        currentImageIndex === index
                                                            ? 'border-emerald-500 scale-105'
                                                            : 'border-transparent hover:border-gray-600'
                                                    }`}
                                                >
                                                    <img
                                                        src={image.url}
                                                        alt={`Vista ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {image.isPrimary && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <span className="text-yellow-400 text-lg">⭐</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* INFORMACIÓN DE LA PROPIEDAD */}
                            <div className="lg:w-2/5 p-8 lg:p-10">
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${property.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                                            {property.is_active ? '✅ Disponible' : '❌ No disponible'}
                                        </span>
                                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-4 py-2 rounded-full text-sm font-semibold capitalize">
                                            🏠 {property.type}
                                        </span>
                                    </div>

                                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                                        {property.title}
                                    </h1>

                                    <div className="flex items-center text-gray-300 mb-6">
                                        <svg className="w-5 h-5 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-lg">{property.address}, {property.city}, {property.state}</span>
                                    </div>

                                    {property.user && (
                                        <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30 mb-6">
                                            <div className="flex items-center">
                                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mr-4">
                                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-400">Publicado por</div>
                                                    <div className="text-lg font-semibold text-white">
                                                        {property.user.name} {property.user.last_name || ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="text-center bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30 hover:border-blue-500/30 transition-colors">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
                                            <span className="text-2xl">🛏️</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">{property.bedrooms || 0}</div>
                                        <div className="text-sm text-gray-400">Habitaciones</div>
                                    </div>
                                    <div className="text-center bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30 hover:border-purple-500/30 transition-colors">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
                                            <span className="text-2xl">🚿</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">{property.bathrooms || 0}</div>
                                        <div className="text-sm text-gray-400">Baños</div>
                                    </div>
                                    <div className="text-center bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30 hover:border-orange-500/30 transition-colors">
                                        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-orange-500/30">
                                            <span className="text-2xl">📐</span>
                                        </div>
                                        <div className="text-2xl font-bold text-white mb-1">{property.area || 0}</div>
                                        <div className="text-sm text-gray-400">m²</div>
                                    </div>
                                </div>

                                {property.description && (
                                    <div className="mb-6">
                                        <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                                            <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center mr-3 border border-emerald-500/30">
                                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </span>
                                            Descripción
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed text-lg bg-gray-700/20 backdrop-blur-sm p-4 rounded-xl border border-gray-600/30">
                                            {property.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RESTO DEL CONTENIDO (Ubicación, Precio, etc.) */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-emerald-500/20 p-8">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                                    <span className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mr-4 border border-emerald-500/30">
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                    </span>
                                    Ubicación
                                </h3>

                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                                        <div className="text-gray-400 mb-2 text-sm font-medium">Dirección</div>
                                        <div className="font-semibold text-white text-lg">{property.address}</div>
                                    </div>
                                    <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                                        <div className="text-gray-400 mb-2 text-sm font-medium">Ciudad</div>
                                        <div className="font-semibold text-white text-lg">{property.city}</div>
                                    </div>
                                    <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                                        <div className="text-gray-400 mb-2 text-sm font-medium">Estado</div>
                                        <div className="font-semibold text-white text-lg">{property.state}</div>
                                    </div>
                                    <div className="bg-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-600/30">
                                        <div className="text-gray-400 mb-2 text-sm font-medium">Código Postal</div>
                                        <div className="font-semibold text-white text-lg">{property.postal_code || 'N/A'}</div>
                                    </div>
                                </div>

                                {property.latitude && property.longitude && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-lg font-semibold text-white flex items-center">
                                                <span className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center mr-2 border border-blue-500/30">
                                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                                                    </svg>
                                                </span>
                                                Mapa de Ubicación
                                            </h4>
                                            <div className="text-xs text-gray-400">
                                                Lat: {parseFloat(property.latitude).toFixed(6)}, Lng: {parseFloat(property.longitude).toFixed(6)}
                                            </div>
                                        </div>

                                        <div className="rounded-xl overflow-hidden border border-gray-600/30 shadow-lg">
                                            <div
                                                ref={mapRef}
                                                className="w-full h-80 bg-gray-700/50"
                                                style={{ minHeight: '320px' }}
                                            >
                                                {mapError ? (
                                                    <div className="h-full flex items-center justify-center bg-red-900/20 text-red-300">
                                                        <div className="text-center">
                                                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="font-medium">Error al cargar el mapa</p>
                                                            <p className="text-sm opacity-75">{mapError}</p>
                                                        </div>
                                                    </div>
                                                ) : !mapLoaded ? (
                                                    <div className="h-full flex items-center justify-center bg-gray-700/50">
                                                        <div className="text-center text-gray-300">
                                                            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                            <p className="text-sm">Cargando mapa...</p>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/20">
                                            <div className="flex items-center text-emerald-200 text-sm">
                                                <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Haz clic en el marcador para ver más información de la propiedad
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="bg-gradient-to-br from-emerald-800/50 to-teal-800/50 rounded-2xl shadow-xl border border-emerald-500/30 p-8">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                                    <span className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mr-4 border border-green-500/30">
                                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                    </span>
                                    Precio
                                </h3>

                                <div className="text-center">
                                    <div className="text-4xl font-bold text-emerald-300 mb-3">
                                        ${formatPrice(property.price)}
                                    </div>
                                    <div className="text-emerald-200 mb-6 font-medium">
                                        Pesos mexicanos (MXN)
                                    </div>

                                    {property.area && (
                                        <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/20">
                                            <div className="text-emerald-200 text-lg font-semibold">
                                                ${Math.round(property.price / property.area).toLocaleString()} por m²
                                            </div>
                                            <div className="text-emerald-300/80 text-sm">Precio por metro cuadrado</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE IMAGEN AMPLIADA */}
            {isImageModalOpen && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="relative max-w-7xl max-h-full w-full">
                        <div className="relative">
                            <img
                                src={getAllImages[currentImageIndex].url}
                                alt={getAllImages[currentImageIndex].title}
                                className="max-w-full max-h-[90vh] object-contain mx-auto rounded-2xl shadow-2xl"
                            />

                            {/* Info overlay en modal */}
                            <div className="absolute top-4 left-4 space-y-2">
                                <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-medium">
                                    {getRoomTypeLabel(getAllImages[currentImageIndex].roomType)}
                                </div>
                                {getAllImages[currentImageIndex].isPrimary && (
                                    <div className="bg-yellow-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-bold">
                                        ⭐ Principal
                                    </div>
                                )}
                            </div>

                            {/* Contador en modal */}
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm font-medium">
                                {currentImageIndex + 1} / {getAllImages.length}
                            </div>

                            {/* Navegación en modal */}
                            {getAllImages.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            previousImage();
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-white border border-white/20"
                                    >
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            nextImage();
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-white border border-white/20"
                                    >
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Botón cerrar */}
                        <button
                            onClick={() => setIsImageModalOpen(false)}
                            className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-white border border-white/20 z-10"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Thumbnails en modal */}
                        {getAllImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-xl p-2">
                                <div className="flex gap-2 max-w-2xl overflow-x-auto">
                                    {getAllImages.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectImage(index);
                                            }}
                                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                                currentImageIndex === index
                                                    ? 'border-emerald-500 scale-110'
                                                    : 'border-transparent hover:border-gray-400'
                                            }`}
                                        >
                                            <img
                                                src={image.url}
                                                alt={`Vista ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {image.isPrimary && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <span className="text-yellow-400 text-xs">⭐</span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

function PropertyForm({ formData, handleInputChange, handleSubmit, loading, isEdit, navigate, errors, showToast }) {
    const [dragActive, setDragActive] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedImages, setSelectedImages] = useState([]);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [primaryImageId, setPrimaryImageId] = useState(null);

    // Estados para el mapa y búsqueda de ubicación
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);

    // Estados para redimensionar el mapa
    const [mapWidth, setMapWidth] = useState(400);
    const [mapHeight, setMapHeight] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState(null);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [startSize, setStartSize] = useState({ width: 0, height: 0 });
    const [isExpanded, setIsExpanded] = useState(false);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

    // Cargar imágenes existentes al editar
    useEffect(() => {
        if (isEdit && formData.id) {
            loadExistingImages();
        }
    }, [isEdit, formData.id]);

    const loadExistingImages = async () => {
        try {
            const response = await fetch(`/properties/${formData.id}/images`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUploadedImages(data.images || []);

                const primary = data.images?.find(img => img.is_primary);
                if (primary) {
                    setPrimaryImageId(primary.id);
                }
            }
        } catch (error) {
            console.error('Error cargando imágenes:', error);
            showToast('Error al cargar las imágenes existentes', 'error');
        }
    };

    // Manejar selección de múltiples imágenes
    const handleMultipleImagesChange = useCallback((e) => {
        const files = Array.from(e.target.files || []);

        if (files.length === 0) return;

        // Validar límite de imágenes
        const totalImages = uploadedImages.length + selectedImages.length + files.length;
        if (totalImages > 15) {
            showToast(`Solo puedes tener hasta 15 imágenes. Actualmente tienes ${uploadedImages.length + selectedImages.length} imágenes.`, 'error');
            return;
        }

        // Validar tamaño de archivos
        const invalidFiles = files.filter(file => file.size > 8 * 1024 * 1024);
        if (invalidFiles.length > 0) {
            showToast('Algunas imágenes superan los 8MB permitidos', 'error');
            return;
        }

        const validFiles = files.filter(file => file.size <= 8 * 1024 * 1024);

        const newImages = validFiles.map((file, index) => ({
            id: `temp_${Date.now()}_${index}`,
            file: file,
            preview: URL.createObjectURL(file),
            room_type: 'other',
            is_primary: uploadedImages.length === 0 && selectedImages.length === 0 && index === 0
        }));

        setSelectedImages(prev => [...prev, ...newImages]);
        showToast(`${validFiles.length} imagen(es) agregada(s)`, 'success');
    }, [selectedImages, uploadedImages, showToast]);

    // FORMULARIO SUBMIT SIMPLIFICADO
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        console.log('📤 ENVIANDO FORMULARIO CON IMÁGENES');
        console.log('Imágenes seleccionadas:', selectedImages.length);

        showToast(isEdit ? 'Actualizando propiedad...' : 'Guardando propiedad...', 'info');

        // Ahora todo se maneja en handleSubmit
        await handleSubmit(e, selectedImages);
    };

    // Eliminar imagen
    const removeImage = async (imageId, isUploaded = false) => {
        if (isUploaded) {
            try {
                const response = await fetch(`/properties/${formData.id}/images/${imageId}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                    }
                });

                if (response.ok) {
                    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
                    showToast('Imagen eliminada', 'success');

                    if (primaryImageId === imageId) {
                        setPrimaryImageId(null);
                    }
                } else {
                    throw new Error('Error al eliminar');
                }
            } catch (error) {
                showToast('Error al eliminar la imagen', 'error');
            }
        } else {
            setSelectedImages(prev => {
                const imageToRemove = prev.find(img => img.id === imageId);
                if (imageToRemove?.preview) {
                    URL.revokeObjectURL(imageToRemove.preview);
                }
                return prev.filter(img => img.id !== imageId);
            });
        }
    };

    // Establecer imagen principal
    const setPrimaryImage = async (imageId, isUploaded = false) => {
        if (isUploaded) {
            try {
                const response = await fetch(`/properties/${formData.id}/images/${imageId}/primary`, {
                    method: 'PATCH',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                    }
                });

                if (response.ok) {
                    setPrimaryImageId(imageId);
                    setUploadedImages(prev => prev.map(img => ({
                        ...img,
                        is_primary: img.id === imageId
                    })));
                    showToast('Imagen principal actualizada', 'success');
                }
            } catch (error) {
                showToast('Error al establecer imagen principal', 'error');
            }
        } else {
            setSelectedImages(prev => prev.map(img => ({
                ...img,
                is_primary: img.id === imageId
            })));
        }
    };

    // Cambiar tipo de habitación
    const changeRoomType = (imageId, roomType, isUploaded = false) => {
        if (isUploaded) {
            setUploadedImages(prev => prev.map(img =>
                img.id === imageId ? { ...img, room_type: roomType } : img
            ));
        } else {
            setSelectedImages(prev => prev.map(img =>
                img.id === imageId ? { ...img, room_type: roomType } : img
            ));
        }
    };

    // DRAG AND DROP para imágenes
    const handleImageDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleImageDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = Array.from(e.dataTransfer.files || []);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            handleMultipleImagesChange({ target: { files: imageFiles } });
        } else {
            showToast('Por favor, selecciona solo archivos de imagen', 'error');
        }
    }, [handleMultipleImagesChange, showToast]);

    // Tipos de habitación disponibles
    const roomTypes = [
        { value: 'exterior', label: '🏠 Exterior', color: 'bg-blue-100 text-blue-800' },
        { value: 'living_room', label: '🛋️ Sala', color: 'bg-green-100 text-green-800' },
        { value: 'kitchen', label: '🍳 Cocina', color: 'bg-orange-100 text-orange-800' },
        { value: 'bedroom', label: '🛏️ Recámara', color: 'bg-purple-100 text-purple-800' },
        { value: 'bathroom', label: '🚿 Baño', color: 'bg-teal-100 text-teal-800' },
        { value: 'other', label: '📷 Otros', color: 'bg-gray-100 text-gray-800' }
    ];

    // FUNCIONES DEL MAPA (Las conservamos todas igual que antes)
    const getMapboxToken = async () => {
        try {
            const response = await fetch('/api/map-config', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.mapboxToken;
            }
        } catch (error) {
            console.error('Error obteniendo token desde API:', error);
        }
        return null;
    };

    // ... (Todas las demás funciones del mapa se mantienen igual)

    const handleResizeStart = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        setStartPosition({ x: e.clientX, y: e.clientY });
        setStartSize({ width: mapWidth, height: mapHeight });

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = getCursor(direction);
        document.body.style.userSelect = 'none';
    };

    const handleResizeMove = (e) => {
        if (!isResizing || !resizeDirection) return;

        const deltaX = e.clientX - startPosition.x;
        const deltaY = e.clientY - startPosition.y;

        let newWidth = startSize.width;
        let newHeight = startSize.height;

        switch (resizeDirection) {
            case 'se':
                newWidth = Math.max(300, Math.min(800, startSize.width + deltaX));
                newHeight = Math.max(200, Math.min(600, startSize.height + deltaY));
                break;
            case 'e':
                newWidth = Math.max(300, Math.min(800, startSize.width + deltaX));
                break;
            case 's':
                newHeight = Math.max(200, Math.min(600, startSize.height + deltaY));
                break;
            case 'sw':
                newWidth = Math.max(300, Math.min(800, startSize.width - deltaX));
                newHeight = Math.max(200, Math.min(600, startSize.height + deltaY));
                break;
            case 'w':
                newWidth = Math.max(300, Math.min(800, startSize.width - deltaX));
                break;
        }

        setMapWidth(newWidth);
        setMapHeight(newHeight);

        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.resize();
            }, 10);
        }
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
        setResizeDirection(null);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    const getCursor = (direction) => {
        switch (direction) {
            case 'se': return 'nw-resize';
            case 'sw': return 'ne-resize';
            case 'e': case 'w': return 'ew-resize';
            case 's': return 'ns-resize';
            default: return 'default';
        }
    };

    const mapSizePresets = [
        { name: 'Pequeño', width: 350, height: 250, icon: '📱' },
        { name: 'Mediano', width: 500, height: 350, icon: '💻' },
        { name: 'Grande', width: 650, height: 450, icon: '🖥️' },
        { name: 'Extra Grande', width: 800, height: 550, icon: '📺' }
    ];

    const setMapSize = (width, height) => {
        setMapWidth(width);
        setMapHeight(height);
        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.resize();
            }, 10);
        }
    };

    const toggleExpandMap = () => {
        if (isExpanded) {
            setMapWidth(400);
            setMapHeight(300);
            setIsExpanded(false);
        } else {
            setMapWidth(800);
            setMapHeight(600);
            setIsExpanded(true);
        }

        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.resize();
            }, 100);
        }
    };

    const extractLocationData = (feature) => {
        const context = feature.context || [];
        let city = '', state = '', country = '', postalCode = '';

        context.forEach(item => {
            if (item.id.includes('place')) {
                city = item.text;
            } else if (item.id.includes('region')) {
                state = item.text;
            } else if (item.id.includes('country')) {
                country = item.text;
            } else if (item.id.includes('postcode')) {
                postalCode = item.text;
            }
        });

        if (!city && feature.text && !feature.text.includes(',')) {
            city = feature.text;
        }

        return { city, state, country, postalCode };
    };

    useEffect(() => {
        loadMapbox();
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);

            selectedImages.forEach(img => {
                if (img.preview) {
                    URL.revokeObjectURL(img.preview);
                }
            });
        };
    }, []);

    useEffect(() => {
        if (mapInstanceRef.current) {
            const timer = setTimeout(() => {
                mapInstanceRef.current.resize();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [mapWidth, mapHeight]);

    const loadMapbox = async () => {
        try {
            const mapboxToken = await getMapboxToken();

            if (!mapboxToken) {
                setMapError('Token de Mapbox no encontrado.');
                return;
            }

            if (!document.querySelector('link[href*="mapbox-gl"]')) {
                const mapboxCSS = document.createElement('link');
                mapboxCSS.rel = 'stylesheet';
                mapboxCSS.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
                document.head.appendChild(mapboxCSS);
            }

            if (!window.mapboxgl) {
                const script = document.createElement('script');
                script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
                script.onload = () => initializeMap(mapboxToken);
                script.onerror = () => setMapError('Error al cargar Mapbox GL JS');
                document.head.appendChild(script);
            } else {
                initializeMap(mapboxToken);
            }
        } catch (error) {
            setMapError('Error al cargar el mapa: ' + error.message);
        }
    };

    const initializeMap = (token) => {
        if (!mapRef.current || mapInstanceRef.current) return;

        try {
            const mapboxgl = window.mapboxgl;
            mapboxgl.accessToken = token;

            let defaultCenter = [-103.3496, 20.6597];

            if (formData.latitude && formData.longitude) {
                defaultCenter = [parseFloat(formData.longitude), parseFloat(formData.latitude)];
                setSelectedCoordinates([parseFloat(formData.latitude), parseFloat(formData.longitude)]);
            }

            const map = new mapboxgl.Map({
                container: mapRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: defaultCenter,
                zoom: selectedCoordinates ? 16 : 13
            });

            map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
            mapInstanceRef.current = map;

            if (selectedCoordinates || (formData.latitude && formData.longitude)) {
                const coords = selectedCoordinates || [parseFloat(formData.latitude), parseFloat(formData.longitude)];
                addMarker(coords);
            }

            map.on('click', handleMapClick);
            setMapLoaded(true);
        } catch (error) {
            console.error('Error inicializando mapa:', error);
            setMapError('Error al inicializar el mapa: ' + error.message);
        }
    };

    const handleMapClick = async (e) => {
        const { lng, lat } = e.lngLat;
        const newCoordinates = [lat, lng];

        addMarker(newCoordinates);

        try {
            const addressResult = await reverseGeocode(lat, lng);

            handleInputChange({
                target: { name: 'address', value: addressResult.address }
            });
            handleInputChange({
                target: { name: 'latitude', value: lat }
            });
            handleInputChange({
                target: { name: 'longitude', value: lng }
            });

            if (addressResult.city) {
                handleInputChange({
                    target: { name: 'city', value: addressResult.city }
                });
            }
            if (addressResult.state) {
                handleInputChange({
                    target: { name: 'state', value: addressResult.state }
                });
            }
            if (addressResult.country) {
                handleInputChange({
                    target: { name: 'country', value: addressResult.country }
                });
            }
            if (addressResult.postalCode) {
                handleInputChange({
                    target: { name: 'postal_code', value: addressResult.postalCode }
                });
            }

            setSelectedCoordinates(newCoordinates);
            showToast('Ubicación seleccionada correctamente', 'success');
        } catch (error) {
            console.error('Error en reverse geocoding:', error);
            setSelectedCoordinates(newCoordinates);
            handleInputChange({
                target: { name: 'latitude', value: lat }
            });
            handleInputChange({
                target: { name: 'longitude', value: lng }
            });
            showToast('Ubicación seleccionada (sin dirección automática)', 'info');
        }
    };

    const addMarker = (coords, addressText = '') => {
        if (!mapInstanceRef.current) return;

        const mapboxgl = window.mapboxgl;

        if (markerRef.current) {
            markerRef.current.remove();
        }

        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
            <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border: 3px solid #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            ">🏠</div>
        `;

        const marker = new mapboxgl.Marker({
            element: markerElement,
            draggable: true
        })
        .setLngLat([coords[1], coords[0]])
        .addTo(mapInstanceRef.current);

        const popupContent = addressText || `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
        const popup = new mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false
        }).setHTML(`
            <div style="text-align: center; font-family: Inter, sans-serif; padding: 10px; min-width: 200px;">
                <strong>📍 Ubicación seleccionada</strong><br>
                <small style="color: #666; font-size: 12px;">${popupContent}</small>
            </div>
        `);

        marker.setPopup(popup);

        marker.on('dragend', async () => {
            const lngLat = marker.getLngLat();
            const { lng, lat } = lngLat;
            const newCoords = [lat, lng];

            try {
                const addressResult = await reverseGeocode(lat, lng);

                handleInputChange({
                    target: { name: 'address', value: addressResult.address }
                });
                handleInputChange({
                    target: { name: 'latitude', value: lat }
                });
                handleInputChange({
                    target: { name: 'longitude', value: lng }
                });

                if (addressResult.city) {
                    handleInputChange({
                        target: { name: 'city', value: addressResult.city }
                    });
                }
                if (addressResult.state) {
                    handleInputChange({
                        target: { name: 'state', value: addressResult.state }
                    });
                }
                if (addressResult.country) {
                    handleInputChange({
                        target: { name: 'country', value: addressResult.country }
                    });
                }

                popup.setHTML(`
                    <div style="text-align: center; font-family: Inter, sans-serif; padding: 10px; min-width: 200px;">
                        <strong>📍 Ubicación seleccionada</strong><br>
                        <small style="color: #666; font-size: 12px;">${addressResult.address}</small>
                    </div>
                `);

                setSelectedCoordinates(newCoords);
                showToast('Ubicación actualizada', 'success');
            } catch (error) {
                console.error('Error actualizando ubicación:', error);
                setSelectedCoordinates(newCoords);
                handleInputChange({
                    target: { name: 'latitude', value: lat }
                });
                handleInputChange({
                    target: { name: 'longitude', value: lng }
                });
            }
        });

        markerRef.current = marker;
        setSelectedCoordinates(coords);

        mapInstanceRef.current.flyTo({
            center: [coords[1], coords[0]],
            zoom: 16
        });
    };

    const handleAddressSearch = useCallback((searchValue) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchValue.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            await searchAddresses(searchValue);
        }, 500);
    }, []);

    const searchAddresses = async (query) => {
        try {
            const mapboxToken = await getMapboxToken();
            if (!mapboxToken) {
                setAddressSuggestions([]);
                setShowSuggestions(false);
                setIsSearching(false);
                return;
            }

            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=mx&limit=5&language=es`
            );

            const results = await response.json();

            if (results && results.features && results.features.length > 0) {
                const suggestions = results.features.map(feature => ({
                    place_name: feature.place_name,
                    center: feature.center,
                    text: feature.text,
                    address: feature.place_name,
                    feature: feature
                }));

                setAddressSuggestions(suggestions);
                setShowSuggestions(true);
            } else {
                setAddressSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Error buscando direcciones:', error);
            setAddressSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsSearching(false);
        }
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const mapboxToken = await getMapboxToken();
            if (!mapboxToken) {
                return {
                    address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    city: '',
                    state: '',
                    country: '',
                    postalCode: ''
                };
            }

            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=es`
            );

            const result = await response.json();

            if (result && result.features && result.features.length > 0) {
                const feature = result.features[0];
                const locationData = extractLocationData(feature);

                return {
                    address: feature.place_name,
                    city: locationData.city,
                    state: locationData.state,
                    country: locationData.country,
                    postalCode: locationData.postalCode
                };
            } else {
                return {
                    address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    city: '',
                    state: '',
                    country: '',
                    postalCode: ''
                };
            }
        } catch (error) {
            console.error('Error en reverse geocoding:', error);
            return {
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                city: '',
                state: '',
                country: '',
                postalCode: ''
            };
        }
    };

    const getCurrentLocation = () => {
        if (!("geolocation" in navigator)) {
            showToast('Geolocalización no disponible en este navegador', 'error');
            return;
        }

        setIsGettingLocation(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const coords = [latitude, longitude];

                try {
                    const addressResult = await reverseGeocode(latitude, longitude);

                    if (mapInstanceRef.current) {
                        addMarker(coords, addressResult.address);
                    }

                    handleInputChange({
                        target: { name: 'address', value: addressResult.address }
                    });
                    handleInputChange({
                        target: { name: 'latitude', value: latitude }
                    });
                    handleInputChange({
                        target: { name: 'longitude', value: longitude }
                    });

                    if (addressResult.city) {
                        handleInputChange({
                            target: { name: 'city', value: addressResult.city }
                        });
                    }
                    if (addressResult.state) {
                        handleInputChange({
                            target: { name: 'state', value: addressResult.state }
                        });
                    }
                    if (addressResult.country) {
                        handleInputChange({
                            target: { name: 'country', value: addressResult.country }
                        });
                    }
                    if (addressResult.postalCode) {
                        handleInputChange({
                            target: { name: 'postal_code', value: addressResult.postalCode }
                        });
                    }

                    showToast('Ubicación actual obtenida correctamente', 'success');
                } catch (error) {
                    console.error('Error obteniendo dirección:', error);
                    showToast('Ubicación obtenida (sin dirección automática)', 'info');
                }

                setIsGettingLocation(false);
            },
            (error) => {
                console.error('Error de geolocalización:', error);
                showToast('Error al obtener ubicación actual', 'error');
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const selectSuggestion = (suggestion) => {
        const coords = [suggestion.center[1], suggestion.center[0]];
        const locationData = extractLocationData(suggestion.feature);

        handleInputChange({
            target: { name: 'address', value: suggestion.text }
        });
        handleInputChange({
            target: { name: 'latitude', value: suggestion.center[1] }
        });
        handleInputChange({
            target: { name: 'longitude', value: suggestion.center[0] }
        });

        if (locationData.city) {
            handleInputChange({
                target: { name: 'city', value: locationData.city }
            });
        }
        if (locationData.state) {
            handleInputChange({
                target: { name: 'state', value: locationData.state }
            });
        }
        if (locationData.country) {
            handleInputChange({
                target: { name: 'country', value: locationData.country }
            });
        }
        if (locationData.postalCode) {
            handleInputChange({
                target: { name: 'postal_code', value: locationData.postalCode }
            });
        }

        if (mapInstanceRef.current) {
            addMarker(coords, suggestion.text);
        }

        setShowSuggestions(false);
        setAddressSuggestions([]);

        showToast('Dirección seleccionada correctamente', 'success');
    };

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

    return (
        <>
            <header className="relative bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isEdit ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            )}
                        </svg>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                        {isEdit ? 'Editar Propiedad' : 'Nueva Propiedad'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        {isEdit ? 'Actualiza la información de tu propiedad' : 'Comparte tu propiedad con la comunidad'}
                    </p>
                </div>
            </header>

            <section className="bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <Button variant="ghost" onClick={() => navigate('index')} className="mb-6">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a Propiedades
                    </Button>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="p-6 md:p-8">
                            {hasErrors && (
                                <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <div className="flex items-center mb-3">
                                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-2">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h4 className="font-semibold text-red-800 dark:text-red-200">Error en el formulario</h4>
                                    </div>
                                    <p className="text-red-700 dark:text-red-300 mb-3 text-sm">Por favor corrige los siguientes errores:</p>
                                    <ul className="space-y-1">
                                        {Object.values(errors).flat().map((error, index) => (
                                            <li key={index} className="flex items-center text-red-700 dark:text-red-300 text-sm">
                                                <svg className="w-3 h-3 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="space-y-8">
                                {/* Información Básica */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-2 text-sm">ℹ️</span>
                                        Información Básica
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Título de la Propiedad *</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                            placeholder="Ej: Hermosa casa en Roma Norte con jardín privado"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 resize-none"
                                            placeholder="Describe las características principales, amenidades y lo que hace especial a tu propiedad..."
                                            rows="4"
                                        />
                                    </div>
                                </div>

                                {/* SECCIÓN DEL MAPA */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-2 text-sm">📍</span>
                                        Ubicación
                                    </h3>

                                    {/* Campo de búsqueda de dirección */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Buscar dirección *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    handleAddressSearch(e.target.value);
                                                }}
                                                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Escribe tu dirección: Av. Vallarta 1234, Guadalajara"
                                                name="address"
                                                required
                                            />

                                            <button
                                                type="button"
                                                onClick={getCurrentLocation}
                                                disabled={isGettingLocation}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50"
                                                title="Usar mi ubicación actual"
                                            >
                                                {isGettingLocation ? (
                                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </button>

                                            {/* Lista de sugerencias */}
                                            {showSuggestions && addressSuggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                                    {isSearching && (
                                                        <div className="px-4 py-2 text-sm text-gray-500">
                                                            Buscando direcciones...
                                                        </div>
                                                    )}
                                                    {addressSuggestions.map((suggestion, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => selectSuggestion(suggestion)}
                                                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 focus:bg-gray-50 dark:focus:bg-gray-600 focus:outline-none text-sm"
                                                        >
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {suggestion.text}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                {suggestion.place_name}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            🔥 Los campos ciudad, estado y país se llenarán automáticamente al seleccionar ubicación
                                        </p>
                                    </div>

                                    {/* Controles de tamaño del mapa */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Mapa Interactivo - {mapWidth}x{mapHeight}px
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={toggleExpandMap}
                                                    className="px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                                                    title={isExpanded ? "Contraer mapa" : "Expandir mapa"}
                                                >
                                                    {isExpanded ? "⤢ Contraer" : "⤡ Expandir"}
                                                </button>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Tamaños:</span>
                                                {mapSizePresets.map((preset) => (
                                                    <button
                                                        key={preset.name}
                                                        type="button"
                                                        onClick={() => setMapSize(preset.width, preset.height)}
                                                        className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                                                            mapHeight === preset.height && mapWidth === preset.width
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                                                        }`}
                                                        title={`${preset.name} (${preset.width}x${preset.height}px)`}
                                                    >
                                                        {preset.icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Contenedor del mapa redimensionable */}
                                        <div className="flex justify-center">
                                            <div
                                                className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-lg"
                                                style={{
                                                    width: `${mapWidth}px`,
                                                    height: `${mapHeight}px`,
                                                    minWidth: '300px',
                                                    minHeight: '200px'
                                                }}
                                            >
                                                {mapError ? (
                                                    <div className="h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                                                        <div className="text-center text-red-600 dark:text-red-400">
                                                            <p className="font-medium">Error al cargar el mapa</p>
                                                            <p className="text-sm">{mapError}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div
                                                            ref={mapRef}
                                                            className="w-full h-full bg-gray-100 dark:bg-gray-700"
                                                        ></div>

                                                        {!mapLoaded && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                                                <div className="text-center">
                                                                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Cargando mapa...</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Controles de redimensionamiento */}
                                                        <div
                                                            className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-emerald-500/20 transition-colors"
                                                            onMouseDown={(e) => handleResizeStart(e, 'e')}
                                                            title="Arrastrar para cambiar el ancho"
                                                        ></div>

                                                        <div
                                                            className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize hover:bg-emerald-500/40 transition-colors"
                                                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                                                            title="Arrastrar para redimensionar"
                                                        >
                                                            <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-sm"></div>
                                                        </div>

                                                        <div
                                                            className="absolute top-0 left-0 w-2 h-full cursor-ew-resize hover:bg-emerald-500/20 transition-colors"
                                                            onMouseDown={(e) => handleResizeStart(e, 'w')}
                                                            title="Arrastrar para cambiar el ancho"
                                                        ></div>

                                                        <div
                                                            className="absolute bottom-0 left-0 w-4 h-4 cursor-ne-resize hover:bg-emerald-500/40 transition-colors"
                                                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                                                            title="Arrastrar para redimensionar"
                                                        ></div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Haz clic en el mapa para seleccionar ubicación. Arrastra los bordes para redimensionar.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Campos adicionales de ubicación */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ciudad *</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Se completa automáticamente"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Se completa automáticamente"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">País</label>
                                            <input
                                                type="text"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Se completa automáticamente"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Código Postal</label>
                                            <input
                                                type="text"
                                                name="postal_code"
                                                value={formData.postal_code}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="Se completa automáticamente"
                                            />
                                        </div>
                                    </div>

                                    {/* Mostrar coordenadas seleccionadas */}
                                    {selectedCoordinates && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                                📍 Coordenadas seleccionadas:
                                            </p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                Latitud: {selectedCoordinates[0].toFixed(6)} | Longitud: {selectedCoordinates[1].toFixed(6)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Detalles de la Propiedad */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-2 text-sm">🏠</span>
                                        Detalles de la Propiedad
                                    </h3>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Precio (MXN) *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">$</span>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Propiedad</label>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
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

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Habitaciones</label>
                                            <input
                                                type="number"
                                                name="bedrooms"
                                                value={formData.bedrooms}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Baños</label>
                                            <input
                                                type="number"
                                                name="bathrooms"
                                                value={formData.bathrooms}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="0"
                                                min="0"
                                                step="0.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Área (m²)</label>
                                            <input
                                                type="number"
                                                name="area"
                                                value={formData.area}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECCIÓN DE MÚLTIPLES IMÁGENES */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                            <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-2 text-sm">📸</span>
                                            Imágenes de la Propiedad
                                        </h3>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {uploadedImages.length + selectedImages.length}/15 imágenes
                                        </div>
                                    </div>

                                    {/* Área de subida */}
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                                            dragActive
                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                        onDragEnter={handleImageDrag}
                                        onDragLeave={handleImageDrag}
                                        onDragOver={handleImageDrag}
                                        onDrop={handleImageDrop}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleMultipleImagesChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*"
                                            disabled={uploadedImages.length + selectedImages.length >= 15}
                                            name="images"
                                        />
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {uploadedImages.length + selectedImages.length >= 15
                                                        ? 'Límite de 15 imágenes alcanzado'
                                                        : 'Arrastra múltiples imágenes aquí o haz clic para seleccionar'
                                                    }
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                                    Hasta 15 imágenes • JPG, PNG, WEBP • Máximo 8MB cada una
                                                </p>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                    ✨ El sistema detecta automáticamente imágenes duplicadas
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Galería de imágenes subidas al servidor */}
                                    {uploadedImages.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                                                <span className="w-5 h-5 bg-green-100 dark:bg-green-900/20 rounded flex items-center justify-center mr-2 text-xs">✓</span>
                                                Imágenes Guardadas ({uploadedImages.length})
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {uploadedImages.map((image, index) => (
                                                    <div key={image.id} className="relative group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                                                        <img
                                                            src={image.url}
                                                            alt={image.filename}
                                                            className="w-full h-32 object-cover"
                                                        />

                                                        {/* Overlay con controles */}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrimaryImage(image.id, true)}
                                                                    className={`p-2 rounded-full transition-colors ${
                                                                        image.is_primary || primaryImageId === image.id
                                                                            ? 'bg-yellow-500 text-white'
                                                                            : 'bg-white/20 text-white hover:bg-yellow-500'
                                                                    }`}
                                                                    title="Establecer como principal"
                                                                >
                                                                    ⭐
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(image.id, true)}
                                                                    className="p-2 rounded-full bg-white/20 text-white hover:bg-red-500 transition-colors"
                                                                    title="Eliminar imagen"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Indicadores */}
                                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                            {(image.is_primary || primaryImageId === image.id) && (
                                                                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                                    ⭐ Principal
                                                                </span>
                                                            )}
                                                            {image.is_duplicate && (
                                                                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                                    🔄 Reutilizada
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Tipo de habitación */}
                                                        <div className="absolute bottom-2 right-2">
                                                            <select
                                                                value={image.room_type || 'other'}
                                                                onChange={(e) => changeRoomType(image.id, e.target.value, true)}
                                                                className="text-xs rounded px-2 py-1 bg-white/90 border-0 focus:ring-1 focus:ring-emerald-500"
                                                            >
                                                                {roomTypes.map(type => (
                                                                    <option key={type.value} value={type.value}>
                                                                        {type.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Galería de imágenes seleccionadas (pendientes de subir) */}
                                    {selectedImages.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                                                <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center mr-2 text-xs">📤</span>
                                                Por Subir ({selectedImages.length})
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {selectedImages.map((imageData, index) => (
                                                    <div key={imageData.id} className="relative group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                                                        <img
                                                            src={imageData.preview}
                                                            alt={imageData.file.name}
                                                            className="w-full h-32 object-cover"
                                                        />

                                                        {/* Overlay con controles */}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrimaryImage(imageData.id, false)}
                                                                    className={`p-2 rounded-full transition-colors ${
                                                                        imageData.is_primary
                                                                            ? 'bg-yellow-500 text-white'
                                                                            : 'bg-white/20 text-white hover:bg-yellow-500'
                                                                    }`}
                                                                    title="Establecer como principal"
                                                                >
                                                                    ⭐
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeImage(imageData.id, false)}
                                                                    className="p-2 rounded-full bg-white/20 text-white hover:bg-red-500 transition-colors"
                                                                    title="Remover imagen"
                                                                >
                                                                    ❌
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Indicador de imagen principal */}
                                                        {imageData.is_primary && (
                                                            <div className="absolute top-2 left-2">
                                                                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                                    ⭐ Principal
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Selector de tipo de habitación */}
                                                        <div className="absolute bottom-2 right-2">
                                                            <select
                                                                value={imageData.room_type}
                                                                onChange={(e) => changeRoomType(imageData.id, e.target.value, false)}
                                                                className="text-xs rounded px-2 py-1 bg-white/90 border-0 focus:ring-1 focus:ring-emerald-500"
                                                            >
                                                                {roomTypes.map(type => (
                                                                    <option key={type.value} value={type.value}>
                                                                        {type.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Información del archivo */}
                                                        <div className="absolute top-2 right-2">
                                                            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                                {(imageData.file.size / 1024 / 1024).toFixed(1)}MB
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Configuración */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mr-2 text-sm">⚙️</span>
                                        Configuración
                                    </h3>

                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active}
                                                onChange={handleInputChange}
                                                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                                                id="is_active"
                                            />
                                            <label className="ml-3 block font-medium text-gray-900 dark:text-white" htmlFor="is_active">
                                                Propiedad disponible para renta
                                            </label>
                                        </div>
                                        <p className="ml-7 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Al activar esta opción, tu propiedad será visible para otros usuarios
                                        </p>
                                    </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <Button type="button" variant="ghost" onClick={() => navigate('index')} disabled={loading} className="sm:w-auto w-full">
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={loading}
                                        disabled={loading}
                                        className="sm:w-auto w-full"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}

// COMPONENTE PRINCIPAL PROPERTIES
function Properties() {
    const { toast, showToast, hideToast } = useToast();

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
        price: '', type: '', bedrooms: '', bathrooms: '', area: '', image: null, is_active: true,
        latitude: '', longitude: ''
    });

    useEffect(() => {
        if (appData.currentPage === 'edit' && appData.property) {
            setFormData({
                ...appData.property,
                latitude: appData.property.latitude || '',
                longitude: appData.property.longitude || ''
            });
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
            case 'my-properties':
                window.location.href = '/my-properties';
                break;
            default:
                console.warn(`Unknown navigation page: ${page}`);
        }
    }, [appData.routes]);

    const contactSeller = useCallback(async (propertyId, sellerId) => {
        try {
            console.log('Iniciando conversación...', { propertyId, sellerId });
            showToast('Iniciando conversación...', 'info');

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

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);

                if (errorData.errors) {
                    const errorMessages = Object.values(errorData.errors).flat();
                    throw new Error(errorMessages.join(', '));
                } else {
                    throw new Error(`Error ${response.status}: ${errorData.message || 'Error desconocido'}`);
                }
            }

            const data = await response.json();
            showToast('¡Conversación iniciada! Redirigiendo al chat...', 'success');

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

    // HANDLESUBMIT MODIFICADO PARA MANEJAR IMÁGENES
        const handleSubmit = useCallback(async (e, selectedImages = []) => {
    e.preventDefault();

    console.log('=== FORM SUBMIT STARTED ===');
    console.log('formData:', formData);
    console.log('selectedImages:', selectedImages.length);

    setLoading(true);

    try {
        const isEdit = appData.currentPage === 'edit';
        showToast(isEdit ? 'Actualizando propiedad...' : 'Guardando propiedad...', 'info');

        const formDataToSend = new FormData();

        // Agregar datos del formulario
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
                if (key === 'is_active') {
                    formDataToSend.append(key, formData[key] ? '1' : '0');
                } else if (key !== 'image' && key !== 'id') {
                    formDataToSend.append(key, formData[key]);
                }
            }
        });

        // Agregar imágenes múltiples si hay
        if (selectedImages && selectedImages.length > 0) {
            console.log('Agregando imágenes al FormData:', selectedImages.length);

            selectedImages.forEach((imageData, index) => {
                formDataToSend.append('images[]', imageData.file);
                formDataToSend.append(`room_types[${index}]`, imageData.room_type || 'other');
            });
        }

        // Para edición, agregar _method
        if (isEdit) {
            formDataToSend.append('_method', 'PUT');
        }

        const url = isEdit ? appData.routes?.update : appData.routes?.store;
        const csrfToken = appData.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        if (!url) {
            throw new Error('URL de envío no encontrada');
        }

        if (!csrfToken) {
            throw new Error('Token CSRF no encontrado');
        }

        console.log('Enviando a:', url);
        console.log('Es edición:', isEdit);

        const response = await fetch(url, {
            method: 'POST', // Siempre POST (Laravel manejará PUT con _method)
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
            body: formDataToSend
        });

        const responseData = await response.json();
        console.log('Response:', responseData);

        if (response.ok && responseData.success) {
            showToast(responseData.message || (isEdit ? 'Propiedad actualizada exitosamente' : 'Propiedad guardada exitosamente'), 'success');

            // Si había duplicados, mostrar mensaje adicional
            if (responseData.images && responseData.images.duplicates > 0) {
                setTimeout(() => {
                    showToast(`Se ahorraron ${responseData.images.space_saved_mb}MB reutilizando imágenes duplicadas`, 'info');
                }, 2000);
            }

            setTimeout(() => navigate('index'), 1500);
            return responseData;
        } else {
            // Manejar errores de validación
            if (responseData.errors) {
                const errorMessages = Object.values(responseData.errors).flat();
                throw new Error(errorMessages.join(', '));
            }
            throw new Error(responseData.message || 'Error al guardar la propiedad');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error al guardar la propiedad', 'error');
        return { success: false };
    } finally {
        setLoading(false);
    }
}, [formData, appData.currentPage, appData.routes, appData.csrfToken, navigate, showToast]);



    const handleDelete = useCallback(async (propertyId) => {
        try {
            showToast('Eliminando propiedad...', 'info');

            const response = await fetch(appData.routes?.destroy, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': appData.csrfToken || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ _method: 'DELETE' })
            });

            if (response.ok) {
                showToast('Propiedad eliminada exitosamente', 'success');
                setTimeout(() => navigate('index'), 1500);
            } else {
                throw new Error('Error al eliminar la propiedad');
            }
        } catch (error) {
            showToast('Error al eliminar la propiedad', 'error');
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
            case 'my-properties':
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
                        currentPage={appData.currentPage}
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
                        errors={appData.errors || {}}
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
                        currentPage={appData.currentPage}
                    />
                );
        }
    }, [appData, filteredProperties, user, searchTerm, typeFilter, roomsFilter, navigate, handleDelete, formData, handleInputChange, handleSubmit, loading, showToast, contactSeller]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
            {renderPage()}
        </div>
    );
}

export default Properties;
