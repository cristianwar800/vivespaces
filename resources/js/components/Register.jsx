import React, { useState, useEffect } from 'react';
// Importar el CSS global

function Register() {
    const [darkMode, setDarkMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        terms: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Aplicar tema inicial
        const savedTheme = localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

        setDarkMode(savedTheme === 'dark');

        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);

        if (newDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Limpiar errores cuando el usuario empiece a escribir
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
        if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es requerido';
        if (!formData.email.trim()) newErrors.email = 'El email es requerido';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
        if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
        if (!formData.password) newErrors.password = 'La contraseña es requerida';
        else if (formData.password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
        if (!formData.terms) newErrors.terms = 'Debe aceptar los términos';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Obtener CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message || '¡Cuenta creada exitosamente! Te hemos enviado un código de verificación.');

                // 🆕 SIEMPRE REDIRIGIR A VERIFICACIÓN DE EMAIL CON PARÁMETRO from_register
                setTimeout(() => {
                    window.location.href = `/verify-email?email=${encodeURIComponent(formData.email)}&from_register=1`;
                }, 2000);
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrorMessage(data.message || 'Error al crear la cuenta');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
     };

    return (
        <div className="h-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 transition-all duration-500">
            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-20 animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
            </div>

            <div className="min-h-full flex flex-col relative z-10">
                {/* Main Content */}
                <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-md w-full space-y-8 animate-slide-up">
                        {/* Header Section */}
                        <div className="text-center">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-glow">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
                                Crea tu cuenta
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                Únete hoy y comienza a gestionar tus propiedades
                            </p>
                        </div>

                        {/* Registration Form Card */}
                        <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 shadow-2xl rounded-3xl px-10 py-10 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-3xl transition-all duration-500">
                            {/* Error Messages */}
                            {errorMessage && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
                                    {errorMessage}
                                </div>
                            )}

                            {/* Success Message */}
                            {successMessage && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm mb-6">
                                    {successMessage}
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Name Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Nombre
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className={`w-full px-4 py-4 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 ${
                                                errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                                            }`}
                                            placeholder="Tu nombre"
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Apellido
                                        </label>
                                        <input
                                            id="last_name"
                                            name="last_name"
                                            type="text"
                                            value={formData.last_name}
                                            onChange={handleInputChange}
                                            required
                                            className={`w-full px-4 py-4 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 ${
                                                errors.last_name ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                                            }`}
                                            placeholder="Tu apellido"
                                        />
                                        {errors.last_name && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.last_name}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Correo electrónico
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className={`w-full px-4 py-4 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 ${
                                            errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                        placeholder="tucorreo@ejemplo.com"
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Teléfono
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        className={`w-full px-4 py-4 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 ${
                                            errors.phone ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                        placeholder="+52 33 1234 5678"
                                    />
                                    {errors.phone && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                                    )}
                                </div>

                                {/* Password */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            className={`w-full px-4 py-4 pr-12 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 ${
                                                errors.password ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                                            }`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Mínimo 8 caracteres</p>
                                    {errors.password && (
                                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                                    )}
                                </div>

                                {/* Terms */}
                                <div className="flex items-start">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        checked={formData.terms}
                                        onChange={handleInputChange}
                                        required
                                        className={`h-5 w-5 mt-1 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 ${
                                            errors.terms ? 'border-red-500' : ''
                                        }`}
                                    />
                                    <label htmlFor="terms" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                        Acepto los <a href="#" className="text-emerald-600 hover:text-emerald-500 font-medium">Términos y Condiciones</a> y la <a href="#" className="text-emerald-600 hover:text-emerald-500 font-medium">Política de Privacidad</a>
                                    </label>
                                </div>
                                {errors.terms && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{errors.terms}</p>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-gray-800 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <span>{isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}</span>
                                    {isLoading && (
                                        <svg className="animate-spin ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer Link */}
                        <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                ¿Ya tienes una cuenta?
                                <a href="/login" className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors ml-1">
                                    Inicia sesión aquí
                                </a>
                            </p>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                            © 2025 ViveSpaces. Todos los derechos reservados.
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default Register;
