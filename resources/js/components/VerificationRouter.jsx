import React, { useState, useEffect } from 'react';
import TestOCR from './TestOCR';
import DocumentOCR from './DocumentOCR';

function VerificationRouter() {
    const [faceEnabled, setFaceEnabled] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);

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
                        console.log('⚠️ Face ID deshabilitado - Solo verificación de documentos');
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

    const getTotalSteps = () => faceEnabled ? 3 : 2;

    const getStepTitle = (step) => {
        if (faceEnabled) {
            switch(step) {
                case 1: return '📸 Verificación Facial';
                case 2: return '🆔 Verificación de INE';
                case 3: return '📄 Comprobante de Domicilio';
                default: return '';
            }
        } else {
            switch(step) {
                case 1: return '🆔 Verificación de INE';
                case 2: return '📄 Comprobante de Domicilio';
                default: return '';
            }
        }
    };

    const getStepDescription = (step) => {
        if (faceEnabled) {
            switch(step) {
                case 1: return 'Captura tu rostro y documento oficial';
                case 2: return 'Verificación OCR de tu credencial para votar';
                case 3: return 'Documento que acredite tu domicilio actual';
                default: return '';
            }
        } else {
            switch(step) {
                case 1: return 'Verificación OCR de tu credencial para votar';
                case 2: return 'Documento que acredite tu domicilio actual';
                default: return '';
            }
        }
    };

    const handleStepComplete = (data) => {
        console.log('✅ Paso completado:', currentStep, data);
        
        setCompletedSteps([...completedSteps, currentStep]);
        
        if (currentStep < getTotalSteps()) {
            console.log(`➡️ Avanzando al paso ${currentStep + 1}`);
            setTimeout(() => {
                setCurrentStep(currentStep + 1);
            }, 2000);
        } else {
            console.log('🎉 ¡Verificación completa!');
        }
    };

    if (configLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600 dark:text-gray-300">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-indigo-900/20 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="text-center mb-8">
                    <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 rounded-full animate-pulse shadow-xl blur-lg"></div>
                        <div className="relative w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-clip-text text-transparent mb-4">
                        Verificación de Identidad
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {faceEnabled 
                            ? 'Proceso completo de verificación con Face ID y documentos oficiales'
                            : 'Verificación con documentos oficiales'
                        }
                    </p>
                </div>

                {/* 🔥 BARRA DE PROGRESO - SEPARADA Y ARRIBA */}
                <div className="max-w-5xl mx-auto mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                        {/* Título del paso actual */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                    {getStepTitle(currentStep)}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {getStepDescription(currentStep)}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                                    {currentStep}
                                </span>
                                <span className="text-lg text-gray-500 dark:text-gray-400">
                                    /{getTotalSteps()}
                                </span>
                            </div>
                        </div>

                        {/* Barra de progreso visual */}
                        <div className="relative">
                            <div className="flex items-center space-x-2">
                                {Array.from({ length: getTotalSteps() }).map((_, idx) => {
                                    const stepNum = idx + 1;
                                    const isCompleted = completedSteps.includes(stepNum);
                                    const isCurrent = stepNum === currentStep;

                                    return (
                                        <React.Fragment key={stepNum}>
                                            {/* Círculo del paso */}
                                            <div className="flex flex-col items-center flex-1">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-lg transition-all ${
                                                    isCompleted 
                                                        ? 'bg-green-500 text-white scale-110' 
                                                        : isCurrent 
                                                        ? 'bg-violet-600 text-white animate-pulse scale-110' 
                                                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {isCompleted ? (
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        stepNum
                                                    )}
                                                </div>
                                                {/* Etiqueta debajo */}
                                                <p className={`text-xs mt-2 font-semibold text-center ${
                                                    isCompleted 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : isCurrent 
                                                        ? 'text-violet-600 dark:text-violet-400' 
                                                        : 'text-gray-500 dark:text-gray-500'
                                                }`}>
                                                    {getStepTitle(stepNum).split(':')[0]}
                                                </p>
                                            </div>

                                            {/* Línea conectora */}
                                            {stepNum < getTotalSteps() && (
                                                <div className={`flex-1 h-2 rounded-full transition-all ${
                                                    isCompleted 
                                                        ? 'bg-green-500' 
                                                        : 'bg-gray-300 dark:bg-gray-600'
                                                }`}></div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Indicador de progreso en porcentaje */}
                        <div className="mt-6 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-violet-600 to-purple-600 h-full transition-all duration-500 ease-out"
                                style={{ width: `${(completedSteps.length / getTotalSteps()) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {completedSteps.length} de {getTotalSteps()} pasos completados ({Math.round((completedSteps.length / getTotalSteps()) * 100)}%)
                        </p>
                    </div>
                </div>

                {/* 🔥 CONTENIDO DEL PASO ACTUAL - SIN CONTENEDOR EXTRA */}
                <div className="max-w-5xl mx-auto">
                    {/* Paso 1: Face ID (solo si está habilitado) */}
                    {faceEnabled && currentStep === 1 && (
                        <TestOCR onComplete={handleStepComplete} />
                    )}

                    {/* Paso 2 con Face ID o Paso 1 sin Face ID: INE */}
                    {((faceEnabled && currentStep === 2) || (!faceEnabled && currentStep === 1)) && (
                        <DocumentOCR type="ine" onComplete={handleStepComplete} />
                    )}

                    {/* Paso 3 con Face ID o Paso 2 sin Face ID: Comprobante */}
                    {((faceEnabled && currentStep === 3) || (!faceEnabled && currentStep === 2)) && (
                        <DocumentOCR type="comprobante" onComplete={handleStepComplete} />
                    )}
                </div>

                {/* PANTALLA DE ÉXITO FINAL */}
                {completedSteps.length === getTotalSteps() && (
                    <div className="max-w-5xl mx-auto mt-8">
                        <div className="p-8 rounded-2xl border-2 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700 animate-fade-in">
                            <div className="text-center">
                                <div className="relative inline-flex items-center justify-center w-32 h-32 mb-6">
                                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
                                    <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
                                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>

                                <h3 className="text-4xl font-bold text-green-800 dark:text-green-300 mb-4">
                                    🎉 ¡Verificación Completa!
                                </h3>
                                <p className="text-xl text-green-700 dark:text-green-400 mb-8">
                                    Todos los pasos de verificación se completaron exitosamente
                                </p>

                                <div className={`grid ${faceEnabled ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-6 mt-8 mb-8`}>
                                    {faceEnabled && (
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:scale-105 transition-transform">
                                            <div className="text-5xl mb-3">📸</div>
                                            <p className="font-bold text-lg text-gray-900 dark:text-white mb-1">Face ID</p>
                                            <p className="text-sm text-green-600 dark:text-green-400 font-semibold">✓ Verificado con éxito</p>
                                        </div>
                                    )}
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:scale-105 transition-transform">
                                        <div className="text-5xl mb-3">🆔</div>
                                        <p className="font-bold text-lg text-gray-900 dark:text-white mb-1">INE</p>
                                        <p className="text-sm text-green-600 dark:text-green-400 font-semibold">✓ Verificada con OCR</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:scale-105 transition-transform">
                                        <div className="text-5xl mb-3">📄</div>
                                        <p className="font-bold text-lg text-gray-900 dark:text-white mb-1">Comprobante</p>
                                        <p className="text-sm text-green-600 dark:text-green-400 font-semibold">✓ Verificado con OCR</p>
                                    </div>
                                </div>

                                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl mb-6">
                                    <p className="text-sm text-green-800 dark:text-green-300">
                                        🔒 Tus datos han sido verificados y están seguros. Puedes continuar con tu registro.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        console.log('🚀 Redirigiendo al dashboard...');
                                        window.location.href = '/dashboard';
                                    }}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-10 rounded-xl shadow-2xl transition-all hover:scale-105 flex items-center justify-center space-x-3 mx-auto"
                                >
                                    <span className="text-lg">Continuar al Dashboard</span>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VerificationRouter;