import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Importar el CSS global

// Componente de botón profesional
const Button = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl focus:ring-emerald-500 transform hover:scale-105',
        secondary: 'bg-transparent border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white focus:ring-emerald-500 transform hover:scale-105',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl focus:ring-red-500 transform hover:scale-105',
        ghost: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
    };

    const sizes = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// Componente para listar propiedades
function PropertiesIndex({ properties, allProperties, user, searchTerm, setSearchTerm, typeFilter, setTypeFilter, roomsFilter, setRoomsFilter, navigate, contactSeller}) {
    return (
        <>
            {/* Header */}
            <header className="page-header">
                <div className="container">
                    <h1 className="page-title font-display">Nuestras Propiedades</h1>
                    <p className="page-subtitle">
                        Explora nuestra amplia selección de propiedades disponibles en las mejores ubicaciones
                    </p>
                </div>
            </header>

            {/* Search and Filter Section */}
            <section className="search-section">
                <div className="container">
                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Buscar por título, ciudad o dirección..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">Tipo de propiedad</option>
                            <option value="casa">Casa</option>
                            <option value="apartamento">Apartamento</option>
                            <option value="condominio">Condominio</option>
                            <option value="oficina">Oficina</option>
                            <option value="local">Local Comercial</option>
                            <option value="terreno">Terreno</option>
                        </select>
                        <select
                            className="filter-select"
                            value={roomsFilter}
                            onChange={(e) => setRoomsFilter(e.target.value)}
                        >
                            <option value="">Habitaciones</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4+">4+</option>
                        </select>
                        {user && (
                            <Button
                                variant="primary"
                                onClick={() => navigate('create')}
                                className="ml-auto"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Nueva Propiedad
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* Properties Section */}
            <section className="properties-section">
                <div className="container">
                    {properties.length > 0 ? (
                        <div className="properties-grid">
                            {properties.map(property => (
                                <PropertyCard
                                    key={property.id}
                                    property={property}
                                    user={user}
                                    navigate={navigate}
                                    contactSeller={contactSeller}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21l4-4 4 4" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13v4" />
                                </svg>
                            </div>
                            <h3 className="empty-title">
                                {allProperties.length === 0 ? 'No hay propiedades disponibles' : 'No se encontraron propiedades'}
                            </h3>
                            <p className="empty-text">
                                {allProperties.length === 0
                                    ? 'Actualmente no tenemos propiedades registradas. Vuelve más tarde para ver nuevas opciones.'
                                    : 'Intenta con otros filtros de búsqueda.'
                                }
                            </p>
                            {user && (
                                <Button variant="primary" onClick={() => navigate('create')}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Registrar Propiedad
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}

// Componente para tarjeta de propiedad
function PropertyCard({ property, user, navigate, contactSeller}) {
    const formatPrice = useCallback((price) => {
        return Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    }, []);

    return (
        <div className="property-card">
            <div className="property-image">
                {property.image ? (
                    <img src={`/storage/${property.image}`} alt={property.title} />
                ) : (
                    <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop" alt="Imagen por defecto" />
                )}
                <div className="property-badge">{property.type}</div>
                <div className={`property-status ${property.is_active ? 'status-active' : 'status-inactive'}`}>
                    {property.is_active ? 'Disponible' : 'No disponible'}
                </div>
            </div>

            <div className="property-content">
                <h3 className="property-title">{property.title}</h3>

                <div className="property-location">
                    <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{property.address}, {property.city}, {property.state}</span>
                </div>

                <div className="property-details">
                    <div className="detail-item">
                        <div className="detail-label">Habitaciones</div>
                        <div className="detail-value">{property.bedrooms || 0}</div>
                    </div>
                    <div className="detail-item">
                        <div className="detail-label">Baños</div>
                        <div className="detail-value">{property.bathrooms || 0}</div>
                    </div>
                    <div className="detail-item">
                        <div className="detail-label">Área</div>
                        <div className="detail-value">{property.area || 0} m²</div>
                    </div>
                </div>

                <div className="property-price">
                    ${formatPrice(property.price)}
                </div>

                <div className="flex space-x-3">
                    <Button
                        variant="primary"
                        onClick={() => navigate('show', property.id)}
                        className="flex-1"
                    >
                        Ver Detalles
                    </Button>

                    {/* Botón Contactar Vendedor - Solo si NO es el propietario */}
                    {user && property.user_id !== user.id && (
                        <Button
                            variant="secondary"
                            onClick={() => contactSeller(property.id, property.user_id)}
                            size="md"
                            className="flex-1"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Contactar
                        </Button>
                    )}

                    {user && property.user_id === user.id && (
                        <Button
                            variant="secondary"
                            onClick={() => navigate('edit', property.id)}
                            size="md"
                            className="px-3"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Componente para mostrar detalles
function PropertyShow({ property, user, navigate, handleDelete }) {
    const formatPrice = useCallback((price) => {
        return Number(price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    }, []);

    if (!property) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Propiedad no encontrada</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">La propiedad que buscas no existe o ha sido eliminada.</p>
                    <Button variant="primary" onClick={() => navigate('index')} className="w-full">
                        Volver a Propiedades
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <header className="page-header">
                <div className="container">
                    <h1 className="page-title font-display">Detalles de la Propiedad</h1>
                    <p className="page-subtitle">Información completa de esta propiedad</p>
                </div>
            </header>

            <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('index')}
                            className="mb-6"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver a Propiedades
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="relative h-96">
                            {property.image ? (
                                <img
                                    src={`/storage/${property.image}`}
                                    alt={property.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop"
                                    alt="Imagen por defecto"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>

                        <div className="p-8">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8">
                                <div className="mb-4 lg:mb-0">
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{property.title}</h2>
                                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-lg">
                                        <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {property.address}, {property.city}, {property.state}, {property.country} {property.postal_code}
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-emerald-500">
                                    ${formatPrice(property.price)} MXN
                                </div>
                            </div>

                            {property.description && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Descripción</h3>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {property.description}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {property.type || 'No especificado'}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Tipo de Propiedad
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {property.bedrooms || 0}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Habitaciones
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {property.bathrooms || 0}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Baños
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {property.area || 0}m²
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        Área
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('index')}
                                    className="flex-1 min-w-[200px]"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    Ver Más Propiedades
                                </Button>

                                {user && property.user_id === user.id && (
                                    <>
                                        <Button
                                            variant="primary"
                                            onClick={() => navigate('edit', property.id)}
                                            className="flex-1 min-w-[200px]"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Editar Propiedad
                                        </Button>
                                        <Button
                                            variant="danger"
                                            onClick={() => handleDelete(property.id)}
                                            className="flex-1 min-w-[200px]"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Eliminar Propiedad
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

// Componente para formulario
function PropertyForm({ formData, handleInputChange, handleSubmit, loading, isEdit, navigate, errors }) {
    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

    return (
        <>
            <header className="page-header">
                <div className="container">
                    <h1 className="page-title font-display">
                        {isEdit ? 'Editar Propiedad' : 'Registrar Propiedad'}
                    </h1>
                    <p className="page-subtitle">
                        {isEdit ? 'Actualiza la información de tu propiedad' : 'Comparte tu propiedad con otros'}
                    </p>
                </div>
            </header>

            <section className="properties-section">
                <div className="container">
                    <div style={{ marginBottom: '2rem' }}>
                        <Button variant="ghost" onClick={() => navigate('index')}>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver a Propiedades
                        </Button>
                    </div>

                    <div className="form-card">
                        <div className="form-header">
                            <div className="form-icon">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isEdit ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    )}
                                </svg>
                            </div>
                            <h2 className="form-title">
                                {isEdit ? 'Editar Información' : 'Nueva Propiedad'}
                            </h2>
                            <p className="form-subtitle">
                                {isEdit ? 'Modifica los datos de tu propiedad' : 'Completa la información de tu propiedad'}
                            </p>
                        </div>

                        {hasErrors && (
                            <div className="alert-error">
                                <strong>Error:</strong> Por favor corrige los siguientes errores:
                                <ul>
                                    {Object.values(errors).flat().map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Información básica */}
                            <div className="form-group">
                                <label className="form-label">Título de la Propiedad *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Ej: Hermosa casa en Roma Norte"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descripción</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="form-textarea"
                                    placeholder="Describe las características principales de tu propiedad..."
                                    rows="4"
                                />
                            </div>

                            {/* Dirección */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Dirección *</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Calle y número"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ciudad *</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Ciudad"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Estado</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Estado"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">País</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="País"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Código Postal</label>
                                <input
                                    type="text"
                                    name="postal_code"
                                    value={formData.postal_code}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Código postal"
                                />
                            </div>

                            {/* Detalles */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Precio (MXN) *</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipo de Propiedad</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="form-select"
                                    >
                                        <option value="">Selecciona el tipo</option>
                                        <option value="casa">Casa</option>
                                        <option value="apartamento">Apartamento</option>
                                        <option value="condominio">Condominio</option>
                                        <option value="oficina">Oficina</option>
                                        <option value="local">Local Comercial</option>
                                        <option value="terreno">Terreno</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Habitaciones</label>
                                    <input
                                        type="number"
                                        name="bedrooms"
                                        value={formData.bedrooms}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Baños</label>
                                    <input
                                        type="number"
                                        name="bathrooms"
                                        value={formData.bathrooms}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="0"
                                        min="0"
                                        step="0.5"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Área (metros cuadrados)</label>
                                <input
                                    type="number"
                                    name="area"
                                    value={formData.area}
                                    onChange={handleInputChange}
                                   className="form-input"
                                   placeholder="0"
                                   min="0"
                               />
                           </div>

                           {/* Imagen */}
                           <div className="form-group">
                               <label className="form-label">Imagen de la Propiedad</label>
                               <input
                                   type="file"
                                   name="image"
                                   onChange={handleInputChange}
                                   className="form-input"
                                   accept="image/*"
                               />
                               <div className="form-help">Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 5MB</div>
                           </div>

                           {/* Estado */}
                           <div className="form-group">
                               <div className="checkbox-group">
                                   <input
                                       type="checkbox"
                                       name="is_active"
                                       checked={formData.is_active}
                                       onChange={handleInputChange}
                                       className="checkbox-input"
                                       id="is_active"
                                   />
                                   <label className="checkbox-label" htmlFor="is_active">
                                       Propiedad disponible para renta
                                   </label>
                               </div>
                           </div>

                           {/* Botones */}
                           <div className="flex flex-col sm:flex-row gap-4 justify-end mt-8">
                               <Button
                                   type="button"
                                   variant="ghost"
                                   onClick={() => navigate('index')}
                                   disabled={loading}
                                   className="sm:w-auto w-full"
                               >
                                   Cancelar
                               </Button>
                               <Button
                                   type="submit"
                                   variant="primary"
                                   disabled={loading}
                                   className="sm:w-auto w-full"
                               >
                                   {loading ? (
                                       <>
                                           <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                           </svg>
                                           {isEdit ? 'Actualizando...' : 'Guardando...'}
                                       </>
                                   ) : (
                                       <>
                                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                           </svg>
                                           {isEdit ? 'Actualizar Propiedad' : 'Guardar Propiedad'}
                                       </>
                                   )}
                               </Button>
                           </div>
                       </form>
                   </div>
               </div>
           </section>
       </>
   );
}

// Componente principal Properties
function Properties() {
   const [appData, setAppData] = useState(() => {
       const dataElement = document.getElementById('properties-data');
       if (dataElement) {
           try {
               return JSON.parse(dataElement.textContent || dataElement.innerText);
           } catch (e) {
               console.error('Error parsing properties data:', e);
               return {};
           }
       }
       return {};
   });

   const [loading, setLoading] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [typeFilter, setTypeFilter] = useState('');
   const [roomsFilter, setRoomsFilter] = useState('');
   const [formData, setFormData] = useState({
       title: '',
       description: '',
       address: '',
       city: '',
       state: '',
       country: '',
       postal_code: '',
       price: '',
       type: '',
       bedrooms: '',
       bathrooms: '',
       area: '',
       image: null,
       is_active: true
   });

   useEffect(() => {
       if (appData.currentPage === 'edit' && appData.property) {
           setFormData(appData.property);
       }
   }, [appData.currentPage, appData.property]);

   const navigate = useCallback((page, propertyId = null) => {
       switch (page) {
           case 'index':
               window.location.href = appData.routes?.index || '/properties';
               break;
           case 'create':
               window.location.href = '/properties/create';
               break;
           case 'show':
               window.location.href = `/properties/${propertyId}`;
               break;
           case 'edit':
               window.location.href = `/properties/${propertyId}/edit`;
               break;
           default:
               console.warn(`Unknown navigation page: ${page}`);
       }
   }, [appData.routes]);

   // Función para contactar al vendedor
   const contactSeller = useCallback(async (propertyId, sellerId) => {
    try {
        console.log('Iniciando conversación...', { propertyId, sellerId });

        const response = await fetch('/api/conversations/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            },
            body: JSON.stringify({
                property_id: propertyId,
                receiver_id: sellerId
            })
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Success:', data);

        alert('¡Conversación iniciada! Redirigiendo al chat...');

        // Redirigir al chat
        window.location.href = `/chat?conversation=${data.conversation.id}`;

    } catch (error) {
        console.error('Error completo:', error);
        alert('Error al iniciar la conversación: ' + error.message);
    }
}, []);

   const handleInputChange = useCallback((e) => {
       const { name, value, type, checked, files } = e.target;

       setFormData(prev => {
           if (type === 'file') {
               return { ...prev, [name]: files[0] };
           } else if (type === 'checkbox') {
               return { ...prev, [name]: checked };
           } else {
               return { ...prev, [name]: value };
           }
       });
   }, []);

   const handleSubmit = useCallback(async (e) => {
       e.preventDefault();
       setLoading(true);

       try {
           const formDataToSend = new FormData();
           Object.keys(formData).forEach(key => {
               if (formData[key] !== null && formData[key] !== '') {
                   if (key === 'is_active') {
                       formDataToSend.append(key, formData[key] ? '1' : '0');
                   } else {
                       formDataToSend.append(key, formData[key]);
                   }
               }
           });

           const url = appData.currentPage === 'edit' ? appData.routes?.update : appData.routes?.store;
           const method = appData.currentPage === 'edit' ? 'PUT' : 'POST';

           if (method === 'PUT') {
               formDataToSend.append('_method', 'PUT');
           }

           const response = await fetch(url, {
               method: 'POST',
               headers: {
                   'X-CSRF-TOKEN': appData.csrfToken,
               },
               body: formDataToSend
           });

           if (response.ok) {
               navigate('index');
           } else {
               const errorData = await response.json();
               console.error('Error submitting form:', errorData);
           }
       } catch (error) {
           console.error('Error:', error);
       } finally {
           setLoading(false);
       }
   }, [formData, appData.currentPage, appData.routes, appData.csrfToken, navigate]);

   const handleDelete = useCallback(async (propertyId) => {
       if (!confirm('¿Estás seguro de que quieres eliminar esta propiedad?')) {
           return;
       }

       try {
           const response = await fetch(appData.routes?.destroy, {
               method: 'POST',
               headers: {
                   'X-CSRF-TOKEN': appData.csrfToken,
                   'Content-Type': 'application/json',
               },
               body: JSON.stringify({ _method: 'DELETE' })
           });

           if (response.ok) {
               navigate('index');
           } else {
               console.error('Error deleting property');
           }
       } catch (error) {
           console.error('Error deleting property:', error);
       }
   }, [appData.routes, appData.csrfToken, navigate]);

   const filteredProperties = useMemo(() => {
       return appData.properties?.filter(property => {
           const matchesSearch = !searchTerm ||
               property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
               property.address.toLowerCase().includes(searchTerm.toLowerCase());

           const matchesType = !typeFilter || property.type === typeFilter;

           const matchesRooms = !roomsFilter ||
               (roomsFilter === '4+' ? property.bedrooms >= 4 : property.bedrooms == roomsFilter);

           return matchesSearch && matchesType && matchesRooms;
       }) || [];
   }, [appData.properties, searchTerm, typeFilter, roomsFilter]);

   const user = useMemo(() => {
       const userDataElement = document.getElementById('user-data');
       if (userDataElement) {
           try {
               return JSON.parse(userDataElement.textContent || userDataElement.innerText);
           } catch (e) {
               return null;
           }
       }
       return null;
   }, []);

   const renderPage = useCallback(() => {
       switch (appData.currentPage) {
           case 'index':
               return (
                   <PropertiesIndex
                       properties={filteredProperties}
                       allProperties={appData.properties || []}
                       user={user}
                       searchTerm={searchTerm}
                       setSearchTerm={setSearchTerm}
                       typeFilter={typeFilter}
                       setTypeFilter={setTypeFilter}
                       roomsFilter={roomsFilter}
                       setRoomsFilter={setRoomsFilter}
                       navigate={navigate}
                       contactSeller={contactSeller}
                   />
               );
           case 'show':
               return (
                   <PropertyShow
                       property={appData.property}
                       user={user}
                       navigate={navigate}
                       handleDelete={handleDelete}
                   />
               );
           case 'edit':
           case 'create':
               return (
                   <PropertyForm
                       formData={formData}
                       handleInputChange={handleInputChange}
                       handleSubmit={handleSubmit}
                       loading={loading}
                       isEdit={appData.currentPage === 'edit'}
                       navigate={navigate}
                       errors={appData.messages?.errors || {}}
                   />
               );
           default:
               return <PropertiesIndex properties={filteredProperties} user={user} navigate={navigate} contactSeller={contactSeller} />;
       }
   }, [appData.currentPage, filteredProperties, appData.properties, appData.property, user, searchTerm, typeFilter, roomsFilter, navigate, handleDelete, formData, handleInputChange, handleSubmit, loading, appData.messages]);

   return (
       <div>
           {renderPage()}
       </div>
   );
}

export default Properties;
