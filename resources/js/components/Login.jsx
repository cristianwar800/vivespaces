import React, { useState, useEffect } from 'react';

function Login() {
    const [darkMode, setDarkMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        remember: false
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

        // Efectos de scroll y mouse
        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            const floatingElement = document.querySelector('.animate-float');
            if (floatingElement) {
                floatingElement.style.transform = `translateY(${rate}px)`;
            }
        };

        const handleMouseMove = (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            const orbs = document.querySelectorAll('.animate-float');
            orbs.forEach((orb, index) => {
                const speed = (index + 1) * 0.02;
                const transform = orb.style.transform || '';
                orb.style.transform = transform + ` translate(${mouseX * speed * 10}px, ${mouseY * speed * 10}px)`;
            });
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
        };
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Obtener CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const response = await fetch('/login', {
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
                setSuccessMessage(data.message || '¡Inicio de sesión exitoso!');

                // Redireccionar después de 1 segundo
                setTimeout(() => {
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 1000);
            } else {
                setErrorMessage(data.message || 'Credenciales incorrectas');
                if (data.errors) {
                    setErrors(data.errors);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage('Error de conexión. Por favor intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const styles = `
        @import 'https://cdn.tailwindcss.com';

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }

        @keyframes glow {
            0% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
            100% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.6); }
        }

        @keyframes slideUp {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }

        .animate-float {
            animation: float 6s ease-in-out infinite;
        }

        .animate-glow {
            animation: glow 2s ease-in-out infinite alternate;
        }

        .animate-slide-up {
            animation: slideUp 0.5s ease-out;
        }

        .animate-fade-in {
            animation: fadeIn 0.8s ease-out;
        }
    `;

    return (
        <>
            <style>{styles}</style>
            <div className="h-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 transition-all duration-500">
                {/* Background Elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    {/* Floating Orbs */}
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-20 animate-float"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
                    <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full opacity-20 animate-float" style={{animationDelay: '4s'}}></div>

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Cg fill=%22%23e5e7eb%22 fill-opacity=%220.1%22%3E%3Cpath d=%22m0 40 40-40h-40v40z%22/%3E%3C/g%3E%3C/svg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Cg fill=%22%234b5563%22 fill-opacity=%220.1%22%3E%3Cpath d=%22m0 40 40-40h-40v40z%22/%3E%3C/g%3E%3C/svg%3E')]"></div>
                </div>

                <div className="min-h-full flex flex-col relative z-10">

                

                    {/* Main Content */}
                    <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                        <div className="max-w-md w-full space-y-8 animate-slide-up">
                            {/* Header Section */}
                            <div className="text-center">
                                {/* Icon */}
                                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-glow">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>

                                {/* Title */}
                                <h2 className="text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
                                    Bienvenido de vuelta
                                </h2>
                                <p className="text-lg text-gray-600 dark:text-gray-400">
                                    Inicia sesión para encontrar tu hogar ideal
                                </p>
                            </div>

                            {/* Login Form Card */}
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

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Email Field */}
                                    <div className="group">
                                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Correo electrónico
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                className={`w-full px-4 py-4 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 group-hover:border-emerald-300 ${
                                                    errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                                                }`}
                                                placeholder="tucorreo@ejemplo.com"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                </svg>
                                            </div>
                                        </div>
                                        {errors.email && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="group">
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
                                                className={`w-full px-4 py-4 pr-12 border-2 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700/50 dark:text-white transition-all duration-300 group-hover:border-emerald-300 ${
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
                                        {errors.password && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                                        )}
                                    </div>

                                    {/* Remember Me & Forgot Password */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                id="remember"
                                                name="remember"
                                                type="checkbox"
                                                checked={formData.remember}
                                                onChange={handleInputChange}
                                                className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                                            />
                                            <label htmlFor="remember" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                                Recordarme
                                            </label>
                                        </div>

                                        <a href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors">
                                            ¿Olvidaste tu contraseña?
                                        </a>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-gray-800 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        <span>{isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
                                        {isLoading && (
                                            <svg className="animate-spin ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Benefits Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                <div className="p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Acceso Instantáneo</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Encuentra propiedades al instante</p>
                                </div>

                                <div className="p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Seguro y Confiable</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Tu información está protegida</p>
                                </div>

                                <div className="p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Soporte Experto</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Asesoría personalizada 24/7</p>
                                </div>
                            </div>

                            {/* Footer Links */}
                            <div className="text-center space-y-6">
                                {/* Register Link */}
                                <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        ¿No tienes una cuenta?
                                        <a href="/register" className="font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors ml-1">
                                            Regístrate aquí
                                        </a>
                                    </p>
                                </div>

                                {/* Legal Links */}
                                <div className="flex justify-center space-x-8 text-sm">
                                    <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors font-medium">
                                        Política de Privacidad
                                    </a>
                                    <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors font-medium">
                                        Términos de Servicio
                                    </a>
                                    <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors font-medium">
                                        Centro de Ayuda
                                    </a>
                                </div>
                            </div>
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className="backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50">
                        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    © 2025 ViveSpaces. Todos los derechos reservados.
                                </p>
                                <div className="flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span>🔒 SSL Protegido</span>
                                    <span>📱 Mobile Friendly</span>
                                    <span>⚡ Rápido y Confiable</span>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}

export default Login;
