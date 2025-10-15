import React, { useState } from 'react';

const Contacto = () => {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        mensaje: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Limpiar error del campo cuando el usuario empiece a escribir
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El email es obligatorio';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'El email debe tener un formato válido';
        }

        if (!formData.mensaje.trim()) {
            newErrors.mensaje = 'El mensaje es obligatorio';
        } else if (formData.mensaje.length > 1000) {
            newErrors.mensaje = 'El mensaje no puede exceder los 1000 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch('/contacto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                setMessage('¡Mensaje enviado correctamente! Nos pondremos en contacto contigo pronto.');
                setMessageType('success');
                setFormData({ nombre: '', email: '', mensaje: '' });
                setErrors({});
            } else {
                setMessage(result.message || 'Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
                setMessageType('error');

                // Si hay errores de validación del servidor
                if (result.errors) {
                    setErrors(result.errors);
                }
            }
        } catch (error) {
            setMessage('Error de conexión. Por favor, verifica tu internet e inténtalo de nuevo.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ nombre: '', email: '', mensaje: '' });
        setErrors({});
        setMessage('');
        setMessageType('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 transition-all duration-500 py-12">
            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-2">
                            Contáctanos
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">¿Tienes alguna pregunta? Estamos aquí para ayudarte.</p>
                    </div>

                    {/* Mensajes de éxito/error */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-xl border backdrop-blur-sm ${messageType === 'success'
                                ? 'bg-emerald-100/80 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                                : 'bg-red-100/80 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                            }`}>
                            <div className="flex items-center justify-between">
                                <span>{message}</span>
                                <button
                                    onClick={resetForm}
                                    className="text-sm underline hover:no-underline opacity-75 hover:opacity-100 transition-opacity"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Campo Nombre */}
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Nombre completo *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                id="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-xl shadow-sm bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                                    errors.nombre
                                        ? 'border-red-500 dark:border-red-400'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                                }`}
                                placeholder="Tu nombre completo"
                                disabled={loading}
                            />
                            {errors.nombre && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.nombre}</p>
                            )}
                        </div>

                        {/* Campo Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Correo electrónico *
                            </label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-xl shadow-sm bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                                    errors.email
                                        ? 'border-red-500 dark:border-red-400'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                                }`}
                                placeholder="tu@email.com"
                                disabled={loading}
                            />
                            {errors.email && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                            )}
                        </div>

                        {/* Campo Mensaje */}
                        <div>
                            <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Mensaje *
                            </label>
                            <textarea
                                name="mensaje"
                                id="mensaje"
                                value={formData.mensaje}
                                onChange={handleChange}
                                rows="6"
                                className={`w-full px-4 py-3 border rounded-xl shadow-sm bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none ${
                                    errors.mensaje
                                        ? 'border-red-500 dark:border-red-400'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                                }`}
                                placeholder="Cuéntanos en qué podemos ayudarte..."
                                disabled={loading}
                            />
                            {errors.mensaje && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.mensaje}</p>
                            )}
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {formData.mensaje.length}/1000 caracteres
                            </p>
                        </div>

                        {/* Botón de envío */}
                        <div className="flex items-center justify-between pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg ${
                                    loading
                                        ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500 dark:focus:ring-emerald-400 shadow-emerald-500/25'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                        </svg>
                                        Enviar mensaje
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Información de contacto adicional */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Otras formas de contactarnos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-300">
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800 hover:shadow-lg transition-all duration-300">
                                    <svg className="w-8 h-8 mx-auto mb-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Email</p>
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs break-words leading-relaxed">
                                        vivespaces<br />soporte@gmail.com
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-teal-100 dark:border-teal-800 hover:shadow-lg transition-all duration-300">
                                    <svg className="w-8 h-8 mx-auto mb-3 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">Ubicación</p>
                                    <p className="font-semibold text-teal-600 dark:text-teal-400">Zapopan, Jalisco</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contacto;
