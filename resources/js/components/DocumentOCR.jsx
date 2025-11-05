import React, { useState, useRef } from 'react';

function DocumentOCR({ type, onComplete }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    const getDocumentInfo = () => {
        switch(type) {
            case 'ine':
                return {
                    title: '🆔 Tu INE',
                    description: 'Credencial para votar vigente',
                    color: 'emerald',
                    bgGradient: 'from-emerald-500 to-green-600',
                    borderColor: 'border-emerald-400 dark:border-emerald-500',
                    hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
                    icon: (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                    )
                };
            case 'comprobante':
                return {
                    title: '📄 Comprobante de Domicilio',
                    description: 'Servicio reciente (máx. 4 meses)',
                    color: 'blue',
                    bgGradient: 'from-blue-500 to-cyan-600',
                    borderColor: 'border-blue-400 dark:border-blue-500',
                    hoverBg: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
                    icon: (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    )
                };
            default:
                return {
                    title: '📋 Documento',
                    description: 'Documento oficial',
                    color: 'gray',
                    bgGradient: 'from-gray-500 to-gray-600',
                    borderColor: 'border-gray-400 dark:border-gray-500',
                    hoverBg: 'hover:bg-gray-50/50 dark:hover:bg-gray-900/10',
                    icon: (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    )
                };
        }
    };

    const docInfo = getDocumentInfo();

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

    const preprocessImage = async (canvas) => {
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

        const targetBrightness = 180;
        const adjustment = targetBrightness - avgBrightness;

        if (Math.abs(adjustment) > 10) {
            console.log('💡 Ajustando brillo en:', adjustment.toFixed(2));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
            }
        }

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const factor = 1.3;
            data[i] = Math.min(255, avg + (data[i] - avg) * factor);
            data[i + 1] = Math.min(255, avg + (data[i + 1] - avg) * factor);
            data[i + 2] = Math.min(255, avg + (data[i + 2] - avg) * factor);
        }

        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        const tempData = new Uint8ClampedArray(data);
        const width = canvas.width;
        const height = canvas.height;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelIdx = (ky + 1) * 3 + (kx + 1);
                            sum += tempData[idx] * kernel[kernelIdx];
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    data[idx] = Math.min(255, Math.max(0, sum));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        console.log('✅ Preprocesamiento completado');
    };

    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return;

        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }

        try {
            console.log(`📸 Mejorando imagen de ${type}...`);
            const enhanced = await preprocessUploadedImage(selectedFile);
            setFile(enhanced.file);
            setPreview(enhanced.preview);
            setError(null);
            console.log(`✅ ${type} mejorada`);
        } catch (err) {
            console.error('Error mejorando imagen:', err);
            const reader = new FileReader();
            reader.onload = (e) => {
                setFile(selectedFile);
                setPreview(e.target.result);
                setError(null);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleVerify = async () => {
        if (!file) {
            setError('Debes subir un documento');
            return;
        }

        setProcessing(true);
        setResult(null);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('document_type', type);

            console.log(`🚀 Enviando ${type} para verificación OCR...`);

            const response = await fetch('/verification/document', {
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
            console.log('📄 Response text:', text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                throw new Error('La respuesta del servidor no es JSON válido.');
            }

            console.log('✅ Data recibida completa:', data);

            setResult(data);

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

    const handleRemove = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
    };

    const handleContinue = () => {
        if (onComplete && result) {
            console.log('➡️ Usuario presionó continuar, avanzando al siguiente paso');
            onComplete(result);
        }
    };

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

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4 mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${docInfo.bgGradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        {docInfo.icon}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{docInfo.title}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{docInfo.description}</p>
                    </div>
                </div>

                {!preview ? (
                    <div 
                        className={`border-2 border-dashed ${docInfo.borderColor} ${docInfo.hoverBg} rounded-2xl p-12 text-center cursor-pointer transition-all min-h-[400px] flex items-center justify-center`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                            className="hidden"
                        />
                        <div className="space-y-4">
                            <div className={`w-20 h-20 bg-gradient-to-br ${docInfo.bgGradient} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Sube tu {docInfo.title.replace(/[🆔📄]/g, '').trim()}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Haz clic aquí o arrastra tu archivo
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <img 
                                src={preview} 
                                alt="Preview" 
                                className="w-full h-auto"
                            />
                            <button
                                onClick={handleRemove}
                                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                                Consejos para una mejor captura:
                            </p>
                            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-500 mt-0.5">•</span>
                                    <span>Usa buena iluminación sin sombras</span>
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
                                {type === 'comprobante' && (
                                    <li className="flex items-start space-x-2">
                                        <span className="text-yellow-500 mt-0.5">•</span>
                                        <span>El comprobante debe tener máximo 4 meses de antigüedad</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {file && !result && (
                <button
                    onClick={handleVerify}
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] flex items-center justify-center space-x-3 mt-8"
                >
                    {processing ? (
                        <>
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-lg">Verificando documento...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-lg">✅ Verificar Documento</span>
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
                        <div>
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-3">
                                    ✅ {result.message || 'Documento Verificado'}
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                    Código: {result.code}
                                </p>
                            </div>

                            {result.data && (
                                <div className="space-y-4">
                                    
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
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Elementos Clave</p>
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

                                    {result.data.validation_details && (
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-green-200 dark:border-green-800">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="font-bold text-gray-900 dark:text-white">📋 Validaciones Realizadas</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {result.data.validation_details.name_verified !== undefined && (
                                                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                        <span className={result.data.validation_details.name_verified ? 'text-green-600' : 'text-red-600'}>
                                                            {result.data.validation_details.name_verified ? '✓' : '✗'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Verificación de Nombre</p>
                                                            {result.data.validation_details.name_match_percentage !== null && (
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                    Coincidencia: {result.data.validation_details.name_match_percentage}%
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {result.data.validation_details.vigency_verified !== undefined && (
                                                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                        <span className={result.data.validation_details.vigency_verified ? 'text-green-600' : 'text-red-600'}>
                                                            {result.data.validation_details.vigency_verified ? '✓' : '✗'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Vigencia del Documento</p>
                                                            {result.data.validation_details.vigency_message && (
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                    {result.data.validation_details.vigency_message}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {result.data.validation_details.curp_valid !== undefined && (
                                                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                        <span className={result.data.validation_details.curp_valid ? 'text-green-600' : 'text-gray-400'}>
                                                            {result.data.validation_details.curp_valid ? '✓' : '—'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">CURP Válido</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {result.data.validation_details.state_detected && (
                                                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                        <span className="text-green-600">📍</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Estado Detectado</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                {result.data.validation_details.state_detected}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {result.data.validation_details.service_company && (
                                                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                        <span className="text-green-600">🏢</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Empresa de Servicio</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                {result.data.validation_details.service_company}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {result.data.extracted_text && (
                                        <details className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-green-200 dark:border-green-800 group">
                                            <summary className="cursor-pointer font-bold text-gray-900 dark:text-white flex items-center justify-between hover:text-green-600 transition-colors">
                                                <div className="flex items-center space-x-2">
                                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span>📄 Ver Texto Extraído por OCR</span>
                                                </div>
                                                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="mt-4">
                                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                        {result.data.extracted_text}
                                                    </p>
                                                </div>
                                                <div className="mt-3 flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Este es el texto exacto que detectó el sistema OCR en tu documento. Útil para verificar qué información se extrajo.</span>
                                                </div>
                                            </div>
                                        </details>
                                    )}

                                    <button
                                        onClick={handleContinue}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center space-x-3"
                                    >
                                        <span className="text-lg">Continuar con el siguiente paso</span>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {result.security_notice && (
                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start space-x-2">
                                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <p className="text-xs text-blue-700 dark:text-blue-400">
                                            {result.security_notice}
                                        </p>
                                    </div>
                                </div>
                            )}
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

                            {result.data && (
                                <div className="space-y-4 mb-6">
                                    {result.data.extracted_text && (
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-red-200 dark:border-red-800">
                                            <div className="flex items-center space-x-2 mb-3">
                                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="font-bold text-gray-900 dark:text-white">📄 Texto Detectado:</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                    {result.data.extracted_text}
                                                </p>
                                            </div>
                                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                                    ⚠️ El texto fue detectado pero no cumple con los requisitos mínimos de legibilidad.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {result.data.confidence !== undefined && (
                                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Confianza</p>
                                                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                                    {Math.round(result.data.confidence)}%
                                                </p>
                                            </div>
                                        )}
                                        {result.data.critical_elements_found !== undefined && (
                                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Elementos</p>
                                                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                                    {result.data.critical_elements_found}
                                                </p>
                                            </div>
                                        )}
                                        {result.data.quality_level && (
                                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Calidad</p>
                                                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                                                    {result.data.quality_level}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {result.suggestions && result.suggestions.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 text-left">
                                    <p className="font-bold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center space-x-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        <span>💡 Sugerencias:</span>
                                    </p>
                                    <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-400">
                                        {result.suggestions.map((suggestion, index) => (
                                            <li key={index} className="flex items-start space-x-2">
                                                <span className="text-yellow-500 mt-0.5">•</span>
                                                <span>{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={handleRemove}
                                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center space-x-3 mt-6"
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
        </>
    );
}

export default DocumentOCR;