import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/global.css';
import NotificationPanel from './NotificationPanel'; // ⬅️ IMPORTAR AQUÍ

// Hook personalizado para el arrastre (SIN localStorage)
const useDraggable = (initialPosition, iconId) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const elementRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  const magnetToEdge = useCallback((pos) => {
    const margin = 20;
    const elementWidth = 60;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 80;

    let newX = pos.x;
    let newY = pos.y;

    if (pos.x < windowWidth / 2) {
      newX = margin;
    } else {
      newX = windowWidth - elementWidth - margin;
    }

    newY = Math.max(navbarHeight + margin, Math.min(pos.y, windowHeight - elementWidth - margin));

    return { x: newX, y: newY };
  }, []);

  const handleStart = useCallback((clientX, clientY) => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    setIsDragging(true);
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });

    document.body.style.userSelect = 'none';
    document.body.style.overflow = 'hidden';
  }, [position]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;

    const newPosition = {
      x: clientX - startPos.x,
      y: clientY - startPos.y
    };

    const margin = 10;
    const elementWidth = 60;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 80;

    newPosition.x = Math.max(margin, Math.min(newPosition.x, windowWidth - elementWidth - margin));
    newPosition.y = Math.max(navbarHeight + margin, Math.min(newPosition.y, windowHeight - elementWidth - margin));

    setPosition(newPosition);
  }, [isDragging, startPos]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.overflow = '';

    dragTimeoutRef.current = setTimeout(() => {
      const magnetizedPosition = magnetToEdge(position);
      setPosition(magnetizedPosition);
    }, 150);
  }, [isDragging, position, magnetToEdge]);

  useEffect(() => {
    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => handleEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  useEffect(() => {
    const handleResize = () => {
      const magnetizedPosition = magnetToEdge(position);
      setPosition(magnetizedPosition);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, magnetToEdge]);

  const dragHandlers = {
    onMouseDown: (e) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    },
    onTouchStart: (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }
  };

  return {
    position,
    isDragging,
    elementRef,
    dragHandlers,
    resetPosition: () => {
      const defaultPos = magnetToEdge(initialPosition);
      setPosition(defaultPos);
    }
  };
};

// Componente DraggableIcon
const DraggableIcon = ({
  iconId,
  initialPosition,
  icon,
  bgColor = 'bg-emerald-500',
  onClick,
  tooltip,
  children
}) => {
  const { position, isDragging, elementRef, dragHandlers, resetPosition } = useDraggable(initialPosition, iconId);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e) => {
    if (!isDragging && onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <>
      <div
        ref={elementRef}
        className={`fixed z-50 cursor-pointer select-none transition-all duration-300 ${
          isDragging
            ? 'scale-110 shadow-2xl rotate-3'
            : 'hover:scale-105 shadow-lg hover:shadow-xl'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: isDragging ? 'scale(1.1) rotate(3deg)' : 'scale(1)',
          zIndex: isDragging ? 9999 : 50
        }}
        {...dragHandlers}
        onClick={handleClick}
        onMouseEnter={() => !isDragging && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={`w-14 h-14 ${bgColor} rounded-full flex items-center justify-center text-white text-xl shadow-lg border-3 border-white/20 backdrop-blur-sm transition-all duration-300 ${
          isDragging ? 'ring-4 ring-white/50' : 'hover:ring-2 ring-white/30'
        }`}>
          {icon}
        </div>

        {isDragging && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Arrastrando...
          </div>
        )}

        {showTooltip && tooltip && !isDragging && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap backdrop-blur-sm">
            {tooltip}
          </div>
        )}
      </div>

      {children}
    </>
  );
};

function Navbar({ user = null }) {
   const [darkMode, setDarkMode] = useState(false);
   const [dropdownOpen, setDropdownOpen] = useState(false);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const [isScrolled, setIsScrolled] = useState(false);

   // Notificar cuando el menú móvil cambia de estado
   useEffect(() => {
       const event = new CustomEvent('mobile-menu-toggle', {
           detail: { isOpen: mobileMenuOpen }
       });
       window.dispatchEvent(event);

       // Bloquear scroll del body cuando el menú móvil está abierto
       if (mobileMenuOpen) {
           document.body.style.overflow = 'hidden';
           document.body.style.position = 'fixed';
           document.body.style.width = '100%';
       } else {
           document.body.style.overflow = '';
           document.body.style.position = '';
           document.body.style.width = '';
       }
   }, [mobileMenuOpen]);
   const [searchQuery, setSearchQuery] = useState('');
   const [searchResults, setSearchResults] = useState([]);
   const [isSearchExpanded, setIsSearchExpanded] = useState(false);
   const [isSearchOpen, setIsSearchOpen] = useState(false);

   const dropdownRef = useRef(null);
   const mobileMenuRef = useRef(null);
   const searchRef = useRef(null);
   const searchInputRef = useRef(null);
   const searchTimeoutRef = useRef(null);

   const [isChatOpen, setIsChatOpen] = useState(false);

   const handleChatToggle = () => {
    window.location.href = '/chat';
    setIsChatOpen(!isChatOpen);
};

   const handleMapToggle = () => {
    const mapEvent = new CustomEvent('toggle-layout-map');
    window.dispatchEvent(mapEvent);
};

const performSearch = async (query) => {
    try {
        const response = await fetch(`/api/search/properties?query=${encodeURIComponent(query)}&limit=6`);
        const data = await response.json();

        if (data.success) {
            window.dispatchEvent(new CustomEvent('search-performed', {
                detail: {
                    query: query.trim(),
                    location: null,
                    results: data.results || []
                }
            }));

            return data.results;
        } else {
            console.error('Search API error:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
};

   const handleSearchSubmit = (e) => {
       e.preventDefault();
       if (searchQuery.trim()) {
           window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
       }
   };

   const handleSearchKeyPress = (e) => {
       if (e.key === 'Enter') {
           handleSearchSubmit(e);
       }
   };

   const goToAdvancedSearch = () => {
       if (searchQuery.trim()) {
           window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
       } else {
           window.location.href = '/search';
       }
   };

   useEffect(() => {
       if (typeof window !== 'undefined') {
           // 🔥 Intentar cargar tema guardado en localStorage
           const savedTheme = localStorage.getItem('theme');

           let isDark = false;
           if (savedTheme) {
               // Si hay tema guardado, usarlo
               isDark = savedTheme === 'dark';
           } else {
               // Si no hay tema guardado, usar preferencia del sistema
               isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
           }

           setDarkMode(isDark);

           if (isDark) {
               document.documentElement.classList.add('dark');
           } else {
               document.documentElement.classList.remove('dark');
           }

           const handleScroll = () => {
               setIsScrolled(window.scrollY > 20);
           };

           window.addEventListener('scroll', handleScroll);
           return () => window.removeEventListener('scroll', handleScroll);
       }

       const handleClickOutside = (event) => {
           if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
               setDropdownOpen(false);
           }
           if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
               setMobileMenuOpen(false);
           }
           if (searchRef.current && !searchRef.current.contains(event.target)) {
               setIsSearchOpen(false);
               setIsSearchExpanded(false);
               setSearchQuery('');
           }
       };

       const handleResize = () => {
           if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
               setMobileMenuOpen(false);
               setDropdownOpen(false);
               setIsSearchOpen(false);
               setIsSearchExpanded(false);

               // Restaurar scroll del body inmediatamente al cambiar a desktop
               document.body.style.overflow = '';
               document.body.style.position = '';
               document.body.style.width = '';
           }
       };

       document.addEventListener('mousedown', handleClickOutside);
       if (typeof window !== 'undefined') {
           window.addEventListener('resize', handleResize);
       }

       return () => {
           document.removeEventListener('mousedown', handleClickOutside);
           if (typeof window !== 'undefined') {
               window.removeEventListener('resize', handleResize);
           }
       };
   }, []);

   useEffect(() => {
       if (isSearchExpanded && searchInputRef.current) {
           searchInputRef.current.focus();
       }

       const handleKeyDown = (event) => {
           if (event.key === 'Escape' && isSearchExpanded) {
               setIsSearchExpanded(false);
               setSearchQuery('');
           }
       };

       document.addEventListener('keydown', handleKeyDown);
       return () => {
           document.removeEventListener('keydown', handleKeyDown);
       };
   }, [isSearchExpanded]);

   useEffect(() => {
       if (searchTimeoutRef.current) {
           clearTimeout(searchTimeoutRef.current);
       }

       if (searchQuery.trim() === '') {
           setSearchResults([]);
           return;
       }

       searchTimeoutRef.current = setTimeout(async () => {
           const results = await performSearch(searchQuery);
           setSearchResults(results);
       }, 300);

       return () => {
           if (searchTimeoutRef.current) {
               clearTimeout(searchTimeoutRef.current);
           }
       };
   }, [searchQuery]);

   const toggleDarkMode = () => {
       const newDarkMode = !darkMode;
       setDarkMode(newDarkMode);

       if (typeof window !== 'undefined') {
           // 🔥 Guardar preferencia en localStorage
           localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');

           if (newDarkMode) {
               document.documentElement.classList.add('dark');
           } else {
               document.documentElement.classList.remove('dark');
           }
       }
   };

   const getCSRFToken = () => {
       if (typeof document !== 'undefined') {
           const metaTag = document.querySelector('meta[name="csrf-token"]');
           return metaTag ? metaTag.getAttribute('content') : '';
       }
       return '';
   };

   const handleSearchToggle = () => {
       setIsSearchExpanded(!isSearchExpanded);
       if (isSearchExpanded) {
           setSearchQuery('');
           setSearchResults([]);
       }
   };

   return (
       <>
       <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
           isScrolled
               ? 'backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 shadow-xl border-b border-gray-200/50 dark:border-gray-700/50'
               : 'backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 shadow-lg border-b border-gray-200/30 dark:border-gray-700/30'
       }`}>
           <div className="max-w-full mx-auto">
               <div className={`flex justify-between items-center px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
                   isScrolled ? 'h-16' : 'h-20'
               }`}>

                   <a href="/" className="group flex items-center space-x-3 hover:scale-105 transition-all duration-300">
                       <div className="relative">
                           <div className={`${isScrolled ? 'w-12 h-12' : 'w-14 h-14'} rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-emerald-500/25 group-hover:rotate-3 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center border-2 border-white/20 dark:border-gray-700/30`}>
                               <img
                                   src="https://i.ibb.co/1fG75QgM/Whats-App-Image-2025-08-01-at-11-58-36-PM.jpg"
                                   alt="ViveSpaces Logo"
                                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                   onError={(e) => {
                                       e.target.style.display = 'none';
                                       e.target.nextElementSibling.style.display = 'flex';
                                   }}
                               />
                               <span className="text-white font-bold text-2xl group-hover:scale-110 transition-transform duration-300 hidden">V</span>
                           </div>
                       </div>
                       <div className="hidden sm:block">
                           <span className={`${isScrolled ? 'text-xl' : 'text-2xl'} font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent transition-all duration-300`}>
                               ViveSpaces
                           </span>
                       </div>
                   </a>

                   {/* MENÚ PRINCIPAL DESKTOP */}
                   <ul className="hidden xl:flex items-center space-x-8">
                       {[
                           { href: "/properties", label: "Propiedades", icon: "🏠" },
                           { href: "/comunidad", label: "Comunidad", icon: "👥" },
                           ...(user && user.role === 'admin' ? [{ href: "/admin", label: "Admin Panel", icon: "⚙️" }] : []),
                           { href: "/contacto", label: "Contacto", icon: "💬" }
                       ].map((link) => (
                           <li key={link.href}>
                               <a href={link.href}
                                   className="group relative px-4 py-3 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-all duration-300 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20"
                               >
                                   <span className="relative z-10 flex items-center space-x-2">
                                       <span className="text-sm opacity-70 group-hover:opacity-100 transition-all duration-200">{link.icon}</span>
                                       <span className="text-sm">{link.label}</span>
                                   </span>
                                   <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:w-3/4 transition-all duration-300 rounded-full"></div>
                               </a>
                           </li>
                       ))}
                   </ul>

                   <div className="hidden lg:flex items-center space-x-6">
                       {/* BUSCADOR */}
                       <div className="relative" ref={searchRef}>
                           <div className="flex items-center">
                               {!isSearchExpanded && (
                                   <button
                                       onClick={handleSearchToggle}
                                       className="group p-2.5 rounded-lg bg-gray-100/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 dark:hover:shadow-emerald-400/20 transition-all duration-300 hover:scale-110 active:scale-95"
                                   >
                                       <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                       </svg>
                                   </button>
                               )}

                               <div
                                   className={`transition-all duration-500 ease-out ${
                                       isSearchExpanded ? 'w-96 ml-2' : 'w-0 ml-0 overflow-hidden'
                                   }`}
                               >
                                   <div className="flex items-center bg-white/98 dark:bg-gray-900/98 rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/10 dark:shadow-black/30 border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-xl w-96 transform transition-all duration-700 ease-out hover:shadow-3xl ring-1 ring-gray-300/20 dark:ring-gray-600/20 hover:ring-emerald-500/30 dark:hover:ring-emerald-400/30">

                                       <div className="relative mr-4">
                                           <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                           </svg>
                                       </div>

                                       <input
                                           ref={searchInputRef}
                                           type="text"
                                           value={searchQuery}
                                           onChange={(e) => setSearchQuery(e.target.value)}
                                           onKeyPress={handleSearchKeyPress}
                                           placeholder="Buscar propiedades, usuarios, ubicaciones..."
                                           className="bg-transparent text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none w-full font-normal tracking-normal focus:placeholder-gray-600 dark:focus:placeholder-gray-300 transition-all duration-300"
                                       />

                                       <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-3"></div>

                                       <button
                                           onClick={handleSearchToggle}
                                           className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg group"
                                       >
                                           <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                           </svg>
                                       </button>

                                       <div className="flex items-center space-x-1 ml-2">
                                           <kbd className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                                               ↵
                                           </kbd>
                                       </div>
                                   </div>
                               </div>
                           </div>

                           {/* RESULTADOS DE BÚSQUEDA */}
                           {isSearchExpanded && (
                               <div className="absolute top-full left-0 mt-2 w-96 z-50">
                                   <div className="bg-white dark:bg-gray-800 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                                       {searchResults.length > 0 ? (
                                           <>
                                               {searchResults.map((result) => (
                                                   <a key={result.id}
                                                       href={result.url}
                                                       className="flex items-center px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                                                       onClick={() => setIsSearchExpanded(false)}
                                                   >
                                                       <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors duration-200 overflow-hidden">
                                                           {result.image ? (
                                                               <img
                                                                   src={result.image}
                                                                   alt={result.title}
                                                                   className="w-full h-full object-cover"
                                                               />
                                                           ) : (
                                                               <span className="text-lg">🏠</span>
                                                           )}
                                                       </div>

                                                       <div className="flex-1 min-w-0">
                                                           <div className="font-medium text-gray-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors duration-200">
                                                               {result.title}
                                                           </div>
                                                           <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                               {result.subtitle}
                                                           </div>
                                                           {result.details && (
                                                               <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                                   {result.details}
                                                               </div>
                                                           )}
                                                       </div>

                                                       <div className="flex-shrink-0 ml-3 text-right">
                                                           <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                                               {result.price}
                                                           </div>
                                                           <div className="text-xs text-gray-500 dark:text-gray-400">
                                                               {result.type}
                                                           </div>
                                                       </div>

                                                       <svg className="flex-shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500 ml-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                       </svg>
                                                   </a>
                                               ))}
                                               <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                                                   <button
                                                       onClick={goToAdvancedSearch}
                                                       className="w-full text-center px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                                                   >
                                                       <span>Ver todos los resultados</span>
                                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                       </svg>
                                                   </button>
                                               </div>
                                           </>
                                       ) : searchQuery.trim() !== '' && (
                                           <>
                                               <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                   <div className="flex flex-col items-center space-y-2">
                                                       <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                       </svg>
                                                       <span>No se encontraron resultados para "{searchQuery}"</span>
                                                   </div>
                                               </div>
                                               <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                                                   <button
                                                       onClick={goToAdvancedSearch}
                                                       className="w-full text-center px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                                                   >
                                                       <span>Búsqueda avanzada</span>
                                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                       </svg>
                                                   </button>
                                               </div>
                                           </>
                                       )}
                                   </div>
                               </div>
                           )}
                       </div>

                       {user ? (
                           <>
                               {/* 🔔 NOTIFICACIONES - INTEGRADO DIRECTAMENTE */}
                               <NotificationPanel />

                               {/* ICONO DE CHAT */}
                               <a href="/chat"
                                   className="p-2.5 mx-2 rounded-lg bg-gray-100/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
                               >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                                   </svg>
                               </a>

                               {/* DROPDOWN PERFIL */}
                               <div className="relative mx-2" ref={dropdownRef}>
                                   <button
                                       onClick={() => setDropdownOpen(!dropdownOpen)}
                                       className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300"
                                   >
                                       <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
                                           {user.profile_photo ? (
                                               <img
                                                   src={`/storage/${user.profile_photo}`}
                                                   alt="Avatar"
                                                   className="w-full h-full object-cover"
                                               />
                                           ) : (
                                               <span className="text-white font-semibold text-sm">
                                                   {user.name?.charAt(0)?.toUpperCase() || ''}
                                                   {user.last_name?.charAt(0)?.toUpperCase() || ''}
                                               </span>
                                           )}
                                       </div>
                                       <div className="hidden lg:block text-left">
                                           <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px]">
                                               {user.name}
                                           </p>
                                           <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                               {user.role || 'Usuario'}
                                           </p>
                                       </div>
                                       <svg
                                           className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                                           fill="none"
                                           stroke="currentColor"
                                           viewBox="0 0 24 24"
                                       >
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                       </svg>
                                   </button>

                                   <div className={`absolute right-0 mt-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200 z-50 ${dropdownOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>

                                       <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-t-xl">
                                           <div className="flex items-center space-x-3">
                                               <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
                                                   {user.profile_photo ? (
                                                       <img
                                                           src={`/storage/${user.profile_photo}`}
                                                           alt="Avatar"
                                                           className="w-full h-full object-cover"
                                                       />
                                                   ) : (
                                                       <span className="text-white font-bold">
                                                           {user.name?.charAt(0)?.toUpperCase() || ''}
                                                           {user.last_name?.charAt(0)?.toUpperCase() || ''}
                                                       </span>
                                                   )}
                                               </div>
                                               <div className="flex-1 min-w-0">
                                                   <p className="font-bold text-gray-900 dark:text-white truncate">
                                                       {user.name} {user.last_name}
                                                   </p>
                                                   <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                       {user.email}
                                                   </p>
                                                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 mt-1">
                                                       {user.role?.charAt(0)?.toUpperCase() + user.role?.slice(1) || 'Usuario'}
                                                   </span>
                                               </div>
                                           </div>
                                       </div>

                                       <div className="py-2">
                                           {[
                                               { href: "/profile", label: "Mi Perfil", icon: "👤" },
                                               ...(user.role === 'admin' ? [{ href: "/admin", label: "Admin Panel", icon: "⚙️" }] : []),
                                               {
                                                   href: "/verification/identity",
                                                   label: user.is_identity_verified ? "Identidad Verificada" : "Verificar Identidad",
                                                   icon: user.is_identity_verified ? "✅" : "✓",
                                                   highlight: !user.is_identity_verified
                                               },
                                               { href: "/my-properties", label: "Mis Propiedades", icon: "🏠" },
                                               { href: "/chat", label: "Mensajes", icon: "💬" },
                                               { href: "/notifications", label: "Notificaciones", icon: "🔔" },
                                               { href: "/favorites", label: "Favoritos", icon: "❤️" }
                                           ].map((item, index) => (
                                               <a key={index}
                                                   href={item.href}
                                                   className={`flex items-center px-4 py-2.5 text-sm transition-all duration-200 ${
                                                       item.highlight
                                                           ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 font-semibold'
                                                           : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                   }`}
                                               >
                                                   <span className="text-base mr-3">{item.icon}</span>
                                                   <span className="font-medium flex items-center">
                                                       {item.label}
                                                       {item.highlight && (
                                                           <span className="ml-2 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                                               !
                                                           </span>
                                                       )}
                                                   </span>
                                               </a>
                                           ))}
                                       </div>

                                       <div className="border-t border-gray-200/50 dark:border-gray-700/50">
                                           <form method="POST" action="/logout">
                                               <input type="hidden" name="_token" value={getCSRFToken()} />
                                               <button
                                                   type="submit"
                                                   className="w-full text-left flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all duration-200 rounded-b-xl"
                                               >
                                                   <span className="text-base mr-3">🚪</span>
                                                   <span className="font-medium">Cerrar Sesión</span>
                                               </button>
                                           </form>
                                       </div>
                                   </div>
                               </div>
                           </>
                       ) : (
                           <div className="flex items-center space-x-3">
                               <a href="/login"
                                   className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20"
                               >
                                   Iniciar Sesión
                               </a>

                               <a href="/register"
                                   className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                               >
                                   Regístrate
                               </a>
                           </div>
                       )}

                       {/* BOTÓN DARK MODE */}
                       <button
                           onClick={toggleDarkMode}
                           className="p-2.5 mx-2 rounded-lg bg-gray-100/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300"
                       >
                           <div className="relative w-5 h-5">
                               <svg className={`absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-0 rotate-180' : 'opacity-100 rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                               </svg>
                               <svg className={`absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                               </svg>
                           </div>
                       </button>
                   </div>

                   {/* BOTONES MÓVILES */}
                   <div className="flex items-center xl:hidden space-x-3">
                       <button
                           onClick={() => setIsSearchOpen(!isSearchOpen)}
                           className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 xl:hidden"
                       >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                           </svg>
                       </button>
                       <button
                           onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                           className="p-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 xl:hidden"
                       >
                           <div className="relative w-5 h-5">
                               <span className={`absolute left-0 top-0.5 w-5 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                               <span className={`absolute left-0 top-2 w-5 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                               <span className={`absolute left-0 top-3.5 w-5 h-0.5 bg-current transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                           </div>
                       </button>
                   </div>
               </div>
           </div>

           {/* BÚSQUEDA MÓVIL */}
           <div className={`xl:hidden transition-all duration-300 ${isSearchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
               <div className="px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50" ref={searchRef}>
                   <div className="flex items-center bg-gray-100/70 dark:bg-gray-800/70 rounded-lg px-3 py-2">
                       <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                       <input
                           type="text"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           onKeyPress={handleSearchKeyPress}
                           placeholder="Buscar propiedades o usuarios..."
                           className="bg-transparent text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none w-full"
                       />
                   </div>
                   {searchResults.length > 0 && (
                       <div className="mt-2 bg-white dark:bg-gray-800 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                           {searchResults.map((result) => (
                               <a key={result.id}
                                   href={result.url}
                                   className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
                                   onClick={() => setIsSearchOpen(false)}
                               >
                                   <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded mr-3 overflow-hidden">
                                       {result.image ? (
                                           <img src={result.image} alt={result.title} className="w-full h-full object-cover" />
                                       ) : (
                                           <div className="w-full h-full flex items-center justify-center">🏠</div>
                                       )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="font-medium truncate text-gray-900 dark:text-white">{result.title}</div>
                                       <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</div>
                                   </div>
                                   <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                       {result.price}
                                   </div>
                               </a>
                           ))}
                           <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                               <button
                                   onClick={goToAdvancedSearch}
                                   className="w-full text-center px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
                               >
                                   Ver todos los resultados
                               </button>
                           </div>
                       </div>
                   )}
               </div>
           </div>

           {/* MENÚ MÓVIL */}
           <div className={`xl:hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
               <div
                   className="px-4 pt-4 pb-6 space-y-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 overflow-y-auto max-h-[calc(100vh-80px)]"
                   ref={mobileMenuRef}
                   style={{ maxHeight: mobileMenuOpen ? 'calc(100vh - 80px)' : '0' }}
               >

                   {user && (
                       <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg mb-4">
                           <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
                               {user.profile_photo ? (
                                   <img src={`/storage/${user.profile_photo}`} alt="Avatar" className="w-full h-full object-cover" />
                               ) : (
                                   <span className="text-white font-semibold text-sm">
                                       {user.name?.charAt(0)?.toUpperCase() || ''}{user.last_name?.charAt(0)?.toUpperCase() || ''}
                                   </span>
                               )}
                           </div>
                           <div className="flex-1 min-w-0">
                               <p className="font-semibold text-gray-900 dark:text-white truncate">
                                   {user.name} {user.last_name}
                               </p>
                               <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                   {user.email}
                               </p>
                               <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 mt-1">
                                   {user.role?.charAt(0)?.toUpperCase() + user.role?.slice(1) || 'Usuario'}
                               </span>
                           </div>
                       </div>
                   )}

                   {[
                       { href: "/properties", label: "Propiedades", icon: "🏠" },
                       { href: "/search", label: "Búsqueda Avanzada", icon: "🔍" },
                       { href: "/comunidad", label: "Comunidad", icon: "👥" },
                       ...(user && user.role === 'admin' ? [{ href: "/admin", label: "Admin Panel", icon: "⚙️" }] : []),
                       ...(user ? [
                           { href: "/chat", label: "Mensajes", icon: "💬" },
                           { href: "/notifications", label: "Notificaciones", icon: "🔔" }
                       ] : []),
                       { href: "/contacto", label: "Contacto", icon: "📞" }
                   ].map((link, index) => (
                       <a key={index}
                           href={link.href}
                           className="flex items-center px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-300"
                           onClick={() => setMobileMenuOpen(false)}
                       >
                           <span className="text-lg mr-3">{link.icon}</span>
                           <span>{link.label}</span>
                       </a>
                   ))}

                   {user ? (
                       <div className="pt-3 space-y-2 border-t border-gray-200/50 dark:border-gray-700/50">
                           <a href="/profile"
                               className="flex items-center px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-300"
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               <span className="text-lg mr-3">👤</span>
                               <span>Mi Perfil</span>
                           </a>

                           <a href="/verification/identity"
                               className={`flex items-center px-3 py-2.5 text-base font-medium rounded-lg transition-all duration-300 ${
                                   user.is_identity_verified
                                       ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                                       : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                               }`}
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               <span className="text-lg mr-3">{user.is_identity_verified ? '✅' : '✓'}</span>
                               <span className="flex items-center">
                                   {user.is_identity_verified ? 'Identidad Verificada' : 'Verificar Identidad'}
                                   {!user.is_identity_verified && (
                                       <span className="ml-2 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                           !
                                       </span>
                                   )}
                               </span>
                           </a>

                           <a href="/my-properties"
                               className="flex items-center px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-300"
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               <span className="text-lg mr-3">🏠</span>
                               <span>Mis Propiedades</span>
                           </a>

                           <a href="/favorites"
                               className="flex items-center px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-300"
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               <span className="text-lg mr-3">❤️</span>
                               <span>Favoritos</span>
                           </a>
                       </div>
                   ) : (
                       <div className="pt-3 space-y-3 border-t border-gray-200/50 dark:border-gray-700/50">
                           <a href="/login"
                               className="block w-full text-center px-4 py-2.5 text-base font-semibold text-gray-700 dark:text-gray-300 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300"
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               🔑 Iniciar Sesión
                           </a>

                           <a href="/register"
                               className="block w-full text-center px-4 py-2.5 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                               onClick={() => setMobileMenuOpen(false)}
                           >
                               ✨ Regístrate
                           </a>
                       </div>
                   )}

                   <div className="pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                       <button
                           onClick={toggleDarkMode}
                           className="flex items-center w-full px-3 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all duration-300"
                       >
                           <div className="relative w-6 h-6 mr-3">
                               <span className={`absolute inset-0 text-lg transition-all duration-300 ${darkMode ? 'opacity-0 rotate-180' : 'opacity-100 rotate-0'}`}>🌙</span>
                               <span className={`absolute inset-0 text-lg transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-180'}`}>☀️</span>
                           </div>
                           <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
                       </button>

                       {user && (
                           <form method="POST" action="/logout" className="mt-2">
                               <input type="hidden" name="_token" value={getCSRFToken()} />
                               <button
                                   type="submit"
                                   className="flex items-center w-full px-3 py-2.5 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300"
                               >
                                   <span className="text-lg mr-3">🚪</span>
                                   <span>Cerrar Sesión</span>
                               </button>
                           </form>
                       )}
                   </div>
               </div>
           </div>
       </nav>
       </>
   );
}

export default Navbar;
