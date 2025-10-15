import React, { useState, useEffect, useMemo } from 'react';
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


  const [searchTerm, setSearchTerm] = useState('');
const [filterStatus, setFilterStatus] = useState('all');
const [sortBy, setSortBy] = useState('newest');

  // Nuevos estados para estadísticas avanzadas
  const [analytics, setAnalytics] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [propertyStats, setPropertyStats] = useState(null);
  const [messageStats, setMessageStats] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  // Componentes auxiliares
  const Notification = ({ message, type, onClose }) => (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl border transform transition-all duration-300 ${type === 'success'
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
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
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
            className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${type === 'danger'
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
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${currentRoleData?.color || 'bg-gray-100 text-gray-800'
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
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${role.value === currentRole ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : ''
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

  // Componente para KPI mejorados con datos reales
  const KPICard = ({ title, value, change, changeType, icon, color, description }) => (
    <div className={`bg-gradient-to-br ${color} p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 text-white transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-4">
        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs font-medium opacity-80 uppercase tracking-wider">{title}</div>
          <div className="text-3xl font-bold text-white mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {change && (
            <div className="flex items-center text-sm">
              <svg className={`w-4 h-4 mr-1 ${changeType === 'increase' ? '' : 'transform rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              <span className="opacity-90">{change}</span>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
        <div className="text-sm opacity-90">{description}</div>
      </div>
    </div>
  );

  // Componente de gráfico de actividad
  const ActivityChart = ({ data }) => {
    if (!data || !Array.isArray(data)) return null;

    const maxValue = Math.max(...data.map(d => d.value || 0));

    return (
      <div className="h-64 bg-gradient-to-t from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-end justify-between h-full space-x-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-emerald-400 to-emerald-500 rounded-t-sm transition-all duration-300 hover:from-emerald-500 hover:to-emerald-600"
                style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                title={`${item.label}: ${item.value}`}
              ></div>
              <span className="text-xs text-gray-500 mt-2 transform -rotate-45">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Funciones de datos
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

        if (data.analytics) setAnalytics(data.analytics);
        if (data.user_stats) setUserStats(data.user_stats);
        if (data.property_stats) setPropertyStats(data.property_stats);
        if (data.message_stats) setMessageStats(data.message_stats);
        if (data.system_stats) setSystemStats(data.system_stats);
        if (data.recent_activity) setRecentActivity(data.recent_activity);
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

  const fetchUserAnalytics = async () => {
    try {
      const response = await fetch('/admin/analytics/users', {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (err) {
      console.error('Error fetching user analytics:', err);
    }
  };

  const fetchPropertyAnalytics = async () => {
    try {
      const response = await fetch('/admin/analytics/properties', {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPropertyStats(data);
      }
    } catch (err) {
      console.error('Error fetching property analytics:', err);
    }
  };

  const fetchSystemAnalytics = async () => {
    try {
      const response = await fetch('/admin/analytics/system', {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (err) {
      console.error('Error fetching system analytics:', err);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/admin/activity/recent', {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch (err) {
      console.error('Error fetching recent activity:', err);
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

      const response = await fetch('/admin/properties', {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const propertiesArray = data.properties?.data || data.properties || [];
        setProperties(propertiesArray);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar propiedades');
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Funciones de utilidad
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

  // Funciones de acciones de usuarios
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

  // Funciones de acciones de propiedades
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

  // UseEffect para cargar datos automáticamente
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardData();
      fetchUserAnalytics();
      fetchPropertyAnalytics();
      fetchSystemAnalytics();
      fetchRecentActivity();

      // Auto-refresh cada 30 segundos para datos en tiempo real
      const interval = setInterval(() => {
        fetchSystemAnalytics();
        fetchRecentActivity();
      }, 30000);

      return () => clearInterval(interval);
    } else if (activeSection === 'users') {
      fetchUsers();
    } else if (activeSection === 'properties') {
      fetchProperties();
    }
  }, [activeSection]);


  // Función para filtrar y ordenar propiedades
const filteredProperties = useMemo(() => {
  let filtered = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (property.city && property.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (property.owner && property.owner.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && property.is_active) ||
                         (filterStatus === 'inactive' && !property.is_active);

    return matchesSearch && matchesStatus;
  });

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'price-high': return (b.price || 0) - (a.price || 0);
      case 'price-low': return (a.price || 0) - (b.price || 0);
      case 'oldest': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
  });

  return filtered;
}, [properties, searchTerm, filterStatus, sortBy]);

  // Verificación de permisos
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
          <a href="/"
            className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  // Dashboard mejorado con datos reales
  const dashboardSection = (
    <div className="p-6 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard Avanzado</h2>
          <p className="text-gray-600 dark:text-gray-300">Análisis en tiempo real de la plataforma ViveSpaces</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Actualizar
          </button>
          <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">Cargando estadísticas...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-lg mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {dashboardData && !loading && (
        <>
          {/* KPIs con datos reales */}
          {/* KPIs actualizados con estadísticas de verificación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
            <KPICard
              title="Total Usuarios"
              value={userStats?.total || dashboardData.stats?.users?.total || 0}
              change={userStats?.growth_today ? `+${userStats.growth_today} hoy` : null}
              changeType="increase"
              color="from-blue-500 via-blue-600 to-blue-700"
              description={`${userStats?.active || 0} activos hoy`}
              icon={
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              }
            />

            {/* Nueva KPI para verificación OCR */}
            <KPICard
              title="Verificados OCR"
              value={userStats?.verified_count || 0}
              change={userStats?.verification_rate ? `${userStats.verification_rate}% del total` : 'OCR Inactivo'}
              changeType="increase"
              color="from-emerald-500 via-emerald-600 to-emerald-700"
              description={`${userStats?.pending_verification || 0} pendientes`}
              icon={
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              }
            />

            {/* Resto de KPIs existentes */}
            <KPICard
              title="Propiedades"
              value={propertyStats?.total || dashboardData.stats?.properties?.total || 0}
              change={propertyStats?.published_today ? `+${propertyStats.published_today} hoy` : null}
              changeType="increase"
              color="from-purple-500 via-purple-600 to-purple-700"
              description={`${propertyStats?.active || 0} activas`}
              icon={
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              }
            />

            <KPICard
              title="Mensajes"
              value={messageStats?.total_today || dashboardData.stats?.messages?.today || 0}
              change={messageStats?.growth_rate ? `${messageStats.growth_rate > 0 ? '+' : ''}${messageStats.growth_rate}%` : null}
              changeType={messageStats?.growth_rate > 0 ? "increase" : "decrease"}
              color="from-orange-500 via-orange-600 to-orange-700"
              description={`${messageStats?.conversations_active || 0} conversaciones activas`}
              icon={
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              }
            />

            <KPICard
              title="Rendimiento"
              value={systemStats?.cpu_usage ? `${systemStats.cpu_usage}%` : 'N/A'}
              change={systemStats?.response_time ? `${systemStats.response_time}ms avg` : null}
              changeType="increase"
              color="from-red-500 via-red-600 to-red-700"
              description={`${systemStats?.uptime || 'N/A'} uptime`}
              icon={
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>

          {/* Gráficos con datos reales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Análisis de usuarios */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Análisis de Usuarios</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">7d</button>
                  <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-full">30d</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {userStats?.new_registrations || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Nuevos Registros</div>
                  <div className="text-xs text-green-600 mt-1">
                    {userStats?.registration_growth ? `+${userStats.registration_growth}%` : 'Sin datos'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {userStats?.retention_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Retención</div>
                  <div className="text-xs text-green-600 mt-1">
                    {userStats?.retention_change ? `${userStats.retention_change > 0 ? '+' : ''}${userStats.retention_change}%` : 'Sin cambio'}
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {userStats?.avg_session_time || 0}min
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sesión Promedio</div>
                  <div className="text-xs text-green-600 mt-1">
                    {userStats?.session_time_change ? `${userStats.session_time_change > 0 ? '+' : ''}${userStats.session_time_change}min` : 'Sin cambio'}
                  </div>
                </div>
              </div>

              {/* Gráfico de actividad */}
              {analytics?.user_activity && (
                <ActivityChart data={analytics.user_activity} />
              )}
            </div>

            {/* Métricas del sistema */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Sistema en Tiempo Real</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU</span>
                    <span className="text-sm font-bold text-emerald-600">{systemStats?.cpu_usage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${systemStats?.cpu_usage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Memoria</span>
                    <span className="text-sm font-bold text-blue-600">{systemStats?.memory_usage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${systemStats?.memory_usage || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Base de Datos</span>
                    <span className="text-sm font-bold text-purple-600">{systemStats?.db_connections || 0}</span>
                  </div>
                  <div className="text-xs text-gray-500">Conexiones activas</div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiempo Respuesta</span>
                    <span className="text-sm font-bold text-orange-600">{systemStats?.response_time || 0}ms</span>
                  </div>
                  <div className="text-xs text-gray-500">Promedio últimas 24h</div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">Estado General</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {systemStats?.health_score || 0}/10
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {systemStats?.health_score >= 8 ? 'Excelente' :
                   systemStats?.health_score >= 6 ? 'Bueno' :
                   systemStats?.health_score >= 4 ? 'Regular' : 'Crítico'}
                </div>
              </div>
            </div>
          </div>

          {/* Actividad reciente con datos reales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Actividad Reciente</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">En vivo</span>
                </div>
              </div>

              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className={`flex items-center space-x-4 p-4 rounded-xl border-l-4 ${
                      activity.type === 'user_registered' ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-500' :
                      activity.type === 'property_published' ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-500' :
                      activity.type === 'message_sent' ? 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-500' :
                      'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-500'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.type === 'user_registered' ? 'bg-blue-500' :
                        activity.type === 'property_published' ? 'bg-emerald-500' :
                        activity.type === 'message_sent' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}>
                        {activity.type === 'user_registered' ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : activity.type === 'property_published' ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {activity.user_name ? `${activity.user_name} - ` : ''}
                          {new Date(activity.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>
                      {activity.metadata && (
                        <span className="text-xs bg-opacity-20 px-2 py-1 rounded-full">
                          {activity.metadata}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Estadísticas de propiedades */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Propiedades Destacadas</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Más Vistas Esta Semana</span>
                    <span className="text-xs text-gray-500">Views</span>
                  </div>
                  <div className="space-y-3">
                    {propertyStats?.top_viewed?.slice(0, 5).map((property, index) => (
                      <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                            index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-800' :
                            'bg-gradient-to-r from-emerald-400 to-emerald-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {property.title.length > 20 ? `${property.title.substring(0, 20)}...` : property.title}
                            </div>
                            <div className="text-xs text-gray-500">{property.views} vistas</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${
                            property.growth > 0 ? 'text-green-600' :
                            property.growth < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {property.growth > 0 ? '+' : ''}{property.growth}%
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Sin datos disponibles</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Usuarios Más Activos</span>
                    <span className="text-xs text-gray-500">Actividad</span>
                  </div>
                  <div className="space-y-2">
                    {userStats?.most_active?.slice(0, 5).map((activeUser, index) => (
                      <div key={activeUser.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-emerald-400 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {activeUser.name} {activeUser.last_name}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {activeUser.activity_score} pts
                        </span>
                      </div>
                    )) || (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Sin datos disponibles</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tablas con datos reales - Usuarios Recientes */}
          {dashboardData?.recent_users && dashboardData.recent_users.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-8 border border-gray-100 dark:border-gray-700">
              <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Usuarios Recientes</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Últimos registros</span>
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Usuario</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Email</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Rol</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Registro</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Última Actividad</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_users.map((userItem, index) => (
                      <tr key={userItem.id || index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {userItem.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {userItem.name} {userItem.last_name}
                              </div>
                              <div className="text-sm text-gray-500">ID: #{userItem.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">{userItem.email}</td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            userItem.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            userItem.role === 'landlord' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}>
                            {userItem.role === 'admin' ? 'Administrador' :
                             userItem.role === 'landlord' ? 'Propietario' : 'Usuario'}
                          </span>
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">
                          {new Date(userItem.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">
                          {userItem.last_activity_at ?
                            new Date(userItem.last_activity_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Sin actividad'
                          }
                        </td>
                        <td className="p-6">
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              userItem.suspended ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              userItem.email_verified_at ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {userItem.suspended ? 'Suspendido' :
                               userItem.email_verified_at ? 'Verificado' : 'Pendiente'}
                            </span>
                            {userItem.is_online && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="En línea"></div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tablas con datos reales - Propiedades Recientes */}
          {dashboardData?.recent_properties && dashboardData.recent_properties.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Propiedades Recientes</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Últimas publicaciones</span>
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Propiedad</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Propietario</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Precio</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Ubicación</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Views</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Publicado</th>
                      <th className="p-6 text-left text-sm font-bold text-gray-900 dark:text-white">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_properties.map((property, index) => (
                      <tr key={property.id || index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {property.title.length > 30 ? `${property.title.substring(0, 30)}...` : property.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {property.bedrooms || 0} rec • {property.bathrooms || 0} baños • {property.area || 'N/A'} m²
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">{property.owner_name || property.owner}</td>
                        <td className="p-6">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ${typeof property.price === 'number' ? property.price.toLocaleString() : property.price}
                          </span>
                          <div className="text-xs text-gray-500">{property.type || 'N/A'}</div>
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">
                          <div>{property.city}</div>
                          <div className="text-xs text-gray-500">{property.state || 'N/A'}</div>
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">
                          <div className="font-medium">{property.views || 0}</div>
                          <div className="text-xs text-gray-500">visualizaciones</div>
                        </td>
                        <td className="p-6 text-gray-700 dark:text-gray-300">
                          {new Date(property.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            property.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {property.is_active ? 'Activa' : 'Inactiva'}
                          </span>
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
  );

  // Sección de usuarios
  const usersSection = (
    <div className="p-6 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Gestión de Usuarios</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Administra los usuarios del sistema y su estado de verificación.</p>

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
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Verificación OCR</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem, index) => (
                  <tr key={userItem.id || index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {userItem.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{userItem.name} {userItem.last_name}</div>
                          <div className="text-sm text-gray-500">ID: #{userItem.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{userItem.email}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      <RoleSelector
                        user={userItem}
                        currentRole={userItem.role}
                        onRoleChange={(newRole) => changeUserRole(userItem.id, newRole, userItem.name)}
                      />
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${userItem.suspended
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                        {userItem.suspended ? 'Suspendido' : 'Activo'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center w-fit ${userItem.is_identity_verified
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                          {userItem.is_identity_verified ? (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Verificado
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              No Verificado
                            </>
                          )}
                        </span>
                        {userItem.verified_at && (
                          <div className="text-xs text-gray-500">
                            {new Date(userItem.verified_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
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
                        {/* Botón para revocar verificación OCR */}
                        {userItem.is_identity_verified && (
                          <button
                            onClick={() => revokeVerification(userItem.id, userItem.name)}
                            className="px-3 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 dark:hover:text-orange-400 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded transition-colors"
                            title="Revocar verificación OCR"
                          >
                            Revocar Verificación
                          </button>
                        )}
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
  );

  const revokeVerification = async (userId, userName) => {
    showConfirmModal(
      'Revocar Verificación OCR',
      `¿Estás seguro de que quieres revocar la verificación de identidad de ${userName}? El usuario tendrá que volver a pasar el proceso de verificación OCR.`,
      async () => {
        try {
          const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

          const response = await fetch(`/admin/users/${userId}/revoke-verification`, {
            method: 'PATCH',
            headers: {
              'X-CSRF-TOKEN': csrfToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              reason: 'Revocado manualmente desde panel de administración'
            })
          });

          const data = await response.json();

          if (response.ok) {
            showNotification(data.message, 'success');
            fetchUsers();
          } else {
            showNotification(data.error || 'Error al revocar verificación', 'error');
          }
        } catch (err) {
          console.error('Error revoking verification:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      'warning',
      'Revocar Verificación'
    );
  };

  // Sección de propiedades
  const propertiesSection = (
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

                    {!loading && (
  <>
    {/* Header con buscador y filtros */}
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 mb-8 border border-emerald-100 dark:border-gray-600">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por título, ciudad o propietario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activas</option>
            <option value="inactive">Solo inactivas</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguas</option>
            <option value="price-high">Precio mayor</option>
            <option value="price-low">Precio menor</option>
          </select>

          <div className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {filteredProperties.length} de {properties.length}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Grid de propiedades */}
    {filteredProperties.length > 0 ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProperties.map((property, index) => (
          <div key={property.id || index} className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            {/* Header con foto */}
            <div className="relative overflow-hidden">
              {property.photos && property.photos.length > 0 ? (
                <img
                  src={property.photos[0].thumbnail || property.photos[0].url}
                  alt={property.title}
                  className="w-full h-48 object-cover cursor-pointer group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setViewingPhotos(property)}
                  onError={(e) => {
                    e.target.src = '/images/no-image-placeholder.png';
                  }}
                />
              ) : (
                <div
                  className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center cursor-pointer group-hover:from-gray-300 transition-all duration-300"
                  onClick={() => setViewingPhotos(property)}
                >
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Badge de estado */}
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${
                  property.is_active
                    ? 'bg-green-100/90 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-red-100/90 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                  {property.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {/* Contador de fotos */}
              {property.photos && property.photos.length > 1 && (
                <div className="absolute top-3 left-3">
                  <span className="bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
                    +{property.photos.length - 1} fotos
                  </span>
                </div>
              )}
            </div>

            {/* Contenido */}
            <div className="p-5">
              {/* Título y precio */}
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {property.title}
                </h3>
                <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  ${typeof property.price === 'number' ? property.price.toLocaleString() : property.price}
                </div>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">{property.bedrooms || 0}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Habitaciones</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{property.bathrooms || 0}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Baños</div>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-lg">{property.area || 'N/A'}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">m²</div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white mb-1">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {property.city || 'N/A'}
                </div>
                <div className="text-xs text-gray-500 truncate pl-6">{property.address || 'Sin dirección'}</div>
              </div>

              {/* Propietario */}
              <div className="mb-4 text-sm bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-3 rounded-lg">
                <span className="text-gray-500">Propietario: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{property.owner}</span>
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewingPhotos(property)}
                  className="flex items-center justify-center px-3 py-2 text-xs font-medium text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-600 dark:bg-purple-900/20 dark:hover:bg-purple-600 rounded-lg transition-all duration-200 border border-purple-200 hover:border-purple-600"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Fotos
                </button>
                <button
                  onClick={() => setEditingProperty(property)}
                  className="flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-600 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-600"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button
                  onClick={() => togglePropertyActive(property.id, property.is_active)}
                  className="flex items-center justify-center px-3 py-2 text-xs font-medium text-yellow-600 hover:text-white bg-yellow-50 hover:bg-yellow-600 dark:bg-yellow-900/20 dark:hover:bg-yellow-600 rounded-lg transition-all duration-200 border border-yellow-200 hover:border-yellow-600"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {property.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => deleteProperty(property.id)}
                  className="flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-900/20 dark:hover:bg-red-600 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-600"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.156 0-4.115-.663-5.75-1.709M6 18L4 16v-1a8 8 0 1116 0v1l-2 2-1.5-1.5" />
        </svg>
        <p className="text-gray-500 text-lg">No se encontraron propiedades</p>
        <p className="text-gray-400 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )}
  </>
)}

      {!loading && properties.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300">No se encontraron propiedades.</p>
        </div>
      )}
    </div>
  );

  // Sección de configuración
  const settingsSection = (
    <div className="p-6 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Configuración</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Personaliza las configuraciones del sistema.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuración del sistema */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sistema</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modo de mantenimiento
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="disabled">Desactivado</option>
                <option value="enabled">Activado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Límite de registros por día
              </label>
              <input
                type="number"
                defaultValue="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Configuración de notificaciones */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notificaciones</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nuevos usuarios</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nuevas propiedades</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reportes de errores</span>
  <input type="checkbox" defaultChecked className="rounded" />
    </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Alertas de seguridad</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          </div>
        </div>

        {/* Configuración de emails */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuración de Email</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Servidor SMTP
              </label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Puerto
              </label>
              <input
                type="number"
                placeholder="587"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Configuración de citas */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sistema de Citas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activar sistema de citas</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duración máxima de cita (horas)
              </label>
              <input
                type="number"
                defaultValue="2"
                min="1"
                max="8"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requerir verificación para citas</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          Guardar Configuración
        </button>
      </div>
    </div>
  );

  // Definir las secciones
  const sections = {
    dashboard: dashboardSection,
    users: usersSection,
    properties: propertiesSection,
    settings: settingsSection,
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Notificaciones y modales */}
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
                onClick={() => setViewingPhotos(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {viewingPhotos.photos && viewingPhotos.photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {viewingPhotos.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border shadow-sm"
                      onError={(e) => {
                        console.error(`Error loading image ${index + 1}:`, e.target.src);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No hay fotos disponibles</p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Esta propiedad no tiene fotos cargadas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
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
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeSection === 'dashboard'
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
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeSection === 'users'
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
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeSection === 'properties'
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
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeSection === 'settings'
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

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto">
        {sections[activeSection]}
      </div>
    </div>
  );
};

export default AdminPanel;
