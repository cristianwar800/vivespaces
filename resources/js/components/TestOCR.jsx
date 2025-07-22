import React, { useState, useRef, useCallback } from 'react';

function TestOCR() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileSelect = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            // Validar tamaño (5MB máximo)
            if (file.size > 5 * 1024 * 1024) {
                alert('El archivo es demasiado grande. Máximo 5MB.');
                return;
            }

            setSelectedFile(file);
            setResult(null);
            setUploadProgress(0);
        } else {
            alert('Por favor selecciona una imagen válida.');
        }
    }, []);

    const handleInputChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    // Drag and drop handlers
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
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    const removeFile = () => {
        setSelectedFile(null);
        setResult(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const testOCR = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setResult(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            // Simular progreso de upload
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + Math.random() * 20;
                });
            }, 100);

            const response = await fetch('/test-ocr', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: formData
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            const data = await response.json();
            setResult(data);

        } catch (error) {
            setResult({
                success: false,
                error: 'Error de conexión: ' + error.message
            });
        } finally {
            setIsProcessing(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-6 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
                        🧪 Prueba de OCR
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Sube una imagen de INE para probar la detección automática con tecnología avanzada
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200 dark:border-gray-700">
                    {!selectedFile ? (
                        // Upload Area
                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 ${
                                dragActive
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-105'
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            <div className="space-y-6">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>

                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {dragActive ? '¡Suelta la imagen aquí!' : 'Arrastra tu INE aquí'}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        o <span className="text-emerald-600 dark:text-emerald-400 font-medium">haz clic para seleccionar</span>
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">JPG</span>
                                        <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">PNG</span>
                                        <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">Máx. 5MB</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // File Preview
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{selectedFile.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={removeFile}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Image Preview */}
                            <div className="relative group">
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="Preview"
                                    className="w-full max-h-80 object-contain bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
                            </div>

                            {/* Progress Bar */}
                            {isProcessing && uploadProgress > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span>Procesando imagen...</span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={testOCR}
                                    disabled={isProcessing}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Analizando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <span>Analizar con OCR</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                    Cambiar imagen
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {result && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                            <svg className="w-6 h-6 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z" />
                            </svg>
                            Resultados del OCR
                        </h3>

                        {result.success && result.data?.success ? (
                            <div className="space-y-6">
                                {/* Status Card */}
                                <div className={`p-6 rounded-2xl border-2 ${
                                    result.data.validation.is_valid
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}>
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                            result.data.validation.is_valid
                                                ? 'bg-emerald-500'
                                                : 'bg-red-500'
                                        }`}>
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                    d={result.data.validation.is_valid
                                                        ? "M5 13l4 4L19 7"
                                                        : "M6 18L18 6M6 6l12 12"
                                                    }
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 className={`text-lg font-semibold ${
                                                result.data.validation.is_valid
                                                    ? 'text-emerald-800 dark:text-emerald-200'
                                                    : 'text-red-800 dark:text-red-200'
                                            }`}>
                                                {result.data.validation.is_valid ? '✅ INE válida detectada' : '❌ No se detectó una INE válida'}
                                            </h4>
                                            <p className={`text-sm ${
                                                result.data.validation.is_valid
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-red-600 dark:text-red-400'
                                            }`}>
                                                Confianza: {result.data.validation.confidence}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {result.data.validation.extracted_name && (
                                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Nombre extraído</h5>
                                            <p className="text-gray-600 dark:text-gray-400">{result.data.validation.extracted_name}</p>
                                        </div>
                                    )}

                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Patrones encontrados</h5>
                                        <p className="text-gray-600 dark:text-gray-400">{result.data.validation.patterns.length} patrones</p>
                                    </div>
                                </div>

                                {/* Patterns */}
                                {result.data.validation.patterns.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Patrones detectados:</h4>
                                        <div className="space-y-2">
                                            {result.data.validation.patterns.map((pattern, index) => (
                                                <div key={index} className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                    <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center mr-3">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-blue-800 dark:text-blue-200 font-mono text-sm">{pattern}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Full Text */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Texto completo extraído:</h4>
                                    <div className="bg-gray-900 dark:bg-gray-800 p-4 rounded-xl border">
                                        <pre className="text-green-400 text-sm whitespace-pre-wrap overflow-auto max-h-64 font-mono">
                                            {result.data.text}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Error en OCR</h4>
                                        <p className="text-red-600 dark:text-red-400">
                                            {result.data?.error || result.error || 'Error desconocido'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TestOCR;
