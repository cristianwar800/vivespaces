import React, { useState, useRef, useCallback, useEffect } from 'react';

// --- Configuración de Documentos CORREGIDA ---
const DOCUMENT_TYPES = {
    identity: {
        name: 'Documento de Identidad',
        icon: '🆔',
        description: 'INE o Pasaporte Mexicano (elige uno)',
        formats: ['JPG', 'PNG', 'WEBP'],
        maxSize: '10MB',
        color: 'emerald',
        required: true,
        options: [
            { value: 'ine', label: 'Credencial INE', icon: '🆔' },
            { value: 'pasaporte', label: 'Pasaporte Mexicano', icon: '📘' }
        ]
    },
    comprobante: {
        name: 'Comprobante de Domicilio',
        icon: '🧾',
        description: 'Recibo de servicios (máx. 4 meses)',
        formats: ['JPG', 'PNG', 'PDF'],
        maxSize: '10MB',
        color: 'purple',
        required: false
    }
};

const DOCUMENT_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    VALIDATED: 'validated',
    REJECTED: 'rejected',
    ERROR: 'error'
};

// --- Componentes de UI ---
const Icon = ({ path, className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
    </svg>
);

const Header = () => (
    <div className="text-center mb-12">
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-purple-500 to-indigo-500 rounded-full animate-pulse shadow-xl blur-lg"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" className="w-8 h-8 text-white" />
            </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Verificación de Documentos
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Sistema de validación inteligente para documentos oficiales con tecnología OCR avanzada
        </p>
    </div>
);

const DocumentCard = ({
    type,
    config,
    status,
    file,
    result,
    selectedDocumentType,
    onFileSelect,
    onProcess,
    onRemove,
    onDocumentTypeChange,
    processing
}) => {
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(null);

    const colorClasses = {
        emerald: {
            bg: 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20',
            border: 'border-emerald-200 dark:border-emerald-700',
            button: 'bg-emerald-600 hover:bg-emerald-700',
            icon: 'bg-emerald-500',
            text: 'text-emerald-700 dark:text-emerald-300'
        },
        purple: {
            bg: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
            border: 'border-purple-200 dark:border-purple-700',
            button: 'bg-purple-600 hover:bg-purple-700',
            icon: 'bg-purple-500',
            text: 'text-purple-700 dark:text-purple-300'
        }
    };

    const colors = colorClasses[config.color];

    const handleFileSelect = useCallback((selectedFile) => {
        if (!selectedFile) return;

        // Para documentos de identidad, verificar que se haya seleccionado el tipo
        if (type === 'identity' && !selectedDocumentType) {
            alert('Por favor selecciona si vas a subir INE o Pasaporte antes de continuar');
            return;
        }

        // Validación de tipos de archivo
        const isValidType = selectedFile.type.startsWith('image/') ||
                           selectedFile.type === 'application/pdf' ||
                           config.formats.some(format =>
                               selectedFile.name.toLowerCase().endsWith('.' + format.toLowerCase())
                           );

        if (!isValidType) {
            alert(`Formato no soportado. Usa: ${config.formats.join(', ')}`);
            return;
        }

        // Validación de tamaño
        const maxSizeBytes = 10 * 1024 * 1024; // 10MB
        const minSizeBytes = 1024; // 1KB mínimo

        if (selectedFile.size > maxSizeBytes) {
            alert(`El archivo es demasiado grande. Máximo ${config.maxSize}.`);
            return;
        }

        if (selectedFile.size < minSizeBytes) {
            if (confirm('El archivo parece muy pequeño. ¿Estás seguro de que es un documento válido?')) {
                // Continuar
            } else {
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);

        onFileSelect(type, selectedFile);
    }, [config.maxSize, config.formats, onFileSelect, type, selectedDocumentType]);

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

    const getStatusDisplay = () => {
        switch (status) {
            case DOCUMENT_STATUS.PENDING:
                return { icon: '⏳', text: 'Pendiente', color: 'text-gray-500' };
            case DOCUMENT_STATUS.UPLOADING:
                return { icon: '📤', text: 'Subiendo...', color: 'text-blue-500' };
            case DOCUMENT_STATUS.PROCESSING:
                return { icon: '🔄', text: 'Procesando...', color: 'text-yellow-500' };
            case DOCUMENT_STATUS.VALIDATED:
                return { icon: '✅', text: 'Validado', color: 'text-green-500' };
            case DOCUMENT_STATUS.REJECTED:
                return { icon: '❌', text: 'Rechazado', color: 'text-red-500' };
            case DOCUMENT_STATUS.ERROR:
                return { icon: '⚠️', text: 'Error', color: 'text-red-500' };
            default:
                return { icon: '⏳', text: 'Pendiente', color: 'text-gray-500' };
        }
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className={`bg-gradient-to-br ${colors.bg} rounded-xl border-2 ${colors.border} p-6 transition-all duration-300 hover:shadow-lg`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center shadow-sm`}>
                        <span className="text-2xl">{config.icon}</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {config.name}
                            {config.required && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{config.description}</p>
                    </div>
                </div>
                <div className={`flex items-center space-x-2 ${statusDisplay.color} font-medium`}>
                    <span>{statusDisplay.icon}</span>
                    <span className="text-sm">{statusDisplay.text}</span>
                </div>
            </div>

            {/* Selector de tipo de documento (solo para identidad) */}
            {type === 'identity' && !file && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tipo de documento de identidad:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {config.options.map(option => (
                            <button
                                key={option.value}
                                onClick={() => onDocumentTypeChange(option.value)}
                                className={`p-3 border-2 rounded-lg text-center transition-all ${
                                    selectedDocumentType === option.value
                                        ? `${colors.border} ${colors.bg} border-solid`
                                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                                }`}
                            >
                                <div className="text-2xl mb-1">{option.icon}</div>
                                <div className="text-sm font-medium">{option.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tipo seleccionado (cuando ya hay archivo) */}
            {type === 'identity' && file && selectedDocumentType && (
                <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                        <span className="text-xl">
                            {config.options.find(opt => opt.value === selectedDocumentType)?.icon}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {config.options.find(opt => opt.value === selectedDocumentType)?.label}
                        </span>
                        <button
                            onClick={() => {
                                onDocumentTypeChange(null);
                                onRemove(type);
                            }}
                            className="ml-auto text-gray-400 hover:text-red-500 p-1"
                        >
                            <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {!file ? (
                // Upload Area
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                        dragActive
                            ? `${colors.border} bg-white/50 dark:bg-gray-800/50 scale-105`
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    } ${type === 'identity' && !selectedDocumentType ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (type === 'identity' && !selectedDocumentType) {
                            alert('Selecciona primero el tipo de documento (INE o Pasaporte)');
                            return;
                        }
                        fileInputRef.current?.click();
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                        className="hidden"
                    />
                    <div className="space-y-3">
                        <div className={`w-16 h-16 ${colors.icon} rounded-full flex items-center justify-center mx-auto shadow-sm`}>
                            <Icon path="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {dragActive ? 'Suelta el archivo aquí' :
                                 type === 'identity' && !selectedDocumentType ? 'Selecciona tipo primero' :
                                 'Subir documento'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {config.formats.join(', ')} • Hasta {config.maxSize}
                            </p>
                            {type === 'identity' && selectedDocumentType && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    {config.options.find(opt => opt.value === selectedDocumentType)?.label} seleccionado
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // File Preview & Actions
                <div className="space-y-4">
                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 ${colors.icon} rounded-lg flex items-center justify-center`}>
                                <Icon path="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title={file.name}>
                                    {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onRemove(type)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Icon path="M6 18L18 6M6 6l12 12" className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="relative">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full max-h-48 object-contain bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                        </div>
                    )}

                    {/* Processing Indicator */}
                    {status === DOCUMENT_STATUS.PROCESSING && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <div className="flex items-center space-x-3">
                                <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                                    Analizando documento...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className={`p-4 rounded-lg border ${
                            result.success
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                        }`}>
                            {result.success ? (
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Icon path="M5 13l4 4L19 7" className="w-5 h-5 text-green-600" />
                                        <span className="font-semibold text-green-700 dark:text-green-300">
                                            Documento validado
                                        </span>
                                    </div>
                                    <p className="text-sm text-green-600 dark:text-green-400">
                                        Confianza: {result.data?.confidence || 0}%
                                    </p>
                                    {result.data?.document_type && (
                                        <p className="text-xs text-green-500 mt-1">
                                            Tipo detectado: {result.data.document_type}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5 text-red-600" />
                                        <span className="font-semibold text-red-700 dark:text-red-300">
                                            Documento rechazado
                                        </span>
                                    </div>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {result.message || 'Error en la validación'}
                                    </p>
                                    {result.suggestions && result.suggestions.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-red-500 font-medium">Sugerencias:</p>
                                            <ul className="text-xs text-red-500 mt-1 space-y-1">
                                                {result.suggestions.map((suggestion, index) => (
                                                    <li key={index}>• {suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        {status === DOCUMENT_STATUS.PENDING && (
                            <button
                                onClick={() => onProcess(type)}
                                disabled={processing}
                                className={`flex-1 ${colors.button} text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                            >
                                <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-4 h-4" />
                                <span>Validar documento</span>
                            </button>
                        )}

                        {(status === DOCUMENT_STATUS.REJECTED || status === DOCUMENT_STATUS.ERROR) && (
                            <button
                                onClick={() => onProcess(type)}
                                disabled={processing}
                                className={`flex-1 ${colors.button} text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                            >
                                <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4" />
                                <span>Reintentar</span>
                            </button>
                        )}

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cambiar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProgressOverview = ({ documentStates, selectedDocumentType }) => {
    const totalRequired = 1; // Solo necesitamos identidad (INE o Pasaporte)
    const hasIdentity = documentStates.identity.status === DOCUMENT_STATUS.VALIDATED;
    const hasComprobante = documentStates.comprobante.status === DOCUMENT_STATUS.VALIDATED;

    const validatedCount = (hasIdentity ? 1 : 0) + (hasComprobante ? 1 : 0);
    const processingCount = Object.values(documentStates).filter(state => state.status === DOCUMENT_STATUS.PROCESSING).length;
    const uploadedCount = Object.values(documentStates).filter(state => state.file).length;

    const progress = hasIdentity ? 100 : 0; // Solo necesitamos identidad
    const canComplete = hasIdentity;

    return (
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Progreso de Verificación
                </h2>
                <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                        {hasIdentity ? 'Listo' : 'Pendiente'}
                    </span>
                    <span className={`font-semibold ${canComplete ? 'text-green-600' : 'text-orange-600'}`}>
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                <div
                    className="h-3 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uploadedCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Subidos</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{processingCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Procesando</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{validatedCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Validados</div>
                </div>
            </div>

            {/* Estado actual */}
            {!hasIdentity ? (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div className="flex items-center space-x-3">
                        <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6 text-orange-600" />
                        <div>
                            <p className="font-semibold text-orange-700 dark:text-orange-300">
                                Documento de identidad requerido
                            </p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Sube y valida tu INE o Pasaporte para continuar
                                {selectedDocumentType && ` (${selectedDocumentType.toUpperCase()} seleccionado)`}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center space-x-3">
                        <Icon path="M5 13l4 4L19 7" className="w-6 h-6 text-green-600" />
                        <div>
                            <p className="font-semibold text-green-700 dark:text-green-300">
                                Verificación lista para completar
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400">
                                Ya puedes completar el proceso de verificación
                                {hasComprobante && ' (incluye comprobante de domicilio)'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CompletionModal = ({ isOpen, onClose, onComplete, documentStates, selectedDocumentType }) => {
    if (!isOpen) return null;

    const hasIdentity = documentStates.identity.status === DOCUMENT_STATUS.VALIDATED;
    const hasComprobante = documentStates.comprobante.status === DOCUMENT_STATUS.VALIDATED;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon path="M5 13l4 4L19 7" className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Completar Verificación
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Documentos validados exitosamente
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {hasIdentity && (
                        <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-2xl">
                                {selectedDocumentType === 'ine' ? '🆔' : '📘'}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {selectedDocumentType === 'ine' ? 'Credencial INE' : 'Pasaporte Mexicano'}
                            </span>
                            <Icon path="M5 13l4 4L19 7" className="w-5 h-5 text-green-600 ml-auto" />
                        </div>
                    )}
                    {hasComprobante && (
                        <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-2xl">🧾</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                Comprobante de Domicilio
                            </span>
                            <Icon path="M5 13l4 4L19 7" className="w-5 h-5 text-green-600 ml-auto" />
                        </div>
                    )}
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onComplete}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-semibold"
                    >
                        Completar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
function EnhancedDocumentVerification() {
    const [documentStates, setDocumentStates] = useState(() => {
        const initialStates = {};
        Object.keys(DOCUMENT_TYPES).forEach(type => {
            initialStates[type] = {
                file: null,
                status: DOCUMENT_STATUS.PENDING,
                result: null,
                processing: false
            };
        });
        return initialStates;
    });

    const [selectedDocumentType, setSelectedDocumentType] = useState(null); // 'ine' o 'pasaporte'
    const [globalProcessing, setGlobalProcessing] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);

    const updateDocumentState = (type, updates) => {
        setDocumentStates(prev => ({
            ...prev,
            [type]: { ...prev[type], ...updates }
        }));
    };

    const handleFileSelect = (type, file) => {
        updateDocumentState(type, {
            file,
            status: DOCUMENT_STATUS.PENDING,
            result: null
        });
    };

    const handleRemoveFile = (type) => {
        updateDocumentState(type, {
            file: null,
            status: DOCUMENT_STATUS.PENDING,
            result: null
        });

        // Si es documento de identidad, limpiar también el tipo seleccionado
        if (type === 'identity') {
            setSelectedDocumentType(null);
        }
    };

    const handleDocumentTypeChange = (docType) => {
        setSelectedDocumentType(docType);
        // Si ya había un archivo, limpiarlo porque cambió el tipo
        if (documentStates.identity.file) {
            updateDocumentState('identity', {
                file: null,
                status: DOCUMENT_STATUS.PENDING,
                result: null
            });
        }
    };

    const handleProcessDocument = async (type) => {
        const documentState = documentStates[type];
        if (!documentState.file) return;

        // Para documentos de identidad, verificar que se haya seleccionado el tipo
        if (type === 'identity' && !selectedDocumentType) {
            alert('Error: No se ha seleccionado el tipo de documento de identidad');
            return;
        }

        setGlobalProcessing(true);
        updateDocumentState(type, {
            status: DOCUMENT_STATUS.PROCESSING,
            processing: true
        });

        try {
            const formData = new FormData();
            formData.append('document', documentState.file);

            // Para identidad, usar el tipo específico seleccionado (ine o pasaporte)
            const documentTypeForAPI = type === 'identity' ? selectedDocumentType : type;
            formData.append('document_type', documentTypeForAPI);

            const response = await fetch('/verification/document', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: formData
            });

            let result;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const textResponse = await response.text();
                console.error('Respuesta no JSON del servidor:', textResponse);

                result = {
                    success: false,
                    message: 'Error del servidor. La respuesta no es válida.',
                    error: 'INVALID_SERVER_RESPONSE'
                };
            }

            updateDocumentState(type, {
                status: result.success ? DOCUMENT_STATUS.VALIDATED : DOCUMENT_STATUS.REJECTED,
                result,
                processing: false
            });

        } catch (error) {
            console.error('Error procesando documento:', error);
            updateDocumentState(type, {
                status: DOCUMENT_STATUS.ERROR,
                result: {
                    success: false,
                    message: 'Error de conexión: ' + error.message,
                    suggestions: [
                        'Verifica tu conexión a internet',
                        'Intenta nuevamente en unos momentos',
                        'Si el problema persiste, contacta soporte'
                    ]
                },
                processing: false
            });
        } finally {
            setGlobalProcessing(false);
        }
    };

    const handleCompleteVerification = async () => {
        const hasIdentity = documentStates.identity.status === DOCUMENT_STATUS.VALIDATED;
        const hasComprobante = documentStates.comprobante.status === DOCUMENT_STATUS.VALIDATED;

        if (!hasIdentity) {
            alert('Error: Necesitas validar un documento de identidad primero');
            return;
        }

        try {
            const formData = new FormData();

            // Agregar documento de identidad con el nombre correcto
            if (selectedDocumentType === 'ine') {
                formData.append('ine_document', documentStates.identity.file);
            } else if (selectedDocumentType === 'pasaporte') {
                formData.append('passport_document', documentStates.identity.file);
            }

            // Agregar comprobante si existe
            if (hasComprobante) {
                formData.append('address_proof', documentStates.comprobante.file);
            }

            // Nota: La selfie sería requerida según tu backend, por ahora omitida
            // formData.append('selfie', selfieFile);

            const response = await fetch('/verification/complete', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('¡Verificación completada exitosamente!');
                // Redirect o actualizar UI
                window.location.href = '/dashboard';
            } else {
                alert('Error en la verificación completa: ' + result.message);
            }

        } catch (error) {
            alert('Error de conexión: ' + error.message);
        } finally {
            setShowCompletionModal(false);
        }
    };

    const hasValidatedIdentity = documentStates.identity.status === DOCUMENT_STATUS.VALIDATED;
    const canComplete = hasValidatedIdentity;

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-indigo-900/20 pt-20 pb-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <Header />

                <ProgressOverview
                    documentStates={documentStates}
                    selectedDocumentType={selectedDocumentType}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {Object.entries(DOCUMENT_TYPES).map(([type, config]) => (
                        <DocumentCard
                            key={type}
                            type={type}
                            config={config}
                            status={documentStates[type].status}
                            file={documentStates[type].file}
                            result={documentStates[type].result}
                            selectedDocumentType={type === 'identity' ? selectedDocumentType : null}
                            onFileSelect={handleFileSelect}
                            onProcess={handleProcessDocument}
                            onRemove={handleRemoveFile}
                            onDocumentTypeChange={type === 'identity' ? handleDocumentTypeChange : null}
                            processing={documentStates[type].processing || globalProcessing}
                        />
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <button
                        onClick={() => setShowCompletionModal(true)}
                        disabled={!canComplete || globalProcessing}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-green-500/30 transform hover:scale-105 active:scale-100 disabled:transform-none"
                    >
                        <Icon path="M5 13l4 4L19 7" className="w-5 h-5" />
                        <span>Completar Verificación</span>
                        {hasValidatedIdentity && (
                            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                                {selectedDocumentType?.toUpperCase()} validado
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            Object.keys(documentStates).forEach(type => {
                                if (documentStates[type].status === DOCUMENT_STATUS.REJECTED ||
                                    documentStates[type].status === DOCUMENT_STATUS.ERROR) {
                                    handleProcessDocument(type);
                                }
                            });
                        }}
                        disabled={globalProcessing || !Object.values(documentStates).some(state =>
                            state.status === DOCUMENT_STATUS.REJECTED || state.status === DOCUMENT_STATUS.ERROR
                        )}
                        className="px-6 py-4 border-2 border-orange-400 dark:border-orange-500 text-orange-600 dark:text-orange-400 font-bold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-5 h-5" />
                        <span>Reintentar Rechazados</span>
                    </button>
                </div>

                {/* Instructions Panel - ACTUALIZADO */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 mr-2" />
                        Instrucciones de Verificación
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Documentos Requeridos</h4>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li className="flex items-center space-x-2">
                                    <span className="text-red-500">•</span>
                                    <span><strong>Documento de Identidad:</strong> INE o Pasaporte (obligatorio - elige uno)</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-purple-500">•</span>
                                    <span><strong>Comprobante:</strong> Servicios max. 4 meses (opcional)</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">•</span>
                                    <span>Solo necesitas UN documento de identidad, no ambos</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Proceso Simplificado</h4>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li className="flex items-center space-x-2">
                                    <span className="text-blue-500">1.</span>
                                    <span>Selecciona INE o Pasaporte</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-blue-500">2.</span>
                                    <span>Sube la foto del documento</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-blue-500">3.</span>
                                    <span>Valida el documento</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <span className="text-green-500">4.</span>
                                    <span>¡Completa la verificación!</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-start space-x-3">
                            <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                    Política de Privacidad
                                </p>
                                <p className="text-blue-700 dark:text-blue-300">
                                    Todos los documentos son procesados únicamente en memoria para verificación.
                                    No se almacenan datos personales. El proceso es completamente seguro y confidencial.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Completion Modal */}
                <CompletionModal
                    isOpen={showCompletionModal}
                    onClose={() => setShowCompletionModal(false)}
                    onComplete={handleCompleteVerification}
                    documentStates={documentStates}
                    selectedDocumentType={selectedDocumentType}
                />

                {/* Debug Panel (desarrollo) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">
                            Debug - Estado de Documentos
                        </h4>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                            {JSON.stringify({
                                documentStates,
                                selectedDocumentType,
                                canComplete
                            }, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EnhancedDocumentVerification;
