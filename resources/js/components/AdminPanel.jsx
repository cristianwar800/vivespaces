import React, { useState, useEffect } from 'react';

const AdminPanel = ({ user }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [viewingPhotos, setViewingPhotos] = useState(null);

  const Notification = ({ message, type, onClose }) => (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl border transform transition-all duration-300 ${
      type === 'success'
        ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
        : type === 'error'
        ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {type === 'success' && (
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {type === 'error' && (
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium">{message}</span>
        </div>
        <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

  const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = "Confirmar", type = "warning" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
            type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {type === 'danger' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  const RoleSelector = ({ user: userItem, currentRole, onRoleChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isChanging, setIsChanging] = useState(false);

    const roles = [
      { value: 'user', label: 'Usuario', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
      { value: 'landlord', label: 'Propietario', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      { value: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' }
    ];

    const currentRoleData = roles.find(role => role.value === currentRole);

    const handleRoleChange = (newRole) => {
      if (newRole !== currentRole) {
        setIsChanging(true);
        onRoleChange(newRole);
        setIsOpen(false);
      }
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest('.role-selector')) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    return (
      <div className="relative role-selector">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isChanging}
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
            currentRoleData?.color || 'bg-gray-100 text-gray-800'
          } ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isChanging ? 'Cambiando...' : currentRoleData?.label || currentRole}
          <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleChange(role.value)}
                disabled={role.value === currentRole}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                  role.value === currentRole ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : ''
                }`}
              >
                <span className={`px-2 py-1 rounded-full ${role.color}`}>
                  {role.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PropertyEditModal = ({ property, onSave, onCancel }) => {
    const [formData, setFormData] = useState(property || {});

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg w-full mx-4 overflow-y-auto max-h-[90vh]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Editar Propiedad</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors duration-200"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const showConfirmModal = (title, message, onConfirm, type = 'warning', confirmText = 'Confirmar') => {
    setConfirmModal({
      title,
      message,
      onConfirm: () => {
        setConfirmModal(null);
        onConfirm();
      },
      onCancel: () => setConfirmModal(null),
      type,
      confirmText
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Solo los administradores pueden acceder a este panel.
          </p>
          <a
            href="/"
            className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch('/admin/dashboard', {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar datos del dashboard');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch('/admin/users', {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users?.data || data.users || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar usuarios');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      console.log('🔍 DEBUG: Fetching properties from /admin/properties');

      const response = await fetch('/admin/properties', {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      console.log('📡 DEBUG: Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 DEBUG: Raw data received:', data);

        const propertiesArray = data.properties?.data || data.properties || [];
        console.log('🏠 DEBUG: Properties array:', propertiesArray);
        console.log('📊 DEBUG: Number of properties:', propertiesArray.length);

        // Verificar cada propiedad individualmente
        propertiesArray.forEach((property, index) => {
          console.log(`🏡 DEBUG: Property ${index + 1}:`, {
            id: property.id,
            title: property.title,
            photos: property.photos,
            photosCount: property.photos ? property.photos.length : 0,
            photosType: typeof property.photos,
            allKeys: Object.keys(property) // Ver todas las propiedades disponibles
          });

          // Log de la propiedad completa para ver qué campos tiene
          console.log(`📋 DEBUG: Complete property object ${index + 1}:`, property);

          if (property.photos && property.photos.length > 0) {
            property.photos.forEach((photo, photoIndex) => {
              console.log(`📸 DEBUG: Photo ${photoIndex + 1} of property "${property.title}":`, photo);
            });
          } else {
            console.log(`❌ DEBUG: No photos found for property "${property.title}"`);
          }
        });

        setProperties(propertiesArray);
      } else {
        const errorData = await response.json();
        console.error('❌ DEBUG: Error response:', errorData);
        setError(errorData.error || 'Error al cargar propiedades');
      }
    } catch (err) {
      console.error('💥 DEBUG: Fetch error:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSuspension = async (userId, currentSuspended) => {
    const action = currentSuspended ? 'reactivar' : 'suspender';
    const actionCapitalized = currentSuspended ? 'Reactivar' : 'Suspender';

    showConfirmModal(
      `${actionCapitalized} Usuario`,
      `¿Estás seguro de que quieres ${action} este usuario?`,
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/users/${userId}/toggle-suspension`, {
            method: 'PATCH',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
            fetchUsers();
          } else {
            showNotification(data.error || 'Error al cambiar estado del usuario', 'error');
          }
        } catch (err) {
          console.error('Error toggling user suspension:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      currentSuspended ? 'warning' : 'danger',
      actionCapitalized
    );
  };

  const resetUserPassword = async (userId, userName) => {
    showConfirmModal(
      'Resetear Contraseña',
      `¿Estás seguro de que quieres resetear la contraseña de ${userName}? Se enviará una nueva contraseña por email.`,
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
          } else {
            showNotification(data.error || 'Error al resetear contraseña', 'error');
          }
        } catch (err) {
          console.error('Error resetting password:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      'warning',
      'Resetear Contraseña'
    );
  };

  const changeUserRole = async (userId, newRole, userName) => {
    const roleLabels = {
      user: 'Usuario',
      landlord: 'Propietario',
      admin: 'Administrador'
    };

    showConfirmModal(
      'Cambiar Rol de Usuario',
      `¿Estás seguro de que quieres cambiar el rol de ${userName} a ${roleLabels[newRole]}?`,
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/users/${userId}/change-role`, {
            method: 'PATCH',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              new_role: newRole,
              reason: `Cambio manual desde panel de administración`
            })
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
            fetchUsers();
          } else {
            showNotification(data.error || 'Error al cambiar rol del usuario', 'error');
          }
        } catch (err) {
          console.error('Error changing user role:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      'warning',
      'Cambiar Rol'
    );
  };

  const deleteUser = async (userId) => {
    showConfirmModal(
      'Eliminar Usuario',
      '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.',
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
            fetchUsers();
          } else {
            showNotification(data.error || 'Error al eliminar el usuario', 'error');
          }
        } catch (err) {
          console.error('Error deleting user:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      'danger',
      'Eliminar'
    );
  };

  const togglePropertyActive = async (propertyId, currentActive) => {
    const action = currentActive ? 'desactivar' : 'activar';
    const actionCapitalized = currentActive ? 'Desactivar' : 'Activar';

    showConfirmModal(
      `${actionCapitalized} Propiedad`,
      `¿Estás seguro de que quieres ${action} esta propiedad?`,
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/properties/${propertyId}/toggle-active`, {
            method: 'PATCH',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
            fetchProperties();
          } else {
            showNotification(data.error || 'Error al cambiar estado de la propiedad', 'error');
          }
        } catch (err) {
          console.error('Error toggling property active:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      currentActive ? 'danger' : 'warning',
      actionCapitalized
    );
  };

  const deleteProperty = async (propertyId) => {
    showConfirmModal(
      'Eliminar Propiedad',
      '¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.',
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/properties/${propertyId}`, {
            method: 'DELETE',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
            fetchProperties();
          } else {
            showNotification(data.error || 'Error al eliminar la propiedad', 'error');
          }
        } catch (err) {
          console.error('Error deleting property:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      'danger',
      'Eliminar'
    );
  };

  const updateProperty = async (updatedData) => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch(`/admin/properties/${updatedData.id}`, {
        method: 'PATCH',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(data.message, 'success');
        setEditingProperty(null);
        fetchProperties();
      } else {
        showNotification(data.error || 'Error al actualizar la propiedad', 'error');
      }
    } catch (err) {
      console.error('Error updating property:', err);
      showNotification('Error de conexión', 'error');
    }
  };

  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardData();
    } else if (activeSection === 'users') {
      fetchUsers();
    } else if (activeSection === 'properties') {
      fetchProperties();
    }
  }, [activeSection]);

  const sections = {
    dashboard: (
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Bienvenido al panel de administración. Aquí puedes ver un resumen de las métricas clave.</p>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Cargando datos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {dashboardData && !loading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Total Usuarios</h3>
                    <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
                      {dashboardData.stats?.users?.total || 0}
                    </p>
                    <p className="text-sm opacity-75">
                      +{dashboardData.stats?.users?.today || 0} hoy
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Propiedades</h3>
                    <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
                      {dashboardData.stats?.properties?.total || 0}
                    </p>
                    <p className="text-sm opacity-75">
                      +{dashboardData.stats?.properties?.today || 0} hoy
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Mensajes Hoy</h3>
                    <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
                      {dashboardData.stats?.messages?.today || 0}
                    </p>
                    <p className="text-sm opacity-75">Comunicaciones</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Usuarios Activos</h3>
                    <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">
                      {dashboardData.stats?.users?.active || 0}
                    </p>
                    <p className="text-sm opacity-75">Últimos 30 días</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad Reciente</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">Nuevo usuario registrado</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Hace 2 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">Nueva propiedad publicada</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Hace 5 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">Mensaje enviado</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Hace 8 minutos</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Métricas Rápidas</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                      <span>Nuevos Usuarios (Meta: 100)</span>
                      <span>75%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div className="bg-emerald-500 dark:bg-emerald-400 h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                      <span>Propiedades Activas (Meta: 200)</span>
                      <span>60%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div className="bg-emerald-500 dark:bg-emerald-400 h-2 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-900 dark:text-white">
                      <span>Engagement (Meta: 80%)</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div className="bg-emerald-500 dark:bg-emerald-400 h-2 rounded-full" style={{width: '85%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {dashboardData?.recent_users && dashboardData.recent_users.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Usuarios Recientes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Nombre</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recent_users.map((userItem, index) => (
                        <tr key={userItem.id || index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                          <td className="p-4 text-gray-700 dark:text-gray-300">
                            {userItem.name} {userItem.last_name}
                          </td>
                          <td className="p-4 text-gray-700 dark:text-gray-300">{userItem.email}</td>
                          <td className="p-4 text-gray-700 dark:text-gray-300">
                            {new Date(userItem.created_at).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dashboardData?.recent_properties && dashboardData.recent_properties.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Propiedades Recientes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Título</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Propietario</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Precio</th>
                        <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recent_properties.map((property, index) => (
                        <tr key={property.id || index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                          <td className="p-4 text-gray-700 dark:text-gray-300">{property.title}</td>
                          <td className="p-4 text-gray-700 dark:text-gray-300">{property.owner}</td>
                          <td className="p-4 text-gray-700 dark:text-gray-300">{property.price}</td>
                          <td className="p-4 text-gray-700 dark:text-gray-300">
                            {new Date(property.created_at).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    ),

    users: (
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Gestión de Usuarios</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Administra los usuarios del sistema.</p>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Cargando usuarios...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Nombre</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Rol</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem, index) => (
                    <tr key={userItem.id || index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="p-4 text-gray-700 dark:text-gray-300">{userItem.name}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{userItem.email}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <RoleSelector
                          user={userItem}
                          currentRole={userItem.role}
                          onRoleChange={(newRole) => changeUserRole(userItem.id, newRole, userItem.name)}
                        />
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          userItem.suspended
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {userItem.suspended ? 'Suspendido' : 'Activo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleUserSuspension(userItem.id, userItem.suspended)}
                            className="px-3 py-1 text-xs font-medium text-yellow-600 hover:text-yellow-700 dark:hover:text-yellow-400 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 rounded transition-colors"
                          >
                            {userItem.suspended ? 'Reactivar' : 'Suspender'}
                          </button>
                          <button
                            onClick={() => resetUserPassword(userItem.id, userItem.name)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded transition-colors"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => deleteUser(userItem.id)}
                            className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:hover:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && users.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">No se encontraron usuarios.</p>
          </div>
        )}
      </div>
    ),

    properties: (
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Gestión de Propiedades</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Administra las propiedades del sistema.</p>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Cargando propiedades...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && properties.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Foto</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Título</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Propietario</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Precio</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Detalles</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ubicación</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property, index) => (
                    <tr key={property.id || index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="p-4">
                        {(() => {
                          console.log(`🔍 DEBUG: Rendering photo cell for property "${property.title}":`, {
                            hasPhotos: !!property.photos,
                            photosLength: property.photos ? property.photos.length : 0,
                            photosArray: property.photos
                          });

                          if (property.photos && property.photos.length > 0) {
                            console.log(`✅ DEBUG: Property "${property.title}" has photos:`, property.photos);
                            return (
                              <div
                                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  console.log(`📸 DEBUG: Clicked on photos for property:`, property);
                                  setViewingPhotos(property);
                                }}
                              >
                                <img
                                  src={property.photos[0].thumbnail || property.photos[0].url}
                                  alt={property.title}
                                  className="w-12 h-12 object-cover rounded-lg border shadow-sm"
                                  loading="lazy"
                                  onLoad={() => console.log(`✅ DEBUG: Image loaded successfully for "${property.title}"`)}
                                  onError={(e) => {
                                    console.error(`❌ DEBUG: Image failed to load for "${property.title}":`, e.target.src);
                                    e.target.src = '/images/no-image-placeholder.png';
                                  }}
                                />
                                {property.photos.length > 1 && (
                                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    +{property.photos.length - 1}
                                  </span>
                                )}
                              </div>
                            );
                          } else {
                            console.log(`❌ DEBUG: Property "${property.title}" has no photos`);
                            return (
                              <div
                                className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => {
                                  console.log(`📸 DEBUG: Clicked on placeholder for property:`, property);
                                  setViewingPhotos(property);
                                }}
                                title="Click para ver fotos"
                              >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            );
                          }
                        })()}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{property.title}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{property.owner}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{property.price}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <div className="text-sm">
                          <div>{property.bedrooms || 0}🛏️ {property.bathrooms || 0}🚿</div>
                          <div className="text-xs text-gray-500">{property.area || 'N/A'} m²</div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <div className="text-sm">
                          <div>{property.city || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{property.address || 'Sin dirección'}</div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          property.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {property.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              console.log(`📸 DEBUG: View photos button clicked for:`, property);
                              setViewingPhotos(property);
                            }}
                            className="px-3 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:hover:text-purple-400 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded transition-colors"
                          >
                            📸 Fotos
                          </button>
                          <button
                            onClick={() => setEditingProperty(property)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => togglePropertyActive(property.id, property.is_active)}
                            className="px-3 py-1 text-xs font-medium text-yellow-600 hover:text-yellow-700 dark:hover:text-yellow-400 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 rounded transition-colors"
                          >
                            {property.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => deleteProperty(property.id)}
                            className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:hover:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && properties.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">No se encontraron propiedades.</p>
          </div>
        )}
      </div>
    ),

    settings: (
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Configuración</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Personaliza las configuraciones del sistema.</p>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Configuraciones del Sistema</label>
          <p className="text-gray-600 dark:text-gray-400">Las configuraciones avanzadas estarán disponibles próximamente.</p>
        </div>
      </div>
    ),
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
        />
      )}

      {editingProperty && (
        <PropertyEditModal
          property={editingProperty}
          onSave={updateProperty}
          onCancel={() => setEditingProperty(null)}
        />
      )}

      {viewingPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Fotos de: {viewingPhotos.title}
              </h3>
              <button
                onClick={() => {
                  console.log('❌ DEBUG: Closing photo modal');
                  setViewingPhotos(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {(() => {
                console.log('🖼️ DEBUG: Rendering modal content for:', {
                  property: viewingPhotos.title,
                  hasPhotos: !!viewingPhotos.photos,
                  photosCount: viewingPhotos.photos ? viewingPhotos.photos.length : 0,
                  photos: viewingPhotos.photos
                });

                if (viewingPhotos.photos && viewingPhotos.photos.length > 0) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {viewingPhotos.photos.map((photo, index) => {
                        console.log(`🖼️ DEBUG: Rendering photo ${index + 1}:`, photo);
                        return (
                          <img
                            key={index}
                            src={photo.url}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border shadow-sm"
                            onLoad={() => console.log(`✅ DEBUG: Modal image ${index + 1} loaded successfully`)}
                            onError={(e) => {
                              console.error(`❌ DEBUG: Modal image ${index + 1} failed to load:`, e.target.src);
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                } else {
                  console.log('❌ DEBUG: No photos to display in modal');
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No hay fotos disponibles</p>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          <strong>Debug Info:</strong><br/>
                          Property: {viewingPhotos.title}<br/>
                          Photos array: {JSON.stringify(viewingPhotos.photos)}<br/>
                          Photos type: {typeof viewingPhotos.photos}
                        </p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            Admin Panel
          </span>
        </div>

        <nav className="p-6">
          <ul className="space-y-2">
            <li
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                activeSection === 'dashboard'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveSection('dashboard')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </li>

            <li
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                activeSection === 'users'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveSection('users')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Usuarios
            </li>

            <li
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                activeSection === 'properties'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveSection('properties')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Propiedades
            </li>

            <li
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                activeSection === 'settings'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveSection('settings')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración
            </li>

            <li className="flex items-center gap-3 p-3 rounded-lg cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200">
              <a href="/logout" className="flex items-center gap-3 w-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        {sections[activeSection]}
      </div>
    </div>
  );
};

export default AdminPanel;
