import React, { useState, useEffect } from 'react';
import FaceIDStep from './FaceIDStep';
import DocumentStep from './DocumentStep';

function VerificationFlow() {
    const [faceEnabled, setFaceEnabled] = useState(false);
    const [configLoading, setConfigLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    
    const [stepResults, setStepResults] = useState({});
    const [canProceed, setCanProceed] = useState(false);

    const [sessionId, setSessionId] = useState(null);
    const [isRestoring, setIsRestoring] = useState(true);

    // 🔥 NUEVOS ESTADOS para usuario ya verificado
    const [userAlreadyVerified, setUserAlreadyVerified] = useState(false);
    const [verifiedAt, setVerifiedAt] = useState(null);

    useEffect(() => {
        loadVerificationSession();
    }, []);

    // 🔥 Log de diagnóstico
    useEffect(() => {
        console.log('📊 Estado actual:', {
            currentStep,
            completedSteps,
            totalSteps: getTotalSteps(),
            shouldShowFinal: completedSteps.length === getTotalSteps(),
            canProceed
        });
    }, [currentStep, completedSteps, canProceed]);

    const loadVerificationSession = async () => {
        try {
            console.log('🔄 Verificando estado de verificación...');
            
            // 1. 🔥 PRIMERO: Verificar si el USUARIO ya está verificado
            const userRes = await fetch('/api/user', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            
            if (userRes.ok) {
                const userData = await userRes.json();
                
                if (userData.user?.is_identity_verified) {
                    console.log('✅ Usuario ya está verificado - Mostrando pantalla especial');
                    setConfigLoading(false);
                    setIsRestoring(false);
                    
                    // 🔥 Mostrar componente de "Ya Verificado"
                    setUserAlreadyVerified(true);
                    setVerifiedAt(userData.user?.verified_at);
                    return; // Detener aquí - NO continuar con flujo normal
                }
            }
            
            // 2. Si NO está verificado, continuar con el flujo normal
            console.log('ℹ️ Usuario NO verificado, cargando sesión...');
            
            // Cargar configuración
            const configRes = await fetch('/api/verification/config', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (configRes.ok) {
                const configData = await configRes.json();
                const faceVerificationEnabled = configData.data?.face_verification_enabled || false;
                setFaceEnabled(faceVerificationEnabled);
                console.log('⚙️ Configuración cargada - Face verification:', faceVerificationEnabled ? 'Habilitado ✅' : 'Deshabilitado ❌');
            }
            
            // 3. 🔥 VERIFICAR SI HAY PROGRESO GUARDADO
            const progressRes = await fetch('/verification/progress', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });
            
            if (progressRes.ok) {
                const progressData = await progressRes.json();
                
                if (progressData.has_session) {
                    console.log('✅ Sesión recuperada:', progressData);
                    
                    // 🔥 RESTAURAR SESSION ID
                    setSessionId(progressData.session_id);
                    
                    // 🔥 RESTAURAR PASOS COMPLETADOS
                    const completedStepsArray = progressData.completed_steps || [];
                    setCompletedSteps(completedStepsArray);
                    console.log('📋 Pasos completados restaurados:', completedStepsArray);
                    
                    // 🔥 RESTAURAR DATOS DE CADA PASO (CRÍTICO)
                    if (progressData.steps_data) {
                        const restoredResults = {};
                        
                        Object.keys(progressData.steps_data).forEach(key => {
                            // key puede ser "step_1", "step_2", etc.
                            const stepNumber = parseInt(key.replace('step_', ''));
                            restoredResults[stepNumber] = progressData.steps_data[key];
                        });
                        
                        setStepResults(restoredResults);
                        console.log('📦 Resultados de pasos restaurados:', restoredResults);
                    }
                    
                    // 🔥 DETERMINAR PASO ACTUAL BASADO EN STATUS
                    if (progressData.status === 'completed') {
                        // Si ya está completada, ir al último paso
                        setCurrentStep(getTotalSteps());
                        setCanProceed(true);
                        console.log('✅ Verificación ya completada (status=completed), mostrando paso final');
                    } else if (completedStepsArray.length > 0) {
                        // Si tiene pasos completados pero aún en progreso
                        const maxCompletedStep = Math.max(...completedStepsArray);
                        
                        if (maxCompletedStep >= getTotalSteps()) {
                            setCurrentStep(getTotalSteps());
                            setCanProceed(true);
                        } else {
                            setCurrentStep(maxCompletedStep + 1);
                            setCanProceed(false);
                        }
                    } else {
                        // No hay pasos completados - empezar en paso 1
                        setCurrentStep(1);
                        setCanProceed(false);
                    }
                    
                } else {
                    console.log('ℹ️ No hay sesión previa. La sesión se creará al completar el primer paso.');
                }
            }
            
        } catch (error) {
            console.error('❌ Error cargando sesión:', error);
        } finally {
            setConfigLoading(false);
            setIsRestoring(false);
        }
    };

    const getTotalSteps = () => 2;

    const getStepTitle = (step) => {
        if (faceEnabled) {
            switch(step) {
                case 1: return 'Verificación Facial + INE';
                case 2: return 'Comprobante de Domicilio';
                default: return '';
            }
        } else {
            switch(step) {
                case 1: return 'Verificación de INE';
                case 2: return 'Comprobante de Domicilio';
                default: return '';
            }
        }
    };

    const handleStepComplete = async (data) => {
        console.log('✅ Paso completado:', currentStep, data);
        
        const newStepResults = {
            ...stepResults,
            [currentStep]: data
        };
        setStepResults(newStepResults);
        
        if (!completedSteps.includes(currentStep)) {
            const newCompleted = [...completedSteps, currentStep];
            setCompletedSteps(newCompleted);
        }
        
        setCanProceed(true);
        
        console.log('🎯 Usuario puede revisar resultado y continuar');
    };

    const handleContinueToNextStep = () => {
        if (currentStep < getTotalSteps()) {
            console.log(`➡️ Usuario avanzó al paso ${currentStep + 1}`);
            setCurrentStep(currentStep + 1);
            setCanProceed(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            console.log('✅ Verificación completa');
        }
    };

    const handleGoToPreviousStep = () => {
        if (currentStep > 1) {
            console.log(`⬅️ Usuario regresó al paso ${currentStep - 1}`);
            setCurrentStep(currentStep - 1);
            setCanProceed(completedSteps.includes(currentStep - 1));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // 🔥 NUEVA FUNCIÓN: Finalizar verificación
    const handleFinalizeVerification = async () => {
        console.log('🎯 Finalizando verificación...');
        
        try {
            const response = await fetch('/verification/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Verificación finalizada:', data);
                
                // Mostrar mensaje de éxito
                alert('🎉 ¡Verificación completada exitosamente!\n\nTu identidad ha sido verificada. Redirigiendo al dashboard...');
                
                // Redirigir después de 2 segundos
                setTimeout(() => {
                    window.location.href = '/properties/create';
                }, 2000);
            } else {
                console.error('❌ Error finalizando:', data);
                
                // Mostrar error específico
                const errorMessage = data.error || 'No se pudo finalizar la verificación';
                const suggestions = data.suggestions || [];
                
                let alertMessage = `❌ Error: ${errorMessage}`;
                if (suggestions.length > 0) {
                    alertMessage += '\n\nSugerencias:\n' + suggestions.join('\n');
                }
                
                alert(alertMessage);
            }
        } catch (error) {
            console.error('❌ Error en finalización:', error);
            alert('Error de conexión al finalizar la verificación. Por favor, intenta nuevamente.');
        }
    };

    // 🔥 SI EL USUARIO YA ESTÁ VERIFICADO, MOSTRAR PANTALLA ESPECIAL
    if (userAlreadyVerified) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-indigo-900/20 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    
                    {/* Encabezado */}
                    <div className="text-center mb-8">
                        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                            <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse opacity-40"></div>
                            <div className="relative w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-2xl">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
                            ✅ Ya estás verificado
                        </h1>
                        
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Tu identidad fue verificada exitosamente
                        </p>
                    </div>

                    {/* Card principal */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border-2 border-green-200 dark:border-green-800">
                        
                        {/* Fecha de verificación */}
                        {verifiedAt && (
                            <div className="text-center mb-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Verificado el
                                </p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {new Date(verifiedAt).toLocaleDateString('es-MX', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}

                        {/* Beneficios */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-4 flex items-center">
                                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                ¿Qué puedes hacer ahora?
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>Publicar propiedades</strong> sin restricciones
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>Contactar propietarios</strong> con tu perfil verificado
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>Mayor confianza</strong> de otros usuarios
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Badge de verificación */}
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 px-6 py-3 rounded-full border-2 border-green-300 dark:border-green-700">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span className="font-bold text-lg">Identidad Verificada</span>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a 
                                href="/properties/create"
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-3 text-center"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Publicar Propiedad</span>
                            </a>
                            
                            <a 
                                href="/properties"
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-3 text-center"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span>Explorar Propiedades</span>
                            </a>
                        </div>

                        {/* Info adicional */}
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-400 text-center">
                                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Tu verificación es permanente. No necesitas repetir este proceso.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (configLoading || isRestoring) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        {isRestoring ? 'Recuperando tu progreso...' : 'Cargando configuración...'}
                    </p>
                    {sessionId && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Sesión: {sessionId.substring(0, 15)}...
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 dark:from-gray-900 dark:via-violet-900/20 dark:to-indigo-900/20 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                
                <div className="text-center mb-6">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-rose-500 to-pink-500 rounded-full animate-pulse shadow-xl blur-lg"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">
                        Verificacion de Identidad
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                        {faceEnabled 
                            ? '🔥 Verificación combinada: Face ID + OCR en 2 pasos simples'
                            : 'Verificación con documentos oficiales en 2 pasos'
                        }
                    </p>
                    
                    {sessionId && completedSteps.length > 0 && (
                        <div className="mt-3 inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-xs font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Progreso guardado automáticamente</span>
                        </div>
                    )}
                </div>

                {/* Barra de progreso */}
                <div className="max-w-5xl mx-auto mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    {Array.from({ length: getTotalSteps() }).map((_, idx) => {
                                        const stepNum = idx + 1;
                                        const isCompleted = completedSteps.includes(stepNum);
                                        const isCurrent = stepNum === currentStep;

                                        return (
                                            <React.Fragment key={stepNum}>
                                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                                    isCompleted 
                                                        ? 'bg-green-500 text-white shadow-lg' 
                                                        : isCurrent 
                                                        ? 'bg-violet-600 text-white shadow-lg ring-4 ring-violet-200 dark:ring-violet-800' 
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    {isCompleted ? (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        stepNum
                                                    )}
                                                    {isCurrent && (
                                                        <div className="absolute -inset-1 bg-violet-400 rounded-full animate-ping opacity-20"></div>
                                                    )}
                                                </div>

                                                {stepNum < getTotalSteps() && (
                                                    <div className={`w-12 h-1 rounded-full transition-all duration-500 ${
                                                        isCompleted 
                                                            ? 'bg-green-500' 
                                                            : 'bg-gray-200 dark:bg-gray-700'
                                                    }`}></div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                                
                                <div className="ml-2 hidden sm:block">
                                    <p className="text-base font-bold text-gray-900 dark:text-white">
                                        {getStepTitle(currentStep)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="hidden md:block">
                                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-violet-600 to-purple-600 h-full transition-all duration-500 ease-out"
                                            style={{ width: `${(completedSteps.length / getTotalSteps()) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-violet-600 dark:text-violet-400">
                                        {currentStep}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        /{getTotalSteps()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="block sm:hidden mt-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white text-center">
                                {getStepTitle(currentStep)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto">
                    
                    {currentStep === 1 && (
                        <>
                            {faceEnabled ? (
                                <FaceIDStep 
                                    onComplete={handleStepComplete}
                                    onBack={currentStep > 1 ? handleGoToPreviousStep : null}
                                    previousResult={stepResults[1]}
                                />
                            ) : (
                                <DocumentStep 
                                    type="ine" 
                                    onComplete={handleStepComplete}
                                    onBack={currentStep > 1 ? handleGoToPreviousStep : null}
                                    previousResult={stepResults[1]}
                                />
                            )}
                        </>
                    )}

                    {currentStep === 2 && (
                        <DocumentStep 
                            type="comprobante" 
                            onComplete={handleStepComplete}
                            onBack={handleGoToPreviousStep}
                            previousResult={stepResults[2]}
                        />
                    )}

                    {canProceed && currentStep < getTotalSteps() && (
                        <div className="mt-6 flex gap-4">
                            {currentStep > 1 && (
                                <button
                                    onClick={handleGoToPreviousStep}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-4 px-6 rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Regresar</span>
                                </button>
                            )}
                            <button
                                onClick={handleContinueToNextStep}
                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-2xl transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
                            >
                                <span>Continuar al siguiente paso</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}

                </div>

                {/* 🔥 PANTALLA FINAL - Con botón "Finalizar Verificación" */}
                {completedSteps.length === getTotalSteps() && (
                    <div className="max-w-5xl mx-auto mt-8 animate-fade-in">
                        <div className="p-8 rounded-2xl border-2 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700">
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
                                    Verificacion Completa
                                </h3>
                                <p className="text-lg text-green-700 dark:text-green-400 mb-8">
                                    Todos los pasos de verificacion se completaron exitosamente
                                </p>

                                <div className={`grid ${faceEnabled ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-4 mt-6 mb-6 max-w-2xl mx-auto`}>
                                    {faceEnabled ? (
                                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:scale-105 transition-transform">
                                            <div className="flex items-center justify-center space-x-2 text-4xl mb-2">
                                                <span>📸</span>
                                                <span>🆔</span>
                                            </div>
                                            <p className="font-bold text-base text-gray-900 dark:text-white mb-1">Face ID + INE</p>
                                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Verificado (Combinado)</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:scale-105 transition-transform">
                                            <div className="text-4xl mb-2">🆔</div>
                                            <p className="font-bold text-base text-gray-900 dark:text-white mb-1">INE</p>
                                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Verificada</p>
                                        </div>
                                    )}
                                    
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg hover:scale-105 transition-transform">
                                        <div className="text-4xl mb-2">📄</div>
                                        <p className="font-bold text-base text-gray-900 dark:text-white mb-1">Comprobante</p>
                                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Verificado</p>
                                    </div>
                                </div>

                                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl mb-6 max-w-xl mx-auto">
                                    <p className="text-sm text-green-800 dark:text-green-300">
                                        Tus datos han sido verificados y estan seguros. Haz clic en "Finalizar Verificación" para completar el proceso.
                                    </p>
                                </div>

                                {/* 🔥 BOTÓN FINALIZAR VERIFICACIÓN */}
                                <button
                                    onClick={handleFinalizeVerification}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-10 rounded-xl shadow-2xl transition-all hover:scale-105 inline-flex items-center space-x-3"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-lg">Finalizar Verificación</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default VerificationFlow;