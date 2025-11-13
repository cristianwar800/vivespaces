// resources/js/components/Email.jsx
import React, { useState, useEffect } from 'react';

function Email() {
    // 🆕 DETECTAR MODO (verificación o password reset)
    const [mode, setMode] = useState('verification'); // 'verification' o 'password_reset'
    const [currentStep, setCurrentStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutos

    // 🆕 DETECTAR MODO AL CARGAR
    useEffect(() => {
        const path = window.location.pathname;
        if (path.includes('/password/forgot')) {
            setMode('password_reset');
        } else {
            setMode('verification');
        }
    }, []);

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

    // Detectar si viene del registro (solo para modo verification)
    useEffect(() => {
        if (mode === 'verification') {
            const urlParams = new URLSearchParams(window.location.search);
            const emailFromUrl = urlParams.get('email');
            const fromRegister = urlParams.get('from_register');

            if (emailFromUrl) {
                setEmail(decodeURIComponent(emailFromUrl));

                if (fromRegister === '1') {
                    console.log('✅ Detectado registro, yendo al paso 2');
                    setCurrentStep(2);
                    setTimeLeft(600);
                    showMessage('Código enviado correctamente. Revisa tu email.');

                    const newUrl = window.location.pathname + '?email=' + encodeURIComponent(emailFromUrl);
                    window.history.replaceState({}, '', newUrl);
                }
            }
        }
    }, [mode]);

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

        setTimeout(() => {
            setSuccessMessage('');
            setErrors({});
        }, 5000);
    };

    // 🆕 ENVIAR CÓDIGO (dinámico según modo)
    const sendCode = async (e) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setErrors({ email: 'Por favor ingresa un email válido' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        const endpoint = mode === 'password_reset' 
            ? '/password/send-reset-code' 
            : '/send-verification';

        try {
            const response = await fetch(endpoint, {
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
                showMessage(mode === 'password_reset' 
                    ? 'Código de recuperación enviado. Revisa tu email.' 
                    : 'Código enviado correctamente. Revisa tu email.');
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

    // 🆕 VERIFICAR CÓDIGO (dinámico según modo)
    const verifyCode = async (e) => {
        e.preventDefault();

        if (!code || code.length !== 6) {
            setErrors({ code: 'Por favor ingresa un código de 6 dígitos' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        // Si es password reset, solo verificar y pasar al paso 3 (nueva contraseña)
        if (mode === 'password_reset') {
            try {
                const response = await fetch('/password/verify-reset-code', {
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
                    setCurrentStep(3); // Ir al paso de nueva contraseña
                    showMessage('Código verificado. Ahora crea tu nueva contraseña.');
                } else {
                    setErrors(data.errors || { general: data.message || 'Código incorrecto' });
                }
            } catch (error) {
                console.error('Error:', error);
                setErrors({ general: 'Error de conexión. Intenta nuevamente.' });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Si es verification, verificar email
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

                setTimeout(() => {
                    if (data.data && data.data.redirect) {
                        window.location.href = data.data.redirect;
                    } else {
                        window.location.href = '/profile';
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

    // 🆕 RESETEAR CONTRASEÑA (nuevo método)
    const resetPassword = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!password || password.length < 8) {
            setErrors({ password: 'La contraseña debe tener al menos 8 caracteres' });
            return;
        }

        if (password !== passwordConfirmation) {
            setErrors({ passwordConfirmation: 'Las contraseñas no coinciden' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/password/reset', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    code, 
                    password,
                    password_confirmation: passwordConfirmation
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setCurrentStep(4); // Paso de éxito
                showMessage('¡Contraseña restablecida exitosamente!');

                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                setErrors(data.errors || { general: data.message || 'Error al cambiar contraseña' });
            }
        } catch (error) {
            console.error('Error:', error);
            setErrors({ general: 'Error de conexión. Intenta nuevamente.' });
        } finally {
            setIsLoading(false);
        }
    };

    // Reenviar código
    const resendCode = async () => {
        setIsLoading(true);
        setErrors({});

        const endpoint = mode === 'password_reset' 
            ? '/password/send-reset-code' 
            : '/send-verification';

        try {
            const response = await fetch(endpoint, {
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

    // 🆕 TÍTULOS DINÁMICOS
    const getTitle = () => {
        if (mode === 'password_reset') {
            if (currentStep === 1) return 'Recuperar Contraseña';
            if (currentStep === 2) return 'Verificar Código';
            if (currentStep === 3) return 'Nueva Contraseña';
            if (currentStep === 4) return '¡Contraseña Cambiada!';
        } else {
            if (currentStep === 1) return 'Verificación de Email';
            if (currentStep === 2) return 'Ingresa el Código';
            if (currentStep === 3) return '¡Email Verificado!';
        }
    };

    const getSubtitle = () => {
        if (mode === 'password_reset') {
            if (currentStep === 1) return 'Ingresa tu email para recibir un código de recuperación';
            if (currentStep === 2) return 'Revisa tu email e ingresa el código de 6 dígitos';
            if (currentStep === 3) return 'Crea una nueva contraseña segura';
            if (currentStep === 4) return 'Tu contraseña ha sido actualizada exitosamente';
        } else {
            if (currentStep === 1) return 'Ingresa tu email para recibir un código de verificación';
            if (currentStep === 2) return 'Revisa tu email e ingresa el código de 6 dígitos';
            if (currentStep === 3) return 'Tu email ha sido verificado exitosamente';
        }
    };

    return (
        <div className="section">
            <div className="container">
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="section-title">
                        {getTitle()}
                    </h1>
                    <p className="section-subtitle">
                        {getSubtitle()}
                    </p>
                </div>

                {/* Mensaje de éxito */}
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

                {/* Error general */}
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

                {/* Contenido principal */}
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    {/* PASO 1: Ingreso de email */}
                    {currentStep === 1 && (
                        <div className="form-card animate-fade-scale">
                            <div className="form-header">
                                <div className="form-icon">
                                    <i className={mode === 'password_reset' ? 'fas fa-lock' : 'fas fa-envelope'}></i>
                                </div>
                                <h2 className="form-title">{mode === 'password_reset' ? 'Recuperar Contraseña' : 'Verificar Email'}</h2>
                                <p className="form-subtitle">
                                    {mode === 'password_reset' 
                                        ? 'Ingresa tu email para recibir un código de recuperación'
                                        : 'Ingresa tu dirección de email para recibir un código de verificación'
                                    }
                                </p>
                            </div>

                            <form onSubmit={sendCode}>
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
                                                {mode === 'password_reset' ? 'Enviar código de recuperación' : 'Enviar código de verificación'}
                                            </>
                                        )}
                                    </button>

                                    {mode === 'password_reset' && (
                                        <button
                                            type="button"
                                            onClick={() => window.location.href = '/login'}
                                            className="btn btn-secondary w-full"
                                            style={{ marginTop: 'var(--spacing-md)' }}
                                        >
                                            <i className="fas fa-arrow-left" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                            Volver al login
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {/* PASO 2: Verificación del código */}
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

                            <div className="spec-item text-center" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <div className="spec-label">Código enviado a:</div>
                                <div className="spec-value">{email}</div>
                            </div>

                            <form onSubmit={verifyCode}>
                                <div className="form-group">
                                    <label htmlFor="code" className="form-label">
                                        Código de {mode === 'password_reset' ? 'Recuperación' : 'Verificación'} *
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

                    {/* PASO 3: Nueva contraseña (solo para password_reset) */}
                    {currentStep === 3 && mode === 'password_reset' && (
                        <div className="form-card animate-fade-scale">
                            <div className="form-header">
                                <div className="form-icon">
                                    <i className="fas fa-lock"></i>
                                </div>
                                <h2 className="form-title">Nueva Contraseña</h2>
                                <p className="form-subtitle">
                                    Crea una contraseña segura para tu cuenta
                                </p>
                            </div>

                            <form onSubmit={resetPassword}>
                                <div className="form-group">
                                    <label htmlFor="password" className="form-label">
                                        Nueva Contraseña *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            id="password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                if (errors.password) {
                                                    setErrors(prev => ({ ...prev, password: '' }));
                                                }
                                            }}
                                            placeholder="Mínimo 8 caracteres"
                                            className={`form-input ${errors.password ? 'error' : ''}`}
                                            required
                                            disabled={isLoading}
                                            minLength="8"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p style={{
                                            color: 'var(--error)',
                                            fontSize: 'var(--font-size-sm)',
                                            marginTop: 'var(--spacing-xs)'
                                        }}>
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="passwordConfirmation" className="form-label">
                                        Confirmar Contraseña *
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPasswordConfirm ? 'text' : 'password'}
                                            name="passwordConfirmation"
                                            id="passwordConfirmation"
                                            value={passwordConfirmation}
                                            onChange={(e) => {
                                                setPasswordConfirmation(e.target.value);
                                                if (errors.passwordConfirmation) {
                                                    setErrors(prev => ({ ...prev, passwordConfirmation: '' }));
                                                }
                                            }}
                                            placeholder="Repite tu contraseña"
                                            className={`form-input ${errors.passwordConfirmation ? 'error' : ''}`}
                                            required
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            <i className={showPasswordConfirm ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                                        </button>
                                    </div>
                                    {errors.passwordConfirmation && (
                                        <p style={{
                                            color: 'var(--error)',
                                            fontSize: 'var(--font-size-sm)',
                                            marginTop: 'var(--spacing-xs)'
                                        }}>
                                            {errors.passwordConfirmation}
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
                                                Cambiando contraseña...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                                Cambiar contraseña
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* PASO 3: Email verificado exitosamente (verification) */}
                    {currentStep === 3 && mode === 'verification' && (
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
                        </div>
                    )}

                    {/* PASO 4: Contraseña cambiada exitosamente (password_reset) */}
                    {currentStep === 4 && mode === 'password_reset' && (
                        <div className="form-card animate-fade-scale text-center">
                            <div className="form-icon animate-glow" style={{
                                fontSize: '3rem',
                                marginBottom: 'var(--spacing-xl)'
                            }}>
                                <i className="fas fa-check-circle"></i>
                            </div>

                            <h2 className="form-title" style={{ color: 'var(--success)' }}>
                                ¡Contraseña Cambiada!
                            </h2>

                            <p className="form-subtitle">
                                Tu contraseña ha sido actualizada exitosamente.
                                Ahora puedes iniciar sesión con tu nueva contraseña.
                            </p>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => window.location.href = '/login'}
                                    className="btn btn-primary w-full"
                                >
                                    <i className="fas fa-sign-in-alt" style={{ marginRight: 'var(--spacing-sm)' }}></i>
                                    Ir al Login
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