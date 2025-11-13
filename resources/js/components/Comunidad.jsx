import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';

// 🆕 DICCIONARIO COMPLETO DE MENSAJES - 100% React, 0% Backend
const APP_MESSAGES = {
    success: {
        postCreated: '¡Tu publicación ha sido creada exitosamente! 🎉',
        postUpdated: '¡Tu publicación ha sido actualizada exitosamente! ✅',
        postDeleted: 'Publicación eliminada correctamente',
        commentAdded: '¡Comentario agregado! 💬',
        commentDeleted: 'Comentario eliminado correctamente',
        reactionAdded: '¡Reacción agregada!',
    },
    error: {
        // Errores de red
        networkError: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
        serverError: 'Ocurrió un error en el servidor. Por favor, intenta de nuevo más tarde.',

        // Errores de sesión
        sessionExpired: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        unauthorized: 'Debes iniciar sesión para realizar esta acción.',
        forbidden: 'No tienes permiso para realizar esta acción.',

        // Errores de publicaciones
        postCreateFailed: 'No se pudo crear la publicación. Por favor, verifica los datos e intenta de nuevo.',
        postUpdateFailed: 'No se pudo actualizar la publicación. Por favor, intenta de nuevo.',
        postDeleteFailed: 'No se pudo eliminar la publicación. Por favor, intenta de nuevo.',
        postNotFound: 'La publicación no existe o ha sido eliminada.',
        postLoadFailed: 'No se pudieron cargar las publicaciones. Por favor, recarga la página.',

        // Errores de comentarios
        commentAddFailed: 'No se pudo agregar el comentario. Por favor, intenta de nuevo.',
        commentDeleteFailed: 'No se pudo eliminar el comentario. Por favor, intenta de nuevo.',
        commentEmpty: 'El comentario no puede estar vacío.',
        commentInvalid: 'El comentario es inválido. Por favor, verifica el contenido.',
        commentsLoadFailed: 'No se pudieron cargar los comentarios.',

        // Errores de archivos
        filesTooLarge: 'Los archivos son demasiado grandes. El tamaño máximo total es de 10MB.',
        fileTypeInvalid: 'Tipo de archivo no permitido. Solo se permiten imágenes, PDF y documentos.',
        tooManyFiles: 'Solo puedes subir máximo 5 archivos.',

        // Errores de validación
        validationFailed: 'Por favor, verifica que todos los campos estén correctos.',
    },
    info: {
        loginRequired: 'Debes iniciar sesión para realizar esta acción.',
    },
    warning: {
        commentEmpty: 'El comentario no puede estar vacío.',
    }
};

// 🆕 DICCIONARIO DE TRADUCCIÓN DE CAMPOS (Backend → Español)
const FIELD_TRANSLATIONS = {
    'title': 'El título',
    'content': 'El contenido',
    'zone': 'La zona',
    'subzone': 'La subzona',
    'post_type': 'El tipo de publicación',
    'topic': 'El tema',
    'attachments': 'Los archivos adjuntos',
    'attachments.*': 'Uno de los archivos',
    'existing_attachments': 'Los archivos existentes',
    'user_id': 'El usuario',
    'is_anonymous': 'La opción de anonimato',
    'allow_comments': 'La opción de comentarios',
};

// 🆕 FUNCIÓN PARA TRADUCIR ERRORES DEL BACKEND A MENSAJES AMIGABLES
const translateBackendError = (backendMessage) => {
    if (!backendMessage) return null;

    const message = backendMessage.toLowerCase();

    // Traducir mensajes comunes de validación de Laravel
    if (message.includes('required') || message.includes('obligatorio')) return 'Este campo es obligatorio';
    if (message.includes('must be at least') || message.includes('al menos')) return 'Este campo es muy corto';
    if (message.includes('may not be greater than') || message.includes('no puede exceder')) return 'Este campo es muy largo';
    if (message.includes('invalid') || message.includes('inválido')) return 'El valor ingresado no es válido';
    if (message.includes('not found') || message.includes('no encontrado')) return 'No se encontró el elemento';
    if (message.includes('unauthorized') || message.includes('no autorizado')) return 'No autorizado';
    if (message.includes('forbidden') || message.includes('prohibido')) return 'Acción no permitida';
    if (message.includes('unauthenticated') || message.includes('sin autenticar')) return 'Sesión no válida';
    if (message.includes('too large') || message.includes('demasiado grande')) return 'Archivo muy grande';
    if (message.includes('file type') || message.includes('tipo de archivo')) return 'Tipo de archivo no permitido';

    // Si no hay traducción específica, retornar null para usar mensaje genérico
    return null;
};

// 🆕 FUNCIÓN PARA PROCESAR ERRORES DE VALIDACIÓN DEL BACKEND
const processValidationErrors = (backendErrors) => {
    if (!backendErrors || typeof backendErrors !== 'object') return null;

    const errorMessages = Object.entries(backendErrors)
        .map(([field, messages]) => {
            const displayName = FIELD_TRANSLATIONS[field] || field;
            const messageList = Array.isArray(messages) ? messages : [messages];

            // Traducir cada mensaje individual
            const translatedMessages = messageList.map(msg => {
                const translated = translateBackendError(msg);
                return translated || msg;
            });

            return `${displayName}: ${translatedMessages.join(', ')}`;
        })
        .join('\n');

    return errorMessages || APP_MESSAGES.error.validationFailed;
};

function Comunidad() {
    // Estados principales
    const [posts, setPosts] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Solo para carga inicial
    const [searching, setSearching] = useState(false); // 🆕 Para búsquedas/filtros
    const [creating, setCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [addingComment, setAddingComment] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [updatingComment, setUpdatingComment] = useState(false);
    const [filters, setFilters] = useState({
        zone: '',
        post_type: '',
        topic: '',
        search: ''
    });

    // Estados para animaciones y efectos
    const [animateHeader, setAnimateHeader] = useState(false);
    const [hoveredPost, setHoveredPost] = useState(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [sortBy, setSortBy] = useState('recent');

    // Sistema de notificaciones
    const [notifications, setNotifications] = useState([]);

    // Estado para confirmación de eliminación
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);
    const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);

    // 🆕 Estado para debounce
    const [searchTimeout, setSearchTimeout] = useState(null);

    // Función para mostrar notificaciones tipo toast
    const showNotification = useCallback((message, type = 'success', duration = 5000) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        
        if (duration > 0) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(notif => notif.id !== id));
            }, duration);
        }
    }, []);

    // Función para cerrar notificación manualmente
    const closeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, []);

    // Obtener CSRF token
    const getCsrfToken = () => {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    };

    // Cargar usuario actual
    const loadUser = useCallback(async () => {
        try {
            const response = await fetch('/api/user', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData.user || userData);
            }
        } catch (error) {
            console.log('Usuario no autenticado');
            setUser(null);
        }
    }, []);

    // 🆕 MEJORADO: Cargar posts con loading states separados
    const loadPosts = useCallback(async (filterParams = {}, isInitialLoad = false) => {
        // Si es carga inicial usa 'loading', si no usa 'searching'
        if (isInitialLoad) {
            setLoading(true);
        } else {
            setSearching(true);
        }

        try {
            const params = new URLSearchParams({
                ...filters,
                ...filterParams
            }).toString();

            const response = await fetch(`/api/comunidad?${params}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();
            if (data.success) {
                setPosts(data.data.data || data.data || []);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            setPosts([]);
            if (isInitialLoad) {
                showNotification(APP_MESSAGES.error.postLoadFailed, 'error');
            }
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            } else {
                setSearching(false);
            }
        }
    }, [filters, showNotification]);

    // 🆕 MEJORADO: Manejar cambios de filtros con debounce
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        
        // 🆕 Si es búsqueda por texto, usar debounce
        if (newFilters.search !== undefined) {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            const timeout = setTimeout(() => {
                loadPosts(newFilters, false);
            }, 500); // Espera 500ms después de que el usuario deje de escribir
            
            setSearchTimeout(timeout);
        } else {
            // Para otros filtros, buscar inmediatamente
            loadPosts(newFilters, false);
        }
    }, [loadPosts, searchTimeout]);

    // 🆕 Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [searchTimeout]);

    // Bloquear telemetría de Mapbox
    useEffect(() => {
        // Sobrescribir fetch para bloquear peticiones a events.mapbox.com
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes('events.mapbox.com')) {
                return Promise.resolve(new Response(null, { status: 204 }));
            }
            return originalFetch.apply(this, args);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    // Crear post con validaciones y mejor manejo de errores
    const handleCreatePost = useCallback(async (postData) => {
        if (!user) {
            showNotification(APP_MESSAGES.info.loginRequired, 'info');
            return;
        }

        setCreating(true);

        try {
            const formData = new FormData();

            formData.append('title', postData.title);
            formData.append('content', postData.content);
            formData.append('zone', postData.zone);

            if (postData.subzone && postData.subzone.trim()) {
                formData.append('subzone', postData.subzone);
            }

            formData.append('post_type', postData.post_type);
            formData.append('topic', postData.topic);
            formData.append('is_anonymous', postData.is_anonymous ? '1' : '0');
            formData.append('allow_comments', postData.allow_comments ? '1' : '0');

            if (postData.attachments && postData.attachments.length > 0) {
                Array.from(postData.attachments).forEach((file) => {
                    formData.append('attachments[]', file);
                });
            }

            const response = await fetch('/api/comunidad', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setPosts(prev => [result.data, ...prev]);
                setShowCreateForm(false);
                showNotification(APP_MESSAGES.success.postCreated, 'success');
            } else {
                // 🆕 Manejo de errores con mensajes de React
                if (response.status === 401) {
                    showNotification(APP_MESSAGES.error.sessionExpired, 'error');
                    setTimeout(() => window.location.href = '/login', 2000);
                } else if (response.status === 422 && result.errors) {
                    // Procesar errores de validación del backend
                    const errorMessages = processValidationErrors(result.errors);
                    showNotification(errorMessages, 'error', 8000);
                } else if (response.status === 413) {
                    showNotification(APP_MESSAGES.error.filesTooLarge, 'error');
                } else if (response.status >= 500) {
                    showNotification(APP_MESSAGES.error.serverError, 'error');
                } else {
                    // Usar mensaje de React, no del backend
                    showNotification(APP_MESSAGES.error.postCreateFailed, 'error');
                }
            }
        } catch (error) {
            console.error('Error de red:', error);
            showNotification(APP_MESSAGES.error.networkError, 'error');
        } finally {
            setCreating(false);
        }
    }, [user, showNotification]);

    // Editar post
    const handleEditPost = useCallback(async (postData) => {
        if (!editingPost) {
            showNotification(APP_MESSAGES.error.postNotFound, 'error');
            return;
        }

        setCreating(true);

        try {
            const formData = new FormData();

            formData.append('title', postData.title);
            formData.append('content', postData.content);
            formData.append('zone', postData.zone);

            if (postData.subzone && postData.subzone.trim()) {
                formData.append('subzone', postData.subzone);
            }

            formData.append('post_type', postData.post_type);
            formData.append('topic', postData.topic);
            formData.append('is_anonymous', postData.is_anonymous ? '1' : '0');
            formData.append('allow_comments', postData.allow_comments ? '1' : '0');

            // 🆕 Enviar archivos existentes que se mantienen (incluso si está vacío para indicar que se eliminaron todos)
            if (postData.existingAttachments !== undefined) {
                formData.append('existing_attachments', JSON.stringify(postData.existingAttachments));
            }

            // 🆕 Enviar nuevos archivos adjuntos
            if (postData.attachments && postData.attachments.length > 0) {
                Array.from(postData.attachments).forEach((file) => {
                    formData.append('attachments[]', file);
                });
            }

            formData.append('_method', 'PUT');

            const response = await fetch(`/api/comunidad/${editingPost.id}`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setPosts(prev => prev.map(post =>
                    post.id === editingPost.id ? result.data : post
                ));
                setShowEditForm(false);
                setEditingPost(null);
                showNotification(APP_MESSAGES.success.postUpdated, 'success');
            } else {
                // 🆕 Manejo de errores con mensajes de React
                if (response.status === 401) {
                    showNotification(APP_MESSAGES.error.sessionExpired, 'error');
                    setTimeout(() => window.location.href = '/login', 2000);
                } else if (response.status === 422 && result.errors) {
                    const errorMessages = processValidationErrors(result.errors);
                    showNotification(errorMessages, 'error', 8000);
                } else if (response.status === 403) {
                    showNotification(APP_MESSAGES.error.forbidden, 'error');
                } else if (response.status >= 500) {
                    showNotification(APP_MESSAGES.error.serverError, 'error');
                } else {
                    showNotification(APP_MESSAGES.error.postUpdateFailed, 'error');
                }
            }
        } catch (error) {
            console.error('Error de red:', error);
            showNotification(APP_MESSAGES.error.networkError, 'error');
        } finally {
            setCreating(false);
        }
    }, [editingPost, showNotification]);

    // Cargar comentarios
    const loadComments = useCallback(async (postId) => {
        setLoadingComments(true);
        try {
            const response = await fetch(`/api/comunidad/${postId}/comments`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();
            if (data.success) {
                setComments(data.data || []);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            setComments([]);
            showNotification(APP_MESSAGES.error.commentsLoadFailed, 'error');
        } finally {
            setLoadingComments(false);
        }
    }, [showNotification]);

    // Agregar comentario
    const handleAddComment = useCallback(async (postId) => {
        if (!newComment.trim()) {
            showNotification(APP_MESSAGES.warning.commentEmpty, 'warning');
            return;
        }

        if (!user) {
            showNotification(APP_MESSAGES.info.loginRequired, 'info');
            return;
        }

        if (addingComment) return;

        setAddingComment(true);
        try {
            const response = await fetch(`/api/comunidad/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    content: newComment.trim(),
                    is_anonymous: false
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setComments(prev => [...prev, result.data]);
                setNewComment('');
                setPosts(prev => prev.map(post =>
                    post.id === postId
                        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
                        : post
                ));
                showNotification(APP_MESSAGES.success.commentAdded, 'success');
            } else {
                // 🆕 Manejo de errores con mensajes de React
                if (response.status === 401) {
                    showNotification(APP_MESSAGES.error.sessionExpired, 'error');
                } else if (response.status === 422 && result.errors) {
                    // Mostrar errores de validación específicos del backend
                    const errorMessages = processValidationErrors(result.errors);
                    showNotification(errorMessages, 'error', 8000);
                } else {
                    showNotification(APP_MESSAGES.error.commentAddFailed, 'error');
                }
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showNotification(APP_MESSAGES.error.networkError, 'error');
        } finally {
            setAddingComment(false);
        }
    }, [newComment, user, addingComment, showNotification]);

    // Actualizar comentario
    const handleUpdateComment = useCallback(async (commentId) => {
        if (!editCommentText.trim()) {
            showNotification(APP_MESSAGES.warning.commentEmpty, 'warning');
            return;
        }

        if (!user) {
            showNotification(APP_MESSAGES.info.loginRequired, 'info');
            return;
        }

        if (updatingComment) return;

        setUpdatingComment(true);
        try {
            const response = await fetch(`/api/comunidad/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    content: editCommentText.trim()
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setComments(prev => prev.map(comment =>
                    comment.id === commentId ? result.data : comment
                ));
                setEditingComment(null);
                setEditCommentText('');
                showNotification('¡Comentario actualizado! ✅', 'success');
            } else {
                if (response.status === 401) {
                    showNotification(APP_MESSAGES.error.sessionExpired, 'error');
                } else if (response.status === 403) {
                    showNotification(APP_MESSAGES.error.forbidden, 'error');
                } else if (response.status === 422 && result.errors) {
                    // Mostrar errores de validación específicos del backend
                    const errorMessages = processValidationErrors(result.errors);
                    showNotification(errorMessages, 'error', 8000);
                } else {
                    showNotification('No se pudo actualizar el comentario', 'error');
                }
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            showNotification(APP_MESSAGES.error.networkError, 'error');
        } finally {
            setUpdatingComment(false);
        }
    }, [editCommentText, user, updatingComment, showNotification]);

    // Mostrar confirmación de eliminación
    const handleDeletePost = useCallback((postId) => {
        setPostToDelete(postId);
        setShowDeleteConfirm(true);
    }, []);

    // Confirmar y ejecutar eliminación
    const confirmDeletePost = useCallback(async () => {
        if (!postToDelete) return;

        setShowDeleteConfirm(false);

        try {
            const postId = postToDelete;
            const response = await fetch(`/api/comunidad/${postId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setPosts(prev => prev.filter(post => post.id !== postId));

                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(null);
                    setComments([]);
                    setNewComment('');
                }

                showNotification(APP_MESSAGES.success.postDeleted, 'success');
            } else {
                // 🆕 Manejo de errores con mensajes de React
                if (response.status === 401) {
                    showNotification(APP_MESSAGES.error.sessionExpired, 'error');
                } else if (response.status === 403) {
                    showNotification(APP_MESSAGES.error.forbidden, 'error');
                } else if (response.status === 404) {
                    showNotification(APP_MESSAGES.error.postNotFound, 'error');
                } else {
                    showNotification(APP_MESSAGES.error.postDeleteFailed, 'error');
                }
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            showNotification(APP_MESSAGES.error.networkError, 'error');
        } finally {
            setPostToDelete(null);
        }
    }, [postToDelete, selectedPost, showNotification]);

    // Mostrar confirmación de eliminación de comentario
    const handleDeleteComment = useCallback((commentId) => {
        setCommentToDelete(commentId);
        setShowDeleteCommentConfirm(true);
    }, []);

    // Confirmar y ejecutar eliminación de comentario
    const confirmDeleteComment = useCallback(async () => {
        if (!commentToDelete) return;

        setShowDeleteCommentConfirm(false);

        try {
            const commentId = commentToDelete;
            const response = await fetch(`/api/comunidad/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setComments(prev => prev.filter(comment => comment.id !== commentId));

                if (selectedPost) {
                    setPosts(prev => prev.map(post =>
                        post.id === selectedPost.id
                            ? { ...post, comments_count: Math.max((post.comments_count || 1) - 1, 0) }
                            : post
                    ));
                }

                showNotification(APP_MESSAGES.success.commentDeleted, 'success');
            } else {
                // 🆕 Manejo de errores con mensajes de React
                if (response.status === 401) {
                    showNotification(APP_MESSAGES.error.sessionExpired, 'error');
                } else if (response.status === 403) {
                    showNotification(APP_MESSAGES.error.forbidden, 'error');
                } else {
                    showNotification(APP_MESSAGES.error.commentDeleteFailed, 'error');
                }
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            showNotification(APP_MESSAGES.error.networkError, 'error');
        } finally {
            setCommentToDelete(null);
        }
    }, [commentToDelete, selectedPost, showNotification]);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateHeader(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Cargar datos iniciales
    useEffect(() => {
        loadUser();
        loadPosts({}, true); // isInitialLoad = true
    }, []);

    // Solo mostrar loading completo en carga inicial
    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16">
            {/* Sistema de Notificaciones Toast */}
            <NotificationContainer 
                notifications={notifications} 
                onClose={closeNotification} 
            />

            {/* Header mejorado con animaciones */}
            <CommunityHeader
                user={user}
                onCreatePost={() => setShowCreateForm(true)}
                filters={filters}
                onFilterChange={handleFilterChange}
                animateHeader={animateHeader}
                searchFocused={searchFocused}
                setSearchFocused={setSearchFocused}
            />

            {/* Create Post Modal */}
            {showCreateForm && (
                <CreatePostModal
                    user={user}
                    onSubmit={handleCreatePost}
                    onClose={() => setShowCreateForm(false)}
                    creating={creating}
                />
            )}

            {/* Edit Post Modal */}
            {showEditForm && editingPost && (
                <CreatePostModal
                    user={user}
                    onSubmit={handleEditPost}
                    onClose={() => {
                        setShowEditForm(false);
                        setEditingPost(null);
                    }}
                    creating={creating}
                    isEdit={true}
                    initialData={editingPost}
                />
            )}

            {/* Posts Feed mejorado con controles de vista */}
            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Controles de vista y ordenamiento */}
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        {/* Tabs de categorías */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'Todas', icon: '🏠', topic: '' },
                                { id: 'social', label: 'Social', icon: '👥', topic: 'social' },
                                { id: 'security', label: 'Seguridad', icon: '🛡️', topic: 'security' },
                                { id: 'maintenance', label: 'Mantenimiento', icon: '🔨', topic: 'maintenance' },
                                { id: 'marketplace', label: 'Marketplace', icon: '🛒', topic: 'marketplace' },
                                { id: 'pets', label: 'Mascotas', icon: '🐾', topic: 'pets' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        handleFilterChange({ topic: tab.topic });
                                    }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                                        activeTab === tab.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Selector de ordenamiento */}
                        <div>
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    handleFilterChange({ sort: e.target.value });
                                }}
                                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            >
                                <option value="recent">Más recientes</option>
                                <option value="popular">Más populares</option>
                                <option value="trending">Tendencia</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 🆕 Indicador de búsqueda (sutil) */}
                {searching && (
                    <div className="mb-4 flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-md flex items-center space-x-2">
                            <svg className="animate-spin h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Buscando...</span>
                        </div>
                    </div>
                )}

                {posts.length === 0 && !searching ? (
                    <EmptyState onCreatePost={() => setShowCreateForm(true)} user={user} />
                ) : (
                    <PostsList
                        posts={posts}
                        user={user}
                        onSelect={(post) => {
                            setSelectedPost(post);
                            loadComments(post.id);
                        }}
                        onEdit={(post) => {
                            setEditingPost(post);
                            setShowEditForm(true);
                        }}
                        onDelete={handleDeletePost}
                        hoveredPost={hoveredPost}
                        setHoveredPost={setHoveredPost}
                    />
                )}
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => {
                        setSelectedPost(null);
                        setComments([]);
                        setNewComment('');
                        setEditingComment(null);
                        setEditCommentText('');
                    }}
                    user={user}
                    comments={comments}
                    loadingComments={loadingComments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    onAddComment={() => handleAddComment(selectedPost.id)}
                    addingComment={addingComment}
                    onEdit={(post) => {
                        setEditingPost(post);
                        setShowEditForm(true);
                        setSelectedPost(null);
                    }}
                    onDelete={handleDeletePost}
                    onDeleteComment={handleDeleteComment}
                    editingComment={editingComment}
                    setEditingComment={setEditingComment}
                    editCommentText={editCommentText}
                    setEditCommentText={setEditCommentText}
                    onUpdateComment={handleUpdateComment}
                    updatingComment={updatingComment}
                />
            )}

            {/* Modal de confirmación de eliminación */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            ¿Eliminar publicación?
                        </h3>

                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Esta acción no se puede deshacer y se eliminarán también todos los comentarios.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setPostToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeletePost}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación de comentario */}
            {showDeleteCommentConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            ¿Eliminar comentario?
                        </h3>

                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Esta acción no se puede deshacer.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteCommentConfirm(false);
                                    setCommentToDelete(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteComment}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sistema de Notificaciones Toast
function NotificationContainer({ notifications, onClose }) {
    return (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md">
            {notifications.map(notification => (
                <NotificationToast
                    key={notification.id}
                    notification={notification}
                    onClose={() => onClose(notification.id)}
                />
            ))}
        </div>
    );
}

function NotificationToast({ notification, onClose }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getColorClasses = () => {
        switch (notification.type) {
            case 'success':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
            case 'error':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
            case 'warning':
                return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
            case 'info':
                return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
            default:
                return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200';
        }
    };

    return (
        <div
            className={`${getColorClasses()} border-2 rounded-xl shadow-lg p-4 transition-all duration-300 transform ${
                isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
            }`}
        >
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium whitespace-pre-line break-words">
                        {notification.message}
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// Componente Loading
function LoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="text-center">
                <div className="relative mx-auto mb-8">
                    <div className="w-20 h-20 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-b-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent animate-pulse">
                        Cargando Comunidad
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Preparando tu experiencia vecinal...</p>
                </div>

                <div className="flex justify-center space-x-2 mt-6">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Componente Header
function CommunityHeader({ user, onCreatePost, filters, onFilterChange, animateHeader, searchFocused, setSearchFocused }) {
    return (
        <div className={`bg-gradient-to-br from-white via-emerald-50 to-emerald-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-2xl border-b border-emerald-200 dark:border-emerald-800 relative overflow-hidden`}>
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 dark:bg-emerald-800 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
                <div className={`flex items-center justify-between mb-8 transition-all duration-1000 ${animateHeader ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className={`w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-700 ${animateHeader ? 'rotate-0 scale-100' : 'rotate-180 scale-0'}`}>
                                <span className="text-3xl animate-bounce" style={{ animationDelay: '0.5s' }}>🏘️</span>
                            </div>
                            <div className={`transition-all duration-700 ${animateHeader ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent animate-pulse">
                                    Comunidad Vecinal
                                </h1>
                                <p className="text-lg text-gray-600 dark:text-gray-400 mt-1 font-medium">
                                    Mantente conectado con tu vecindario
                                </p>
                            </div>
                        </div>
                    </div>

                    {user && (
                        <button
                            onClick={onCreatePost}
                            className={`group relative bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-500 transform hover:scale-105 hover:shadow-2xl flex items-center space-x-3 shadow-lg overflow-hidden ${animateHeader ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                            style={{ transitionDelay: '0.3s' }}
                        >
                            <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <span className="relative z-10">Nueva Publicación</span>
                            <div className="absolute inset-0 bg-white bg-opacity-20 rounded-2xl transform scale-0 group-hover:scale-100 transition-transform duration-500"></div>

                            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white bg-opacity-30 rounded-full transform scale-0 group-hover:scale-100 transition-all duration-700" style={{ transitionDelay: '0.1s' }}></div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white bg-opacity-30 rounded-full transform scale-0 group-hover:scale-100 transition-all duration-700" style={{ transitionDelay: '0.2s' }}></div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white bg-opacity-30 rounded-full transform scale-0 group-hover:scale-100 transition-all duration-700" style={{ transitionDelay: '0.3s' }}></div>
                            </div>
                        </button>
                    )}
                </div>

                <div className={`transition-all duration-700 ${animateHeader ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.5s' }}>
                    <CommunityFilters
                        filters={filters}
                        onChange={onFilterChange}
                        searchFocused={searchFocused}
                        setSearchFocused={setSearchFocused}
                    />
                </div>
            </div>
        </div>
    );
}

// Componente Filtros
function CommunityFilters({ filters, onChange }) {
    const handleInputChange = (key, value) => {
        onChange({ [key]: value });
    };

    const CustomSelect = ({ value, onChange, options, values }) => (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className="w-full px-4 py-3 pr-12 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 cursor-pointer"
                style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'none'
                }}
            >
                {options.map((option, index) => (
                    <option key={index} value={values[index]}>{option}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Buscar publicaciones..."
                    value={filters.search}
                    onChange={(e) => handleInputChange('search', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                />
            </div>

            <CustomSelect
                value={filters.zone}
                onChange={(e) => handleInputChange('zone', e.target.value)}
                options={['Todas las zonas', 'Centro', 'Norte', 'Sur', 'Este', 'Oeste']}
                values={['', 'centro', 'norte', 'sur', 'este', 'oeste']}
            />

            <CustomSelect
                value={filters.post_type}
                onChange={(e) => handleInputChange('post_type', e.target.value)}
                options={['Todos los tipos', '📝 General', '🚨 Alertas', '❓ Preguntas', '💰 Ventas', '🔧 Servicios', '🎉 Eventos', '🔍 Perdidos y Encontrados']}
                values={['', 'general', 'alert', 'question', 'sale', 'service', 'event', 'lost_found']}
            />

            <CustomSelect
                value={filters.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                options={['Todos los temas', '🛡️ Seguridad', '🔨 Mantenimiento', '👥 Social', '🏪 Servicios', '🛒 Marketplace', '🐕 Mascotas', '🚗 Transporte', '📋 Otros']}
                values={['', 'security', 'maintenance', 'social', 'services', 'marketplace', 'pets', 'transportation', 'other']}
            />
        </div>
    );
}

// Componente Estado Vacío
function EmptyState({ onCreatePost, user }) {
    return (
        <div className="text-center py-20">
            <div className="relative mx-auto w-40 h-40 mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-gradient-to-br from-emerald-200 to-emerald-300 dark:from-emerald-800 dark:to-emerald-700 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-4 bg-gradient-to-br from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                    <svg className="w-20 h-20 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
            </div>

            <div className="space-y-4 mb-10">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent">
                    ¡Bienvenido a tu Comunidad!
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Aún no hay publicaciones, pero eso está a punto de cambiar. Sé el primero en compartir algo increíble con tus vecinos.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-10">
                {[
                    { icon: '👥', label: 'Vecinos Conectados', value: '0' },
                    { icon: '📝', label: 'Publicaciones', value: '0' },
                    { icon: '💬', label: 'Conversaciones', value: '0' }
                ].map((stat, index) => (
                    <div key={index} className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-105 transition-all duration-300">
                        <div className="text-3xl mb-2">{stat.icon}</div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{stat.value}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                    </div>
                ))}
            </div>

            {user && (
                <div className="space-y-4">
                    <button
                        onClick={onCreatePost}
                        className="group bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-10 py-5 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white bg-opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                        <span className="flex items-center space-x-3 relative z-10">
                            <svg className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Crear Primera Publicación</span>
                        </span>
                    </button>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        💡 Tip: Las publicaciones sobre eventos locales, alertas de seguridad y recomendaciones de servicios son muy populares
                    </p>
                </div>
            )}
        </div>
    );
}

// Componente Lista de Posts
function PostsList({ posts, user, onSelect, onEdit, onDelete, hoveredPost, setHoveredPost }) {
    return (
        <div className="space-y-6">
            {posts.map((post, index) => (
                <div
                    key={post.id}
                    className={`transition-all duration-500 ${index < 3 ? 'animate-fade-in-up' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <PostCard
                        post={post}
                        user={user}
                        onSelect={onSelect}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        hoveredPost={hoveredPost}
                        setHoveredPost={setHoveredPost}
                    />
                </div>
            ))}
        </div>
    );
}

// Componente Tarjeta de Post
function PostCard({ post, user, onSelect, onEdit, onDelete, hoveredPost, setHoveredPost }) {

    const getPostTypeIcon = (type) => {
        const icons = {
            general: '📝',
            alert: '🚨',
            question: '❓',
            sale: '💰',
            service: '🔧',
            event: '🎉',
            lost_found: '🔍'
        };
        return icons[type] || '📝';
    };

    const getTopicColor = (topic) => {
        const colors = {
            security: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            social: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            services: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            marketplace: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            pets: 'bg-pink-100 text-pink-800 dark:bg-purple-900 dark:text-pink-200',
            transportation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
            other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        };
        return colors[topic] || colors.other;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Hace unos minutos';
        } else if (diffInHours < 24) {
            return `Hace ${Math.floor(diffInHours)} horas`;
        } else if (diffInHours < 48) {
            return 'Ayer';
        } else {
            return date.toLocaleDateString('es-ES');
        }
    };

    return (
        <div
            className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all duration-500 transform hover:-translate-y-1 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-700 relative overflow-hidden max-w-2xl mx-auto ${hoveredPost === post.id ? 'ring-2 ring-emerald-500/20' : ''}`}
            onMouseEnter={() => setHoveredPost(post.id)}
            onMouseLeave={() => setHoveredPost(null)}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <div className="absolute top-3 left-3 z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transform transition-all duration-300 group-hover:scale-110 ${
                    post.post_type === 'alert' ? 'bg-red-100 dark:bg-red-900/30 animate-pulse' :
                        post.post_type === 'event' ? 'bg-purple-100 dark:bg-purple-900/30' :
                            post.post_type === 'sale' ? 'bg-green-100 dark:bg-green-900/30' :
                                'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                    {getPostTypeIcon(post.post_type)}
                </div>
            </div>

            <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center space-x-4">
                    <div className="relative group/avatar">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center font-semibold text-lg shadow-lg transition-all duration-300 group-hover/avatar:scale-110 group-hover/avatar:shadow-xl">
                            {post.is_anonymous ? '?' : (post.user?.name?.charAt(0) || 'A')}
                        </div>
                        {post.is_pinned && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                <svg className="w-3 h-3 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse">
                            </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-lg transition-colors duration-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                {post.is_anonymous ? 'Usuario Anónimo' : `${post.user?.name || 'Usuario'} ${post.user?.last_name || ''}`}
                            </h4>
                            <span className={`px-3 py-1.5 text-sm rounded-full font-medium ${getTopicColor(post.topic)} shadow-sm transition-all duration-300 group-hover:scale-105`}>
                                {post.topic}
                            </span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center space-x-1 transition-colors duration-300 group-hover:text-emerald-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{post.zone}</span>
                            </span>
                            {post.subzone && (
                                <>
                                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                    <span>{post.subzone}</span>
                                </>
                            )}
                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                            <span>{formatDate(post.created_at)}</span>
                        </div>
                    </div>
                </div>

                {user && user.id === post.user_id && (
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => onEdit(post)}
                            className="p-2.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title="Editar publicación"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(post.id)}
                            className="p-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            title="Eliminar publicación"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div className="mb-6 relative z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight transition-colors duration-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {post.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
                    {post.content.length > 200
                        ? `${post.content.substring(0, 200)}...`
                        : post.content
                    }
                </p>
            </div>

            {post.attachments && post.attachments.length > 0 && (
                <div className="mb-6 relative z-10">
                    <div className={`grid gap-3 ${
                        post.attachments.length === 1 ? 'grid-cols-1' :
                            post.attachments.length === 2 ? 'grid-cols-2' :
                                'grid-cols-2 md:grid-cols-3'
                    }`}>
                        {post.attachments.slice(0, 3).map((attachment, index) => (
                            <div key={index} className="relative group/attachment overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                                {attachment.type?.startsWith('image/') ? (
                                    <div onClick={() => onSelect && onSelect(post)}>
                                        <img
                                            src={`/storage/${attachment.path}`}
                                            alt={attachment.name}
                                            className="w-full h-48 object-cover transition-all duration-300 group-hover/attachment:brightness-110 rounded-xl"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/attachment:bg-opacity-20 transition-all duration-300 rounded-xl flex items-center justify-center">
                                            <svg className="w-8 h-8 text-white opacity-0 group-hover/attachment:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group-hover/attachment:scale-105 border-2 border-dashed border-gray-300 dark:border-gray-600"
                                        onClick={() => onSelect && onSelect(post)}
                                    >
                                        <svg className="w-8 h-8 text-gray-400 mb-2 transition-transform duration-300 group-hover/attachment:scale-110" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm5 3a1 1 0 000 2h6a1 1 0 100-2H9zM7 9a1 1 0 000 2h8a1 1 0 100-2H7zm-2 3a1 1 0 100 2h4a1 1 0 100-2H5z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs text-gray-500 text-center px-2 font-medium">{attachment.name.length > 20 ? attachment.name.substring(0, 20) + '...' : attachment.name}</span>
                                    </div>
                                )}

                                {post.attachments.length > 3 && index === 2 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 rounded-xl flex items-center justify-center text-white font-semibold cursor-pointer transition-all duration-300 group-hover/attachment:bg-opacity-70">
                                        <div className="text-center">
                                            <div className="text-2xl mb-1">+{post.attachments.length - 3}</div>
                                            <div className="text-xs">más archivos</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 relative z-10">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={() => onSelect && onSelect(post)}
                        className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-all duration-300 group/action"
                    >
                        <div className="p-2 rounded-xl transition-all duration-300 group-hover/action:bg-blue-50 dark:group-hover/action:bg-blue-900/20 group-hover/action:scale-110">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <span className="font-medium group-hover/action:scale-110">{post.comments_count || 0}</span>
                    </button>

                </div>

                <div className="text-sm">
                    {post.post_type === 'alert' && post.topic === 'security' && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 shadow-sm animate-pulse">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Alerta de Seguridad
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// 🆕 Componente de campo de entrada optimizado - Extraído fuera del modal para evitar re-creaciones
const FormField = memo(({
    label,
    name,
    type = 'text',
    placeholder,
    required = false,
    maxLength,
    rows,
    value,
    error,
    touched,
    onChange,
    onBlur,
    children
}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children || (
            type === 'textarea' ? (
                <textarea
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(name, e.target.value)}
                    onBlur={() => onBlur(name)}
                    className={`w-full p-3 border-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
                        error && touched
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500'
                    }`}
                    rows={rows || 3}
                    maxLength={maxLength}
                />
            ) : (
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(name, e.target.value)}
                    onBlur={() => onBlur(name)}
                    className={`w-full p-3 border-2 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
                        error && touched
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500'
                    }`}
                    maxLength={maxLength}
                />
            )
        )}

        {/* Contador de caracteres y error */}
        <div className="flex justify-between items-center mt-1">
            {error && touched ? (
                <span className="text-xs text-red-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </span>
            ) : (
                <span></span>
            )}

            {maxLength && (
                <span className={`text-xs ${
                    value.length > maxLength * 0.9
                        ? 'text-orange-500 font-medium'
                        : 'text-gray-500'
                }`}>
                    {value.length}/{maxLength}
                </span>
            )}
        </div>
    </div>
));

FormField.displayName = 'FormField';

// 🆕 MEJORADO Y OPTIMIZADO: Modal para crear/editar post - SIN validación en cada tecla
const CreatePostModal = memo(({ user, onSubmit, onClose, creating, isEdit = false, initialData = null }) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        content: initialData?.content || '',
        zone: initialData?.zone || '',
        subzone: initialData?.subzone || '',
        post_type: initialData?.post_type || 'general',
        topic: initialData?.topic || 'other',
        is_anonymous: initialData?.is_anonymous || false,
        allow_comments: initialData?.allow_comments !== false,
        attachments: null
    });

    const [previewFiles, setPreviewFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState(initialData?.attachments || []);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // 🆕 Cargar imágenes existentes al editar
    useEffect(() => {
        if (isEdit && initialData?.attachments && initialData.attachments.length > 0) {
            setExistingAttachments(initialData.attachments);
        }
    }, [isEdit, initialData]);

    // 🆕 Estados para el selector de mapa
    const [showMapSelector, setShowMapSelector] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // 🆕 OPTIMIZADO: Validar campo individual SOLO cuando pierde el foco - Usando useMemo
    const validateField = useCallback((name, value) => {
        const trimmedValue = value?.trim() || '';

        switch (name) {
            case 'title':
                if (!trimmedValue) return 'El título es obligatorio';
                if (trimmedValue.length < 5) return 'El título debe tener al menos 5 caracteres';
                if (value.length > 200) return 'El título no puede exceder 200 caracteres';
                return '';

            case 'content':
                if (!trimmedValue) return 'El contenido es obligatorio';
                if (trimmedValue.length < 10) return 'El contenido debe tener al menos 10 caracteres';
                if (value.length > 5000) return 'El contenido no puede exceder 5000 caracteres';
                return '';

            case 'zone':
                if (!trimmedValue) return 'La zona es obligatoria';
                if (value.length > 100) return 'La zona no puede exceder 100 caracteres';
                return '';

            case 'subzone':
                if (value && value.length > 100) return 'La subzona no puede exceder 100 caracteres';
                return '';

            default:
                return '';
        }
    }, []);

    // 🆕 OPTIMIZADO: Manejar cambios SIN validar en tiempo real con useCallback
    const handleChange = useCallback((name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));

        // 🆕 Limpiar error cuando el usuario empiece a escribir
        setErrors(prev => {
            if (prev[name]) {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            }
            return prev;
        });
    }, []);

    // 🆕 OPTIMIZADO: Marcar campo como tocado y validar con useCallback
    const handleBlur = useCallback((name) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, formData[name]);
        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }, [formData, validateField]);

    // Validar formulario completo
    const validateForm = () => {
        const newErrors = {};
        
        newErrors.title = validateField('title', formData.title);
        newErrors.content = validateField('content', formData.content);
        newErrors.zone = validateField('zone', formData.zone);
        newErrors.subzone = validateField('subzone', formData.subzone);

        // Filtrar errores vacíos
        const filteredErrors = Object.fromEntries(
            Object.entries(newErrors).filter(([_, error]) => error !== '')
        );

        setErrors(filteredErrors);
        return Object.keys(filteredErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Marcar todos los campos como tocados
        setTouched({
            title: true,
            content: true,
            zone: true,
            subzone: true
        });

        // Validar formulario
        if (!validateForm()) {
            return;
        }

        // 🆕 Incluir archivos existentes al enviar
        const dataToSubmit = {
            ...formData,
            existingAttachments: isEdit ? existingAttachments : []
        };

        onSubmit(dataToSubmit);
    };

    // Validar archivos antes de agregarlos
    const handleFileChange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            setFormData(prev => ({ ...prev, attachments: null }));
            setPreviewFiles([]);
            return;
        }

        // Validaciones de archivos
        const maxFiles = 5;
        const maxFileSize = 10 * 1024 * 1024; // 10MB por archivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        const validFiles = [];
        const fileErrors = [];

        // 🆕 Validar total de archivos (existentes + nuevos)
        const totalFiles = (isEdit ? existingAttachments.length : 0) + files.length;
        if (totalFiles > maxFiles) {
            fileErrors.push(`Total de archivos no puede exceder ${maxFiles}. Tienes ${existingAttachments.length} guardados.`);
            setErrors(prev => ({ ...prev, attachments: fileErrors.join(', ') }));
            return;
        }

        if (files.length > maxFiles) {
            fileErrors.push(`Solo puedes subir máximo ${maxFiles} archivos`);
        }

        for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
            const file = files[i];

            // Validar tipo
            if (!allowedTypes.includes(file.type)) {
                fileErrors.push(`${file.name}: Tipo de archivo no permitido`);
                continue;
            }

            // Validar tamaño
            if (file.size > maxFileSize) {
                fileErrors.push(`${file.name}: El archivo excede los 10MB`);
                continue;
            }

            validFiles.push(file);
        }

        if (fileErrors.length > 0) {
            setErrors(prev => ({ ...prev, attachments: fileErrors.join(', ') }));
        } else {
            setErrors(prev => ({ ...prev, attachments: '' }));
        }

        if (validFiles.length === 0) {
            return;
        }

        // Crear FileList a partir de array
        const dt = new DataTransfer();
        validFiles.forEach(file => dt.items.add(file));
        setFormData(prev => ({ ...prev, attachments: dt.files }));

        // Crear previews
        const previews = [];
        validFiles.forEach((file) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previews.push({
                        name: file.name,
                        type: file.type,
                        url: e.target.result,
                        size: file.size
                    });
                    if (previews.length === validFiles.length) {
                        setPreviewFiles([...previews]);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                previews.push({
                    name: file.name,
                    type: file.type,
                    url: null,
                    size: file.size
                });
            }
        });
        
        if (previews.filter(p => !p.url).length === previews.length) {
            setPreviewFiles([...previews]);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const removeFile = (index) => {
        const newPreviews = previewFiles.filter((_, i) => i !== index);
        setPreviewFiles(newPreviews);

        if (newPreviews.length === 0) {
            setFormData(prev => ({ ...prev, attachments: null }));
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
        }
    };

    // 🆕 Remover archivos existentes (del servidor)
    const removeExistingFile = (index) => {
        const newExisting = existingAttachments.filter((_, i) => i !== index);
        setExistingAttachments(newExisting);
    };

    // 🆕 Funciones para el selector de mapa
    const getMapboxToken = async () => {
        try {
            const response = await fetch('/api/map-config', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.mapboxToken;
            }
        } catch (error) {
            console.error('Error obteniendo token de Mapbox:', error);
        }
        return null;
    };

    const reverseGeocode = async (lng, lat, mapboxToken) => {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=es&types=neighborhood,locality,place,postcode,district,region`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    // Extraer información detallada
                    const locationParts = [];

                    // Buscar colonia/barrio
                    const neighborhood = data.features.find(f => f.place_type.includes('neighborhood'));
                    if (neighborhood) {
                        locationParts.push(neighborhood.text);
                    }

                    // Buscar municipio/ciudad
                    const place = data.features.find(f => f.place_type.includes('place'));
                    if (place && place.text !== neighborhood?.text) {
                        locationParts.push(place.text);
                    }

                    // Buscar estado
                    const region = data.features.find(f => f.place_type.includes('region'));
                    if (region) {
                        locationParts.push(region.text);
                    }

                    // Buscar código postal
                    const postcode = data.features.find(f => f.place_type.includes('postcode'));
                    if (postcode) {
                        locationParts.push(`CP ${postcode.text}`);
                    }

                    // Si no encontramos nada específico, usar el primer resultado
                    if (locationParts.length === 0 && data.features[0]) {
                        return data.features[0].place_name;
                    }

                    // Unir todas las partes con comas
                    return locationParts.join(', ');
                }
            }
        } catch (error) {
            console.error('Error en reverse geocoding:', error);
        }
        return null;
    };

    const initializeMap = async () => {
        setMapLoading(true);
        try {
            const mapboxToken = await getMapboxToken();

            if (!mapboxToken) {
                showNotification('No se pudo cargar el token de Mapbox. Por favor, intenta de nuevo.', 'error');
                setShowMapSelector(false);
                setMapLoading(false);
                return;
            }

            // Cargar CSS de Mapbox si no está cargado
            if (!document.querySelector('link[href*="mapbox-gl"]')) {
                const mapboxCSS = document.createElement('link');
                mapboxCSS.rel = 'stylesheet';
                mapboxCSS.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
                document.head.appendChild(mapboxCSS);

                // Esperar a que cargue el CSS
                await new Promise((resolve) => {
                    mapboxCSS.onload = resolve;
                    setTimeout(resolve, 2000); // Timeout de seguridad
                });
            }

            // Cargar script de Mapbox si no está cargado
            if (!window.mapboxgl) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
                    script.onload = () => {
                        // Deshabilitar telemetría de Mapbox completamente
                        if (window.mapboxgl) {
                            window.mapboxgl.prewarm = () => {};
                            window.mapboxgl.clearPrewarmedResources = () => {};
                        }
                        resolve();
                    };
                    script.onerror = () => reject(new Error('Error al cargar Mapbox GL JS'));
                    document.head.appendChild(script);

                    // Timeout de seguridad de 10 segundos
                    setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000);
                });
            }

            // Crear el mapa
            await createMap(mapboxToken);
        } catch (error) {
            console.error('Error inicializando mapa:', error);
            setMapLoading(false);
            showNotification('No se pudo cargar el mapa. Por favor, verifica tu conexión a internet e intenta de nuevo.', 'error');
            setShowMapSelector(false);
        }
    };

    const createMap = async (mapboxToken) => {
        return new Promise((resolve, reject) => {
            try {
                const mapboxgl = window.mapboxgl;

                if (!mapboxgl) {
                    reject(new Error('Mapbox GL JS no está disponible'));
                    return;
                }

                mapboxgl.accessToken = mapboxToken;

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                }

                const map = new mapboxgl.Map({
                    container: 'zone-map-selector',
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [-103.3496, 20.6597], // Guadalajara centro
                    zoom: 12,
                    attributionControl: false,
                    trackResize: true,
                    collectResourceTiming: false,
                    fadeDuration: 0,
                    crossSourceCollisions: false
                });

                mapInstanceRef.current = map;
                map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                // Timeout de seguridad para la carga del mapa (aumentado a 30 segundos)
                const loadTimeout = setTimeout(() => {
                    setMapLoading(false);
                    reject(new Error('El mapa tardó demasiado en cargar'));
                }, 30000);

                map.on('load', () => {
                    clearTimeout(loadTimeout);
                    setMapLoading(false);
                    resolve(map);
                });

                map.on('error', (e) => {
                    // Ignorar errores de telemetría bloqueados por ad-blockers
                    if (e.error?.message?.includes('events.mapbox.com')) {
                        console.warn('Telemetría de Mapbox bloqueada (esto es normal y no afecta la funcionalidad)');
                        return;
                    }

                    clearTimeout(loadTimeout);
                    console.error('Error del mapa:', e);
                    setMapLoading(false);
                    reject(e);
                });

                // Manejar clic en el mapa
                map.on('click', async (e) => {
                    const { lng, lat } = e.lngLat;

                    // Mostrar loading
                    setMapLoading(true);

                    try {
                        // Hacer reverse geocoding
                        const zoneName = await reverseGeocode(lng, lat, mapboxToken);

                        if (zoneName) {
                            // Actualizar el campo de zona
                            handleChange('zone', zoneName);

                            // Cerrar el mapa
                            setShowMapSelector(false);

                            // Limpiar el mapa
                            if (mapInstanceRef.current) {
                                mapInstanceRef.current.remove();
                                mapInstanceRef.current = null;
                            }
                        } else {
                            showNotification('No se pudo obtener la ubicación. Por favor, intenta en otro punto.', 'warning');
                        }
                    } catch (error) {
                        console.error('Error en reverse geocoding:', error);
                        showNotification('Error al obtener la ubicación. Por favor, intenta de nuevo.', 'error');
                    } finally {
                        setMapLoading(false);
                    }
                });

            } catch (error) {
                console.error('Error creando mapa:', error);
                setMapLoading(false);
                reject(error);
            }
        });
    };

    // Efecto para inicializar el mapa cuando se abre el selector
    useEffect(() => {
        if (showMapSelector) {
            // Esperar a que el DOM se actualice
            setTimeout(() => {
                initializeMap();
            }, 100);
        }

        // Cleanup al cerrar
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [showMapSelector]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isEdit ? '✏️ Editar Publicación' : '✨ Nueva Publicación'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Comparte con tu comunidad
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-all duration-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Título */}
                    <FormField
                        label="Título"
                        name="title"
                        placeholder="¿Qué quieres compartir?"
                        required
                        maxLength={200}
                        value={formData.title}
                        error={errors.title}
                        touched={touched.title}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />

                    {/* Contenido */}
                    <FormField
                        label="Contenido"
                        name="content"
                        type="textarea"
                        placeholder="Comparte los detalles de tu publicación..."
                        required
                        maxLength={5000}
                        rows={4}
                        value={formData.content}
                        error={errors.content}
                        touched={touched.content}
                        onChange={handleChange}
                        onBlur={handleBlur}
                    />

                    {/* Ubicación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Zona/Colonia <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="zone"
                                placeholder="Ej: Providencia, Guadalajara, Jalisco, CP 44630"
                                maxLength={100}
                                value={formData.zone}
                                onChange={(e) => handleChange('zone', e.target.value)}
                                onBlur={() => handleBlur('zone')}
                                className={`w-full p-3 border-2 ${
                                    errors.zone && touched.zone
                                        ? 'border-red-500 dark:border-red-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                } rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200`}
                            />
                            {errors.zone && touched.zone && (
                                <p className="mt-1 text-sm text-red-500">{errors.zone}</p>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowMapSelector(true)}
                                className="mt-2 w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                                title="Seleccionar zona en el mapa"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Seleccionar ubicación en el mapa
                            </button>
                        </div>

                        <FormField
                            label="Subzona"
                            name="subzone"
                            placeholder="Ej: Cerca del parque (opcional)"
                            maxLength={100}
                            value={formData.subzone}
                            error={errors.subzone}
                            touched={touched.subzone}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>

                    {/* Tipo y Tema */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo de Publicación <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.post_type}
                                onChange={(e) => handleChange('post_type', e.target.value)}
                                className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            >
                                <option value="general">📝 General</option>
                                <option value="alert">🚨 Alerta</option>
                                <option value="question">❓ Pregunta</option>
                                <option value="sale">💰 Venta</option>
                                <option value="service">🔧 Servicio</option>
                                <option value="event">🎉 Evento</option>
                                <option value="lost_found">🔍 Perdidos y Encontrados</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tema <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.topic}
                                onChange={(e) => handleChange('topic', e.target.value)}
                                className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            >
                                <option value="other">📋 Otros</option>
                                <option value="security">🛡️ Seguridad</option>
                                <option value="maintenance">🔨 Mantenimiento</option>
                                <option value="social">👥 Social</option>
                                <option value="services">🏪 Servicios</option>
                                <option value="marketplace">🛒 Marketplace</option>
                                <option value="pets">🐕 Mascotas</option>
                                <option value="transportation">🚗 Transporte</option>
                            </select>
                        </div>
                    </div>

                    {/* Archivos */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Archivos Adjuntos (Opcional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-emerald-500 transition-all duration-200">
                            <input
                                id="file-input"
                                type="file"
                                multiple
                                accept="image/*,application/pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label htmlFor="file-input" className="cursor-pointer">
                                <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Clic para subir</span> o arrastra archivos
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        JPG, PNG, GIF, PDF, DOC (máx. 10MB cada uno, hasta 5 archivos)
                                    </p>
                                </div>
                            </label>
                        </div>

                        {errors.attachments && (
                            <p className="mt-2 text-xs text-red-500 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {errors.attachments}
                            </p>
                        )}

                        {/* Mostrar archivos existentes (al editar) */}
                        {isEdit && existingAttachments.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    📎 Archivos actuales ({existingAttachments.length})
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {existingAttachments.map((file, index) => (
                                        <div key={index} className="relative group border-2 border-emerald-200 dark:border-emerald-600 rounded-lg overflow-hidden hover:border-emerald-500 transition-all duration-200">
                                            {file.type?.startsWith('image/') ? (
                                                <img
                                                    src={`/storage/${file.path}`}
                                                    alt={file.name}
                                                    className="w-full h-24 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-24 bg-emerald-50 dark:bg-emerald-900/20 flex flex-col items-center justify-center">
                                                    <svg className="w-6 h-6 text-emerald-600 mb-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm5 3a1 1 0 000 2h6a1 1 0 100-2H9zM7 9a1 1 0 000 2h8a1 1 0 100-2H7zm-2 3a1 1 0 100 2h4a1 1 0 100-2H5z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs text-emerald-700 dark:text-emerald-300 text-center px-1 font-medium">{file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
                                                </div>
                                            )}

                                            {/* Botón eliminar */}
                                            <button
                                                type="button"
                                                onClick={() => removeExistingFile(index)}
                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                                title="Eliminar archivo existente"
                                            >
                                                ×
                                            </button>

                                            {/* Badge de archivo existente */}
                                            <div className="absolute top-1 left-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                                ✓ Guardado
                                            </div>

                                            {/* Info del archivo */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                                                {formatFileSize(file.size || 0)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Preview de archivos NUEVOS */}
                        {previewFiles.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    {isEdit ? '➕ Nuevos archivos' : 'Archivos seleccionados'} ({previewFiles.length})
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {previewFiles.map((file, index) => (
                                        <div key={index} className="relative group border-2 border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:border-emerald-500 transition-all duration-200">
                                            {file.url ? (
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="w-full h-24 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center">
                                                    <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm5 3a1 1 0 000 2h6a1 1 0 100-2H9zM7 9a1 1 0 000 2h8a1 1 0 100-2H7zm-2 3a1 1 0 100 2h4a1 1 0 100-2H5z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs text-gray-500 text-center px-1">{file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
                                                </div>
                                            )}

                                            {/* Botón eliminar */}
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                                title="Eliminar archivo"
                                            >
                                                ×
                                            </button>

                                            {/* Info del archivo */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center">
                                                {formatFileSize(file.size)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Opciones */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Opciones de Privacidad</p>
                        
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="allow_comments"
                                checked={formData.allow_comments}
                                onChange={(e) => handleChange('allow_comments', e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            />
                            <label htmlFor="allow_comments" className="ml-3 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Permitir comentarios
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_anonymous"
                                checked={formData.is_anonymous}
                                onChange={(e) => handleChange('is_anonymous', e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_anonymous" className="ml-3 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Publicar como anónimo
                            </label>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={creating}
                            className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={creating || Object.keys(errors).some(key => errors[key])}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            {creating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {isEdit ? 'Actualizando...' : 'Publicando...'}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {isEdit ? 'Actualizar Publicación' : 'Publicar Ahora'}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Info adicional */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium mb-1">Consejos para una buena publicación:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>Usa un título claro y descriptivo</li>
                                    <li>Proporciona detalles relevantes en el contenido</li>
                                    <li>Selecciona la zona correcta para mayor alcance</li>
                                    <li>Las imágenes aumentan el engagement</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* 🆕 Modal del selector de mapa */}
            {showMapSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                        {/* Header del mapa */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-500 to-emerald-600">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">📍</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Seleccionar Zona</h3>
                                    <p className="text-sm text-emerald-100">Haz clic en el mapa para seleccionar tu zona</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowMapSelector(false);
                                    if (mapInstanceRef.current) {
                                        mapInstanceRef.current.remove();
                                        mapInstanceRef.current = null;
                                    }
                                }}
                                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all duration-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Contenedor del mapa */}
                        <div className="relative" style={{ height: '500px' }}>
                            {mapLoading && (
                                <div className="absolute inset-0 bg-white dark:bg-gray-800 flex items-center justify-center z-10">
                                    <div className="text-center">
                                        <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-gray-600 dark:text-gray-400 font-medium">Cargando mapa...</p>
                                    </div>
                                </div>
                            )}
                            <div id="zone-map-selector" className="w-full h-full"></div>
                        </div>

                        {/* Footer con instrucciones compactas */}
                        <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 border-t border-emerald-600">
                            <div className="flex flex-col space-y-2">
                                <p className="text-white font-bold text-sm flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    Haz clic en el mapa para seleccionar tu zona
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-50">
                                    <span className="flex items-center">
                                        <span className="text-lg mr-1">👆</span> Clic en mapa
                                    </span>
                                    <span className="text-emerald-200">→</span>
                                    <span className="flex items-center">
                                        <span className="text-lg mr-1">✨</span> Se llena automático
                                    </span>
                                    <span className="text-emerald-200">→</span>
                                    <span className="flex items-center">
                                        <span className="text-lg mr-1">🎯</span> Listo
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

CreatePostModal.displayName = 'CreatePostModal';

// Modal de detalles del post (manteniendo el mismo código que antes, sin cambios)
function PostDetailModal({
    post,
    onClose,
    user,
    comments,
    loadingComments,
    newComment,
    setNewComment,
    onAddComment,
    addingComment,
    onEdit,
    onDelete,
    onDeleteComment,
    editingComment,
    setEditingComment,
    editCommentText,
    setEditCommentText,
    onUpdateComment,
    updatingComment
}) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    const getPostTypeIcon = (type) => {
        const icons = {
            general: '📝',
            alert: '🚨',
            question: '❓',
            sale: '💰',
            service: '🔧',
            event: '🎉',
            lost_found: '🔍'
        };
        return icons[type] || '📝';
    };

    const getTopicColor = (topic) => {
        const colors = {
            security: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            social: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            services: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            marketplace: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            pets: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
            transportation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
            other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        };
        return colors[topic] || colors.other;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const downloadFile = (attachment) => {
        const link = document.createElement('a');
        link.href = `/storage/${attachment.path}`;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
                    {/* Header del modal */}
                    <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <span className="mr-2">{getPostTypeIcon(post.post_type)}</span>
                            Detalles de la Publicación
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-all duration-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Contenido del modal */}
                    <div className="p-6">
                        {/* Información del usuario */}
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-medium text-lg">
                                {post.is_anonymous ? '?' : (post.user?.name?.charAt(0) || 'A')}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                        {post.is_anonymous ? 'Usuario Anónimo' : `${post.user?.name || 'Usuario'} ${post.user?.last_name || ''}`}
                                    </h4>
                                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${getTopicColor(post.topic)}`}>
                                        {post.topic}
                                    </span>
                                    {post.is_pinned && (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs font-medium">
                                            📌 Fijado
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span>📍 {post.zone}</span>
                                    {post.subzone && (
                                        <>
                                            <span>•</span>
                                            <span>{post.subzone}</span>
                                        </>
                                    )}
                                    <span>•</span>
                                    <span>{formatDate(post.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Título */}
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {post.title}
                        </h3>

                        {/* Contenido completo */}
                        <div className="prose dark:prose-invert max-w-none mb-6">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {post.content}
                            </p>
                        </div>

                        {/* Attachments completos */}
                        {post.attachments && post.attachments.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    Archivos adjuntos ({post.attachments.length})
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {post.attachments.map((attachment, index) => (
                                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                            {attachment.type?.startsWith('image/') ? (
                                                <div
                                                    className="cursor-pointer group"
                                                    onClick={() => setSelectedImageIndex(index)}
                                                >
                                                    <img
                                                        src={`/storage/${attachment.path}`}
                                                        alt={attachment.name}
                                                        className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                                                    />
                                                    <div className="p-3">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {attachment.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatFileSize(attachment.size || 0)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                    onClick={() => downloadFile(attachment)}
                                                >
                                                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center">
                                                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm5 3a1 1 0 000 2h6a1 1 0 100-2H9zM7 9a1 1 0 000 2h8a1 1 0 100-2H7zm-2 3a1 1 0 100 2h4a1 1 0 100-2H5z" clipRule="evenodd" />
                                                        </svg>
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {attachment.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatFileSize(attachment.size || 0)} • Clic para descargar
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Estadísticas */}
                        <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700 mb-6">
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <span>{post.comments_count || 0} comentarios</span>
                                </div>
                            </div>

                            {/* Acciones adicionales para el dueño del post */}
                            {user && user.id === post.user_id && (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => {
                                            onEdit(post);
                                            onClose();
                                        }}
                                        className="text-blue-500 hover:text-blue-600 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => onDelete(post.id)}
                                        className="text-red-500 hover:text-red-600 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sección de comentarios */}
                        <div className="mt-6">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Comentarios
                            </h4>

                            {/* Input para nuevo comentario */}
                            {user && post.allow_comments && (
                                <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-medium text-sm">
                                            {user.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <textarea
                                                placeholder="Escribe un comentario..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                                rows="3"
                                                maxLength={1000}
                                            />
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {newComment.length}/1000 caracteres
                                                </span>
                                                <button
                                                    onClick={onAddComment}
                                                    disabled={!newComment.trim() || addingComment}
                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                                >
                                                    {addingComment ? (
                                                        <span className="flex items-center">
                                                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Enviando...
                                                        </span>
                                                    ) : (
                                                        'Comentar'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!post.allow_comments && (
                                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="text-yellow-800 dark:text-yellow-200 text-sm">
                                            Los comentarios están deshabilitados en esta publicación.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Lista de comentarios */}
                            <div className="space-y-4">
                                {loadingComments ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando comentarios...</span>
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <p className="text-lg font-medium mb-1">No hay comentarios aún</p>
                                        <p className="text-sm">¡Sé el primero en comentar!</p>
                                    </div>
                                ) : (
                                    comments.map((comment, index) => (
                                        <div key={comment.id || index} className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
                                                {comment.is_anonymous ? '?' : (comment.user?.name?.charAt(0) || 'U')}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                                            {comment.is_anonymous ? 'Usuario Anónimo' : `${comment.user?.name} ${comment.user?.last_name}`}
                                                        </h5>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatDate(comment.created_at)}
                                                        </span>
                                                    </div>
                                                    {user && user.id === comment.user_id && (
                                                        <div className="flex items-center space-x-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingComment(comment.id);
                                                                    setEditCommentText(comment.content);
                                                                }}
                                                                className="text-blue-400 hover:text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                title="Editar comentario"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteComment(comment.id)}
                                                                className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                title="Eliminar comentario"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {editingComment === comment.id ? (
                                                    <div className="mt-2">
                                                        <textarea
                                                            value={editCommentText}
                                                            onChange={(e) => setEditCommentText(e.target.value)}
                                                            className="w-full p-2 border border-emerald-300 dark:border-emerald-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                                                            rows="2"
                                                            maxLength={1000}
                                                        />
                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className="text-xs text-gray-500">{editCommentText.length}/1000</span>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingComment(null);
                                                                        setEditCommentText('');
                                                                    }}
                                                                    className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button
                                                                    onClick={() => onUpdateComment(comment.id)}
                                                                    disabled={!editCommentText.trim() || updatingComment}
                                                                    className="px-3 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {updatingComment ? 'Guardando...' : 'Guardar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                                        {comment.content}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer del modal */}
                    <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {post.post_type === 'alert' && (
                                <span className="text-red-600 dark:text-red-400 font-medium flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    Esta es una alerta de la comunidad
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de imagen completa */}
            {selectedImageIndex !== null && post.attachments && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-60">
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={() => setSelectedImageIndex(null)}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <img
                            src={`/storage/${post.attachments[selectedImageIndex].path}`}
                            alt={post.attachments[selectedImageIndex].name}
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />

                        {/* Navegación entre imágenes */}
                        {post.attachments.filter(att => att.type?.startsWith('image/')).length > 1 && (
                            <>
                                <button
                                    onClick={() => {
                                        const imageAttachments = post.attachments.filter(att => att.type?.startsWith('image/'));
                                        const currentImageIndex = imageAttachments.findIndex(att => att === post.attachments[selectedImageIndex]);
                                        const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : imageAttachments.length - 1;
                                        const prevAttachment = imageAttachments[prevIndex];
                                        setSelectedImageIndex(post.attachments.findIndex(att => att === prevAttachment));
                                    }}
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => {
                                        const imageAttachments = post.attachments.filter(att => att.type?.startsWith('image/'));
                                        const currentImageIndex = imageAttachments.findIndex(att => att === post.attachments[selectedImageIndex]);
                                        const nextIndex = currentImageIndex < imageAttachments.length - 1 ? currentImageIndex + 1 : 0;
                                        const nextAttachment = imageAttachments[nextIndex];
                                        setSelectedImageIndex(post.attachments.findIndex(att => att === nextAttachment));
                                    }}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {/* Info de la imagen */}
                        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
                            <p className="font-medium">{post.attachments[selectedImageIndex].name}</p>
                            <p className="text-sm opacity-75">
                                {formatFileSize(post.attachments[selectedImageIndex].size || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Comunidad;