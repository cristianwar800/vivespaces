import React, { useState, useRef } from 'react';

function DocumentStep({ type = 'comprobante', onComplete, onBack, previousResult }) {
    const [isAlreadyValidated, setIsAlreadyValidated] = useState(false);
    const [showValidatedScreen, setShowValidatedScreen] = useState(true);
    
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // 🔥 Detectar validación previa
    React.useEffect(() => {
        console.log('🔍 Verificando previousResult para tipo:', type, previousResult);
        
        if (previousResult) {
            // Verificar si tiene datos de validación de documento
            const hasDocValidation = previousResult.document_validation || previousResult.confidence;
            const hasSuccess = previousResult.success === true;
            
            if (hasSuccess && hasDocValidation) {
                console.log(`✅ Paso de ${type} ya fue validado previamente:`, previousResult);
                setIsAlreadyValidated(true);
                setResult(previousResult);
                setShowValidatedScreen(true);
            } else {
                console.log(`ℹ️ previousResult existe pero no está completo para ${type}:`, previousResult);
            }
        } else {
            console.log(`ℹ️ No hay previousResult para ${type}`);
        }
    }, [previousResult, type]);

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;

        const maxSize = 10 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
            setError('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Tipo de archivo no válido. Solo JPG, PNG o PDF.');
            return;
        }

        setFile(selectedFile);
        setError(null);

        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target.result);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(null);
        }

        console.log('✅ Archivo seleccionado:', selectedFile.name);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        handleFileSelect(droppedFile);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Por favor selecciona un archivo primero');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('document', file);

            console.log(`🚀 Validando ${type}...`);

            const response = await fetch('/verification/validate-document', {
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
            console.log('📄 Response (primeros 500 caracteres):', text.substring(0, 500));

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                console.error('📄 Texto completo recibido:', text);
                throw new Error('La respuesta del servidor no es JSON válido');
            }

            console.log('✅ Data recibida:', data);

            setResult(data);

            // 🔥 FIX: Llamar a onComplete automáticamente si es exitoso
            if (data.success) {
                console.log(`✅ ${type} validado exitosamente - Notificando al padre automáticamente`);
                
                // 🔥 Pequeño delay para asegurar que el estado se actualice
                setTimeout(() => {
                    if (onComplete) {
                        console.log(`📤 Ejecutando onComplete para ${type}`);
                        onComplete(data);
                    }
                }, 100);
            }

        } catch (error) {
            console.error('❌ Error:', error);
            setError(error.message || 'Error de conexión. Intenta nuevamente.');
            setResult({
                success: false,
                error: error.message || 'Error de conexión'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleEditValidation = () => {
        console.log(`✏️ Usuario quiere editar/revalidar ${type}`);
        setShowValidatedScreen(false);
    };

    // 🔥 PANTALLA DE VALIDACIÓN PREVIA
    if (isAlreadyValidated && showValidatedScreen && result) {
        // 🔥 Extraer datos de manera flexible
        const docValidation = result.document_validation || {};
        const confidence = docValidation.confidence_percentage || result.confidence || 0;
        const detailedInfo = result.detailed_info || [];
        
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
                            ✅ {type === 'comprobante' ? 'Paso 2 Completado' : 'Documento Validado'}
                        </h3>
                        <p className="text-lg text-green-700 dark:text-green-400 mb-6">
                            Tu {type === 'comprobante' ? 'comprobante de domicilio' : 'documento'} ya fue verificado exitosamente
                        </p>

                        {confidence > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg mb-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Confianza de Verificación</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                    {confidence}%
                                </p>
                            </div>
                        )}

                        {detailedInfo.length > 0 && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center justify-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Información Verificada</span>
                                </p>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded border border-blue-100 dark:border-blue-700">
                                    <div className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                                        {detailedInfo.map((info, i) => (
                                            <div key={i} className="flex items-center space-x-2">
                                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>{info}</span>
                                            </div>
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
                                ℹ️ Ya completaste este paso exitosamente. Scroll hacia abajo para ver el botón de finalizar o revalida tu información si lo deseas.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    if (result && onComplete) {
                                        console.log(`➡️ Usuario confirmó continuar desde ${type}`);
                                        onComplete(result);
                                        
                                        // Scroll al final para ver pantalla de finalización
                                        setTimeout(() => {
                                            window.scrollTo({ 
                                                top: document.documentElement.scrollHeight, 
                                                behavior: 'smooth' 
                                            });
                                        }, 300);
                                    }
                                }}
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-3"
                            >
                                <span className="text-lg">Ver Pantalla de Finalización</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <button
                                onClick={handleEditValidation}
                                className="sm:flex-none bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Revalidar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 🔥 INTERFAZ NORMAL
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
                    <span className="font-semibold">Regresar al paso anterior</span>
                </button>
            )}

            {isAlreadyValidated && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 px-6 py-4 rounded-xl flex items-start space-x-3">
                    <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                        <p className="font-semibold mb-1">✅ Este paso ya fue completado anteriormente</p>
                        <p className="text-sm">Puedes revalidar tu {type} o simplemente finalizar el proceso.</p>
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

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl">📄</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {type === 'comprobante' ? 'Comprobante de Domicilio' : 'Documento'}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {type === 'comprobante' ? 'Sube tu comprobante (recibo de luz, agua, etc.)' : 'Sube tu documento oficial'}
                        </p>
                    </div>
                </div>

                {!file ? (
                    <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl p-16 text-center cursor-pointer transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                            className="hidden"
                        />
                        <div className="space-y-4">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Sube tu {type === 'comprobante' ? 'Comprobante de Domicilio' : 'Documento'}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Haz clic aquí o arrastra tu archivo
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                                    JPG, PNG, PDF • Máximo 10MB
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative group">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full max-h-96 object-contain rounded-2xl shadow-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                />
                            ) : (
                                <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                    <div className="text-center">
                                        <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-lg font-bold text-gray-700 dark:text-gray-300">Archivo PDF</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{file.name}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="absolute top-3 right-3">
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setPreview(null);
                                        setResult(null);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl shadow-lg transition-all hover:scale-105"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            {!result && (
                                <div className="absolute bottom-3 left-3 bg-blue-500/90 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm flex items-center space-x-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Archivo listo</span>
                                </div>
                            )}
                        </div>

                        {!result && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Archivo seleccionado</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-400 break-all">{file.name}</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!result && (
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-5 px-8 rounded-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] flex items-center justify-center space-x-3"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-lg">Validando documento...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-lg">✅ Validar {type === 'comprobante' ? 'Comprobante' : 'Documento'}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {!result && type === 'comprobante' && (
                    <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Consejos para una mejor captura:</span>
                        </h3>
                        <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-400">
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
                                <span>Evita reflejos en la foto</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>La foto debe estar enfocada y nítida</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-yellow-500 mt-0.5">•</span>
                                <span>El comprobante debe tener máximo 4 meses de antigüedad</span>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* 🔥 RESULTADOS DE VALIDACIÓN */}
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
                                ✅ {type === 'comprobante' ? 'Comprobante Verificado' : 'Documento Verificado'}
                            </h3>
                            <p className="text-lg text-green-700 dark:text-green-400 mb-6">
                                {result.message || `Tu ${type} ha sido validado exitosamente`}
                            </p>

                            {result.document_validation && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-800 shadow-lg mb-6">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Confianza de Validación</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {result.document_validation.confidence_percentage}%
                                    </p>
                                </div>
                            )}

                            {result.detailed_info && result.detailed_info.length > 0 && (
                                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
                                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">📋 Información Detectada:</p>
                                    <div className="space-y-2">
                                        {result.detailed_info.map((info, i) => (
                                            <div key={i} className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-400">
                                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>{info}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    ℹ️ Validación completada. Scroll hacia abajo para ver el botón "Finalizar Verificación".
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
                                No se pudo validar
                            </h3>
                            <p className="text-lg text-red-700 dark:text-red-400 mb-6">
                                {result.error || 'Por favor, intenta con un documento más claro'}
                            </p>

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

                            <button
                                onClick={() => {
                                    setFile(null);
                                    setPreview(null);
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

export default DocumentStep;