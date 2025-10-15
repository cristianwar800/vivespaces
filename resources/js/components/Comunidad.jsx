import React, { useState, useEffect, useCallback } from 'react';

function Comunidad() {
    // Estados principales
    const [posts, setPosts] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [addingComment, setAddingComment] = useState(false);
    const [filters, setFilters] = useState({
        zone: '',
        post_type: '',
        topic: '',
        search: ''
    });

    // Nuevos estados para animaciones y efectos
    const [animateHeader, setAnimateHeader] = useState(false);
    const [hoveredPost, setHoveredPost] = useState(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'popular', 'trending'

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

    // Cargar posts
    const loadPosts = useCallback(async (filterParams = {}) => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Manejar cambios de filtros
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        loadPosts(newFilters);
    }, [loadPosts]);

    // Crear post - CORREGIDO
    const handleCreatePost = useCallback(async (postData) => {
        console.log('🚀 === INICIO DEBUG CREATE POST ===');
        console.log('📤 Datos originales recibidos:', postData);

        // Validar datos antes de enviar
        if (!postData.title || postData.title.trim().length < 5) {
            alert('El título debe tener al menos 5 caracteres');
            return;
        }

        if (!postData.content || postData.content.trim().length < 10) {
            alert('El contenido debe tener al menos 10 caracteres');
            return;
        }

        if (!postData.zone || postData.zone.trim().length === 0) {
            alert('La zona es obligatoria');
            return;
        }

        if (!user) {
            alert('Debes estar autenticado para crear un post');
            return;
        }

        setCreating(true);

        try {
            const formData = new FormData();

            // Agregar campos básicos
            formData.append('title', postData.title.trim());
            formData.append('content', postData.content.trim());
            formData.append('zone', postData.zone.trim());

            if (postData.subzone) {
                formData.append('subzone', postData.subzone.trim());
            }

            formData.append('post_type', postData.post_type);
            formData.append('topic', postData.topic);
            formData.append('is_anonymous', postData.is_anonymous ? '1' : '0');
            formData.append('allow_comments', postData.allow_comments ? '1' : '0');

            // Agregar archivos si existen
            if (postData.attachments && postData.attachments.length > 0) {
                Array.from(postData.attachments).forEach((file, index) => {
                    formData.append('attachments[]', file);
                });
            }

            console.log('🌐 Enviando petición a:', '/api/comunidad');

            const response = await fetch('/api/comunidad', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            console.log('📡 Respuesta recibida:', response.status);

            const result = await response.json();
            console.log('📄 Contenido de la respuesta:', result);

            if (result.success) {
                console.log('✅ Post creado exitosamente:', result.data);
                setPosts(prev => [result.data, ...prev]);
                setShowCreateForm(false);
                alert('¡Post creado exitosamente!');
            } else {
                console.error('❌ Error del servidor:', result);

                if (result.errors) {
                    const errorMessages = Object.entries(result.errors)
                        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                        .join('\n');
                    alert(`Errores de validación:\n${errorMessages}`);
                } else {
                    alert('Error: ' + (result.message || 'Error desconocido'));
                }
            }
        } catch (error) {
            console.error('💥 Error de red o JavaScript:', error);
            alert('Error de conexión: ' + error.message);
        } finally {
            setCreating(false);
        }
    }, [user, getCsrfToken]);

    // Reaccionar a post
    const handleReactToPost = useCallback(async (postId) => {
        if (!user) {
            alert('Debes estar autenticado para reaccionar');
            return;
        }

        try {
            const response = await fetch(`/api/comunidad/${postId}/react`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();
            if (result.success) {
                setPosts(prev => prev.map(post =>
                    post.id === postId
                        ? { ...post, reactions_count: result.reactions_count }
                        : post
                ));
            }
        } catch (error) {
            console.error('Error reacting to post:', error);
        }
    }, [user, getCsrfToken]);

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
        } finally {
            setLoadingComments(false);
        }
    }, []);

    // Agregar comentario - CORREGIDO
    const handleAddComment = useCallback(async (postId) => {
        if (!newComment.trim() || addingComment || !user) return;

        setAddingComment(true);
        try {
            const response = await fetch(`/api/comunidad/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    content: newComment.trim(),
                    is_anonymous: false
                })
            });

            const result = await response.json();
            if (result.success) {
                setComments(prev => [...prev, result.data]);
                setNewComment('');

                setPosts(prev => prev.map(post =>
                    post.id === postId
                        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
                        : post
                ));
            } else {
                alert('Error: ' + (result.message || 'Error al agregar comentario'));
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Error al agregar el comentario');
        } finally {
            setAddingComment(false);
        }
    }, [newComment, user, getCsrfToken]);

    // Editar post - CORREGIDO
    const handleEditPost = useCallback(async (postData) => {
        console.log('🔄 === INICIO DEBUG EDIT POST ===');
        console.log('📤 Datos de edición:', postData);

        if (!editingPost) {
            alert('No hay post para editar');
            return;
        }

        // Validaciones
        if (!postData.title || postData.title.trim().length < 5) {
            alert('El título debe tener al menos 5 caracteres');
            return;
        }

        if (!postData.content || postData.content.trim().length < 10) {
            alert('El contenido debe tener al menos 10 caracteres');
            return;
        }

        if (!postData.zone || postData.zone.trim().length === 0) {
            alert('La zona es obligatoria');
            return;
        }

        setCreating(true);

        try {
            const formData = new FormData();

            // Agregar campos básicos
            formData.append('title', postData.title.trim());
            formData.append('content', postData.content.trim());
            formData.append('zone', postData.zone.trim());

            if (postData.subzone) {
                formData.append('subzone', postData.subzone.trim());
            }

            formData.append('post_type', postData.post_type);
            formData.append('topic', postData.topic);
            formData.append('is_anonymous', postData.is_anonymous ? '1' : '0');
            formData.append('allow_comments', postData.allow_comments ? '1' : '0');

            // Agregar archivos si existen
            if (postData.attachments && postData.attachments.length > 0) {
                Array.from(postData.attachments).forEach((file, index) => {
                    formData.append('attachments[]', file);
                });
            }

            formData.append('_method', 'PUT');

            console.log('🌐 Enviando petición de edición a:', `/api/comunidad/${editingPost.id}`);

            const response = await fetch(`/api/comunidad/${editingPost.id}`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            console.log('📡 Respuesta de edición:', response.status);

            const result = await response.json();
            console.log('📄 Resultado de edición:', result);

            if (result.success) {
                console.log('✅ Post editado exitosamente:', result.data);

                setPosts(prev => prev.map(post =>
                    post.id === editingPost.id ? result.data : post
                ));

                setShowEditForm(false);
                setEditingPost(null);
                alert('¡Post editado exitosamente!');
            } else {
                console.error('❌ Error editando post:', result);
                if (result.errors) {
                    const errorMessages = Object.entries(result.errors)
                        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                        .join('\n');
                    alert(`Errores de validación:\n${errorMessages}`);
                } else {
                    alert('Error: ' + (result.message || 'Error desconocido'));
                }
            }
        } catch (error) {
            console.error('💥 Error editando post:', error);
            alert('Error de conexión: ' + error.message);
        } finally {
            setCreating(false);
        }
    }, [editingPost, getCsrfToken]);

    // Eliminar post - CORREGIDO
    const handleDeletePost = useCallback(async (postId) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`/api/comunidad/${postId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();
            if (result.success) {
                setPosts(prev => prev.filter(post => post.id !== postId));

                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost(null);
                    setComments([]);
                    setNewComment('');
                }

                alert('Post eliminado exitosamente');
            } else {
                alert('Error: ' + (result.message || 'Error al eliminar el post'));
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error al eliminar el post');
        }
    }, [selectedPost, getCsrfToken]);

    // Eliminar comentario - CORREGIDO
    const handleDeleteComment = useCallback(async (commentId) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
            return;
        }

        try {
            const response = await fetch(`/api/comunidad/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json();
            if (result.success) {
                setComments(prev => prev.filter(comment => comment.id !== commentId));

                if (selectedPost) {
                    setPosts(prev => prev.map(post =>
                        post.id === selectedPost.id
                            ? { ...post, comments_count: Math.max((post.comments_count || 1) - 1, 0) }
                            : post
                    ));
                }

                alert('Comentario eliminado exitosamente');
            } else {
                alert('Error: ' + (result.message || 'Error al eliminar el comentario'));
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Error al eliminar el comentario');
        }
    }, [selectedPost, getCsrfToken]);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateHeader(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Función para scroll suave hacia arriba
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Detectar scroll para mostrar botón de volver arriba
   

    // Cargar datos iniciales
    useEffect(() => {
        loadUser();
        loadPosts();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16">
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
                                { id: 'all', label: 'Todas', icon: '🏠' },
                                { id: 'social', label: 'Social', icon: '👥' },
                                { id: 'security', label: 'Seguridad', icon: '🛡️' },
                                { id: 'maintenance', label: 'Mantenimiento', icon: '🔨' },
                                { id: 'marketplace', label: 'Marketplace', icon: '🛒' },
                                { id: 'events', label: 'Eventos', icon: '🎉' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
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

                        {/* Controles de vista */}
                        <div className="flex items-center space-x-4">
                            {/* Selector de vista */}
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        viewMode === 'grid'
                                            ? 'bg-white dark:bg-gray-600 text-emerald-600 shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    title="Vista de cuadrícula"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        viewMode === 'list'
                                            ? 'bg-white dark:bg-gray-600 text-emerald-600 shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                    title="Vista de lista"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            {/* Selector de ordenamiento */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                            >
                                <option value="recent">Más recientes</option>
                                <option value="popular">Más populares</option>
                                <option value="trending">Tendencia</option>
                            </select>
                        </div>
                    </div>
                </div>

                {posts.length === 0 ? (
                    <EmptyState onCreatePost={() => setShowCreateForm(true)} user={user} />
                ) : (
                    <PostsList
                        posts={posts}
                        user={user}
                        onReact={handleReactToPost}
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
                        viewMode={viewMode}
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
                />
            )}

            {/* Botón de volver arriba */}


                        {/* Indicador de progreso de lectura */}
        </div>
    );
}

// Componente para la barra de progreso de lectura


// Componente Loading
function LoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="text-center">
                {/* Spinner principal con efectos */}
                <div className="relative mx-auto mb-8">
                    <div className="w-20 h-20 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-b-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>

                {/* Texto de carga con animación */}
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent animate-pulse">
                        Cargando Comunidad
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Preparando tu experiencia vecinal...</p>
                </div>

                {/* Puntos de carga animados */}
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className={`bg-gradient-to-br from-white via-emerald-50 to-emerald-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-2xl border-b border-emerald-200 dark:border-emerald-800 relative overflow-hidden`}>
            {/* Elementos decorativos de fondo */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200 dark:bg-emerald-800 rounded-full opacity-20 blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
                {/* Título con animaciones */}
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

                            {/* Efecto de partículas en hover */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white bg-opacity-30 rounded-full transform scale-0 group-hover:scale-100 transition-all duration-700" style={{ transitionDelay: '0.1s' }}></div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white bg-opacity-30 rounded-full transform scale-0 group-hover:scale-100 transition-all duration-700" style={{ transitionDelay: '0.2s' }}></div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white bg-opacity-30 rounded-full transform scale-0 group-hover:scale-100 transition-all duration-700" style={{ transitionDelay: '0.3s' }}></div>
                            </div>
                        </button>
                    )}
                </div>

                {/* Filtros mejorados con animaciones */}
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
            {/* Búsqueda con mejor diseño */}
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

            {/* Selects mejorados */}
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
                {/* Círculos animados de fondo */}
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

            {/* Estadísticas animadas */}
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

// Componente Lista de Posts - CORREGIDO
function PostsList({ posts, user, onReact, onSelect, onEdit, onDelete, hoveredPost, setHoveredPost, viewMode }) {
    return (
        <div className={`space-y-6 ${viewMode === 'list' ? 'list-style-none' : ''}`}>
            {posts.map((post, index) => (
                <div
                    key={post.id}
                    className={`transition-all duration-500 ${index < 3 ? 'animate-fade-in-up' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <PostCard
                        post={post}
                        user={user}
                        onReact={onReact}
                        onSelect={onSelect}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        hoveredPost={hoveredPost}
                        setHoveredPost={setHoveredPost}
                        viewMode={viewMode}
                    />
                </div>
            ))}
        </div>
    );
}


// Componente Tarjeta de Post - CORREGIDO
function PostCard({ post, user, onReact, onSelect, onEdit, onDelete, hoveredPost, setHoveredPost, viewMode }) {
    const [isLiked, setIsLiked] = useState(false);
    const [showActions, setShowActions] = useState(false);

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

    const handleLike = () => {
        setIsLiked(!isLiked);
        onReact(post.id);
    };

    return (
        <div
        className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all duration-500 transform hover:-translate-y-1 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-700 relative overflow-hidden max-w-2xl mx-auto ${hoveredPost === post.id ? 'ring-2 ring-emerald-500/20' : ''
        } ${viewMode === 'list' ? 'flex items-start space-x-4 max-w-4xl' : ''}`}
            onMouseEnter={() => setHoveredPost(post.id)}
            onMouseLeave={() => setHoveredPost(null)}
        >
            {/* Efecto de brillo en hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            {/* Indicador de tipo de post con animación */}
            <div className="absolute top-4 right-4 z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transform transition-all duration-300 group-hover:scale-110 ${
                    post.post_type === 'alert' ? 'bg-red-100 dark:bg-red-900/30 animate-pulse' :
                    post.post_type === 'event' ? 'bg-purple-100 dark:bg-purple-900/30' :
                    post.post_type === 'sale' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                    {getPostTypeIcon(post.post_type)}
                </div>
            </div>

            {/* Header del post mejorado */}
            <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center space-x-4">
                    {/* Avatar con efectos */}
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
                        {/* Anillo de estado online */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
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

                {/* Acciones del propietario mejoradas */}
                <div className="flex items-center space-x-3">
                    <span className="text-2xl animate-pulse">{getPostTypeIcon(post.post_type)}</span>

                    {user && user.id === post.user_id && (
                        <div className={`flex items-center space-x-2 transition-all duration-300 ${showActions ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                            <button
                                onClick={() => onEdit(post)}
                                className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Editar publicación"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDelete(post.id)}
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Eliminar publicación"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Contenido mejorado */}
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

            {/* Attachments mejorados con efectos */}
                                    {/* Attachments mejorados con efectos */}
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

                    {/* Overlay para más archivos */}
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

            {/* Acciones mejoradas con efectos */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 relative z-10">
                <div className="flex items-center space-x-6">
                    {user && (
                        <button
                            onClick={handleLike}
                            className={`flex items-center space-x-2 transition-all duration-300 group/action ${isLiked ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'
                                }`}
                        >
                            <div className={`p-2 rounded-xl transition-all duration-300 group-hover/action:bg-emerald-50 dark:group-hover/action:bg-emerald-900/20 ${isLiked ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                                }`}>
                                <svg className={`w-5 h-5 transition-all duration-300 ${isLiked ? 'scale-110 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <span className="font-medium transition-all duration-300 group-hover/action:scale-110">{post.reactions_count || 0}</span>
                        </button>
                    )}

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

                    <button className="flex items-center space-x-2 text-gray-500 hover:text-purple-500 transition-all duration-300 group/action">
                        <div className="p-2 rounded-xl transition-all duration-300 group-hover/action:bg-purple-50 dark:group-hover/action:bg-purple-900/20 group-hover/action:scale-110">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                        </div>
                        <span className="font-medium group-hover/action:scale-110">{post.shares_count || 0}</span>
                    </button>

                    {/* Botón de guardar */}
                    <button className="flex items-center space-x-2 text-gray-500 hover:text-yellow-500 transition-all duration-300 group/action">
                        <div className="p-2 rounded-xl transition-all duration-300 group-hover/action:bg-yellow-50 dark:group-hover/action:bg-yellow-900/20 group-hover/action:scale-110">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
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

// Modal para crear/editar post - CORREGIDO
function CreatePostModal({ user, onSubmit, onClose, creating, isEdit = false, initialData = null }) {
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

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validaciones básicas
        if (!formData.title.trim() || formData.title.trim().length < 5) {
            alert('El título debe tener al menos 5 caracteres');
            return;
        }

        if (!formData.content.trim() || formData.content.trim().length < 10) {
            alert('El contenido debe tener al menos 10 caracteres');
            return;
        }

        if (!formData.zone.trim()) {
            alert('La zona es obligatoria');
            return;
        }

        onSubmit(formData);
    };

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            setFormData(prev => ({ ...prev, attachments: null }));
            setPreviewFiles([]);
            return;
        }

        setFormData(prev => ({ ...prev, attachments: files }));

        // Crear previews
        const previews = [];
        for (let i = 0; i < Math.min(files.length, 5); i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previews.push({
                        name: file.name,
                        type: file.type,
                        url: e.target.result,
                        size: file.size
                    });
                    if (previews.length === Math.min(files.length, 5)) {
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
        }
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

        // Reset file input if no files left
        if (newPreviews.length === 0) {
            setFormData(prev => ({ ...prev, attachments: null }));
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {isEdit ? 'Editar Publicación' : 'Nueva Publicación'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Título */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            placeholder="¿Qué quieres compartir?"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                            maxLength={200}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            {formData.title.length}/200 caracteres
                        </div>
                    </div>

                    {/* Contenido */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contenido *
                        </label>
                        <textarea
                            placeholder="Comparte los detalles de tu publicación..."
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                            maxLength={5000}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            {formData.content.length}/5000 caracteres
                        </div>
                    </div>

                    {/* Ubicación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Zona/Colonia *
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Roma Norte"
                                value={formData.zone}
                                onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Subzona (Opcional)
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Cerca del parque"
                                value={formData.subzone}
                                onChange={(e) => setFormData(prev => ({ ...prev, subzone: e.target.value }))}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Tipo y Tema */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo de Publicación
                            </label>
                            <select
                                value={formData.post_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, post_type: e.target.value }))}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                                Tema
                            </label>
                            <select
                                value={formData.topic}
                                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                            Archivos (Opcional)
                        </label>
                        <input
                            id="file-input"
                            type="file"
                            multiple
                            accept="image/*,application/pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                            Máximo 5 archivos. Formatos: JPG, PNG, GIF, PDF, DOC, DOCX (máx. 10MB cada uno)
                        </div>

                        {/* Preview de archivos */}
                        {previewFiles.length > 0 && (
                            <div className="mt-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {previewFiles.map((file, index) => (
                                        <div key={index} className="relative group border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
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
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>

                                            {/* Info del archivo */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                                                {formatFileSize(file.size)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Opciones */}
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="allow_comments"
                                checked={formData.allow_comments}
                                onChange={(e) => setFormData(prev => ({ ...prev, allow_comments: e.target.checked }))}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            />
                            <label htmlFor="allow_comments" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Permitir comentarios
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_anonymous"
                                checked={formData.is_anonymous}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_anonymous" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Publicar como anónimo
                            </label>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={creating || !formData.title.trim() || !formData.content.trim() || !formData.zone.trim()}
                            className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {creating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {isEdit ? 'Actualizando...' : 'Publicando...'}
                                </span>
                            ) : (
                                isEdit ? 'Actualizar' : 'Publicar'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Modal de detalles del post - CORREGIDO
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
    onDeleteComment
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header del modal */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <span className="mr-2">{getPostTypeIcon(post.post_type)}</span>
                            Detalles de la Publicación
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <span>{post.reactions_count || 0} reacciones</span>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <span>{post.comments_count || 0} comentarios</span>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                    <span>{post.shares_count || 0} compartidas</span>
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
                                                        <button
                                                            onClick={() => onDeleteComment(comment.id)}
                                                            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            title="Eliminar comentario"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                                    {comment.content}
                                                </p>
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
