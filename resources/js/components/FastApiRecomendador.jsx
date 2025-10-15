// resources/js/components/FastApiRecomendador.jsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, MapPin, ArrowRight, Sparkles, Heart } from 'lucide-react';

const FastApiRecomendador = () => {
    // Estados
    const [config, setConfig] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Recomendaciones
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    // ==================== CARGAR CONFIGURACIÓN ====================
    useEffect(() => {
        const configElement = document.getElementById('recomendador-config');
        if (configElement) {
            try {
                const data = JSON.parse(configElement.textContent);
                setConfig(data);
                setUser(data.user);
            } catch (error) {
                console.error('Error cargando config:', error);
            }
        }
        setLoading(false);
    }, []);

    // ==================== CARGAR RECOMENDACIONES AUTOMÁTICAMENTE ====================
    useEffect(() => {
        if (config) {
            loadRecommendations();
        }
    }, [config]);

    // ==================== API CALL ====================
    const makeApiCall = async (endpoint, options = {}) => {
        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': config?.csrfToken || '',
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

    // ==================== CARGAR RECOMENDACIONES ====================
    const loadRecommendations = async () => {
        if (!config) return;

        setLoadingRecommendations(true);

        try {
            const response = await makeApiCall(`${config.apiEndpoints.similar}`, {
                method: 'POST',
                body: JSON.stringify({
                    query: 'casa departamento',
                    n_similar: 10
                })
            });

            if (response.success && response.data?.result?.similar_searches) {
                setRecommendations(response.data.result.similar_searches);
            }

        } catch (error) {
            console.error('Error cargando recomendaciones:', error);
        } finally {
            setLoadingRecommendations(false);
        }
    };

    // ==================== APLICAR RECOMENDACIÓN ====================
    const applyRecommendation = (query) => {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    };

    // ==================== RENDER ====================
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando recomendaciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 py-8">
            <div className="max-w-6xl mx-auto px-4">

                {/* HEADER */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-12 h-12 text-blue-600 animate-pulse" />
                    </div>
                    <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-3">
                        Sugerencias para ti
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Basado en lo que otros usuarios están buscando
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* COLUMNA PRINCIPAL: RECOMENDACIONES */}
                    <div className="lg:col-span-3 space-y-6">

                        {loadingRecommendations ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl animate-pulse shadow-lg"></div>
                                ))}
                            </div>
                        ) : recommendations.length > 0 ? (
                            <div className="space-y-4">
                                {recommendations.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => applyRecommendation(rec.query)}
                                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl cursor-pointer transition-all transform hover:scale-[1.02] border-2 border-transparent hover:border-blue-500"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5 flex-1">
                                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                                    <MapPin className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                                        {rec.query}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Click para ver propiedades
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-7 h-7 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-2 transition-all flex-shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                                <Sparkles className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                                <p className="text-2xl font-semibold text-gray-500 dark:text-gray-400 mb-3">
                                    No hay sugerencias disponibles
                                </p>
                                <p className="text-gray-400 dark:text-gray-500">
                                    Vuelve más tarde para ver nuevas recomendaciones
                                </p>
                            </div>
                        )}

                    </div>

                    {/* COLUMNA LATERAL: INFO */}
                    <div className="space-y-6">

                        {/* TOTAL DE SUGERENCIAS */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                {recommendations.length}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Sugerencias disponibles
                            </p>
                        </div>

                        {/* TIP */}
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <Heart className="w-6 h-6" />
                                <h3 className="font-bold text-lg">Consejo</h3>
                            </div>
                            <p className="text-sm opacity-95 leading-relaxed">
                                Estas búsquedas son populares entre usuarios como tú. Explora para encontrar tu hogar ideal.
                            </p>
                        </div>

                        {/* ACCIÓN ADICIONAL */}
                        <a
                            href="/properties"
                            className="block bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                        >
                            <h3 className="font-bold text-lg mb-2">
                                ¿No encuentras lo que buscas?
                            </h3>
                            <p className="text-sm opacity-95 mb-4">
                                Explora todas nuestras propiedades disponibles
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Ver todas</span>
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </a>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default FastApiRecomendador;
