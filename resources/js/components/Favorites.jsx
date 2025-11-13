import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import Navbar from './Navbar';

// Componente FavoriteButton (mismo que usas en Properties)
const FavoriteButton = ({ propertyId, initialIsFavorite = false, onToggle }) => {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLoading) return;

        setIsLoading(true);

        try {
            const response = await fetch(`/properties/${propertyId}/favorite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                credentials: 'same-origin' // Incluir cookies
            });

            const data = await response.json();

            if (data.success) {
                setIsFavorite(data.is_favorite);

                if (onToggle) {
                    onToggle(propertyId, data.is_favorite);
                }
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`p-2 rounded-full transition-all duration-300 shadow-md ${
                isFavorite 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
            {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg 
                    className="w-5 h-5" 
                    fill={isFavorite ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                    />
                </svg>
            )}
        </button>
    );
};

// Componente PropertyCard simplificado para Favoritos
const PropertyCard = ({ property, onRemove }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const getMainImage = () => {
        if (property.photos && property.photos.length > 0) {
            const primaryPhoto = property.photos.find(photo => photo.is_primary);
            if (primaryPhoto) {
                return primaryPhoto.url || `/storage/${primaryPhoto.path}`;
            }
            return property.photos[0].url || `/storage/${property.photos[0].path}`;
        }
        if (property.image) {
            return `/storage/${property.image}`;
        }
        return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop";
    };

    const formatPrice = (price) => {
        return Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    };

    const getPropertyTypeIcon = (type) => {
        const icons = { 
            casa: '🏠', 
            apartamento: '🏢', 
            condominio: '🏘️', 
            oficina: '🏢', 
            local: '🏪', 
            terreno: '🌳' 
        };
        return icons[type] || '🏠';
    };

    const handleFavoriteToggle = (propertyId, isFavorite) => {
        if (!isFavorite) {
            // Si se quitó de favoritos, remover de la lista
            onRemove(propertyId);
        }
    };

    return (
        <div className="group relative overflow-hidden">
            {/* Efecto de brillo en hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10 pointer-events-none"></div>

            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transform hover:-translate-y-2 hover:scale-[1.02]">
                {/* Imagen */}
                <div className="relative h-56 overflow-hidden">
                    {/* Skeleton loader */}
                    {!imageLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                        </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]"></div>

                    <img
                        src={getMainImage()}
                        alt={property.title}
                        className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110 group-hover:rotate-1`}
                        onLoad={() => setImageLoaded(true)}
                    />

                    {/* Badges mejorados */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 z-[2]">
                        <span className="inline-flex items-center bg-gradient-to-r from-emerald-500 to-teal-500 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg border border-white/20 transform hover:scale-105 transition-transform">
                            <span className="mr-1.5">{getPropertyTypeIcon(property.type)}</span>
                            {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md shadow-lg border border-white/20 ${
                            property.is_active
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                        }`}>
                            <span className={`w-2 h-2 rounded-full mr-2 ${property.is_active ? 'bg-white' : 'bg-white'} animate-pulse`}></span>
                            {property.is_active ? 'Disponible' : 'No disponible'}
                        </span>
                    </div>

                    {/* Botón de favoritos mejorado */}
                    <div className="absolute top-3 right-3 z-[2] transform group-hover:scale-110 transition-transform">
                        <FavoriteButton
                            propertyId={property.id}
                            initialIsFavorite={true}
                            onToggle={handleFavoriteToggle}
                        />
                    </div>

                    {/* Badge de "Favorito" */}
                    <div className="absolute bottom-3 right-3 z-[2] bg-red-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg border border-white/20">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span>Favorito</span>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
                        {property.title}
                    </h3>

                    <div className="flex items-center text-gray-600 dark:text-gray-400 mb-5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        <div className="w-5 h-5 mr-2 flex-shrink-0">
                            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="truncate text-sm font-medium">{property.address}, {property.city}, {property.state}</span>
                    </div>

                    {/* Características con diseño mejorado */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="group/item flex items-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all hover:shadow-md">
                                <span className="text-base mr-1.5">🛏️</span>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{property.bedrooms || 0}</span>
                            </div>
                            <div className="group/item flex items-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-md">
                                <span className="text-base mr-1.5">🚿</span>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{property.bathrooms || 0}</span>
                            </div>
                            <div className="group/item flex items-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 transition-all hover:shadow-md">
                                <span className="text-base mr-1.5">📐</span>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{property.area || 0}m²</span>
                            </div>
                        </div>
                    </div>

                    {/* Precio con efecto premium */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-700/50">
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Precio</div>
                        <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                            ${formatPrice(property.price)}
                        </div>
                    </div>

                    {/* Botones mejorados */}
                    <div className="flex gap-3">
                        <a
                            href={`/properties/${property.id}`}
                            className="group/btn flex-1 relative overflow-hidden text-center px-5 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover/btn:translate-x-full transition-transform duration-700"></div>
                            <span className="relative flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Detalles
                            </span>
                        </a>
                        <a
                            href={`/chat?property=${property.id}`}
                            className="group/btn px-5 py-3 bg-white dark:bg-gray-700 border-2 border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-bold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center"
                            title="Contactar"
                        >
                            <svg className="w-6 h-6 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente principal FavoritesPage
function FavoritesPage({ user }) {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/properties/favorites');

            if (response.data.success) {
                setFavorites(response.data.favorites);
            }
        } catch (err) {
            console.error('Error cargando favoritos:', err);
            setError('Error al cargar favoritos');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFavorite = (propertyId) => {
        setFavorites(favorites.filter(prop => prop.id !== propertyId));
    };

    const goToProperties = () => {
        window.location.href = '/properties';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navbar user={user} />
                <div className="container mx-auto px-4 py-8 mt-20">
                    <div className="text-center">
                        <div className="relative inline-block">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 animate-pulse"></div>
                            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg font-medium">Cargando favoritos...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navbar user={user} />
                <div className="container mx-auto px-4 py-8 mt-20">
                    <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">{error}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar user={user} />
            
            <div className="container mx-auto px-4 py-8 mt-20">
                {/* Header mejorado */}
                <div className="relative mb-12 overflow-hidden">
                    {/* Fondo decorativo */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-pink-500/10 to-rose-500/10 dark:from-red-500/5 dark:via-pink-500/5 dark:to-rose-500/5 rounded-3xl -z-10"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-400/20 to-pink-400/20 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-rose-400/20 to-red-400/20 rounded-full blur-3xl -z-10"></div>

                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 sm:p-10">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 dark:from-red-400 dark:via-pink-400 dark:to-rose-400">
                                    Mis Favoritos
                                </h1>
                            </div>

                            <div className="flex items-center space-x-3">
                                <div className={`inline-flex items-center px-4 py-2 rounded-xl font-bold text-sm shadow-md ${
                                    favorites.length > 0
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <span>
                                        {favorites.length === 0 ? 'No tienes favoritos guardados' :
                                         favorites.length === 1 ? '1 propiedad guardada' :
                                         `${favorites.length} ${favorites.length > 1 ? 'propiedades' : 'propiedad'} guardadas`}
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl">
                                {favorites.length > 0
                                    ? 'Aquí están todas las propiedades que has marcado como favoritas. ¡Explora y encuentra tu hogar ideal!'
                                    : 'Empieza a guardar tus propiedades favoritas para acceder a ellas rápidamente'}
                            </p>
                        </div>

                        <button
                            onClick={goToProperties}
                            className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                            <span className="relative flex items-center space-x-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span>Explorar Propiedades</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Lista de favoritos */}
                {favorites.length === 0 ? (
                    <div className="relative">
                        {/* Fondo decorativo */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-red-900/10 dark:via-pink-900/10 dark:to-rose-900/10 rounded-3xl -z-10"></div>

                        <div className="text-center py-24 px-8">
                            {/* Icono animado */}
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-200 to-pink-200 dark:from-red-900/30 dark:to-pink-900/30 rounded-full animate-pulse"></div>
                                <div className="absolute inset-2 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center">
                                    <svg className="w-16 h-16 text-red-500 dark:text-red-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                            </div>

                            <h3 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
                                No tienes favoritos aún
                            </h3>

                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                                Explora nuestro catálogo de propiedades y guarda tus favoritas haciendo clic en el
                                <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                para acceder a ellas rápidamente
                            </p>

                            {/* Características */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Explora</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Descubre miles de propiedades disponibles</p>
                                </div>

                                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Guarda</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Marca tus propiedades favoritas</p>
                                </div>

                                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Contacta</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Comunícate con los propietarios</p>
                                </div>
                            </div>

                            <button
                                onClick={goToProperties}
                                className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-600 text-white font-black text-lg rounded-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
                                <svg className="relative w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span className="relative">Explorar Propiedades Ahora</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fadeIn">
                        {favorites.map((property, index) => (
                            <div
                                key={property.id}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className="animate-slideUp"
                            >
                                <PropertyCard
                                    property={property}
                                    onRemove={handleRemoveFavorite}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


export default FavoritesPage;