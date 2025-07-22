import React, { useState, useEffect } from 'react';

function Profile({ user = null }) {
   const [formData, setFormData] = useState({
       name: '',
       last_name: '',
       email: '',
       phone: '',
       address: '',
       city: '',
       state: '',
       country: 'MX',
       postal_code: '',
       current_password: '',
       new_password: '',
       new_password_confirmation: '',
       profile_photo: null,
       remove_photo: false
   });

   const [errors, setErrors] = useState({});
   const [isLoading, setIsLoading] = useState(false);
   const [isLoadingData, setIsLoadingData] = useState(true);
   const [showPassword, setShowPassword] = useState(false);
   const [showNewPassword, setShowNewPassword] = useState(false);
   const [successMessage, setSuccessMessage] = useState('');
   const [previewImage, setPreviewImage] = useState('');
   const [showImagePreview, setShowImagePreview] = useState(false);

   // Función para cargar los datos del usuario desde el backend
   const loadUserData = async () => {
       try {
           setIsLoadingData(true);

           const response = await fetch('/profile/get', {
               method: 'GET',
               headers: {
                   'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                   'Content-Type': 'application/json',
                   'Accept': 'application/json',
               }
           });

           const data = await response.json();

           if (response.ok && data.success) {
               const userData = data.user;

               setFormData({
                   name: userData.name || '',
                   last_name: userData.last_name || '',
                   email: userData.email || '',
                   phone: userData.phone || '',
                   address: userData.address || '',
                   city: userData.city || '',
                   state: userData.state || '',
                   country: userData.country || 'MX',
                   postal_code: userData.postal_code || '',
                   current_password: '',
                   new_password: '',
                   new_password_confirmation: '',
                   profile_photo: null,
                   remove_photo: false
               });

               // Establecer la imagen de perfil si existe
               if (userData.profile_photo) {
                   setPreviewImage(`/storage/${userData.profile_photo}`);
               } else {
                   setPreviewImage('');
               }
           }
       } catch (error) {
           console.error('Error loading user data:', error);
       } finally {
           setIsLoadingData(false);
       }
   };

   // Cargar datos del usuario al montar el componente
   useEffect(() => {
       loadUserData();
   }, []);

   const handleInputChange = (e) => {
       const { name, value } = e.target;

       setFormData(prev => ({
           ...prev,
           [name]: value
       }));

       if (errors[name]) {
           setErrors(prev => ({
               ...prev,
               [name]: ''
           }));
       }
   };

   const handleImageChange = (e) => {
       const file = e.target.files[0];
       if (file) {
           setFormData(prev => ({
               ...prev,
               profile_photo: file,
               remove_photo: false
           }));

           const reader = new FileReader();
           reader.onload = (e) => {
               setPreviewImage(e.target.result);
           };
           reader.readAsDataURL(file);
       }
   };

   const handleRemoveImage = async () => {
        console.log('🔄 Iniciando eliminación de foto...');

        try {
            setIsLoading(true);
            setErrors({});

            const formDataToSend = new FormData();

            formDataToSend.append('name', formData.name);
            formDataToSend.append('last_name', formData.last_name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('phone', formData.phone);
            formDataToSend.append('address', formData.address || '');
            formDataToSend.append('city', formData.city || '');
            formDataToSend.append('state', formData.state || '');
            formDataToSend.append('country', formData.country);
            formDataToSend.append('postal_code', formData.postal_code || '');
            formDataToSend.append('remove_photo', 'true');

            console.log('📤 Enviando petición...');

            const response = await fetch('/profile/update', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: formDataToSend
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            const data = await response.json();
            console.log('📦 Response data:', data);

            if (response.ok && data.success) {
                console.log('✅ Eliminación exitosa');
                console.log('👤 Usuario actualizado:', data.user);
                console.log('🖼️ Foto en respuesta:', data.user.profile_photo);

                setSuccessMessage('Foto eliminada exitosamente');

                setTimeout(() => {
                    console.log('🔄 Recargando página...');
                    window.location.reload();
                }, 1000);

            } else {
                console.error('❌ Error en respuesta:', data);
                setErrors(data.errors || { general: 'Error al eliminar la foto' });
            }
        } catch (error) {
            console.error('💥 Error en catch:', error);
            setErrors({ general: 'Error al eliminar la foto. Inténtalo de nuevo.' });
        } finally {
            setIsLoading(false);
            console.log('🏁 Proceso terminado');
        }
    };

   const handleSubmit = async (e) => {
       e.preventDefault();

       setIsLoading(true);
       setErrors({});
       setSuccessMessage('');

       try {
           const formDataToSend = new FormData();

           // Agregar todos los campos al FormData
           Object.keys(formData).forEach(key => {
               if (key === 'remove_photo') {
                   formDataToSend.append(key, formData[key] ? 'true' : 'false');
               } else if (formData[key] !== null && formData[key] !== '') {
                   formDataToSend.append(key, formData[key]);
               }
           });

           const response = await fetch('/profile/update', {
               method: 'POST',
               headers: {
                   'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
               },
               body: formDataToSend
           });

           const data = await response.json();

           if (response.ok && data.success) {
               setSuccessMessage('Perfil actualizado exitosamente');
               setFormData(prev => ({
                   ...prev,
                   current_password: '',
                   new_password: '',
                   new_password_confirmation: '',
                   remove_photo: false
               }));

               // Actualizar imagen según respuesta del servidor
               if (data.user.profile_photo) {
                   setPreviewImage(`/storage/${data.user.profile_photo}`);
               } else {
                   setPreviewImage('');
               }

               // Limpiar mensaje después de 3 segundos
               setTimeout(() => {
                   setSuccessMessage('');
               }, 3000);
           } else {
               setErrors(data.errors || {});
           }
       } catch (error) {
           console.error('Error:', error);
           setErrors({ general: 'Error al actualizar el perfil. Inténtalo de nuevo.' });
       } finally {
           setIsLoading(false);
       }
   };

   // Mostrar loading mientras se cargan los datos
   if (isLoadingData) {
       return (
           <div className="container" style={{
               minHeight: '100vh',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
           }}>
               <div style={{ textAlign: 'center' }}>
                   <div className="loading-spinner" style={{
                       borderTopColor: 'var(--primary)',
                       margin: '0 auto',
                       marginBottom: 'var(--spacing-md)'
                   }}></div>
                   <p style={{ color: 'var(--text-tertiary)' }}>Cargando perfil...</p>
               </div>
           </div>
       );
   }

   return (
       <div className="section" style={{
           background: 'var(--bg-secondary)',
           minHeight: '100vh',
           paddingTop: '2rem',
           paddingBottom: '2rem'
       }}>
           <div className="container">
               {/* Header */}
               <div style={{ marginBottom: '2rem' }}>
                   <h1 className="section-title" style={{
                       textAlign: 'left',
                       marginBottom: 'var(--spacing-sm)'
                   }}>
                       Mi Perfil
                   </h1>
                   <p className="section-subtitle" style={{
                       textAlign: 'left',
                       marginBottom: 0,
                       maxWidth: 'none'
                   }}>
                       Actualiza tu información personal y configuración de cuenta
                   </p>
               </div>

               {/* Mensaje de éxito */}
               {successMessage && (
                   <div className="alert-success" style={{ marginBottom: 'var(--spacing-lg)' }}>
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
                   <div className="alert-error" style={{ marginBottom: 'var(--spacing-lg)' }}>
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

               <form onSubmit={handleSubmit}>
                   {/* Información Personal */}
                   <div className="form-card" style={{ marginBottom: '2rem' }}>
                       <div style={{
                           padding: 'var(--spacing-lg)',
                           borderBottom: '1px solid var(--border-primary)',
                           marginBottom: 'var(--spacing-lg)'
                       }}>
                           <h3 style={{
                               fontSize: 'var(--font-size-xl)',
                               fontWeight: '600',
                               color: 'var(--text-primary)',
                               margin: 0,
                               marginBottom: 'var(--spacing-xs)'
                           }}>
                               Información Personal
                           </h3>
                           <p style={{
                               fontSize: 'var(--font-size-sm)',
                               color: 'var(--text-tertiary)',
                               margin: 0
                           }}>
                               Actualiza tu información personal básica
                           </p>
                       </div>

                       <div>
                           {/* Foto de perfil */}
                           <div style={{ marginBottom: '2rem' }}>
                               <div style={{
                                   display: 'flex',
                                   alignItems: 'flex-start',
                                   gap: '2rem',
                                   marginBottom: '2rem',
                                   flexWrap: 'wrap'
                               }}>
                                   <div style={{
                                       display: 'flex',
                                       flexDirection: 'column',
                                       alignItems: 'center',
                                       gap: '1rem'
                                   }}>
                                       <div style={{
                                           width: '6rem',
                                           height: '6rem',
                                           borderRadius: 'var(--radius-full)',
                                           overflow: 'hidden',
                                           background: 'var(--bg-tertiary)',
                                           border: `2px solid var(--primary)`
                                       }}>
                                           {previewImage ? (
                                               <img
                                                   src={previewImage}
                                                   alt="Foto de perfil"
                                                   style={{
                                                       width: '100%',
                                                       height: '100%',
                                                       objectFit: 'cover',
                                                       cursor: 'pointer'
                                                   }}
                                                   onClick={() => setShowImagePreview(true)}
                                               />
                                           ) : (
                                               <div style={{
                                                   width: '100%',
                                                   height: '100%',
                                                   display: 'flex',
                                                   alignItems: 'center',
                                                   justifyContent: 'center'
                                               }}>
                                                   <svg
                                                       style={{ width: '3rem', height: '3rem', color: 'var(--text-tertiary)' }}
                                                       fill="currentColor"
                                                       viewBox="0 0 20 20"
                                                   >
                                                       <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                   </svg>
                                               </div>
                                           )}
                                       </div>

                                       <div style={{
                                           display: 'flex',
                                           gap: 'var(--spacing-md)',
                                           flexWrap: 'wrap',
                                           justifyContent: 'center'
                                       }}>
                                           <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                                               <svg
                                                   style={{ width: '1rem', height: '1rem' }}
                                                   fill="none"
                                                   stroke="currentColor"
                                                   viewBox="0 0 24 24"
                                               >
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                               </svg>
                                               Subir foto
                                               <input
                                                   type="file"
                                                   name="profile_photo"
                                                   accept="image/*"
                                                   onChange={handleImageChange}
                                                   disabled={isLoading}
                                                   style={{ display: 'none' }}
                                               />
                                           </label>

                                           {previewImage && (
                                               <button
                                                   type="button"
                                                   onClick={handleRemoveImage}
                                                   className="btn btn-danger"
                                                   disabled={isLoading}
                                               >
                                                   <svg
                                                       style={{ width: '1rem', height: '1rem' }}
                                                       fill="none"
                                                       stroke="currentColor"
                                                       viewBox="0 0 24 24"
                                                   >
                                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                   </svg>
                                                   {isLoading ? 'Eliminando...' : 'Eliminar'}
                                               </button>
                                           )}
                                       </div>
                                   </div>

                                   <div>
                                       <h4 style={{
                                           fontSize: 'var(--font-size-sm)',
                                           fontWeight: '500',
                                           color: 'var(--text-primary)',
                                           margin: 0,
                                           marginBottom: 'var(--spacing-xs)'
                                       }}>
                                           Foto de perfil
                                       </h4>
                                       <p style={{
                                           fontSize: 'var(--font-size-sm)',
                                           color: 'var(--text-secondary)',
                                           margin: 0,
                                           marginBottom: 'var(--spacing-xs)'
                                       }}>
                                           JPG, PNG o GIF. Máximo 5MB.
                                       </p>
                                       <p style={{
                                           fontSize: 'var(--font-size-xs)',
                                           color: 'var(--text-tertiary)',
                                           margin: 0,
                                           fontStyle: 'italic'
                                       }}>
                                           Haz clic en la imagen para ver vista previa
                                       </p>
                                   </div>
                               </div>
                           </div>

                           {/* Nombre y Apellido */}
                           <div className="form-row" style={{ marginBottom: 'var(--spacing-lg)' }}>
                               <div className="form-group">
                                   <label htmlFor="name" className="form-label">
                                       Nombre *
                                   </label>
                                   <input
                                       type="text"
                                       name="name"
                                       id="name"
                                       value={formData.name}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.name ? 'error' : ''}`}
                                   />
                                   {errors.name && <p className="error-text">{errors.name}</p>}
                               </div>

                               <div className="form-group">
                                   <label htmlFor="last_name" className="form-label">
                                       Apellido *
                                   </label>
                                   <input
                                       type="text"
                                       name="last_name"
                                       id="last_name"
                                       value={formData.last_name}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.last_name ? 'error' : ''}`}
                                   />
                                   {errors.last_name && <p className="error-text">{errors.last_name}</p>}
                               </div>
                           </div>

                           {/* Email y Teléfono */}
                           <div className="form-row" style={{ marginBottom: 'var(--spacing-lg)' }}>
                               <div className="form-group">
                                   <label htmlFor="email" className="form-label">
                                       Email *
                                   </label>
                                   <input
                                       type="email"
                                       name="email"
                                       id="email"
                                       value={formData.email}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.email ? 'error' : ''}`}
                                   />
                                   {errors.email && <p className="error-text">{errors.email}</p>}
                               </div>

                               <div className="form-group">
                                   <label htmlFor="phone" className="form-label">
                                       Teléfono *
                                   </label>
                                   <input
                                       type="tel"
                                       name="phone"
                                       id="phone"
                                       value={formData.phone}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.phone ? 'error' : ''}`}
                                   />
                                   {errors.phone && <p className="error-text">{errors.phone}</p>}
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Dirección */}
                   <div className="form-card" style={{ marginBottom: '2rem' }}>
                       <div style={{
                           padding: 'var(--spacing-lg)',
                           borderBottom: '1px solid var(--border-primary)',
                           marginBottom: 'var(--spacing-lg)'
                       }}>
                           <h3 style={{
                               fontSize: 'var(--font-size-xl)',
                               fontWeight: '600',
                               color: 'var(--text-primary)',
                               margin: 0,
                               marginBottom: 'var(--spacing-xs)'
                           }}>
                               Dirección
                           </h3>
                           <p style={{
                               fontSize: 'var(--font-size-sm)',
                               color: 'var(--text-tertiary)',
                               margin: 0
                           }}>
                               Información de ubicación
                           </p>
                       </div>

                       <div>
                           <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                               <label htmlFor="address" className="form-label">
                                   Dirección
                               </label>
                               <input
                                   type="text"
                                   name="address"
                                   id="address"
                                   value={formData.address}
                                   onChange={handleInputChange}
                                   className={`form-input ${errors.address ? 'error' : ''}`}
                               />
                               {errors.address && <p className="error-text">{errors.address}</p>}
                           </div>

                           <div className="form-row" style={{ marginBottom: 'var(--spacing-lg)' }}>
                               <div className="form-group">
                                   <label htmlFor="city" className="form-label">
                                       Ciudad
                                   </label>
                                   <input
                                       type="text"
                                       name="city"
                                       id="city"
                                       value={formData.city}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.city ? 'error' : ''}`}
                                   />
                                   {errors.city && <p className="error-text">{errors.city}</p>}
                               </div>

                               <div className="form-group">
                                   <label htmlFor="state" className="form-label">
                                       Estado
                                   </label>
                                   <input
                                       type="text"
                                       name="state"
                                       id="state"
                                       value={formData.state}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.state ? 'error' : ''}`}
                                   />
                                   {errors.state && <p className="error-text">{errors.state}</p>}
                               </div>
                           </div>

                           <div className="form-row">
                               <div className="form-group">
                                   <label htmlFor="country" className="form-label">
                                       País
                                   </label>
                                   <select
                                       name="country"
                                       id="country"
                                       value={formData.country}
                                       onChange={handleInputChange}
                                       className={`form-select ${errors.country ? 'error' : ''}`}
                                   >
                                       <option value="MX">México</option>
                                       <option value="US">Estados Unidos</option>
                                       <option value="CA">Canadá</option>
                                       <option value="ES">España</option>
                                       <option value="AR">Argentina</option>
                                       <option value="CO">Colombia</option>
                                       <option value="PE">Perú</option>
                                       <option value="CL">Chile</option>
                                   </select>
                                   {errors.country && <p className="error-text">{errors.country}</p>}
                               </div>

                               <div className="form-group">
                                   <label htmlFor="postal_code" className="form-label">
                                       Código Postal
                                   </label>
                                   <input
                                       type="text"
                                       name="postal_code"
                                       id="postal_code"
                                       value={formData.postal_code}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.postal_code ? 'error' : ''}`}
                                   />
                                   {errors.postal_code && <p className="error-text">{errors.postal_code}</p>}
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Cambio de Contraseña */}
                   <div className="form-card" style={{ marginBottom: '2rem' }}>
                       <div style={{
                           padding: 'var(--spacing-lg)',
                           borderBottom: '1px solid var(--border-primary)',
                           marginBottom: 'var(--spacing-lg)'
                       }}>
                           <h3 style={{
                               fontSize: 'var(--font-size-xl)',
                               fontWeight: '600',
                               color: 'var(--text-primary)',
                               margin: 0,
                               marginBottom: 'var(--spacing-xs)'
                           }}>
                               Cambiar Contraseña
                           </h3>
                           <p style={{
                               fontSize: 'var(--font-size-sm)',
                               color: 'var(--text-tertiary)',
                               margin: 0
                           }}>
                               Deja en blanco si no quieres cambiar la contraseña
                           </p>
                       </div>

                       <div>
                           <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                               <label htmlFor="current_password" className="form-label">
                                   Contraseña Actual
                               </label>
                               <div style={{ position: 'relative' }}>
                                   <input
                                       type={showPassword ? "text" : "password"}
                                       name="current_password"
                                       id="current_password"
                                       value={formData.current_password}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.current_password ? 'error' : ''}`}
                                       style={{ paddingRight: '2.5rem' }}
                                   />
                                   <button
                                       type="button"
                                       style={{
                                           position: 'absolute',
                                           right: 0,
                                           top: 0,
                                           height: '100%',
                                           padding: '0 0.75rem',
                                           display: 'flex',
                                           alignItems: 'center',
                                           background: 'none',
                                           border: 'none',
                                           cursor: 'pointer',
                                           color: 'var(--text-tertiary)'
                                       }}
                                       onClick={() => setShowPassword(!showPassword)}
                                   >
                                       {showPassword ? (
                                           <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                           </svg>
                                       ) : (
                                           <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                           </svg>
                                       )}
                                   </button>
                               </div>
                               {errors.current_password && <p className="error-text">{errors.current_password}</p>}
                           </div>

                           <div className="form-row">
                               <div className="form-group">
                                   <label htmlFor="new_password" className="form-label">
                                       Nueva Contraseña
                                   </label>
                                   <div style={{ position: 'relative' }}>
                                       <input
                                           type={showNewPassword ? "text" : "password"}
                                           name="new_password"
                                           id="new_password"
                                           value={formData.new_password}
                                           onChange={handleInputChange}
                                           className={`form-input ${errors.new_password ? 'error' : ''}`}
                                           style={{ paddingRight: '2.5rem' }}
                                       />
                                       <button
                                           type="button"
                                           style={{
                                               position: 'absolute',
                                               right: 0,
                                               top: 0,
                                               height: '100%',
                                               padding: '0 0.75rem',
                                               display: 'flex',
                                               alignItems: 'center',
                                               background: 'none',
                                               border: 'none',
                                               cursor: 'pointer',
                                               color: 'var(--text-tertiary)'
                                           }}
                                           onClick={() => setShowNewPassword(!showNewPassword)}
                                       >
                                           {showNewPassword ? (
                                               <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                               </svg>
                                           ) : (
                                               <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                               </svg>
                                           )}
                                       </button>
                                   </div>
                                   {errors.new_password && <p className="error-text">{errors.new_password}</p>}
                               </div>

                               <div className="form-group">
                                   <label htmlFor="new_password_confirmation" className="form-label">
                                       Confirmar Nueva Contraseña
                                   </label>
                                   <input
                                       type="password"
                                       name="new_password_confirmation"
                                       id="new_password_confirmation"
                                       value={formData.new_password_confirmation}
                                       onChange={handleInputChange}
                                       className={`form-input ${errors.new_password_confirmation ? 'error' : ''}`}
                                   />
                                   {errors.new_password_confirmation && <p className="error-text">{errors.new_password_confirmation}</p>}
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Botones de acción */}
                   <div className="form-actions">
                       <button
                           type="button"
                           onClick={() => window.history.back()}
                           className="btn btn-secondary"
                       >
                           Cancelar
                       </button>
                       <button
                           type="submit"
                           disabled={isLoading}
                           className="btn btn-primary"
                       >
                           {isLoading ? (
                               <>
                                   <div className="loading-spinner"></div>
                                   Actualizando...
                               </>
                           ) : (
                               'Actualizar Perfil'
                           )}
                       </button>
                   </div>
               </form>

               {/* Modal de vista previa de imagen */}
               {showImagePreview && previewImage && (
                   <div
                       style={{
                           position: 'fixed',
                           top: 0,
                           left: 0,
                           right: 0,
                           bottom: 0,
                           backgroundColor: 'var(--overlay)',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           zIndex: 1000
                       }}
                       onClick={() => setShowImagePreview(false)}
                   >
                       <div
                           style={{
                               background: 'var(--bg-primary)',
                               borderRadius: 'var(--radius-lg)',
                               maxWidth: '90vw',
                               maxHeight: '90vh',
                               display: 'flex',
                               flexDirection: 'column',
                               overflow: 'hidden',
                               border: '1px solid var(--border-primary)',
                               boxShadow: 'var(--shadow-2xl)'
                           }}
                           onClick={(e) => e.stopPropagation()}
                       >
                           <div style={{
                               display: 'flex',
                               justifyContent: 'space-between',
                               alignItems: 'center',
                               padding: 'var(--spacing-md) var(--spacing-lg)',
                               borderBottom: '1px solid var(--border-primary)'
                           }}>
                               <h3 style={{
                                   margin: 0,
                                   fontSize: 'var(--font-size-lg)',
                                   fontWeight: '600',
                                   color: 'var(--text-primary)'
                               }}>
                                   Vista previa de la foto
                               </h3>
                               <button
                                   type="button"
                                   onClick={() => setShowImagePreview(false)}
                                   style={{
                                       background: 'none',
                                       border: 'none',
                                       cursor: 'pointer',
                                       color: 'var(--text-tertiary)',
                                       padding: 'var(--spacing-xs)',
                                       borderRadius: 'var(--radius-sm)',
                                       transition: 'all var(--transition-fast)'
                                   }}
                               >
                                   <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                   </svg>
                               </button>
                           </div>
                           <div style={{
                               padding: 'var(--spacing-lg)',
                               display: 'flex',
                               justifyContent: 'center',
                               alignItems: 'center',
                               minHeight: '300px'
                           }}>
                               <img
                                   src={previewImage}
                                   alt="Vista previa"
                                   style={{
                                       maxWidth: '100%',
                                       maxHeight: '60vh',
                                       objectFit: 'contain',
                                       borderRadius: 'var(--radius-md)',
                                       boxShadow: 'var(--shadow-lg)'
                                   }}
                               />
                           </div>
                           <div style={{
                               display: 'flex',
                               justifyContent: 'flex-end',
                               gap: 'var(--spacing-md)',
                               padding: 'var(--spacing-md) var(--spacing-lg)',
                               borderTop: '1px solid var(--border-primary)'
                           }}>
                               <button
                                   type="button"
                                   onClick={() => setShowImagePreview(false)}
                                   className="btn btn-secondary"
                               >
                                   Cerrar
                               </button>
                               <button
                                   type="button"
                                   onClick={async () => {
                                       setShowImagePreview(false);
                                       await handleRemoveImage();
                                   }}
                                   className="btn btn-danger"
                                   disabled={isLoading}
                               >
                                   {isLoading ? 'Eliminando...' : 'Eliminar foto'}
                               </button>
                           </div>
                       </div>
                   </div>
               )}
           </div>
       </div>
   );
}

export default Profile;
