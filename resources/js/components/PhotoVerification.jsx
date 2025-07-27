import React, { useState, useEffect, useRef } from 'react';

const PhotoVerification = () => {
    // Estados del modelo (IGUAL que tu código que funciona)
    const [model, setModel] = useState(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Estados para cámara (IGUAL que tu código que funciona)
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [webcamPredictions, setWebcamPredictions] = useState([]);
    const [webcamStream, setWebcamStream] = useState(null);
    const [cameraStatus, setCameraStatus] = useState('Inactiva');

    // 🆕 Estados para validaciones individuales
    const [validationMode, setValidationMode] = useState('selection');
    const [ineValidated, setIneValidated] = useState(false);
    const [personValidated, setPersonValidated] = useState(false);
    const [currentValidationProgress, setCurrentValidationProgress] = useState(0);
    const [currentInstruction, setCurrentInstruction] = useState('Selecciona qué quieres validar');

    // Referencias (IGUAL que tu código que funciona)
    const webcamRef = useRef(null);
    const predictionIntervalRef = useRef(null);

    // 🆕 Referencias para validación individual
    const validationTimerRef = useRef(null);
    const progressIntervalRef = useRef(null);

    const MODEL_URL = "./comparison-model/";

    // Configuración de validación
    const VALIDATION_THRESHOLD = 0.90; // 90%
    const VALIDATION_DURATION = 3000; // 3 segundos
    const PROGRESS_INTERVAL = 100; // Actualizar cada 100ms

    // CARGAR SCRIPTS - EXACTAMENTE IGUAL que tu código que funciona
    useEffect(() => {
        const loadScripts = async () => {
            try {
                setIsLoading(true);

                if (window.tf && window.tmImage) {
                    await loadModel();
                    return;
                }

                if (!window.tf) {
                    const tfScript = document.createElement('script');
                    tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js';
                    document.head.appendChild(tfScript);

                    await new Promise((resolve) => {
                        tfScript.onload = resolve;
                    });
                }

                if (!window.tmImage) {
                    const tmScript = document.createElement('script');
                    tmScript.src = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js';
                    document.head.appendChild(tmScript);

                    await new Promise((resolve) => {
                        tmScript.onload = resolve;
                    });
                }

                await loadModel();

            } catch (error) {
                console.error('Error loading scripts:', error);
                setError('Error cargando las librerías de IA');
            } finally {
                setIsLoading(false);
            }
        };

        loadScripts();
    }, []);

    // CARGAR MODELO - EXACTAMENTE IGUAL que tu código que funciona
    const loadModel = async () => {
        try {
            setIsLoading(true);
            console.log('🔄 Intentando cargar modelo desde:', MODEL_URL);

            const modelURL = MODEL_URL + "model.json";
            const metadataURL = MODEL_URL + "metadata.json";

            const loadedModel = await window.tmImage.load(modelURL, metadataURL);
            setModel(loadedModel);
            setIsModelLoaded(true);

            console.log('✅ Modelo cargado exitosamente');
            console.log('📊 Número de clases:', loadedModel.getTotalClasses());

        } catch (error) {
            console.error('❌ Error loading model:', error);
            setError('Error cargando el modelo de IA');
        } finally {
            setIsLoading(false);
        }
    };

    // 🆕 INICIAR VALIDACIÓN INDIVIDUAL CON DELAY
    const startIndividualValidation = async (type) => {
        console.log(`🚀 Iniciando validación de ${type.toUpperCase()}...`);
        setError('');

        // Animación de transición
        setValidationMode('transition');
        setCurrentInstruction(
            type === 'ine'
                ? '🔄 Preparando validación de documento...'
                : '🔄 Preparando reconocimiento facial...'
        );

        // Delay para la animación
        await new Promise(resolve => setTimeout(resolve, 500));

        setValidationMode(`validating-${type}`);
        setCurrentValidationProgress(0);

        // Mensajes más descriptivos
        const instructions = {
            'ine': {
                preparing: '🔍 Ajustando para documento...',
                ready: '🆔 Muestre su INE/cliente claramente dentro del marco',
                success: '✅ Documento detectado!'
            },
            'person': {
                preparing: '🔍 Ajustando para rostro...',
                ready: '👤 Mire directamente a la cámara con buena iluminación',
                success: '✅ Rostro detectado!'
            }
        };

        setCurrentInstruction(instructions[type].preparing);

        setTimeout(async () => {
            if (webcamRef.current) {
                setCurrentInstruction(instructions[type].ready);
                try {
                    await startWebcam();
                } catch (err) {
                    setCurrentInstruction('❌ Error al iniciar cámara');
                }
            } else {
                setError('Error: Video no disponible');
                setCurrentInstruction('❌ Error técnico');
            }
        }, 300);
    };

    // FUNCIÓN DE CÁMARA - EXACTAMENTE IGUAL que tu código que funciona
    const startWebcam = async () => {
        try {
            console.log('📹 Iniciando cámara...');
            setError('');
            setCameraStatus('Solicitando permisos...');

            // Mostrar loader de cámara
            setIsWebcamActive(true); // Cambiado para mostrar el contenedor de video inmediatamente
            setCurrentInstruction('⌛ Preparando cámara...');

            if (!webcamRef.current) {
                throw new Error('Elemento video no disponible');
            }

            // Detener stream existente con animación
            if (webcamStream) {
                setCurrentInstruction('🔄 Reiniciando cámara...');
                await new Promise(resolve => {
                    const video = webcamRef.current;
                    video.style.opacity = '0';
                    setTimeout(() => {
                        webcamStream.getTracks().forEach(track => track.stop());
                        setWebcamStream(null);
                        resolve();
                    }, 500); // Animación de fade out
                });
            }

            // Configuración mejorada de cámara
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });

            setWebcamStream(stream);
            const video = webcamRef.current;

            // Efecto de fade in para el video
            video.style.transition = 'opacity 0.5s ease';
            video.style.opacity = '0';
            video.srcObject = stream;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;

            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    setCameraStatus('Configurando video...');
                    video.play()
                        .then(() => {
                            video.style.opacity = '1'; // Fade in
                            setCameraStatus('Cámara activa');
                            setIsWebcamActive(true);
                            startRealTimePredictions();
                            resolve();
                        })
                        .catch(err => {
                            console.error('Error al reproducir video:', err);
                            setCameraStatus('Error en reproducción');
                            setError(`Error: ${err.message}`);
                        });
                };

                video.onerror = (err) => {
                    console.error('Error en video:', err);
                    setCameraStatus('Error en dispositivo');
                    setError('Error al acceder a la cámara');
                };
            });

        } catch (error) {
            console.error('Error en cámara:', error);
            setIsWebcamActive(false);
            setCameraStatus('Error: ' + error.message);
            setError(`No se pudo iniciar la cámara: ${error.message}`);

            // Mostrar mensaje amigable
            setCurrentInstruction('❌ Error al acceder a la cámara. Por favor revisa los permisos.');
        }
    };

    const stopWebcam = () => {
        console.log('🛑 Deteniendo cámara...');

        // Limpiar intervalos
        if (predictionIntervalRef.current) {
            clearInterval(predictionIntervalRef.current);
            predictionIntervalRef.current = null;
        }
        if (validationTimerRef.current) {
            clearTimeout(validationTimerRef.current);
            validationTimerRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }

        if (webcamStream) {
            webcamStream.getTracks().forEach(track => {
                track.stop();
                console.log('🔴 Track detenido:', track.kind);
            });
            setWebcamStream(null);
        }

        if (webcamRef.current) {
            webcamRef.current.srcObject = null;
        }

        setIsWebcamActive(false);
        setWebcamPredictions([]);
        setCameraStatus('Inactiva');
        setCurrentValidationProgress(0);
    };

    // PREDICCIONES - IGUAL que tu código + lógica de validación individual
    const startRealTimePredictions = () => {
        if (!model || !webcamRef.current) return;

        predictionIntervalRef.current = setInterval(async () => {
            try {
                const video = webcamRef.current;

                if (video && video.readyState === 4 && video.videoWidth > 0) {
                    const predictions = await model.predict(video);
                    setWebcamPredictions(predictions);

                    // 🆕 PROCESAR VALIDACIÓN INDIVIDUAL
                    processIndividualValidation(predictions);
                }
            } catch (error) {
                console.error('❌ Error en predicción:', error);
            }
        }, 200);
    };

    // 🆕 PROCESAR VALIDACIÓN INDIVIDUAL
    const processIndividualValidation = (predictions) => {
        if (!predictions || predictions.length === 0) return;

        const ineConfidence = predictions.find(p => p.className === 'INE')?.probability || 0;
        const personConfidence = predictions.find(p => p.className === 'Persona')?.probability || 0;

        // Efectos visuales basados en confianza
        const getConfidenceStyle = (confidence) => ({
            width: `${confidence * 100}%`,
            backgroundColor: confidence >= VALIDATION_THRESHOLD
                ? '#10B981'
                : confidence > VALIDATION_THRESHOLD * 0.7
                    ? '#F59E0B'
                    : '#EF4444'
        });

        if (validationMode === 'validating-ine') {
            if (ineConfidence >= VALIDATION_THRESHOLD) {
                if (!validationTimerRef.current) {
                    console.log('🆔 INE detectada, iniciando validación...');
                    setCurrentInstruction('🎯 ¡Documento válido detectado! Mantenga la posición...');
                    startValidationTimer('ine');
                }
            } else {
                if (validationTimerRef.current) {
                    console.log('⚠️ INE perdida, cancelando validación...');
                    cancelValidationTimer();
                    setCurrentInstruction('🔍 Ajuste el documento en el marco por favor');
                }
                // Feedback visual en tiempo real
                setWebcamPredictions(predictions.map(p => ({
                    ...p,
                    style: getConfidenceStyle(p.className === 'INE' ? p.probability : 0)
                })));
            }
        }
        else if (validationMode === 'validating-person') {
            if (personConfidence >= VALIDATION_THRESHOLD) {
                if (!validationTimerRef.current) {
                    console.log('👤 Persona detectada, iniciando validación...');
                    setCurrentInstruction('🎯 ¡Rostro detectado! Mantenga la posición...');
                    startValidationTimer('person');
                }
            } else {
                if (validationTimerRef.current) {
                    console.log('⚠️ Persona perdida, cancelando validación...');
                    cancelValidationTimer();
                    setCurrentInstruction('👀 Mire directamente a la cámara');
                }
                // Feedback visual en tiempo real
                setWebcamPredictions(predictions.map(p => ({
                    ...p,
                    style: getConfidenceStyle(p.className === 'Persona' ? p.probability : 0)
                })));
            }
        }
    };

    // 🆕 FUNCIONES DE VALIDACIÓN INDIVIDUAL
    const startValidationTimer = (type) => {
        const startTime = Date.now();

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / VALIDATION_DURATION) * 100, 100);
            setCurrentValidationProgress(progress);

            const remaining = Math.ceil((VALIDATION_DURATION - elapsed) / 1000);
            if (remaining > 0) {
                if (type === 'ine') {
                    setCurrentInstruction(`🆔 Validando INE... ${remaining}s`);
                } else {
                    setCurrentInstruction(`👤 Validando Persona... ${remaining}s`);
                }
            }
        }, PROGRESS_INTERVAL);

        validationTimerRef.current = setTimeout(() => {
            console.log(`✅ ${type.toUpperCase()} VALIDADA!`);
            completeIndividualValidation(type);
        }, VALIDATION_DURATION);
    };

    const cancelValidationTimer = () => {
        if (validationTimerRef.current) {
            clearTimeout(validationTimerRef.current);
            validationTimerRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        setCurrentValidationProgress(0);
    };

    const completeIndividualValidation = (type) => {
        // Limpiar timers
        cancelValidationTimer();
        setCurrentValidationProgress(100);

        // Efectos de celebración
        const celebration = {
            'ine': {
                emoji: '🆔',
                message: '¡Documento validado con éxito!',
                color: 'text-blue-600'
            },
            'person': {
                emoji: '👤',
                message: '¡Rostro verificado con éxito!',
                color: 'text-green-600'
            }
        };

        if (type === 'ine') {
            setIneValidated(true);
            setValidationMode('ine-completed');
        } else {
            setPersonValidated(true);
            setValidationMode('person-completed');
        }

        setCurrentInstruction(
            <span className={`${celebration[type].color} animate-bounce`}>
                {celebration[type].emoji} {celebration[type].message}
            </span>
        );

        // Sonido de éxito (opcional)
        if (typeof window !== 'undefined') {
            const audio = new Audio('/sounds/success.mp3'); // Asegúrate de tener este archivo
            audio.volume = 0.3;
            audio.play().catch(e => console.log('No se pudo reproducir sonido:', e));
        }

        // Detener cámara después de un momento
        setTimeout(() => {
            stopWebcam();

            if ((type === 'ine' && personValidated) || (type === 'person' && ineValidated)) {
                setValidationMode('all-completed');
                setCurrentInstruction(
                    <span className="text-purple-600 font-bold text-xl">
                        🎉 ¡Validación completa! ✔️
                    </span>
                );
            } else {
                setValidationMode('selection');
                setCurrentInstruction('Seleccione siguiente validación');
            }
        }, 2000);
    };

    // 🆕 RESET INDIVIDUAL
    const resetValidation = (type) => {
        if (type === 'ine') {
            setIneValidated(false);
        } else if (type === 'person') {
            setPersonValidated(false);
        } else if (type === 'all') {
            setIneValidated(false);
            setPersonValidated(false);
        }

        setValidationMode('selection');
        setCurrentInstruction('Selecciona qué quieres validar');
        setCurrentValidationProgress(0);
        stopWebcam();
    };

    // Limpiar al desmontar
    useEffect(() => {
        return () => stopWebcam();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        🤖 Validación Individual de Identidad
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Valida tu INE y Persona por separado
                    </p>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg mb-6 text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-blue-700 dark:text-blue-300">Cargando modelo de IA...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg mb-6">
                        <p className="text-red-700 dark:text-red-300">❌ {error}</p>
                        <button
                            onClick={() => {setError(''); }}
                            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            🔄 Reintentar
                        </button>
                    </div>
                )}

                {/* 🔧 VIDEO ÚNICO - VISIBLE SOLO CUANDO ESTÁ ACTIVO */}
                <div className="text-center mb-6">
                    <video
                        ref={webcamRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full max-w-md mx-auto border-4 border-blue-300 rounded-lg shadow-lg transition-opacity duration-300 ${
                            isWebcamActive ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                            backgroundColor: '#000',
                            minHeight: isWebcamActive ? '300px' : '0px',
                            height: isWebcamActive ? 'auto' : '0px'
                        }}
                    />
                    {isWebcamActive && (
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Sigue las instrucciones de arriba
                        </p>
                    )}
                </div>

                {/* 🆕 ESTADO DE VALIDACIONES */}
                {isModelLoaded && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6 shadow-lg">
                        <h3 className="font-bold mb-4 text-center">📋 Estado de Validaciones</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Estado INE */}
                            <div className={`p-4 rounded-lg border-2 ${
                                ineValidated
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-300 bg-gray-50 dark:bg-gray-700'
                            }`}>
                                <div className="text-center">
                                    <div className="text-4xl mb-2">🆔</div>
                                    <h4 className="font-bold mb-2">Validación INE</h4>
                                    <p className={`text-lg font-bold ${
                                        ineValidated ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        {ineValidated ? '✅ Validada' : '⚪ Pendiente'}
                                    </p>
                                </div>
                            </div>

                            {/* Estado Persona */}
                            <div className={`p-4 rounded-lg border-2 ${
                                personValidated
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-300 bg-gray-50 dark:bg-gray-700'
                            }`}>
                                <div className="text-center">
                                    <div className="text-4xl mb-2">👤</div>
                                    <h4 className="font-bold mb-2">Validación Persona</h4>
                                    <p className={`text-lg font-bold ${
                                        personValidated ? 'text-green-600' : 'text-gray-600'
                                    }`}>
                                        {personValidated ? '✅ Validada' : '⚪ Pendiente'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Instrucción actual */}
                        <div className={`text-center p-4 rounded-lg font-bold text-lg ${
                            validationMode === 'all-completed'
                                ? 'bg-green-100 text-green-800'
                                : validationMode.includes('validating')
                                ? 'bg-blue-100 text-blue-800'
                                : validationMode.includes('completed')
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {currentInstruction}
                        </div>

                        {/* Barra de progreso durante validación */}
                        {validationMode.includes('validating') && (
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div
                                        className="h-4 rounded-full transition-all duration-300 bg-blue-500"
                                        style={{ width: `${currentValidationProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center mt-2 text-sm text-gray-600">
                                    Progreso: {currentValidationProgress.toFixed(0)}%
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* 🆕 BOTONES DE VALIDACIÓN INDIVIDUAL */}
                {isModelLoaded && validationMode === 'selection' && (
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Botón Validar INE */}
                            <button
                                onClick={() => startIndividualValidation('ine')}
                                disabled={ineValidated}
                                className={`p-6 rounded-lg text-xl font-bold transition-colors ${
                                    ineValidated
                                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                <div className="text-4xl mb-2">🆔</div>
                                {ineValidated ? '✅ INE Validada' : 'Validar INE'}
                            </button>

                            {/* Botón Validar Persona */}
                            <button
                                onClick={() => startIndividualValidation('person')}
                                disabled={personValidated}
                                className={`p-6 rounded-lg text-xl font-bold transition-colors ${
                                    personValidated
                                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                        : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                            >
                                <div className="text-4xl mb-2">👤</div>
                                {personValidated ? '✅ Persona Validada' : 'Validar Persona'}
                            </button>
                        </div>

                        {/* Botones de reset */}
                        {(ineValidated || personValidated) && (
                            <div className="text-center space-x-4">
                                {ineValidated && (
                                    <button
                                        onClick={() => resetValidation('ine')}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        🔄 Reset INE
                                    </button>
                                )}
                                {personValidated && (
                                    <button
                                        onClick={() => resetValidation('person')}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        🔄 Reset Persona
                                    </button>
                                )}
                                <button
                                    onClick={() => resetValidation('all')}
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    🗑️ Reset Todo
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Botón cancelar durante validación */}
                {validationMode.includes('validating') && (
                    <div className="text-center mb-6">
                        <button
                            onClick={() => {
                                stopWebcam();
                                setValidationMode('selection');
                                setCurrentInstruction('Selecciona qué quieres validar');
                            }}
                            className="px-8 py-4 bg-red-500 text-white text-xl font-bold rounded-lg hover:bg-red-600"
                        >
                            🛑 CANCELAR VALIDACIÓN
                        </button>
                    </div>
                )}

                {/* Botón continuar después de completar una validación */}
                {validationMode.includes('completed') && validationMode !== 'all-completed' && (
                    <div className="text-center mb-6">
                        <button
                            onClick={() => {
                                setValidationMode('selection');
                                setCurrentInstruction('Selecciona qué quieres validar');
                            }}
                            className="px-8 py-4 bg-blue-500 text-white text-xl font-bold rounded-lg hover:bg-blue-600"
                        >
                            ✨ CONTINUAR
                        </button>
                    </div>
                )}

                {/* Predicciones EN VIVO */}
                {webcamPredictions.length > 0 && isWebcamActive && (
                    <div className="bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 p-6 rounded-xl border-4 border-green-300">
                        <h2 className="text-2xl font-bold text-center mb-4 text-green-800 dark:text-green-300">
                            🔥 ANÁLISIS EN TIEMPO REAL 🔥
                        </h2>
                        <div className="space-y-4">
                            {webcamPredictions.map((prediction, index) => {
                                const percentage = (prediction.probability * 100).toFixed(1);
                                const isHigh = prediction.probability >= VALIDATION_THRESHOLD;
                                const isCurrentTarget =
                                    (validationMode === 'validating-ine' && prediction.className === 'INE') ||
                                    (validationMode === 'validating-person' && prediction.className === 'Persona');

                                return (
                                    <div key={index} className={`p-4 rounded-lg shadow-lg ${
                                        isCurrentTarget ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-white dark:bg-gray-800'
                                    }`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className={`text-2xl font-bold ${isCurrentTarget ? 'text-yellow-800' : ''}`}>
                                                {prediction.className === 'INE' ? '🆔 INE' : '👤 PERSONA'}
                                                {isCurrentTarget && ' ← VALIDANDO'}
                                            </span>
                                            <span className={`text-3xl font-black ${isHigh ? 'text-green-600' : 'text-red-600'}`}>
                                                {percentage}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-8 mb-2">
                                            <div
                                                className={`h-8 rounded-full transition-all duration-300 ${
                                                    isHigh ? 'bg-green-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-center">
                                            <span className={`text-lg font-bold ${isHigh ? 'text-green-600' : 'text-red-600'}`}>
                                                {isHigh ? '✅ UMBRAL ALCANZADO (90%)' : '❌ DEBAJO DEL UMBRAL (90%)'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Mensaje de éxito total */}
                {validationMode === 'all-completed' && (
                    <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-lg mt-6">
                        <div className="text-8xl mb-4">🎉</div>
                        <h3 className="text-2xl font-bold text-green-600 mb-4">
                            ¡Validación Completa!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Ambas validaciones han sido completadas exitosamente.
                        </p>
                        <div className="flex justify-center space-x-4 mb-6">
                            <div className="bg-white p-4 rounded-lg shadow">
                                <div className="text-green-500 text-3xl">✅</div>
                                <div className="text-sm font-bold">INE Validada</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                                <div className="text-green-500 text-3xl">✅</div>
                                <div className="text-sm font-bold">Persona Validada</div>
                            </div>
                        </div>
                        <button
                            onClick={() => resetValidation('all')}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            🔄 Nueva Validación
                        </button>
                    </div>
                )}

                {/* Estado del sistema */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-6 shadow">
                    <h3 className="font-bold mb-3">🔧 Estado del Sistema:</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Modelo:</span>
                            <span className={isModelLoaded ? 'text-green-600' : 'text-red-600'}>
                                {isModelLoaded ? '✅ Cargado' : '❌ No cargado'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cámara:</span>
                            <span className={isWebcamActive ? 'text-green-600' : 'text-gray-600'}>
                                {cameraStatus}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Predicciones:</span>
                            <span className={webcamPredictions.length > 0 ? 'text-green-600' : 'text-gray-600'}>
                                {webcamPredictions.length > 0 ? '✅ Funcionando' : '⚪ Esperando'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Modo actual:</span>
                            <span className="text-blue-600 font-bold">
                                {validationMode === 'selection' ? 'Selección' :
                                 validationMode === 'validating-ine' ? 'Validando INE' :
                                 validationMode === 'validating-person' ? 'Validando Persona' :
                                 validationMode === 'ine-completed' ? 'INE Completada' :
                                 validationMode === 'person-completed' ? 'Persona Completada' :
                                 validationMode === 'all-completed' ? 'Todo Completado' : validationMode}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Video ref disponible:</span>
                            <span className={webcamRef.current ? 'text-green-600' : 'text-red-600'}>
                                {webcamRef.current ? '✅ Sí' : '❌ No'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Debug info */}
                <div className="mt-6 bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs font-mono">
                    <p><strong>Debug Detallado:</strong></p>
                    <p>Stream activo: {webcamStream?.active ? '✅' : '❌'}</p>
                    <p>Stream tracks: {webcamStream?.getTracks().length || 0}</p>
                    <p>Video readyState: {webcamRef.current?.readyState} (4=HAVE_ENOUGH_DATA)</p>
                    <p>Video size: {webcamRef.current?.videoWidth || 0}x{webcamRef.current?.videoHeight || 0}</p>
                    <p>Video paused: {webcamRef.current?.paused ? '❌' : '✅'}</p>
                    <p>Video ended: {webcamRef.current?.ended ? '❌' : '✅'}</p>
                    <p>Predicciones: {webcamPredictions.length}</p>
                    <p>Estado cámara: {cameraStatus}</p>
                    <p>Modo validación: {validationMode}</p>
                    <p>Progreso actual: {currentValidationProgress.toFixed(0)}%</p>
                    <p>INE validada: {ineValidated ? '✅' : '❌'}</p>
                    <p>Persona validada: {personValidated ? '✅' : '❌'}</p>
                    <p>Ref webcam: {webcamRef.current ? 'Disponible' : 'NULL'}</p>
                    <p>Video visible: {isWebcamActive ? 'SÍ' : 'NO'}</p>
                </div>

                {/* Instrucciones */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">
                        💡 Cómo funciona la validación individual:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                        <li>• <strong>Flexibilidad total:</strong> Valida INE y Persona en cualquier orden</li>
                        <li>• <strong>Validación independiente:</strong> Cada una requiere 90%+ por 3 segundos</li>
                        <li>• <strong>Reseteo disponible:</strong> Puedes revalidar cualquiera cuando quieras</li>
                        <li>• <strong>Cancelación instantánea:</strong> Si bajas del umbral, se resetea automáticamente</li>
                        <li>• <strong>Estado persistente:</strong> Las validaciones completadas se mantienen</li>
                        <li>• <strong>Video dinámico:</strong> Solo se muestra cuando está en uso</li>
                    </ul>
                </div>

                {/* Estadísticas */}
                {(ineValidated || personValidated) && (
                    <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-900 dark:text-yellow-400 mb-2">
                            📊 Resumen de Validaciones:
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-2xl">{ineValidated ? '✅' : '⚪'}</div>
                                <div className="font-bold">INE</div>
                                <div className="text-xs text-gray-600">
                                    {ineValidated ? 'Validada' : 'Pendiente'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl">{personValidated ? '✅' : '⚪'}</div>
                                <div className="font-bold">Persona</div>
                                <div className="text-xs text-gray-600">
                                    {personValidated ? 'Validada' : 'Pendiente'}
                                </div>
                            </div>
                        </div>

                        {ineValidated && personValidated && (
                            <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
                                <div className="text-green-800 font-bold">
                                    🎉 ¡Validación 100% Completa!
                                </div>
                                <div className="text-green-600 text-sm">
                                    Identidad verificada exitosamente
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
 };

 export default PhotoVerification;
