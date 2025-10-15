import React, { useState, useEffect, useRef } from 'react';
import ViveSpacesSearchTracker from '../services/search_tracker';

function Search() {
    console.log('🔍 Search component loaded');

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        type: 'all', // all, properties, users, communities
        location: '',
        priceRange: { min: '', max: '' },
        propertyType: 'all', // all, casa, departamento, local
        sortBy: 'relevance' // relevance, price_asc, price_desc, date_new, date_old
    });
    const [showFilters, setShowFilters] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);
    const [popularSearches] = useState([
        'Departamentos Zapopan',
        'Casas Guadalajara Centro',
        'Locales Comerciales',
        'Propiedades con Jardín',
        'Departamentos Amueblados'
    ]);

    const searchTimeoutRef = useRef(null);
    const searchInputRef = useRef(null);
    const [tracker, setTracker] = useState(null);

    // Inicializar tracker
    useEffect(() => {
        const searchTracker = new ViveSpacesSearchTracker();
        setTracker(searchTracker);
        console.log('✅ Search Tracker inicializado en Search.jsx');
    }, []);

    // Obtener query inicial desde URL si existe
    useEffect(() => {
        console.log('🚀 Search useEffect inicial ejecutándose');

        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q');
            console.log('📍 Query desde URL:', query);

            if (query) {
                console.log('✅ Estableciendo query inicial:', decodeURIComponent(query));
                setSearchQuery(decodeURIComponent(query));
            }

            // Cargar búsquedas recientes del localStorage
            const saved = localStorage.getItem('vivespaces_recent_searches');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    console.log('📚 Búsquedas recientes cargadas:', parsed);
                    setRecentSearches(parsed);
                } catch (e) {
                    console.error('❌ Error parsing recent searches:', e);
                    setRecentSearches([]);
                }
            }
        }
    }, []);

    // Función de búsqueda real
    const performSearch = async (query, filters = searchFilters) => {
        try {
            setIsLoading(true);

            // 🔥 TRACKEAR LA BÚSQUEDA CON EL SISTEMA DE ML
            if (tracker && query.trim()) {
                tracker.trackCustomSearch(query.trim(), {
                    type: filters.type,
                    location: filters.location,
                    property_type: filters.propertyType,
                    sort_by: filters.sortBy,
                    price_min: filters.priceRange.min,
                    price_max: filters.priceRange.max,
                    search_context: 'advanced_search_page'
                });
                console.log('📊 Búsqueda trackeada:', query);
            }

            // Construir parámetros de búsqueda
            const params = new URLSearchParams({
                query: query,
                limit: 20,
                type: filters.type,
                location: filters.location,
                property_type: filters.propertyType,
                sort_by: filters.sortBy
            });

            if (filters.priceRange.min) params.append('price_min', filters.priceRange.min);
            if (filters.priceRange.max) params.append('price_max', filters.priceRange.max);

            const response = await fetch(`/api/search/properties?${params}`);
            const data = await response.json();

            if (data.success) {
                setSearchResults(data.results || []);

                // Guardar en búsquedas recientes
                if (query.trim()) {
                    saveToRecentSearches(query.trim());
                }

                // Actualizar URL sin recargar la página
                if (typeof window !== 'undefined') {
                    const newUrl = query.trim()
                        ? `${window.location.pathname}?q=${encodeURIComponent(query.trim())}`
                        : window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }
            } else {
                console.error('Search API error:', data.message);
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Guardar en búsquedas recientes
    const saveToRecentSearches = (query) => {
        if (typeof window !== 'undefined') {
            let recent = [...recentSearches];
            recent = recent.filter(item => item !== query);
            recent.unshift(query);
            recent = recent.slice(0, 8); // Solo mantener 8

            setRecentSearches(recent);
            localStorage.setItem('vivespaces_recent_searches', JSON.stringify(recent));
        }
    };

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            performSearch(searchQuery);
        }, 500);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, searchFilters]);

    // Manejar búsqueda desde sugerencias
    const handleQuickSearch = (query) => {
        setSearchQuery(query);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    // Limpiar búsqueda
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
        }
    };

    // Aplicar filtros
    const handleFilterChange = (filterType, value) => {
        setSearchFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    // Limpiar búsquedas recientes
    const clearRecentSearches = () => {
        setRecentSearches([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('vivespaces_recent_searches');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
                        Búsqueda Avanzada
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Encuentra exactamente lo que buscas con nuestros filtros avanzados
                    </p>
                </div>

                {/* Barra de búsqueda principal */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="relative">
                        <div className="flex items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-3xl transition-all duration-300">
                            {/* Ícono de búsqueda */}
                            <div className="relative mr-4">
                                <svg
                                    className={`w-6 h-6 transition-colors duration-300 ${isLoading ? 'text-emerald-500 animate-spin' : 'text-gray-500 dark:text-gray-400'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {isLoading ? (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    )}
                                </svg>
                            </div>

                            {/* Input principal */}
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="¿Qué estás buscando? Propiedades, ubicaciones, características..."
                                className="bg-transparent text-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none flex-1 font-normal"
                            />

                            {/* Botones de acción */}
                            <div className="flex items-center space-x-3 ml-4">
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                )}

                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>

                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-2 rounded-lg transition-all duration-200 ${showFilters ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros avanzados */}
                <div
                    className={`max-w-4xl mx-auto mb-8 transition-all duration-500 ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                >
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-gray-200/60 dark:border-gray-700/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Tipo de búsqueda */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de búsqueda
                                </label>
                                <select
                                    value={searchFilters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="all">Todo</option>
                                    <option value="properties">Propiedades</option>
                                    <option value="users">Usuarios</option>
                                    <option value="communities">Comunidades</option>
                                </select>
                            </div>

                            {/* Tipo de propiedad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de propiedad
                                </label>
                                <select
                                    value={searchFilters.propertyType}
                                    onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="all">Todas</option>
                                    <option value="casa">Casa</option>
                                    <option value="departamento">Departamento</option>
                                    <option value="local">Local Comercial</option>
                                </select>
                            </div>

                            {/* Ordenar por */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ordenar por
                                </label>
                                <select
                                    value={searchFilters.sortBy}
                                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="relevance">Relevancia</option>
                                    <option value="price_asc">Precio: Menor a Mayor</option>
                                    <option value="price_desc">Precio: Mayor a Menor</option>
                                    <option value="date_new">Más Recientes</option>
                                    <option value="date_old">Más Antiguos</option>
                                </select>
                            </div>

                            {/* Ubicación */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ubicación
                                </label>
                                <input
                                    type="text"
                                    value={searchFilters.location}
                                    onChange={(e) => handleFilterChange('location', e.target.value)}
                                    placeholder="Guadalajara, Zapopan..."
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 text-gray-900 dark:text-gray-100"
                                />
                            </div>

                            {/* Rango de precio */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Rango de precio (MXN)
                                </label>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="number"
                                        value={searchFilters.priceRange.min}
                                        onChange={(e) =>
                                            handleFilterChange('priceRange', {
                                                ...searchFilters.priceRange,
                                                min: e.target.value
                                            })
                                        }
                                        placeholder="Desde"
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 text-gray-900 dark:text-gray-100"
                                    />
                                    <span className="text-gray-500 dark:text-gray-400">-</span>
                                    <input
                                        type="number"
                                        value={searchFilters.priceRange.max}
                                        onChange={(e) =>
                                            handleFilterChange('priceRange', {
                                                ...searchFilters.priceRange,
                                                max: e.target.value
                                            })
                                        }
                                        placeholder="Hasta"
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-400 dark:focus:border-emerald-400 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Búsquedas sugeridas (cuando no hay query) */}
                {!searchQuery && (
                    <div className="max-w-4xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Búsquedas recientes */}
                        {recentSearches.length > 0 && (
                            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-gray-200/60 dark:border-gray-700/60">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                        <svg
                                            className="w-5 h-5 text-emerald-500 mr-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Búsquedas Recientes
                                    </h3>
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {recentSearches.map((search, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickSearch(search)}
                                            className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all duration-200 flex items-center justify-between group"
                                        >
                                            <span>{search}</span>
                                            <svg
                                                className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors duration-200"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="2"
                                                    d="M9 5l7 7-7 7"
                                                />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Búsquedas populares */}
                        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-gray-200/60 dark:border-gray-700/60">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                <svg
                                    className="w-5 h-5 text-emerald-500 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                    />
                                </svg>
                                Búsquedas Populares
                            </h3>
                            <div className="space-y-2">
                                {popularSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickSearch(search)}
                                        className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all duration-200 flex items-center justify-between group"
                                    >
                                        <span>{search}</span>
                                        <svg
                                            className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors duration-200"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Resultados de búsqueda */}
                {searchQuery && (
                    <div className="max-w-6xl mx-auto">
                        {/* Header de resultados */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Resultados para "{searchQuery}"
                                {searchResults.length > 0 && (
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                                        ({searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'})
                                    </span>
                                )}
                            </h2>
                        </div>

                        {/* Grid de resultados */}
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center space-x-2">
                                    <svg
                                        className="animate-spin w-6 h-6 text-emerald-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    <span className="text-lg text-gray-600 dark:text-gray-400">Buscando...</span>
                                </div>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {searchResults.map((result) => (
                                    <div
                                        key={result.id}
                                        className="group bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                                    >
                                        {/* Imagen */}
                                        <div className="aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
                                            {result.image ? (
                                                <img
                                                    src={result.image}
                                                    alt={result.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
                                                    <span className="text-6xl">🏠</span>
                                                </div>
                                            )}

                                            {/* Badge de tipo */}
                                            <div className="absolute top-4 left-4">
                                                <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-lg">
                                                    {result.type}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contenido */}
                                        <div className="p-6">
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
                                                {result.title}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                                {result.subtitle}
                                            </p>
                                            {result.details && (
                                                <p className="text-gray-500 dark:text-gray-500 text-xs mb-4">
                                                    {result.details}
                                                </p>
                                            )}

                                            {/* Precio y botón */}
                                            <div className="flex items-center justify-between">
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                        {result.price}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {result.type}
                                                    </div>
                                                </div>


                                                 <a   href={result.url}
                                                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                                >
                                                    Ver más
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="max-w-md mx-auto">
                                    <svg
                                        className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        No se encontraron resultados
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        No encontramos ningún resultado para "{searchQuery}". Intenta con otros términos o ajusta los filtros.
                                    </p>
                                    <button
                                        onClick={clearSearch}
                                        className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                    >
                                        Limpiar búsqueda
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Search;
