// resources/js/components/TestAI.jsx

import React, { useState, useEffect } from 'react';

function TestAI({ user }) {
    // Estados
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('connection');
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [loading, setLoading] = useState({});
    const [results, setResults] = useState({});

    // Estados para algoritmos ML
    const [query, setQuery] = useState('');
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('ensemble');
    const [mlResult, setMlResult] = useState(null);
    const [mlLoading, setMlLoading] = useState(false);

    // Cargar configuración
    useEffect(() => {
        const configElement = document.getElementById('ai-config');
        if (configElement) {
            try {
                const data = JSON.parse(configElement.textContent || configElement.innerText);
                setConfig(data);
                console.log('📋 Configuración cargada:', data);
            } catch (e) {
                console.error('❌ Error cargando configuración:', e);
            }
        }

        // Check inicial de API
        checkConnection();
    }, []);

    // Funciones auxiliares
    const makeApiCall = async (url, options = {}) => {
        console.log('🌐 Iniciando llamada a:', url);
        console.log('📤 Opciones:', options);

        // Obtener CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        const timeoutId = setTimeout(() => {
            console.error('⏱️ TIMEOUT después de 30 segundos');
            throw new Error('Timeout: La API no respondió en 30 segundos');
        }, 30000);

        try {
            console.log('⏳ Haciendo fetch a:', url);
            const startTime = Date.now();

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers,
                },
                credentials: 'same-origin',
                ...options,
            });

            const elapsed = Date.now() - startTime;
            console.log(`✅ Respuesta recibida en ${elapsed}ms`);
            console.log('📊 Status:', response.status, response.statusText);

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('❌ Respuesta no OK:', response.status);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Datos parseados:', data);
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Error en makeApiCall:', error);
            console.error('📍 URL que falló:', url);
            throw error;
        }
    };

    // ====================
    // TESTS DE CONEXIÓN
    // ====================

    const checkConnection = async () => {
        console.log('🔍 Verificando conexión inicial...');
        setConnectionStatus('checking');
        try {
            const data = await makeApiCall('/ai/health');
            console.log('✅ Conexión exitosa:', data);
            if (data.success && data.ai_status === 'connected') {
                console.log('✅ API conectada correctamente');
                setConnectionStatus('connected');
            } else {
                console.warn('⚠️ API respondió pero estado no es connected:', data);
                setConnectionStatus('disconnected');
            }
        } catch (error) {
            console.error('❌ Error en checkConnection:', error);
            setConnectionStatus('disconnected');
        }
    };

    const testConnection = async () => {
        console.log('🧪 Test de conexión manual iniciado');
        setLoading(prev => ({ ...prev, connection: true }));
        try {
            const data = await makeApiCall('/ai/health');
            console.log('✅ Test de conexión exitoso:', data);
            setResults(prev => ({
                ...prev,
                connection: {
                    success: true,
                    message: '✅ FastAPI conectado',
                    data: data
                }
            }));
            setConnectionStatus('connected');
        } catch (error) {
            console.error('❌ Test de conexión falló:', error);
            setResults(prev => ({
                ...prev,
                connection: {
                    success: false,
                    message: '❌ Error de conexión',
                    error: error.message
                }
            }));
            setConnectionStatus('disconnected');
        }
        setLoading(prev => ({ ...prev, connection: false }));
    };

    const testTracking = async () => {
        console.log('🧪 Test de tracking iniciado');
        setLoading(prev => ({ ...prev, tracking: true }));
        try {
            const searchData = {
                user_id: user?.id || 1,
                session_id: `test-${Date.now()}`,
                search_query: 'casa en guadalajara con piscina',
                search_type: 'property',
                filters: { location: 'guadalajara', type: 'casa' },
                results_count: 25
            };

            console.log('📤 Enviando tracking data:', searchData);
            const data = await makeApiCall('/ai/track', {
                method: 'POST',
                body: JSON.stringify(searchData)
            });

            console.log('✅ Tracking exitoso:', data);
            setResults(prev => ({
                ...prev,
                tracking: {
                    success: true,
                    message: '✅ Tracking funcionando',
                    data: data
                }
            }));
        } catch (error) {
            console.error('❌ Error en tracking:', error);
            setResults(prev => ({
                ...prev,
                tracking: {
                    success: false,
                    message: '❌ Error en tracking',
                    error: error.message
                }
            }));
        }
        setLoading(prev => ({ ...prev, tracking: false }));
    };

    const testMLEndpoints = async () => {
        console.log('🧪 Test de ML endpoints iniciado');
        setLoading(prev => ({ ...prev, ml: true }));
        try {
            const data = await makeApiCall('/ai/ml-test');
            console.log('✅ ML test exitoso:', data);
            setResults(prev => ({
                ...prev,
                ml: {
                    success: true,
                    message: '✅ Algoritmos ML funcionando',
                    data: data
                }
            }));
        } catch (error) {
            console.error('❌ Error en ML test:', error);
            setResults(prev => ({
                ...prev,
                ml: {
                    success: false,
                    message: '❌ Error en algoritmos ML',
                    error: error.message
                }
            }));
        }
        setLoading(prev => ({ ...prev, ml: false }));
    };

    // ====================
    // TESTS DE ALGORITMOS ML
    // ====================

    const testAlgorithm = async () => {
        if (!query.trim()) {
            alert('Por favor escribe una búsqueda');
            return;
        }

        console.log('🧪 Test de algoritmo iniciado:', selectedAlgorithm);
        setMlLoading(true);
        setMlResult(null);

        try {
            const endpoints = {
                naive_bayes: '/ai/classify/quick',
                knn: '/ai/similar',
                mlp: '/ai/predict/complex',
                ensemble: '/ai/predict/ensemble',
                compare: '/ai/compare'
            };

            const endpoint = endpoints[selectedAlgorithm];
            const payload = selectedAlgorithm === 'knn' || selectedAlgorithm === 'compare'
                ? { query, n_similar: 5 }
                : { query };

            console.log('📤 Endpoint:', endpoint);
            console.log('📤 Payload:', payload);

            const data = await makeApiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            console.log('✅ Algoritmo respondió:', data);
            setMlResult(data);
        } catch (error) {
            console.error('❌ Error en algoritmo:', error);
            setMlResult({
                success: false,
                error: error.message
            });
        }
        setMlLoading(false);
    };

    const setQuickQuery = (exampleQuery) => {
        setQuery(exampleQuery);
    };

    // ====================
    // RENDER
    // ====================

    if (!config) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        🤖 ViveSpaces AI - Sistema de Pruebas
                    </h1>
                    <p className="text-emerald-100">
                        Prueba los 3 algoritmos de Machine Learning y verifica la conexión
                    </p>

                    {/* Status Badge */}
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <div className={`w-3 h-3 rounded-full ${
                            connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                            connectionStatus === 'disconnected' ? 'bg-red-400' :
                            'bg-yellow-400 animate-pulse'
                        }`}></div>
                        <span className="text-white font-medium">
                            {connectionStatus === 'connected' ? 'API Conectada' :
                             connectionStatus === 'disconnected' ? 'API Desconectada' :
                             'Verificando...'}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('connection')}
                        className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                            activeTab === 'connection'
                                ? 'bg-white dark:bg-gray-800 shadow-lg text-emerald-600'
                                : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 hover:bg-white dark:hover:bg-gray-800'
                        }`}
                    >
                        🔌 Tests de Conexión
                    </button>
                    <button
                        onClick={() => setActiveTab('algorithms')}
                        className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                            activeTab === 'algorithms'
                                ? 'bg-white dark:bg-gray-800 shadow-lg text-emerald-600'
                                : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 hover:bg-white dark:hover:bg-gray-800'
                        }`}
                    >
                        🧠 Tests de Algoritmos ML
                    </button>
                </div>

                {/* Connection Tests Tab */}
                {activeTab === 'connection' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Test 1: Conexión */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                                🔌 Conexión
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                                Verificar que FastAPI esté corriendo
                            </p>
                            <button
                                onClick={testConnection}
                                disabled={loading.connection}
                                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                {loading.connection ? '⏳ Probando...' : '🚀 Probar Conexión'}
                            </button>

                            {results.connection && (
                                <div className={`mt-4 p-3 rounded-lg text-sm ${
                                    results.connection.success
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200'
                                }`}>
                                    <div className="font-medium">{results.connection.message}</div>
                                    {results.connection.data && (
                                        <pre className="mt-2 text-xs overflow-auto max-h-32">
                                            {JSON.stringify(results.connection.data, null, 2)}
                                        </pre>
                                    )}
                                    {results.connection.error && (
                                        <pre className="mt-2 text-xs">
                                            {results.connection.error}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Test 2: Tracking */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                                📊 Tracking
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                                Guardar eventos de búsqueda
                            </p>
                            <button
                                onClick={testTracking}
                                disabled={loading.tracking || connectionStatus !== 'connected'}
                                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                {loading.tracking ? '⏳ Enviando...' : '📤 Enviar Búsqueda'}
                            </button>

                            {results.tracking && (
                                <div className={`mt-4 p-3 rounded-lg text-sm ${
                                    results.tracking.success
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200'
                                }`}>
                                    <div className="font-medium">{results.tracking.message}</div>
                                    {results.tracking.error && (
                                        <pre className="mt-2 text-xs">
                                            {results.tracking.error}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Test 3: ML Endpoints */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                                🧠 Algoritmos ML
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                                Verificar que los algoritmos funcionen
                            </p>
                            <button
                                onClick={testMLEndpoints}
                                disabled={loading.ml || connectionStatus !== 'connected'}
                                className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                {loading.ml ? '⏳ Probando...' : '🧪 Test Algoritmos'}
                            </button>

                            {results.ml && (
                                <div className={`mt-4 p-3 rounded-lg text-sm ${
                                    results.ml.success
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200'
                                }`}>
                                    <div className="font-medium">{results.ml.message}</div>
                                    {results.ml.error && (
                                        <pre className="mt-2 text-xs">
                                            {results.ml.error}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Algorithms Tests Tab */}
                {activeTab === 'algorithms' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                        {/* Selector de Algoritmo */}
                        <div className="mb-6">
                            <label className="block text-lg font-bold text-gray-900 dark:text-white mb-3">
                                Selecciona el Algoritmo:
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {config.algorithms && Object.entries(config.algorithms).map(([key, algo]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedAlgorithm(key)}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            selectedAlgorithm === key
                                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg scale-105'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                                        }`}
                                    >
                                        <div className="text-3xl mb-2">{algo.icon}</div>
                                        <div className="font-bold text-sm text-gray-900 dark:text-white">{algo.name}</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{algo.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input de Búsqueda */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Escribe tu búsqueda:
                            </label>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && testAlgorithm()}
                                placeholder="Ej: casa venta zapopan con piscina"
                                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:border-emerald-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        {/* Ejemplos Rápidos */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Ejemplos rápidos:
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {config.testQueries && config.testQueries.map((example, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setQuickQuery(example)}
                                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-full transition-colors text-gray-700 dark:text-gray-300"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Botón de Búsqueda */}
                        <button
                            onClick={testAlgorithm}
                            disabled={mlLoading || !query.trim() || connectionStatus !== 'connected'}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                        >
                            {mlLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analizando con {config.algorithms[selectedAlgorithm]?.name}...
                                </span>
                            ) : (
                                `🔍 Buscar con ${config.algorithms[selectedAlgorithm]?.name}`
                            )}
                        </button>

                        {/* Resultados */}
                        {mlResult && (
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                    📊 Resultados de {config.algorithms[selectedAlgorithm]?.name}:
                                </h3>
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl p-6 border-2 border-emerald-200 dark:border-emerald-800">
                                    <pre className="text-sm overflow-auto max-h-96 bg-white dark:bg-gray-900 p-4 rounded-lg">
                                        {JSON.stringify(mlResult, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Info Footer */}
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        📝 Información del Sistema
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Estado API:</h4>
                            <p className={`font-bold ${
                                connectionStatus === 'connected' ? 'text-green-600' :
                                connectionStatus === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                                {connectionStatus === 'connected' ? '✅ Conectada' :
                                 connectionStatus === 'disconnected' ? '❌ Desconectada' :
                                 '⏳ Verificando...'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Usuario:</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                {user ? `${user.name} (#${user.id})` : 'No autenticado'}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Tests Completados:</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                {Object.keys(results).length} / 3
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Algoritmos:</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                4 disponibles
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TestAI;
