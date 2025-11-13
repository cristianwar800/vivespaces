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

  // Estados para estadísticas avanzadas
  const [analytics, setAnalytics] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [propertyStats, setPropertyStats] = useState(null);
  const [messageStats, setMessageStats] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  // Estados para TestAI
  const [aiConfig, setAiConfig] = useState(null);
  const [aiConnectionStatus, setAiConnectionStatus] = useState('checking');
  const [aiLoading, setAiLoading] = useState({});
  const [aiResults, setAiResults] = useState({});
  const [mlQuery, setMlQuery] = useState('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('ensemble');
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Estados para Configuración del Sistema
  const [systemConfigs, setSystemConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(false);

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

  const KPICard = ({ title, value, change, changeType, icon, color, description }) => (
    <div className="group relative overflow-hidden">
      {/* Efecto de brillo animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

      <div className={`relative bg-gradient-to-br ${color} p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 text-white transform hover:-translate-y-2 hover:scale-105 border border-white/20`}>
        {/* Decoración superior */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12"></div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md shadow-lg transform group-hover:scale-110 transition-transform duration-300 border border-white/30">
              {icon}
            </div>
            <div className="text-right">
              <div className="text-xs font-bold opacity-90 uppercase tracking-widest mb-2 bg-white/10 px-3 py-1 rounded-full inline-block backdrop-blur-sm">
                {title}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-4xl font-black text-white mb-2 tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>

            {change && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                changeType === 'increase'
                  ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-400/50'
                  : 'bg-red-500/30 text-red-100 border border-red-400/50'
              } backdrop-blur-sm`}>
                <svg className={`w-4 h-4 mr-1 ${changeType === 'increase' ? '' : 'transform rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span>{change}</span>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-white/20 to-white/5 rounded-xl p-4 backdrop-blur-md border border-white/20 shadow-inner">
            <div className="text-sm font-medium opacity-95 flex items-center">
              <svg className="w-4 h-4 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ActivityChart = ({ data }) => {
    if (!data || !Array.isArray(data)) return null;

    const maxValue = Math.max(...data.map(d => d.value || 0));

    return (
      <div className="relative h-72 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-inner overflow-hidden">
        {/* Grid de fondo */}
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative flex items-end justify-between h-full space-x-3">
          {data.map((item, index) => {
            const heightPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const colorIndex = index % 5;
            const gradients = [
              'from-blue-400 via-blue-500 to-blue-600',
              'from-emerald-400 via-emerald-500 to-emerald-600',
              'from-purple-400 via-purple-500 to-purple-600',
              'from-orange-400 via-orange-500 to-orange-600',
              'from-pink-400 via-pink-500 to-pink-600'
            ];

            return (
              <div key={index} className="group flex-1 flex flex-col items-center relative">
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-xl z-10 pointer-events-none">
                  <div className="flex items-center space-x-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>{item.value.toLocaleString()}</span>
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                </div>

                {/* Barra */}
                <div
                  className={`w-full bg-gradient-to-t ${gradients[colorIndex]} rounded-t-xl transition-all duration-500 hover:scale-105 transform origin-bottom shadow-lg hover:shadow-2xl relative overflow-hidden group cursor-pointer`}
                  style={{ height: `${heightPercentage}%` }}
                >
                  {/* Brillo superior */}
                  <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/40 to-transparent"></div>
                  {/* Efecto de pulso */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-300"></div>
                </div>

                {/* Etiqueta */}
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-3 truncate max-w-full px-1 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Funciones de API general
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

  // Funciones de AI/FastAPI
  const makeAiApiCall = async (url, options = {}) => {
    console.log('🌐 Iniciando llamada a:', url);
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    const timeoutId = setTimeout(() => {
      throw new Error('Timeout: La API no respondió en 30 segundos');
    }, 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
        credentials: 'same-origin',
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Error en makeAiApiCall:', error);
      throw error;
    }
  };

  const checkAiConnection = async () => {
    console.log('🔍 Verificando conexión a FastAPI...');
    setAiConnectionStatus('checking');
    try {
      const data = await makeAiApiCall('/ai/health');
      if (data.success && data.ai_status === 'connected') {
        setAiConnectionStatus('connected');
      } else {
        setAiConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ Error en checkAiConnection:', error);
      setAiConnectionStatus('disconnected');
    }
  };

  const testAiConnection = async () => {
    setAiLoading(prev => ({ ...prev, connection: true }));
    try {
      const data = await makeAiApiCall('/ai/health');
      setAiResults(prev => ({
        ...prev,
        connection: {
          success: true,
          message: '✅ FastAPI conectado',
          data: data
        }
      }));
      setAiConnectionStatus('connected');
      showNotification('FastAPI conectado correctamente', 'success');
    } catch (error) {
      setAiResults(prev => ({
        ...prev,
        connection: {
          success: false,
          message: '❌ Error de conexión',
          error: error.message
        }
      }));
      setAiConnectionStatus('disconnected');
      showNotification('Error al conectar con FastAPI', 'error');
    }
    setAiLoading(prev => ({ ...prev, connection: false }));
  };

  const testAiTracking = async () => {
    setAiLoading(prev => ({ ...prev, tracking: true }));
    try {
      const searchData = {
        user_id: user?.id || 1,
        session_id: `test-${Date.now()}`,
        search_query: 'casa en guadalajara con piscina',
        search_type: 'property',
        filters: { location: 'guadalajara', type: 'casa' },
        results_count: 25
      };

      const data = await makeAiApiCall('/ai/track', {
        method: 'POST',
        body: JSON.stringify(searchData)
      });

      setAiResults(prev => ({
        ...prev,
        tracking: {
          success: true,
          message: '✅ Tracking funcionando',
          data: data
        }
      }));
      showNotification('Tracking guardado correctamente', 'success');
    } catch (error) {
      setAiResults(prev => ({
        ...prev,
        tracking: {
          success: false,
          message: '❌ Error en tracking',
          error: error.message
        }
      }));
      showNotification('Error en tracking', 'error');
    }
    setAiLoading(prev => ({ ...prev, tracking: false }));
  };

  const testAiMLEndpoints = async () => {
    setAiLoading(prev => ({ ...prev, ml: true }));
    try {
      const data = await makeAiApiCall('/ai/ml-test');
      setAiResults(prev => ({
        ...prev,
        ml: {
          success: true,
          message: '✅ Algoritmos ML funcionando',
          data: data
        }
      }));
      showNotification('Algoritmos ML verificados', 'success');
    } catch (error) {
      setAiResults(prev => ({
        ...prev,
        ml: {
          success: false,
          message: '❌ Error en algoritmos ML',
          error: error.message
        }
      }));
      showNotification('Error en algoritmos ML', 'error');
    }
    setAiLoading(prev => ({ ...prev, ml: false }));
  };

  const testAiAlgorithm = async () => {
    if (!mlQuery.trim()) {
      showNotification('Por favor escribe una búsqueda', 'error');
      return;
    }

    setMlLoading(true);
    setMlResult(null);

    try {
      const endpoints = {
        naive_bayes: '/ai/classify/quick',
        knn: '/ai/similar',
        mlp: '/ai/predict/complex',
        ensemble: '/ai/predict/ensemble',
        compare: '/ai/compare'
      };

      const endpoint = endpoints[selectedAlgorithm];
      const payload = selectedAlgorithm === 'knn' || selectedAlgorithm === 'compare'
        ? { query: mlQuery, n_similar: 5 }
        : { query: mlQuery };

      const data = await makeAiApiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setMlResult(data);
      showNotification('Algoritmo ejecutado correctamente', 'success');
    } catch (error) {
      setMlResult({
        success: false,
        error: error.message
      });
      showNotification('Error ejecutando algoritmo', 'error');
    }
    setMlLoading(false);
  };

  const loadAiConfig = () => {
    const configElement = document.getElementById('ai-config');
    if (configElement) {
      try {
        const data = JSON.parse(configElement.textContent || configElement.innerText);
        setAiConfig(data);
      } catch (e) {
        console.error('❌ Error cargando configuración AI:', e);
      }
    } else {
      setAiConfig({
        algorithms: {
          naive_bayes: {
            icon: '🎯',
            name: 'Naive Bayes',
            description: 'Clasificación rápida'
          },
          knn: {
            icon: '🔍',
            name: 'KNN',
            description: 'Búsqueda por similitud'
          },
          mlp: {
            icon: '🧠',
            name: 'MLP',
            description: 'Red neuronal'
          },
          ensemble: {
            icon: '🎭',
            name: 'Ensemble',
            description: 'Combinación de modelos'
          }
        },
        testQueries: [
          'casa venta zapopan',
          'departamento renta guadalajara',
          'oficina comercial centro',
          'terreno industrial'
        ]
      });
    }
  };

  // Funciones para Configuración del Sistema
  const fetchSystemConfigs = async () => {
    setConfigsLoading(true);
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch('/admin/config', {
        method: 'GET',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSystemConfigs(data.configs);
      } else {
        showNotification('Error al cargar configuraciones', 'error');
      }
    } catch (err) {
      console.error('Error fetching system configs:', err);
      showNotification('Error de conexión al cargar configuraciones', 'error');
    } finally {
      setConfigsLoading(false);
    }
  };

  const updateSystemConfig = async (key, value) => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch('/admin/config/update', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ key, value })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(data.message, 'success');
        fetchSystemConfigs();
      } else {
        showNotification(data.error || 'Error al actualizar configuración', 'error');
      }
    } catch (err) {
      console.error('Error updating system config:', err);
      showNotification('Error de conexión al actualizar configuración', 'error');
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

  const revokeVerification = async (userId, userName) => {
    showConfirmModal(
      'Revocar Verificación de Identidad',
      `¿Estás seguro de que quieres revocar la verificación de identidad de ${userName}? El usuario tendrá que volver a pasar el proceso de verificación.`,
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
            console.log('✅ Verificación revocada exitosamente:', data.user);
            // Pequeño delay para asegurar que la BD se actualice
            setTimeout(() => {
              console.log('🔄 Recargando lista de usuarios...');
              fetchUsers();
            }, 500);
          } else {
            showNotification(data.error || 'Error al revocar verificación', 'error');
          }
        } catch (err) {
          console.error('❌ Error revoking verification:', err);
          showNotification('Error de conexión', 'error');
        }
      },
      'warning',
      'Revocar Verificación'
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

  // UseEffect para cargar datos
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardData();
      fetchUserAnalytics();
      fetchPropertyAnalytics();
      fetchSystemAnalytics();
      fetchRecentActivity();

      const interval = setInterval(() => {
        fetchSystemAnalytics();
        fetchRecentActivity();
      }, 30000);

      return () => clearInterval(interval);
    } else if (activeSection === 'users') {
      fetchUsers();
    } else if (activeSection === 'properties') {
      fetchProperties();
    } else if (activeSection === 'ai-test') {
      loadAiConfig();
      checkAiConnection();
    } else if (activeSection === 'system-config') {
      fetchSystemConfigs();
    }
  }, [activeSection]);

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

  // Dashboard section
  const dashboardSection = (
    <div className="p-6 sm:p-8">
      {/* Header mejorado con gradiente */}
      <div className="relative mb-10 overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 dark:from-emerald-500/5 dark:via-blue-500/5 dark:to-purple-500/5 rounded-3xl"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl"></div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white">
              Dashboard Avanzado
            </h2>
            <p className="text-gray-600 dark:text-gray-300 flex items-center space-x-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Análisis en tiempo real de la plataforma ViveSpaces</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="group relative px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
              <div className="relative flex items-center space-x-2">
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Actualizar</span>
                  </>
                )}
              </div>
            </button>

            <select className="px-5 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer">
              <option value="today">📅 Hoy</option>
              <option value="week">📊 Esta semana</option>
              <option value="month">📈 Este mes</option>
              <option value="year">🎯 Este año</option>
            </select>
          </div>
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

            <KPICard
              title="Identidades Verificadas"
              value={userStats?.verified_count || 0}
              change={userStats?.verification_rate ? `${userStats.verification_rate}% del total` : null}
              changeType="increase"
              color="from-emerald-500 via-emerald-600 to-emerald-700"
              description={`${userStats?.pending_verification || 0} sin verificar`}
              icon={
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              }
            />

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden relative">
              {/* Decoración de fondo */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-100/50 to-transparent dark:from-blue-900/20 rounded-full -mr-20 -mt-20"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Análisis de Usuarios</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">7d</button>
                    <button className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300">30d</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                  {/* Mini Stat Card 1 */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100/50 to-blue-50 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-blue-900/30 p-6 rounded-2xl border-2 border-blue-200/50 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl cursor-pointer transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl group-hover:bg-blue-400/20 transition-all duration-300"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                          {userStats?.registration_growth ? `+${userStats.registration_growth}%` : '0%'}
                        </div>
                      </div>
                      <div className="text-3xl font-black text-blue-700 dark:text-blue-300 mb-1">
                        {userStats?.new_registrations || 0}
                      </div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nuevos Registros</div>
                    </div>
                  </div>

                  {/* Mini Stat Card 2 */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-50 dark:from-emerald-900/30 dark:via-emerald-800/20 dark:to-emerald-900/30 p-6 rounded-2xl border-2 border-emerald-200/50 dark:border-emerald-700/50 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 hover:shadow-xl cursor-pointer transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all duration-300"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                          {userStats?.retention_change ? `${userStats.retention_change > 0 ? '+' : ''}${userStats.retention_change}%` : '0%'}
                        </div>
                      </div>
                      <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mb-1">
                        {userStats?.retention_rate || 0}%
                      </div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tasa de Retención</div>
                    </div>
                  </div>

                  {/* Mini Stat Card 3 */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-purple-100/50 to-purple-50 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-purple-900/30 p-6 rounded-2xl border-2 border-purple-200/50 dark:border-purple-700/50 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-xl cursor-pointer transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl group-hover:bg-purple-400/20 transition-all duration-300"></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                          {userStats?.session_time_change ? `${userStats.session_time_change > 0 ? '+' : ''}${userStats.session_time_change}m` : '0m'}
                        </div>
                      </div>
                      <div className="text-3xl font-black text-purple-700 dark:text-purple-300 mb-1">
                        {userStats?.avg_session_time || 0}<span className="text-xl">min</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">Sesión Promedio</div>
                    </div>
                  </div>
                </div>

                {analytics?.user_activity && (
                  <ActivityChart data={analytics.user_activity} />
                )}
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Decoración de fondo */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-transparent dark:from-emerald-900/20 rounded-full -ml-16 -mt-16 blur-2xl"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-blue-200/30 to-transparent dark:from-blue-900/20 rounded-full -mr-16 -mb-16 blur-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Sistema en Tiempo Real</h3>
                </div>

                <div className="space-y-6">
                  {/* CPU Stat */}
                  <div className="group p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border-2 border-emerald-200/50 dark:border-emerald-700/50 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">CPU</span>
                      </div>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{systemStats?.cpu_usage || 0}%</span>
                    </div>
                    <div className="relative w-full h-3 bg-emerald-200/30 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 rounded-full transition-all duration-700 shadow-lg"
                        style={{ width: `${systemStats?.cpu_usage || 0}%` }}
                      >
                        <div className="h-full w-full bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Memory Stat */}
                  <div className="group p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border-2 border-blue-200/50 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Memoria</span>
                      </div>
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{systemStats?.memory_usage || 0}%</span>
                    </div>
                    <div className="relative w-full h-3 bg-blue-200/30 dark:bg-blue-900/30 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full transition-all duration-700 shadow-lg"
                        style={{ width: `${systemStats?.memory_usage || 0}%` }}
                      >
                        <div className="h-full w-full bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Database Connections */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-purple-200/50 dark:border-purple-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">Base de Datos</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Conexiones activas</div>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{systemStats?.db_connections || 0}</span>
                    </div>
                  </div>

                  {/* Response Time */}
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl border-2 border-orange-200/50 dark:border-orange-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">Tiempo Respuesta</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Promedio últimas 24h</div>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{systemStats?.response_time || 0}<span className="text-sm">ms</span></span>
                    </div>
                  </div>
                </div>

                {/* Health Score - Mejorado */}
                <div className="mt-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 animate-pulse"></div>
                  <div className="relative p-6 bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-emerald-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Estado General del Sistema</span>
                        </div>
                        <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                          {systemStats?.health_score || 0}<span className="text-2xl">/10</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-block px-4 py-2 rounded-xl font-bold text-sm ${
                          (systemStats?.health_score || 0) >= 8
                            ? 'bg-emerald-500 text-white'
                            : (systemStats?.health_score || 0) >= 6
                            ? 'bg-blue-500 text-white'
                            : (systemStats?.health_score || 0) >= 4
                            ? 'bg-orange-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {(systemStats?.health_score || 0) >= 8 ? '🎉 Excelente' :
                           (systemStats?.health_score || 0) >= 6 ? '👍 Bueno' :
                           (systemStats?.health_score || 0) >= 4 ? '⚠️ Regular' : '🚨 Crítico'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

  // Users Section
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
                  <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Verificación de Identidad</th>
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
                              Identidad Verificada
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Sin Verificar
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
                        {userItem.is_identity_verified && (
                          <button
                            onClick={() => revokeVerification(userItem.id, userItem.name)}
                            className="px-3 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 dark:hover:text-orange-400 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded transition-colors"
                            title="Revocar verificación de identidad"
                          >
                            Revocar Identidad
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

  // Properties Section
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
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 mb-8 border border-emerald-100 dark:border-gray-600">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProperties.map((property, index) => (
                <div key={property.id || index} className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  <div className="relative overflow-hidden">
                    {property.photos && property.photos.length > 0 ? (
                      <img
                        src={property.photos[0].thumbnail || property.photos[0].url}
                        alt={property.title}
                        className="w-full h-48 object-cover cursor-pointer group-hover:scale-110 transition-transform duration-300"
                        onClick={() => setViewingPhotos(property)}
                        onError={(e) => {
                          console.error('Error loading property image:', e.target.src);
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TaW4gaW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
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

                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${
                        property.is_active
                          ? 'bg-green-100/90 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                          : 'bg-red-100/90 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                      }`}>
                        {property.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {property.photos && property.photos.length > 1 && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm">
                          +{property.photos.length - 1} fotos
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {property.title}
                      </h3>
                      <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                        ${typeof property.price === 'number' ? property.price.toLocaleString() : property.price}
                      </div>
                    </div>

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

                    <div className="mb-4 text-sm bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-3 rounded-lg">
                      <span className="text-gray-500">Propietario: </span>
                      <span className="text-gray-900 dark:text-white font-semibold">{property.owner}</span>
                    </div>

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

  // AI Test Section  
  const aiTestSection = (
    <div className="p-6 sm:p-8">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">
          🤖 ViveSpaces AI - Sistema de Pruebas
        </h2>
        <p className="text-emerald-100">
          Prueba los 3 algoritmos de Machine Learning y verifica la conexión con FastAPI
        </p>

        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
          <div className={`w-3 h-3 rounded-full ${
            aiConnectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
            aiConnectionStatus === 'disconnected' ? 'bg-red-400' :
            'bg-yellow-400 animate-pulse'
          }`}></div>
          <span className="text-white font-medium">
            {aiConnectionStatus === 'connected' ? 'API Conectada' :
             aiConnectionStatus === 'disconnected' ? 'API Desconectada' :
             'Verificando...'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            🔌 Conexión
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Verificar que FastAPI esté corriendo
          </p>
          <button
            onClick={testAiConnection}
            disabled={aiLoading.connection}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {aiLoading.connection ? '⏳ Probando...' : '🚀 Probar Conexión'}
          </button>

          {aiResults.connection && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              aiResults.connection.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200'
            }`}>
              <div className="font-medium">{aiResults.connection.message}</div>
              {aiResults.connection.data && (
                <pre className="mt-2 text-xs overflow-auto max-h-32">
                  {JSON.stringify(aiResults.connection.data, null, 2)}
                </pre>
              )}
              {aiResults.connection.error && (
                <pre className="mt-2 text-xs">
                  {aiResults.connection.error}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            📊 Tracking
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Guardar eventos de búsqueda
          </p>
          <button
            onClick={testAiTracking}
            disabled={aiLoading.tracking || aiConnectionStatus !== 'connected'}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {aiLoading.tracking ? '⏳ Enviando...' : '📤 Enviar Búsqueda'}
          </button>

          {aiResults.tracking && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              aiResults.tracking.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200'
            }`}>
              <div className="font-medium">{aiResults.tracking.message}</div>
              {aiResults.tracking.error && (
                <pre className="mt-2 text-xs">
                  {aiResults.tracking.error}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            🧠 Algoritmos ML
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Verificar que los algoritmos funcionen
          </p>
          <button
            onClick={testAiMLEndpoints}
            disabled={aiLoading.ml || aiConnectionStatus !== 'connected'}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {aiLoading.ml ? '⏳ Probando...' : '🧪 Test Algoritmos'}
          </button>

          {aiResults.ml && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              aiResults.ml.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200'
            }`}>
              <div className="font-medium">{aiResults.ml.message}</div>
              {aiResults.ml.error && (
                <pre className="mt-2 text-xs">
                  {aiResults.ml.error}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        {aiConfig && (
          <>
            <div className="mb-6">
              <label className="block text-lg font-bold text-gray-900 dark:text-white mb-3">
                Selecciona el Algoritmo:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(aiConfig.algorithms).map(([key, algo]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedAlgorithm(key)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedAlgorithm === key
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg scale-105'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <div className="text-3xl mb-2">{algo.icon}</div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{algo.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{algo.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Escribe tu búsqueda:
              </label>
              <input
                type="text"
                value={mlQuery}
                onChange={(e) => setMlQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && testAiAlgorithm()}
                placeholder="Ej: casa venta zapopan con piscina"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-gray-700 rounded-lg focus:border-emerald-500 focus:outline-none dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Ejemplos rápidos:
              </label>
              <div className="flex flex-wrap gap-2">
                {aiConfig.testQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setMlQuery(example)}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-full transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={testAiAlgorithm}
              disabled={mlLoading || !mlQuery.trim() || aiConnectionStatus !== 'connected'}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {mlLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analizando con {aiConfig.algorithms[selectedAlgorithm]?.name}...
                </span>
              ) : (
                `🔍 Buscar con ${aiConfig.algorithms[selectedAlgorithm]?.name}`
              )}
            </button>

            {mlResult && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  📊 Resultados de {aiConfig.algorithms[selectedAlgorithm]?.name}:
                </h3>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl p-6 border-2 border-emerald-200 dark:border-emerald-800">
                  <pre className="text-sm overflow-auto max-h-96 bg-white dark:bg-gray-900 p-4 rounded-lg">
                    {JSON.stringify(mlResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          📝 Información del Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Estado API:</h4>
            <p className={`font-bold ${
              aiConnectionStatus === 'connected' ? 'text-green-600' :
              aiConnectionStatus === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {aiConnectionStatus === 'connected' ? '✅ Conectada' :
               aiConnectionStatus === 'disconnected' ? '❌ Desconectada' :
               '⏳ Verificando...'}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Usuario:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              {user ? `${user.name} (#${user.id})` : 'No autenticado'}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Tests Completados:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              {Object.keys(aiResults).length} / 3
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Algoritmos:</h4>
            <p className="text-gray-600 dark:text-gray-400">
              4 disponibles
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Sección de Configuración del Sistema
  const systemConfigSection = (
    <div className="p-6 sm:p-8">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">
          ⚙️ Configuración del Sistema
        </h2>
        <p className="text-emerald-100">
          Controla las configuraciones globales del sistema de verificación
        </p>
      </div>

      {configsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Configuraciones Públicas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
              <h3 className="text-xl font-bold text-white">Configuraciones Públicas</h3>
              <p className="text-emerald-100 text-sm">Accesibles sin autenticación</p>
            </div>

            <div className="p-6 space-y-4">
              {systemConfigs
                .filter(config => config.is_public)
                .map(config => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {config.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {config.description}
                      </p>
                    </div>

                    <div className="ml-4">
                      {config.type === 'boolean' ? (
                        <button
                          onClick={() => updateSystemConfig(config.key, config.value === 'true' ? 'false' : 'true')}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ${
                            config.value === 'true'
                              ? 'bg-emerald-600'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                              config.value === 'true' ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <input
                          type={config.type === 'integer' ? 'number' : 'text'}
                          value={config.value}
                          onChange={(e) => updateSystemConfig(config.key, e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white w-24"
                        />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Configuraciones Privadas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
              <h3 className="text-xl font-bold text-white">Configuraciones Privadas</h3>
              <p className="text-purple-100 text-sm">Solo accesibles para administradores</p>
            </div>

            <div className="p-6 space-y-4">
              {systemConfigs
                .filter(config => !config.is_public)
                .map(config => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {config.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {config.description}
                      </p>
                    </div>

                    <div className="ml-4">
                      {config.type === 'boolean' ? (
                        <button
                          onClick={() => updateSystemConfig(config.key, config.value === 'true' ? 'false' : 'true')}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ${
                            config.value === 'true'
                              ? 'bg-purple-600'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                              config.value === 'true' ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : config.type === 'integer' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={config.value}
                            onChange={(e) => updateSystemConfig(config.key, e.target.value)}
                            className="w-32"
                          />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-center">
                            {config.value}%
                          </span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={config.value}
                          onChange={(e) => updateSystemConfig(config.key, e.target.value)}
                          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white w-32"
                        />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Información</h4>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Los cambios en las configuraciones se aplican inmediatamente. Las configuraciones públicas están disponibles para todos los usuarios, mientras que las privadas solo son accesibles desde el panel de administración.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Definir las secciones
  const sections = {
    dashboard: dashboardSection,
    users: usersSection,
    properties: propertiesSection,
    'ai-test': aiTestSection,
    'system-config': systemConfigSection,
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
                    <div key={index} className="relative">
                      <img
                        src={photo.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border shadow-sm hover:shadow-lg transition-shadow"
                        onError={(e) => {
                          console.error(`Error loading image ${index + 1}:`, e.target.src);
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcnJvciBlbiBpbWFnZW48L3RleHQ+PC9zdmc+';
                        }}
                      />
                      {photo.is_primary && (
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold">
                          Principal
                        </div>
                      )}
                      {photo.is_duplicate && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                          Duplicada
                        </div>
                      )}
                    </div>
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
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeSection === 'ai-test'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              onClick={() => setActiveSection('ai-test')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Test AI / FastAPI
            </li>

            <li
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${activeSection === 'system-config'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              onClick={() => setActiveSection('system-config')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuración del Sistema
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