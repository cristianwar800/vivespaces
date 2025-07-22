// resources/js/components/Email.jsx
import React, { useState, useEffect } from 'react';

function Email() {
    const [currentStep, setCurrentStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutos

    // Countdown timer
    useEffect(() => {
        let interval = null;
        if (currentStep === 2 && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft => timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setErrors({ general: 'El código ha expirado. Solicita uno nuevo.' });
            setCurrentStep(1);
        }
        return () => clearInterval(interval);
    }, [currentStep, timeLeft]);

    // 🆕 Obtener email de la URL si viene del registro


    // 🆕 DETECTAR SI VIENE DEL REGISTRO Y CONFIGURAR AUTOMÁTICAMENTE
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');
        const fromRegister = urlParams.get('from_register');

        // 🔍 DEBUGGING - líneas temporales
        console.log('URL actual:', window.location.href);
        console.log('Email de URL:', emailFromUrl);
        console.log('From register:', fromRegister);
        console.log('Tipo from register:', typeof fromRegister);

        if (emailFromUrl) {
            setEmail(decodeURIComponent(emailFromUrl));

            // 🆕 SI VIENE DEL REGISTRO, IR DIRECTAMENTE AL PASO 2
            if (fromRegister === '1') {
                console.log('✅ Detectado registro, yendo al paso 2');
                setCurrentStep(2);
                setTimeLeft(600); // Reiniciar timer
                showMessage('Código enviado correctamente. Revisa tu email.');

                // Limpiar URL para que no se vea el parámetro
                const newUrl = window.location.pathname + '?email=' + encodeURIComponent(emailFromUrl);
                window.history.replaceState({}, '', newUrl);
            } else {
                console.log('❌ No detectado from_register');
            }
        } else {
            console.log('❌ No hay email en URL');
        }
    }, []);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const showMessage = (text, isError = false) => {
        if (isError) {
            setErrors({ general: text });
            setSuccessMessage('');
        } else {
            setSuccessMessage(text);
            setErrors({});
        }

        // Limpiar mensaje después de 5 segundos
        setTimeout(() => {
            setSuccessMessage('');
            setErrors({});
        }, 5000);
    };

    const sendVerificationCode = async (e) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setErrors({ email: 'Por favor ingresa un email válido' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/send-verification', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setCurrentStep(2);
                setTimeLeft(600);
                showMessage('Código enviado correctamente. Revisa tu email.');
            } else {
                setErrors(data.errors || { general: data.message || 'Error enviando el código' });
            }
        } catch (error) {
            console.error('Error:', error);
            setErrors({ general: 'Error de conexión. Intenta nuevamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    const verifyCode = async (e) => {
        e.preventDefault();

        if (!code || code.length !== 6) {
            setErrors({ code: 'Por favor ingresa un código de 6 dígitos' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/verify-code', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setCurrentStep(3);
                showMessage('¡Email verificado exitosamente!');

                // 🆕 REDIRIGIR AUTOMÁTICAMENTE DESPUÉS DE VERIFICAR
                setTimeout(() => {
                    if (data.data && data.data.redirect) {
                        window.location.href = data.data.redirect;
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 2000);
            } else {
                setErrors(data.errors || { general: data.message || 'Código incorrecto' });
            }
        } catch (error) {
            console.error('Error:', error);
            setErrors({ general: 'Error de conexión. Intenta nuevamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    const resendCode = async () => {
        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/send-verification', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setCode('');
                setTimeLeft(600);
                showMessage('Nuevo código enviado correctamente.');
            } else {
                setErrors(data.errors || { general: data.message || 'Error reenviando el código' });
            }
        } catch (error) {
            console.error('Error:', error);
            setErrors({ general: 'Error de conexión. Intenta nuevamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 6) {
            setCode(value);
            if (errors.code) {
                setErrors(prev => ({ ...prev, code: '' }));
            }
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) {
            setErrors(prev => ({ ...prev, email: '' }));
        }
    };

    return (
        <div className="section">
            <div className="container">
                {/* Header con tu estilo existente */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="section-title">
                        Verificación de Email
                    </h1>
                    <p className="section-subtitle">
                        {currentStep === 1 && 'Ingresa tu email para recibir un código de verificación'}
                        {currentStep === 2 && 'Revisa tu email e ingresa el código de 6 dígitos'}
                        {currentStep === 3 && 'Tu email ha sido verificado exitosamente'}
                    </p>
                </div>

                {/* Mensaje de éxito usando tus clases */}
                {successMessage && (
                    <div className="alert-success animate-slide-up">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                            <div>
                                <svg
                                    style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', margin: 0 }}>
                                    {successMessage}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error general usando tus clases */}
                {errors.general && (
                    <div className="alert-error animate-slide-up">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                            <div>
                                <svg
                                    style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', margin: 0 }}>
                                    {errors.general}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contenido principal usando form-card */}
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {/* Paso 1: Ingreso de email */}
                    {currentStep === 1 && (
                        <div className="form-card animate-fade-scale">
                            <div className="form-header">
                                <div className="form-icon">
                                    <i className="fas fa-envelope"></i>
                                </div>
                                <h2 className="form-title">Verificar Email</h2>
                                <p className="form-subtitle">
                                    Ingresa tu dirección de email para recibir un código de verificación
                                </p>
                            </div>

                            <form onSubmit={sendVerificationCode}>
                                <div className="form-group">
                                    <label htmlFor="email" className="form-label">
                                        Dirección de Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder="ejemplo@gmail.com"
                                        className={`form-input ${errors.email ? 'error' : ''}`}
                                        required
                                        disabled={isLoading}
                                    />
                                    {errors.email && (
                                        <p style={{
                                            color: 'var(--error)',
                                            fontSize: 'var(--font-size-sm)',
                                            marginTop: 'var(--spacing-xs)'
                                        }}>
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn btn-primary w-full"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="loading-spinner"></div>
                                                Enviando código...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-paper-plane" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                                Enviar código de verificación
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Paso 2: Verificación del código */}
                    {currentStep === 2 && (
                        <div className="form-card animate-fade-scale">
                            <div className="form-header">
                                <div className="form-icon">
                                    <i className="fas fa-key"></i>
                                </div>
                                <h2 className="form-title">Ingresa el Código</h2>
                                <p className="form-subtitle">
                                    Hemos enviado un código de 6 dígitos a tu email
                                </p>
                            </div>

                            {/* Mostrar email con estilo de tu sistema */}
                            <div className="spec-item text-center" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <div className="spec-label">Código enviado a:</div>
                                <div className="spec-value">{email}</div>
                            </div>

                            <form onSubmit={verifyCode}>
                                <div className="form-group">
                                    <label htmlFor="code" className="form-label">
                                        Código de Verificación *
                                    </label>
                                    <input
                                        type="text"
                                        name="code"
                                        id="code"
                                        value={code}
                                        onChange={handleCodeChange}
                                        placeholder="000000"
                                        className={`form-input ${errors.code ? 'error' : ''}`}
                                        style={{
                                            textAlign: 'center',
                                            fontSize: '2rem',
                                            letterSpacing: '0.5rem',
                                            fontWeight: 'bold'
                                        }}
                                        maxLength="6"
                                        required
                                        disabled={isLoading}
                                    />
                                    {errors.code && (
                                        <p style={{
                                            color: 'var(--error)',
                                            fontSize: 'var(--font-size-sm)',
                                            marginTop: 'var(--spacing-xs)'
                                        }}>
                                            {errors.code}
                                        </p>
                                    )}
                                </div>

                                {/* Timer usando tu sistema de estilos */}
                                <div className="detail-item text-center" style={{
                                    marginBottom: 'var(--spacing-lg)',
                                    background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
                                    borderColor: timeLeft < 60 ? 'var(--error)' : 'var(--border-primary)'
                                }}>
                                    <div className="detail-label">Tiempo restante</div>
                                    <div className="detail-value" style={{
                                        color: timeLeft < 60 ? 'var(--error)' : 'var(--text-primary)'
                                    }}>
                                        {formatTime(timeLeft)}
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn btn-primary w-full"
                                        style={{ marginBottom: 'var(--spacing-md)' }}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="loading-spinner"></div>
                                                Verificando...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                                Verificar código
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resendCode}
                                        disabled={isLoading}
                                        className="btn btn-secondary w-full"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="loading-spinner"></div>
                                                Reenviando...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-redo" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                                Reenviar código
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Paso 3: Verificación exitosa */}
                    {currentStep === 3 && (
                        <div className="form-card animate-fade-scale text-center">
                            <div className="form-icon animate-glow" style={{
                                fontSize: '3rem',
                                marginBottom: 'var(--spacing-xl)'
                            }}>
                                <i className="fas fa-check-circle"></i>
                            </div>

                            <h2 className="form-title" style={{ color: 'var(--success)' }}>
                                ¡Email Verificado!
                            </h2>

                            <p className="form-subtitle">
                                Tu dirección de email ha sido verificada exitosamente.
                                Ya puedes continuar usando la plataforma.
                            </p>

                            <div className="spec-item" style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderColor: 'var(--success)',
                                marginBottom: 'var(--spacing-xl)'
                            }}>
                                <div className="spec-label">Email verificado</div>
                                <div className="spec-value" style={{ color: 'var(--success)' }}>
                                    {email}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="btn btn-primary w-full"
                                >
                                    <i className="fas fa-arrow-right" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                    Ir al Dashboard
                                </button>

                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/'}
                                    className="btn btn-secondary w-full"
                                >
                                    <i className="fas fa-home" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                    Volver al Inicio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Email;
