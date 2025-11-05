import React, { useState, useRef, useCallback, useEffect } from 'react';

function TestOCR({ onComplete }) {
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
    
    const [faceEnabled, setFaceEnabled] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const selfieInputRef = useRef(null);
    const ineInputRef = useRef(null);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                console.log('🔧 Cargando configuración de verificación...');
                
                const response = await fetch('/api/verification/config', {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Configuración cargada:', data);
                    
                    setFaceEnabled(data.data?.face_verification_enabled || false);
                    
                    if (!data.data?.face_verification_enabled) {
                        console.log('⚠️ Face ID deshabilitado - Solo se mostrará verificación de documentos');
                    }
                } else {
                    console.warn('⚠️ No se pudo cargar configuración, usando valores por defecto');
                    setFaceEnabled(false);
                }
            } catch (error) {
                console.error('❌ Error cargando configuración:', error);
                setFaceEnabled(false);
            } finally {
                setConfigLoading(false);
            }
        };

        loadConfig();
    }, []);

    const preprocessImage = async (canvas) => {
        return new Promise((resolve) => {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let totalBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                totalBrightness += brightness;
            }
            const avgBrightness = totalBrightness / (data.length / 4);

            console.log('📊 Brillo promedio original:', avgBrightness.toFixed(2));

            const targetBrightness = 140;
            const adjustment = (targetBrightness - avgBrightness) * 0.5;

            if (Math.abs(adjustment) > 10) {
                console.log('💡 Ajustando brillo en:', adjustment.toFixed(2));
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
                }
            }

            const contrast = 1.15;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
                data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
                data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
            }

            const tempData = new Uint8ClampedArray(data);
            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    
                    if (brightness < 50) {
                        const neighbors = [
                            ((y-1) * canvas.width + x) * 4,
                            ((y+1) * canvas.width + x) * 4,
                            (y * canvas.width + (x-1)) * 4,
                            (y * canvas.width + (x+1)) * 4
                        ];
                        
                        for (let c = 0; c < 3; c++) {
                            let sum = data[idx + c];
                            neighbors.forEach(n => sum += data[n + c]);
                            tempData[idx + c] = sum / 5;
                        }
                    }
                }
            }
            
            for (let i = 0; i < data.length; i++) {
                data[i] = tempData[i];
            }

            ctx.putImageData(imageData, 0, 0);
            console.log('✅ Preprocesamiento completado');
            resolve();
        });
    };

    const preprocessUploadedImage = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    await preprocessImage(canvas);
                    
                    canvas.toBlob((blob) => {
                        const enhancedFile = new File([blob], file.name, { type: 'image/jpeg' });
                        resolve({
                            file: enhancedFile,
                            preview: canvas.toDataURL('image/jpeg', 0.92)
                        });
                    }, 'image/jpeg', 0.92);
                };
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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

        console.log('🎨 Aplicando mejoras de imagen...');
        await preprocessImage(canvas);

        canvas.toBlob((blob) => {
            const file = new File([blob], 'selfie_enhanced.jpg', { type: 'image/jpeg' });
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            
            setSelfieFile(file);
            setSelfiePreview(dataUrl);
            stopCamera();
            setError(null);
            
            console.log('✅ Selfie capturada y mejorada');
        }, 'image/jpeg', 0.95);
    }, [stopCamera]);

    const handleFileSelect = async (file, type) => {
        if (!file) return;

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }

        try {
            if (type === 'selfie') {
                console.log('📸 Mejorando selfie subida...');
                const enhanced = await preprocessUploadedImage(file);
                setSelfieFile(enhanced.file);
                setSelfiePreview(enhanced.preview);
                setError(null);
                console.log('✅ Selfie mejorada');
            } else {
                console.log('🪪 Mejorando foto de INE...');
                const enhanced = await preprocessUploadedImage(file);
                setIneFile(enhanced.file);
                setInePreview(enhanced.preview);
                setError(null);
                console.log('✅ INE mejorada');
            }
        } catch (err) {
            console.error('Error mejorando imagen:', err);
            const reader = new FileReader();
            reader.onload = (e) => {
                if (type === 'selfie') {
                    setSelfieFile(file);
                    setSelfiePreview(e.target.result);
                } else {
                    setIneFile(file);
                    setInePreview(e.target.result);
                }
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVerify = async () => {
        if (faceEnabled && (!selfieFile || !ineFile)) {
            setError('Debes subir ambas fotos para continuar');
            return;
        }

        if (!faceEnabled && !ineFile) {
            setError('Debes subir tu documento de identidad');
            return;
        }

        setProcessing(true);
        setResult(null);
        setError(null);

        try {
            const formData = new FormData();

            if (faceEnabled) {
                if (selfiePreview) {
                    formData.append('selfie_data', selfiePreview);
                    console.log('📤 Usando selfie desde preview (base64)');
                } else {
                    console.log('📤 Convirtiendo selfie a base64...');
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(selfieFile);
                    });
                    const selfieBase64 = await base64Promise;
                    formData.append('selfie_data', selfieBase64);
                    console.log('✅ Selfie convertida a base64');
                }
                formData.append('ine', ineFile);
                console.log('🚀 Enviando verificación facial con Verify API (threshold 80%)...');
            } else {
                formData.append('document', ineFile);
                formData.append('document_type', 'ine');
                console.log('🚀 Enviando verificación de documento (solo OCR)...');
            }

            const endpoint = faceEnabled ? '/api/face-verify' : '/verification/document';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData
            });

            console.log('📡 Response status:', response.status);

            const text = await response.text();
            console.log('📄 Response text (primeros 500 caracteres):', text.substring(0, 500));

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                console.error('📄 Texto completo recibido:', text);
                throw new Error('La respuesta del servidor no es JSON válido. Verifica la consola para más detalles.');
            }

            console.log('✅ Data recibida:', data);

            setResult(data);

            if (data.success && onComplete) {
                setTimeout(() => {
                    onComplete(data);
                }, 3000);
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

    if (configLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600 dark:text-gray-300">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    // 🔥 RETURN SIN LAYOUT - SOLO CONTENIDO
    return (
        <>
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl flex items-start space-x-3 mb-6">
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

            <div className={`grid ${faceEnabled ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'} gap-8 mb-8`}>
                
                {faceEnabled && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-2xl">📸</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tu Selfie</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Toma una foto o sube una imagen</p>
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
                                    📸 Tomar foto
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
                                    📤 Subir foto
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
                                            filter: cameraActive ? 'brightness(1.1) contrast(1.05)' : 'brightness(0.3)'
                                        }}
                                    ></video>

                                    {cameraActive && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="relative">
                                                <div className="w-48 h-60 border-4 border-pink-500/60 rounded-full animate-pulse"></div>
                                                <div className="absolute inset-0 w-48 h-60 border-4 border-pink-400/30 rounded-full animate-ping"></div>
                                                
                                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                                                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                                                </div>
                                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                                                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                                                </div>
                                                
                                                <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-64 text-center">
                                                    <p className="text-white text-sm font-bold bg-pink-600/90 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
                                                        Centra tu rostro en el óvalo
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!cameraActive && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                                            <div className="text-center">
                                                <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                                    <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-white text-lg font-bold mb-2">Cámara desactivada</p>
                                                <p className="text-gray-300 text-sm">Presiona "Iniciar Cámara" para comenzar</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-4 px-4">
                                        {!cameraActive ? (
                                            <button
                                                onClick={startCamera}
                                                className="group relative bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transition-all hover:scale-105 flex items-center space-x-3"
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
                                                    className="group relative p-6 rounded-full shadow-2xl transition-all flex items-center justify-center bg-white hover:bg-gray-100 text-gray-900 hover:scale-110"
                                                    title="Capturar foto"
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
                                                    title="Detener cámara"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {cameraActive && (
                                        <>
                                            <div className="absolute top-4 left-4 flex items-center space-x-2 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm animate-fade-in">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                <span>EN VIVO</span>
                                            </div>
                                            <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm">
                                                HD • 1080p
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
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-red-600 dark:text-red-400">⚠️</span>
                                            <div className="text-xs">
                                                <p className="font-semibold text-red-800 dark:text-red-300">Threshold 80%</p>
                                                <p className="text-red-700 dark:text-red-400">Sin excepciones</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-start space-x-2">
                                            <span className="text-blue-600 dark:text-blue-400">🔐</span>
                                            <div className="text-xs">
                                                <p className="font-semibold text-blue-800 dark:text-blue-300">Verify API</p>
                                                <p className="text-blue-700 dark:text-blue-400">Verificación directa</p>
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
                                            JPG, PNG • Hasta 10MB
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
                                        title="Retomar foto"
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
                                    <span>Foto mejorada con IA</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🆔</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tu INE</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Documento oficial de identidad</p>
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
                                        Arrastra o haz clic para seleccionar
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                        JPG, PNG • Hasta 10MB
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative group">
                            <img
                                src={inePreview}
                                alt="INE"
                                className="w-full rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700"
                            />
                            <div className="absolute top-3 right-3">
                                <button
                                    onClick={() => {
                                        setIneFile(null);
                                        setInePreview(null);
                                        setResult(null);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105"
                                    title="Eliminar"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            <div className="absolute bottom-3 left-3 bg-emerald-500/90 text-white px-3 py-1.5 rounded-lg text-sm font-bold backdrop-blur-sm flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>INE mejorada</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center space-x-2">
                            <span>💡</span>
                            <span>Consejos para mejor resultado</span>
                        </h3>
                        <ul className="space-y-1.5 text-sm text-yellow-700 dark:text-yellow-400">
                            <li className="flex items-start space-x-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>Usa buena iluminación (luz natural preferible)</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>Asegúrate de que todo el documento sea visible</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>Evita reflejos y sombras en la foto</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>La foto debe estar enfocada y nítida</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {ineFile && !result && (faceEnabled ? selfieFile : true) && (
                <button
                    onClick={handleVerify}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] flex items-center justify-center space-x-3 mt-8"
                >
                    {processing ? (
                        <>
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-lg">
                                {faceEnabled ? 'Verificando con threshold 80%...' : 'Verificando documento...'}
                            </span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-lg">
                                {faceEnabled ? '🔐 Verificar (Threshold 80%)' : '✅ Verificar Documento'}
                            </span>
                        </>
                    )}
                </button>
            )}

            {result && (
                <div className={`mt-8 p-8 rounded-2xl border-2 shadow-2xl ${
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
                                ✅ {faceEnabled ? '¡Rostros Verificados!' : '¡Documento Verificado!'}
                            </h3>
                            <p className="text-lg text-green-700 dark:text-green-400 mb-6">
                                {result.message}
                            </p>

                            {faceEnabled && result.similarity_percentage && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Similitud</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {result.similarity_percentage}%
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Threshold</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {result.threshold_used}%
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Confianza</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 capitalize">
                                            {result.confidence_level}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!faceEnabled && result.data && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {result.data.confidence !== undefined && (
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Confianza OCR</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {Math.round(result.data.confidence)}%
                                            </p>
                                        </div>
                                    )}
                                    {result.data.critical_elements_found !== undefined && (
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Elementos</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {result.data.critical_elements_found}
                                            </p>
                                        </div>
                                    )}
                                    {result.data.quality_score !== undefined && (
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Calidad</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {Math.round(result.data.quality_score)}%
                                            </p>
                                        </div>
                                    )}
                                    {result.data.patterns_detected !== undefined && (
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Patrones</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {result.data.patterns_detected}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                                    {faceEnabled 
                                        ? '🔐 Algoritmo: Verify API con threshold estricto de 80%'
                                        : '✅ Verificación completada con todas las validaciones'
                                    }
                                </p>
                                {faceEnabled && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        Sin ajustes por lentes o iluminación
                                    </p>
                                )}
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
                                ❌ Verificación Fallida
                            </h3>
                            <p className="text-lg text-red-700 dark:text-red-400 mb-6">
                                {result.error || result.message}
                            </p>
                            
                            {result.similarity_percentage && (
                                <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 inline-block">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Similitud detectada</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                        {result.similarity_percentage}%
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        (Requerido: {result.threshold_used || 80}%+)
                                    </p>
                                </div>
                            )}

                            {result.code && (
                                <div className="mb-4 inline-block bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg">
                                    <p className="text-sm font-mono text-red-700 dark:text-red-400">
                                        Código: {result.code}
                                    </p>
                                </div>
                            )}

                            {result.suggestions && result.suggestions.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-red-200 dark:border-red-800 text-left">
                                    <p className="font-bold text-red-800 dark:text-red-300 mb-3 flex items-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Sugerencias para mejorar:</span>
                                    </p>
                                    <ul className="space-y-2 text-red-700 dark:text-red-400">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i} className="flex items-start space-x-2">
                                                <span className="text-red-500 mt-1">•</span>
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.detailed_reasons && result.detailed_reasons.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-red-200 dark:border-red-800 text-left mt-4">
                                    <p className="font-bold text-red-800 dark:text-red-300 mb-3">
                                        📋 Razones detalladas:
                                    </p>
                                    <ul className="space-y-2 text-red-700 dark:text-red-400 text-sm">
                                        {result.detailed_reasons.map((reason, i) => (
                                            <li key={i} className="flex items-start space-x-2">
                                                <span className="text-red-500 mt-1">•</span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default TestOCR;