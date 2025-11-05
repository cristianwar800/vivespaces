import React, { useState, useRef, useCallback, useEffect } from 'react';

function FaceIDStep({ onComplete, onBack, previousResult }) {
    const [isAlreadyValidated, setIsAlreadyValidated] = useState(false);
    const [showValidatedScreen, setShowValidatedScreen] = useState(true);
    
    const [selfieFile, setSelfieFile] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [ineFile, setIneFile] = useState(null);
    const [inePreview, setInePreview] = useState(null);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [showCamera, setShowCamera] = useState(true);
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const selfieInputRef = useRef(null);
    const ineInputRef = useRef(null);

    // 🔥 FIX: Detectar validación previa correctamente
    useEffect(() => {
        console.log('🔍 Verificando previousResult:', previousResult);
        
        if (previousResult) {
            // Verificar si tiene los datos de Face ID (puede venir de diferentes estructuras)
            const hasFaceId = previousResult.face_id || previousResult.face_similarity;
            const hasSuccess = previousResult.success === true || previousResult.is_match === true;
            
            if (hasSuccess && hasFaceId) {
                console.log('✅ Paso 1 ya fue validado previamente:', previousResult);
                setIsAlreadyValidated(true);
                setResult(previousResult);
                setShowValidatedScreen(true);
            } else {
                console.log('ℹ️ previousResult existe pero no está completo:', previousResult);
            }
        } else {
            console.log('ℹ️ No hay previousResult');
        }
    }, [previousResult]);

    const extractSafeDataFromOCR = (fullText) => {
        if (!fullText) return 'No se pudo extraer información';
        
        console.log('🔍 Texto completo recibido:', fullText);
        
        const safeData = [];
        
        // 1️⃣ EXTRAER CURP
        const curpPattern = /[A-Z]{4}\d{6}[HM][A-Z0-9]{7}/;
        const curpMatch = fullText.match(curpPattern);
        
        if (curpMatch) {
            safeData.push(`CURP: ${curpMatch[0]}`);
            console.log('✅ CURP encontrado:', curpMatch[0]);
        }
        
        // 2️⃣ EXTRAER NOMBRE
        let nameFound = false;
        const nombreIndex = fullText.indexOf('NOMBRE');
        
        if (nombreIndex !== -1) {
            const afterNombre = fullText.substring(nombreIndex + 6).trim();
            const domicilioIndex = afterNombre.indexOf('DOMICILIO');
            
            if (domicilioIndex !== -1) {
                const nombreCompleto = afterNombre.substring(0, domicilioIndex).trim();
                
                if (nombreCompleto.length >= 8 && /^[A-ZÁÉÍÓÚÑÜ\s]+$/.test(nombreCompleto)) {
                    safeData.push(`Nombre: ${nombreCompleto}`);
                    console.log('✅ Nombre encontrado:', nombreCompleto);
                    nameFound = true;
                }
            }
        }
        
        if (safeData.length === 0) {
            return 'Información verificada correctamente';
        }
        
        return safeData.join('\n');
    };

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: 'user',
                    aspectRatio: { ideal: 16/9 },
                    frameRate: { ideal: 30 }
                }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraStream(stream);
                setCameraActive(true);
                setError(null);
            }
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            setCameraActive(false);
        }
    }, [cameraStream]);

    const captureSelfie = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.restore();

        canvas.toBlob((blob) => {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            
            setSelfieFile(file);
            setSelfiePreview(dataUrl);
            stopCamera();
            setError(null);
            
            console.log('✅ Selfie capturada');
        }, 'image/jpeg', 0.95);
    }, [stopCamera]);

    const handleFileSelect = (file, type) => {
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === 'selfie') {
                setSelfieFile(file);
                setSelfiePreview(e.target.result);
                console.log('✅ Selfie cargada');
            } else {
                setIneFile(file);
                setInePreview(e.target.result);
                console.log('✅ INE cargada');
            }
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleVerify = async () => {
        if (!selfieFile || !ineFile) {
            setError('Debes subir ambas fotos para continuar');
            return;
        }

        setProcessing(true);
        setResult(null);
        setError(null);

        try {
            const formData = new FormData();

            if (selfiePreview) {
                formData.append('selfie_data', selfiePreview);
            } else {
                const reader = new FileReader();
                const base64Promise = new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(selfieFile);
                });
                const selfieBase64 = await base64Promise;
                formData.append('selfie_data', selfieBase64);
            }
            
            formData.append('ine', ineFile);
            console.log('🚀 Enviando verificación Face ID + OCR...');

            const response = await fetch('/verification/face-verify', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData
            });

            const text = await response.text();
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                throw new Error('La respuesta del servidor no es JSON válido');
            }

            console.log('✅ Data recibida:', data);

            setResult(data);

            // 🔥 FIX: Llamar a onComplete automáticamente si es exitoso
            if (data.success && onComplete) {
                console.log('✅ Verificación exitosa - Notificando al padre automáticamente');
                onComplete(data);
            }

        } catch (error) {
            console.error('❌ Error:', error);
            setError(error.message || 'Error de conexión. Intenta nuevamente.');
            setResult({
                success: false,
                error: error.message || 'Error de conexión'
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleEditValidation = () => {
        console.log('✏️ Usuario quiere editar/revalidar el Paso 1');
        setShowValidatedScreen(false);
    };

    // 🔥 PANTALLA DE VALIDACIÓN PREVIA
    if (isAlreadyValidated && showValidatedScreen && result) {
        // 🔥 FIX: Extraer datos de manera más flexible
        const faceIdData = result.face_id || {};
        const ocrData = result.ocr_validation || {};
        
        const faceSimilarity = faceIdData.similarity_percentage || result.face_similarity || 0;
        const nameMatchPercentage = ocrData.name_match_percentage || result.name_match_percentage || 0;
        const extractedText = ocrData.extracted_text || result.extracted_text || '';
        
        return (
            <div className="space-y-6">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-semibold">Regresar</span>
                    </button>
                )}

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-8 rounded-2xl border-2 border-green-300 dark:border-green-700 shadow-2xl">
                    <div className="text-center">
                        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-40"></div>
                            <div className="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        <h3 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-3">
                            ✅ Paso 1 Completado
                        </h3>
                        <p className="text-lg text-green-700 dark:text-green-400 mb-6">
                            Tu identidad facial y documento INE ya fueron verificados exitosamente
                        </p>

                        {/* 🔥 FIX: Mostrar métricas solo si existen */}
                        {(faceSimilarity > 0 || nameMatchPercentage > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {faceSimilarity > 0 && (
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Coincidencia de Rostro</p>
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                            {faceSimilarity}%
                                        </p>
                                    </div>
                                )}

                                {nameMatchPercentage > 0 && (
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verificación de Datos</p>
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                            {nameMatchPercentage}%
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🔥 FIX: Mostrar texto extraído solo si existe */}
                        {extractedText && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center justify-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Información Verificada</span>
                                </p>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded border border-blue-100 dark:border-blue-700">
                                    <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2 font-mono">
                                        {extractSafeDataFromOCR(extractedText).split('\n').map((line, i) => (
                                            line.trim() && (
                                                <div key={i} className="flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span>{line}</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Validación completada y guardada</span>
                        </div>

                        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                ℹ️ Ya completaste este paso exitosamente. Puedes continuar al siguiente paso o revalidar tu información si lo deseas.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    if (result && onComplete) {
                                        console.log('➡️ Usuario confirmó continuar al Paso 2');
                                        onComplete(result);
                                    }
                                }}
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-3"
                            >
                                <span className="text-lg">Continuar al Paso 2</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>

                            <button
                                onClick={handleEditValidation}
                                className="sm:flex-none bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Ver detalles / Revalidar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 🔥 INTERFAZ NORMAL (ya sea primera vez o usuario eligió editar/revalidar)
    return (
        <div className="space-y-6">
            {/* 🔥 BOTÓN REGRESAR */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="font-semibold">Regresar</span>
                </button>
            )}

            {/* 🔥 BANNER INFORMATIVO SI YA ESTABA VALIDADO */}
            {isAlreadyValidated && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-6 py-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                        <p className="font-semibold mb-1">✅ Este paso ya fue completado anteriormente</p>
                        <p className="text-sm">Puedes revalidar tu información o simplemente continuar al siguiente paso.</p>
                    </div>
                    <button
                        onClick={() => setShowValidatedScreen(true)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-semibold text-sm whitespace-nowrap"
                    >
                        Ver detalles →
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="font-semibold mb-1">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SECCIÓN SELFIE */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">📸</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tu Selfie</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Toma una foto clara de tu rostro</p>
                        </div>
                    </div>

                    {!selfiePreview && (
                        <div className="flex space-x-3 mb-6">
                            <button
                                onClick={() => {
                                    setShowCamera(true);
                                    stopCamera();
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                                    showCamera
                                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                Tomar foto
                            </button>
                            <button
                                onClick={() => {
                                    setShowCamera(false);
                                    stopCamera();
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                                    !showCamera
                                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                Subir foto
                            </button>
                        </div>
                    )}

                    {showCamera && !selfiePreview && (
                        <div className="space-y-4">
                            <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden shadow-2xl aspect-video">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                    style={{
                                        filter: cameraActive ? 'brightness(1)' : 'brightness(0.3)'
                                    }}
                                ></video>

                                {cameraActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-48 h-60 border-4 border-pink-500/60 rounded-full animate-pulse"></div>
                                        <div className="absolute w-48 h-60 border-4 border-pink-400/30 rounded-full animate-ping"></div>
                                    </div>
                                )}

                                {!cameraActive && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm space-y-6">
                                        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center animate-pulse">
                                            <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-white text-lg font-bold">Cámara desactivada</p>
                                        <p className="text-gray-300 text-sm">Presiona Iniciar Cámara</p>
                                    </div>
                                )}

                                <div className="absolute bottom-6 left-0 right-0 z-20">
                                    <div className="flex justify-center items-center space-x-4 px-4">
                                        {!cameraActive ? (
                                            <button
                                                onClick={startCamera}
                                                className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transition-all hover:scale-105 flex items-center space-x-3"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                <span>Iniciar Cámara</span>
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={captureSelfie}
                                                    className="relative p-6 rounded-full shadow-2xl transition-all flex items-center justify-center bg-white hover:bg-gray-100 text-gray-900 hover:scale-110"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-pulse opacity-30"></div>
                                                    <svg className="w-10 h-10 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>

                                                <button
                                                    onClick={stopCamera}
                                                    className="bg-red-500/80 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:scale-105 backdrop-blur-sm"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {cameraActive && (
                                    <>
                                        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm z-20">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            <span>EN VIVO</span>
                                        </div>
                                        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm z-20">
                                            HD 1080p
                                        </div>
                                    </>
                                )}
                            </div>

                            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-lg border border-pink-200 dark:border-pink-800">
                                    <div className="flex items-start space-x-2">
                                        <span className="text-pink-600 dark:text-pink-400">💡</span>
                                        <div className="text-xs">
                                            <p className="font-semibold text-pink-800 dark:text-pink-300">Iluminación</p>
                                            <p className="text-pink-700 dark:text-pink-400">Luz frontal uniforme</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-pink-50 dark:bg-pink-900/20 p-3 rounded-lg border border-pink-200 dark:border-pink-800">
                                    <div className="flex items-start space-x-2">
                                        <span className="text-pink-600 dark:text-pink-400">👤</span>
                                        <div className="text-xs">
                                            <p className="font-semibold text-pink-800 dark:text-pink-300">Solo tú</p>
                                            <p className="text-pink-700 dark:text-pink-400">Sin otras personas</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start space-x-2">
                                        <span className="text-blue-600 dark:text-blue-400">🎯</span>
                                        <div className="text-xs">
                                            <p className="font-semibold text-blue-800 dark:text-blue-300">Sin filtros</p>
                                            <p className="text-blue-700 dark:text-blue-400">Mejor precisión</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-start space-x-2">
                                        <span className="text-green-600 dark:text-green-400">✨</span>
                                        <div className="text-xs">
                                            <p className="font-semibold text-green-800 dark:text-green-300">Imagen original</p>
                                            <p className="text-green-700 dark:text-green-400">Alta calidad</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showCamera && !selfiePreview && (
                        <div 
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-pink-400 dark:hover:border-pink-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-pink-50/50 dark:hover:bg-pink-900/10"
                            onClick={() => selfieInputRef.current?.click()}
                        >
                            <input
                                ref={selfieInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileSelect(e.target.files[0], 'selfie')}
                                className="hidden"
                            />
                            <div className="space-y-4">
                                <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                        Arrastra tu selfie aquí
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        o haz clic para seleccionar
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                        JPG, PNG - Hasta 10MB
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {selfiePreview && (
                        <div className="relative group">
                            <img
                                src={selfiePreview}
                                alt="Selfie"
                                className="w-full rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700"
                            />
                            <div className="absolute top-3 right-3 flex space-x-2">
                                <button
                                    onClick={() => {
                                        setSelfieFile(null);
                                        setSelfiePreview(null);
                                        setResult(null);
                                        if (showCamera) startCamera();
                                    }}
                                    className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                            <div className="absolute bottom-3 left-3 bg-green-500/90 text-white px-3 py-1.5 rounded-lg text-sm font-bold backdrop-blur-sm flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Foto lista</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECCIÓN INE - 🔥 CON DIFUMINADO TOTAL */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🆔</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tu INE</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Documento protegido y seguro</p>
                        </div>
                    </div>

                    {!inePreview ? (
                        <div 
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 min-h-[400px] flex items-center justify-center"
                            onClick={() => ineInputRef.current?.click()}
                        >
                            <input
                                ref={ineInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileSelect(e.target.files[0], 'ine')}
                                className="hidden"
                            />
                            <div className="space-y-4">
                                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                        Sube tu INE
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                        Tus datos estarán protegidos
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                        JPG, PNG - Hasta 10MB
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative group">
                                {/* 🔥 INE COMPLETAMENTE DIFUMINADA */}
                                <img
                                    src={inePreview}
                                    alt="INE"
                                    className="w-full rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700"
                                    style={{ filter: 'blur(25px) brightness(0.7)' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-emerald-500/95 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl backdrop-blur-sm flex items-center space-x-3">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                        <span>Datos Protegidos</span>
                                    </div>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <button
                                        onClick={() => {
                                            setIneFile(null);
                                            setInePreview(null);
                                            setResult(null);
                                        }}
                                        className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* 🔥 MENSAJE DE PRIVACIDAD MÁXIMA */}
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <div>
                                        <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">Tu privacidad es nuestra prioridad</p>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-400">La imagen se procesa de forma segura y encriptada</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÓN VERIFICAR - 🔥 TEXTO PARA USUARIO FINAL */}
            {ineFile && selfieFile && !result && (
                <button
                    onClick={handleVerify}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] flex items-center justify-center space-x-3"
                >
                    {processing ? (
                        <>
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-lg">Verificando tu identidad...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-lg">✅ Verificar Identidad</span>
                        </>
                    )}
                </button>
            )}

            {/* RESULTADOS - 🔥 VERSIÓN SIN BOTÓN DUPLICADO */}
            {result && (
                <div className={`p-8 rounded-2xl border-2 shadow-2xl ${
                    result.success
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700'
                        : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-300 dark:border-red-700'
                }`}>
                    {result.success ? (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-3">
                                ✅ Identidad Verificada
                            </h3>
                            <p className="text-lg text-green-700 dark:text-green-400 mb-6">
                                Tu identidad ha sido confirmada exitosamente
                            </p>

                            {/* Métricas - 🔥 PARA USUARIO FINAL */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {result.face_id && (
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Coincidencia de Rostro</p>
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                            {result.face_id.similarity_percentage}%
                                        </p>
                                    </div>
                                )}

                                {result.ocr_validation && (
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verificación de Datos</p>
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                            {result.ocr_validation.name_match_percentage}%
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* 🔥 CURP Y NOMBRE EXTRAÍDOS (ÉXITO) */}
                            {result.ocr_validation?.extracted_text && (
                                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center justify-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Información Verificada</span>
                                    </p>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded border border-blue-100 dark:border-blue-700">
                                        <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2 font-mono">
                                            {extractSafeDataFromOCR(result.ocr_validation.extracted_text).split('\n').map((line, i) => (
                                                line.trim() && (
                                                    <div key={i} className="flex items-center space-x-2">
                                                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span>{line}</span>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 🔥 MENSAJE INFORMATIVO - SIN BOTÓN DUPLICADO */}
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center justify-center space-x-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>ℹ️ Ya completaste este paso exitosamente. Puedes continuar al siguiente paso o revalidar tu información si lo deseas.</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-3xl font-bold text-red-800 dark:text-red-300 mb-3">
                                No se pudo verificar
                            </h3>
                            <p className="text-lg text-red-700 dark:text-red-400 mb-6">
                                Por favor, intenta con fotos más claras
                            </p>

                            {/* Métricas aunque haya fallado */}
                            {(result.face_id || result.ocr_validation) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {result.face_id && (
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Coincidencia de Rostro</p>
                                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                                {result.face_id.similarity_percentage}%
                                            </p>
                                        </div>
                                    )}

                                    {result.ocr_validation && (
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Verificación de Datos</p>
                                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                                {result.ocr_validation.name_match_percentage}%
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Razones y Sugerencias - TODO DEL CÓDIGO ORIGINAL */}
                            {result.error_reasons && result.error_reasons.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 text-left mb-6">
                                    <p className="font-bold text-red-800 dark:text-red-300 mb-3 flex items-center space-x-2">
                                        <span>⚠️</span>
                                        <span>Razones del rechazo:</span>
                                    </p>
                                    <ul className="space-y-2 text-sm text-red-700 dark:text-red-400">
                                        {result.error_reasons.map((reason, i) => (
                                            <li key={i} className="flex items-start space-x-2">
                                                <span className="text-red-500 mt-0.5">•</span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.suggestions && result.suggestions.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 text-left mb-6">
                                    <p className="font-bold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        <span>💡 Sugerencias:</span>
                                    </p>
                                    <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-400">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i} className="flex items-start space-x-2">
                                                <span className="text-yellow-500 mt-0.5">•</span>
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.detailed_info && result.detailed_info.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-left mb-6">
                                    <p className="font-bold text-blue-800 dark:text-blue-300 mb-3">
                                        📊 Información detallada:
                                    </p>
                                    <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                                        {result.detailed_info.map((info, i) => (
                                            <p key={i}>{info}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setSelfieFile(null);
                                    setSelfiePreview(null);
                                    setIneFile(null);
                                    setInePreview(null);
                                    setResult(null);
                                    setError(null);
                                }}
                                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center space-x-3"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-lg">Intentar de nuevo</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FaceIDStep;