import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/global.css';
import ViveSpacesSearchTracker from '../services/search_tracker';

// ==================== UTILIDADES GEOGRÁFICAS MEJORADAS ====================
const toRadians = (degrees) => degrees * (Math.PI / 180);
const toDegrees = (radians) => radians * (180 / Math.PI);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371.0088;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const calculateCirclePoint = (centerLat, centerLng, radiusKm, angleDegrees) => {
  const R = 6371.0088;
  const lat1 = toRadians(centerLat);
  const lng1 = toRadians(centerLng);
  const bearing = toRadians(angleDegrees);
  const d = radiusKm;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) +
    Math.cos(lat1) * Math.sin(d / R) * Math.cos(bearing)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(d / R) * Math.cos(lat1),
    Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2)
  };
};

// Función para dispersar marcadores que tienen EXACTAMENTE la misma ubicación
const disperseOverlappingMarkers = (properties) => {
  const SAME_LOCATION_THRESHOLD = 0.0000001; // Prácticamente las mismas coordenadas exactas
  const DISPERSE_RADIUS_KM = 0.03; // 30 metros de radio para dispersar

  const dispersed = [];
  const processed = new Set();

  properties.forEach((property, index) => {
    if (processed.has(index)) return;

    // Buscar propiedades en la MISMA ubicación EXACTA
    const sameLocation = [property];
    processed.add(index);

    properties.forEach((other, otherIndex) => {
      if (otherIndex === index || processed.has(otherIndex)) return;

      const latDiff = Math.abs(property.latitude - other.latitude);
      const lngDiff = Math.abs(property.longitude - other.longitude);

      // Solo agrupar si están en EXACTAMENTE la misma ubicación
      if (latDiff < SAME_LOCATION_THRESHOLD && lngDiff < SAME_LOCATION_THRESHOLD) {
        sameLocation.push(other);
        processed.add(otherIndex);
      }
    });

    // Si solo hay una propiedad, NO dispersar - usar coordenadas originales
    if (sameLocation.length === 1) {
      dispersed.push(property);
    } else {
      // Solo dispersar si hay 2 o más propiedades en la MISMA ubicación exacta
      sameLocation.forEach((prop, idx) => {
        const angle = (idx / sameLocation.length) * 360;
        const newCoords = calculateCirclePoint(
          property.latitude,
          property.longitude,
          DISPERSE_RADIUS_KM,
          angle
        );

        dispersed.push({
          ...prop,
          displayLatitude: newCoords.lat,
          displayLongitude: newCoords.lng,
          originalLatitude: prop.latitude,
          originalLongitude: prop.longitude
        });
      });
    }
  });

  return dispersed;
};

// ==================== COMPONENTE MARCADOR CLUSTER ====================
const ClusterMarker = ({ count, onClick }) => (
  <div className="cluster-marker-wrapper" onClick={onClick} style={{ cursor: 'pointer' }}>
    <div className="cluster-pulse-ring"></div>
    <div className="cluster-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
    <div className="cluster-marker">
      <div className="cluster-count">{count}</div>
      <div className="cluster-label">propiedades</div>
    </div>
    <div className="cluster-glow"></div>
  </div>
);

// ==================== COMPONENTE MARCADOR INDIVIDUAL ====================
const PropertyMarker = ({ featured = false }) => (
  <div className="property-marker-wrapper">
    <div className="property-pulse"></div>
    <div className={`property-marker ${featured ? 'featured' : ''}`}>
      <div className="property-icon">🏠</div>
    </div>
    {featured && <div className="featured-badge">⭐</div>}
  </div>
);

// ==================== COMPONENTE BARRA DE BÚSQUEDA ====================
const SearchBar = ({ onSearch, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    await onSearch(searchTerm);
    setIsSearching(false);
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSearch} className="search-bar">
        <div className="search-icon">🔍</div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por zona, colonia..."
          className="search-input"
          disabled={isSearching}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="search-clear"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="search-button"
          disabled={isSearching || !searchTerm.trim()}
        >
          {isSearching ? (
            <div className="spinner-small"></div>
          ) : (
            'Buscar'
          )}
        </button>
      </form>
      <button onClick={onClose} className="search-close-btn">Cerrar búsqueda</button>
    </div>
  );
};

// ==================== COMPONENTE BARRA DE RADIO COMPACTO (SIEMPRE VISIBLE) ====================
const RadiusSlider = ({ radius, onRadiusChange, isSearching, propertiesCount }) => {
  const [localRadius, setLocalRadius] = useState(radius);

  useEffect(() => {
    setLocalRadius(radius);
  }, [radius]);

  const handleChange = (e) => {
    setLocalRadius(Number(e.target.value));
  };

  const handleMouseUp = () => {
    if (localRadius !== radius) {
      onRadiusChange(localRadius);
    }
  };

  return (
    <div className="radius-slider-compact">
      <div className="radius-header-compact">
        <div className="radius-info-compact">
          <svg className="radius-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <span className="radius-text-compact">Radio: <strong>{localRadius}km</strong></span>
          {!isSearching && propertiesCount !== undefined && (
            <span className="properties-badge">{propertiesCount}</span>
          )}
        </div>
      </div>

      <div className="radius-content-compact">
        <div className="radius-track-wrapper">
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={localRadius}
            onChange={handleChange}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            className="radius-input-compact"
            disabled={isSearching}
          />
          <div className="radius-track-bg-compact">
            <div
              className="radius-track-fill-compact"
              style={{ width: `${((localRadius - 0.5) / 9.5) * 100}%` }}
            />
          </div>
        </div>

        {isSearching && (
          <div className="radius-status-compact searching">
            <div className="status-spinner-small"></div>
            <span>Buscando...</span>
          </div>
        )}

        {!isSearching && propertiesCount !== undefined && propertiesCount === 0 && (
          <div className="radius-status-compact warning">
            <span>Sin propiedades - expande el radio</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== WIDGET ESTADÍSTICAS FLOTANTE ====================
const FloatingStats = ({ properties, radius, buttonPosition }) => {
  const avgPrice = properties.length > 0
    ? Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length / 1000)
    : 0;

  if (properties.length === 0) return null;

  // Posicionar el widget cerca del botón
  const statsPosition = {
    left: buttonPosition.x + 70,
    top: buttonPosition.y
  };

  return (
    <div
      className="floating-stats-widget-fixed"
      style={{
        left: `${statsPosition.left}px`,
        top: `${statsPosition.top}px`
      }}
    >
      <div className="stats-widget-mini">
        <div className="stats-mini-row">
          <div className="stats-mini-icon">🏠</div>
          <div className="stats-mini-data">
            <span className="stats-mini-count">{properties.length}</span>
            <span className="stats-mini-label">encontradas</span>
          </div>
        </div>
        <div className="stats-mini-divider"></div>
        <div className="stats-mini-row">
          <div className="stats-mini-icon">📍</div>
          <div className="stats-mini-data">
            <span className="stats-mini-value">{radius}km</span>
          </div>
        </div>
        <div className="stats-mini-divider"></div>
        <div className="stats-mini-row">
          <div className="stats-mini-icon">💰</div>
          <div className="stats-mini-data">
            <span className="stats-mini-value">${avgPrice}k</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE NOTIFICACIÓN TOAST ====================
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast-notification">
      <div className="toast-icon">ℹ️</div>
      <div className="toast-message">{message}</div>
      <button onClick={onClose} className="toast-close">✕</button>
    </div>
  );
};

// ==================== HOOK DRAGGABLE ====================
const useDraggable = (initialPosition, iconId) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStarted, setDragStarted] = useState(false);
  const elementRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  const magnetToEdge = useCallback((pos) => {
    const margin = 20;
    const elementWidth = 56;
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
    setIsMouseDown(true);
    setDragStarted(false);
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });
  }, [position]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!isMouseDown) return;

    const newPosition = {
      x: clientX - startPos.x,
      y: clientY - startPos.y
    };

    const threshold = 5;
    const distance = Math.abs(newPosition.x - position.x) + Math.abs(newPosition.y - position.y);

    if (distance > threshold && !dragStarted) {
      setIsDragging(true);
      setDragStarted(true);
      document.body.style.userSelect = 'none';
      document.body.style.overflow = 'hidden';
    }

    if (!dragStarted) return;

    const elementWidth = 56;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const navbarHeight = 80;

    newPosition.x = Math.max(0, Math.min(newPosition.x, windowWidth - elementWidth));
    newPosition.y = Math.max(navbarHeight, Math.min(newPosition.y, windowHeight - elementWidth));

    setPosition(newPosition);
  }, [isMouseDown, startPos, position, dragStarted]);

  const handleEnd = useCallback(() => {
    setIsMouseDown(false);
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.overflow = '';

    if (dragStarted) {
      dragTimeoutRef.current = setTimeout(() => {
        const magnetizedPosition = magnetToEdge(position);
        setPosition(magnetizedPosition);
        setDragStarted(false);
      }, 150);
    } else {
      setDragStarted(false);
    }
  }, [dragStarted, position, magnetToEdge]);

  useEffect(() => {
    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => handleEnd();

    if (isMouseDown) {
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
  }, [isMouseDown, handleMove, handleEnd]);

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
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);
    },
    onTouchStart: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }
  };

  return {
    position,
    isDragging,
    elementRef,
    dragHandlers,
    wasDragged: dragStarted
  };
};

// ==================== COMPONENTE PRINCIPAL ====================
function LayoutMap({ user = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([-103.3496, 20.6597]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapConfig, setMapConfig] = useState(null);

  const [showRadar, setShowRadar] = useState(false);
  const [radarClickCoords, setRadarClickCoords] = useState({ lng: 0, lat: 0 });
  const [radarProperties, setRadarProperties] = useState([]);
  const [isSearchingRadar, setIsSearchingRadar] = useState(false);
  const [radarRadius, setRadarRadius] = useState(3);

  const [showSearch, setShowSearch] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 🔥 NUEVO: Estado para el tracker
  const [tracker, setTracker] = useState(null);

  // Estado para detectar si el mapa está siendo arrastrado
  const [isMapDragging, setIsMapDragging] = useState(false);
  const mapDragStartRef = useRef(null);

  // Estado para detectar si el menú móvil del navbar está abierto
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const markersRef = useRef([]);

  // 🔥 NUEVO: Inicializar tracker
  useEffect(() => {
    const mapTracker = new ViveSpacesSearchTracker();
    setTracker(mapTracker);
    console.log('✅ Search Tracker inicializado en LayoutMap');
  }, []);

  // Escuchar cuando se abre/cierra el menú móvil del navbar
  useEffect(() => {
    const handleMobileMenuToggle = (event) => {
      setIsMobileMenuOpen(event.detail.isOpen);
    };

    window.addEventListener('mobile-menu-toggle', handleMobileMenuToggle);
    return () => window.removeEventListener('mobile-menu-toggle', handleMobileMenuToggle);
  }, []);

  const getInitialPosition = useCallback(() => {
    const buttonSize = 56;
    const margin = 20;
    const isMobileDevice = window.innerWidth <= 768;

    // En móvil: posicionarlo más arriba para evitar conflicto con chatbot
    // En desktop: posición normal en la izquierda
    return {
      x: margin,
      y: isMobileDevice
        ? window.innerHeight - buttonSize - margin - 160  // Más arriba en móvil (160px en lugar de 80px)
        : window.innerHeight - buttonSize - margin - 80
    };
  }, []);

  const [initialPosition] = useState(getInitialPosition);
  const { position, isDragging, elementRef, dragHandlers, wasDragged } = useDraggable(
    initialPosition,
    'layout-map-button'
  );

  const calculateModalPosition = useCallback(() => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buttonSize = 56;
    const margin = 20;
    const navbarHeight = 80;

    let modalWidth = Math.min(650, windowWidth - 40);
    let modalHeight = Math.min(750, windowHeight - navbarHeight - 40);

    let modalX, modalY;

    if (position.x < windowWidth / 2) {
      modalX = position.x;
      if (modalX < margin) {
        modalX = margin;
      }
      if (modalX + modalWidth > windowWidth - margin) {
        modalX = Math.max(margin, windowWidth - modalWidth - margin);
      }
    } else {
      modalX = position.x + buttonSize - modalWidth;
      if (modalX + modalWidth > windowWidth - margin) {
        modalX = windowWidth - modalWidth - margin;
      }
      if (modalX < margin) {
        modalX = margin;
      }
    }

    modalY = position.y - modalHeight - margin;

    if (modalY < navbarHeight + margin) {
      modalY = position.y + buttonSize + margin;
      if (modalY + modalHeight > windowHeight - margin) {
        modalY = Math.max(navbarHeight + margin, (windowHeight - modalHeight) / 2);
      }
    }

    modalX = Math.max(margin, Math.min(modalX, windowWidth - modalWidth - margin));
    modalY = Math.max(navbarHeight + margin, Math.min(modalY, windowHeight - modalHeight - margin));

    return { x: modalX, y: modalY, width: modalWidth, height: modalHeight };
  }, [position]);

  useEffect(() => {
    fetch('/api/map-config')
      .then(res => res.json())
      .then(config => {
        setMapConfig(config);
        if (config.mapboxToken) {
          mapboxgl.accessToken = config.mapboxToken;
        }
      })
      .catch(error => console.error('[CONFIG ERROR]', error));
  }, []);

  const handleCloseRadar = useCallback(() => {
    setShowRadar(false);
    setRadarProperties([]);

    const map = mapInstanceRef.current;
    if (map) {
      if (map.getLayer('radar-circle-border')) map.removeLayer('radar-circle-border');
      if (map.getLayer('radar-circle')) map.removeLayer('radar-circle');
      if (map.getSource('radar-source')) map.removeSource('radar-source');
    }

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
  }, []);

  const handleCloseMap = useCallback(() => {
    handleCloseRadar();

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setIsOpen(false);
    }, 300);
  }, [handleCloseRadar]);

  const handleOpenModal = useCallback(() => {
    if (wasDragged || isDragging) {
      return;
    }
    setIsOpen(true);
  }, [wasDragged, isDragging]);

  const searchPropertiesAtPoint = useCallback(async (lngLat, radius = radarRadius) => {
    setIsSearchingRadar(true);

    // ℹ️ Las búsquedas geográficas de radar usan /api/properties/nearby directamente
    // No necesitan trackeo de IA porque no son búsquedas por keywords

    try {
      const response = await fetch('/api/properties/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          lng: lngLat.lng,
          lat: lngLat.lat,
          radius: radius
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // 🚀 OPTIMIZACIÓN: El backend ya filtró y calculó distancias, solo validamos datos básicos
      if (data.success && Array.isArray(data.properties)) {
        const validProperties = data.properties.filter(prop => {
          // Solo validaciones básicas de datos (backend ya filtró por distancia)
          if (!prop.id || !prop.latitude || !prop.longitude ||
              prop.latitude === 0 || prop.longitude === 0 ||
              isNaN(prop.latitude) || isNaN(prop.longitude)) {
            return false;
          }

          if (Math.abs(prop.latitude) > 90 || Math.abs(prop.longitude) > 180) {
            return false;
          }

          return true;
        }).map(prop => ({
          ...prop,
          distance: prop.distance.toFixed(3) // Backend ya calculó distancia
        }));

        // Backend ya ordenó por distancia, no es necesario ordenar aquí
        setRadarProperties(validProperties);

        if (validProperties.length === 0) {
          setToastMessage(`No se encontraron propiedades en ${radius}km. Intenta expandir el radio de búsqueda.`);
          setShowToast(true);
        } else {
          const closestDistance = parseFloat(validProperties[0].distance);
          setToastMessage(`✓ ${validProperties.length} propiedad${validProperties.length > 1 ? 'es' : ''} encontrada${validProperties.length > 1 ? 's' : ''} (más cercana: ${closestDistance.toFixed(2)}km)`);
          setShowToast(true);
        }
      } else {
        setRadarProperties([]);
        setToastMessage(`No hay propiedades disponibles en ${radius}km. Prueba expandir el radio.`);
        setShowToast(true);
      }

    } catch (error) {
      console.error('[API ERROR]', error);
      setRadarProperties([]);
      setToastMessage('Error al buscar propiedades. Por favor intenta nuevamente.');
      setShowToast(true);
    } finally {
      setIsSearchingRadar(false);
    }
  }, [radarRadius, tracker, mapCenter]);

  // 🚀 OPTIMIZACIÓN: Debounce para evitar búsquedas mientras mueve el slider
  const debounceTimerRef = useRef(null);

  const handleRadiusChange = useCallback((newRadius) => {
    setRadarRadius(newRadius);

    // Cancelar búsqueda anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Esperar 500ms después de que el usuario deje de mover el slider
    if (showRadar && radarClickCoords) {
      debounceTimerRef.current = setTimeout(() => {
        searchPropertiesAtPoint(radarClickCoords, newRadius);
      }, 500);
    }
  }, [showRadar, radarClickCoords, searchPropertiesAtPoint]);

  const handleSearch = useCallback(async (searchTerm) => {
    // ℹ️ Las búsquedas de ubicación son geográficas (Mapbox geocoding)
    // No necesitan trackeo de IA porque no buscan propiedades por keywords

    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?access_token=${mapConfig.mapboxToken}&country=MX&limit=1`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 2000
          });

          setTimeout(() => {
            const lngLat = { lng, lat };

            if (clickMarkerRef.current) {
              clickMarkerRef.current.remove();
            }

            const el = document.createElement('div');
            el.innerHTML = `<div style="width: 24px; height: 24px; background: #ef4444; border: 4px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`;

            clickMarkerRef.current = new mapboxgl.Marker(el)
              .setLngLat([lng, lat])
              .addTo(mapInstanceRef.current);

            setRadarClickCoords(lngLat);
            setShowRadar(true);
            searchPropertiesAtPoint(lngLat);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [mapConfig, searchPropertiesAtPoint, tracker]);

  useEffect(() => {
    if (mapInstanceRef.current && isOpen) {
      setTimeout(() => {
        mapInstanceRef.current.resize();
      }, 350);
    }
  }, [isOpen, calculateModalPosition()]);

  useEffect(() => {
    if (!showRadar || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Limpiar capas del radar si existen
    if (map.getLayer('radar-circle-border')) map.removeLayer('radar-circle-border');
    if (map.getLayer('radar-circle')) map.removeLayer('radar-circle');
    if (map.getSource('radar-source')) map.removeSource('radar-source');

    const radiusInKm = radarRadius;
    const points = 128;
    const centerLat = radarClickCoords.lat;
    const centerLng = radarClickCoords.lng;

    const circleCoords = [];

    // Crear coordenadas del círculo
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 360;
      const point = calculateCirclePoint(centerLat, centerLng, radiusInKm, angle);
      circleCoords.push([point.lng, point.lat]);
    }

    // Agregar fuente del círculo
    map.addSource('radar-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [circleCoords]
        }
      }
    });

    // Capa de relleno del círculo
    map.addLayer({
      id: 'radar-circle',
      type: 'fill',
      source: 'radar-source',
      paint: {
        'fill-color': '#10b981',
        'fill-opacity': 0.15
      }
    });

    // Capa de borde del círculo
    map.addLayer({
      id: 'radar-circle-border',
      type: 'line',
      source: 'radar-source',
      paint: {
        'line-color': '#10b981',
        'line-width': 3,
        'line-opacity': 0.8
      }
    });

    if (radarProperties.length === 0) {
      return () => {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        if (map.getLayer('radar-circle-border')) map.removeLayer('radar-circle-border');
        if (map.getLayer('radar-circle')) map.removeLayer('radar-circle');
        if (map.getSource('radar-source')) map.removeSource('radar-source');
      };
    }

    // ✅ MOSTRAR CADA PROPIEDAD INDIVIDUALMENTE (sin clustering)
    // Dispersar propiedades que tienen exactamente la misma ubicación
    const dispersedProperties = disperseOverlappingMarkers(radarProperties);

    dispersedProperties.forEach((property, index) => {
      setTimeout(() => {
        const markerEl = document.createElement('div');

        // Hacer el marcador completamente clickeable
        markerEl.style.cursor = 'pointer';
        markerEl.style.opacity = '0';
        markerEl.style.transform = 'scale(0)';
        markerEl.style.transition = 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

        const root = ReactDOM.createRoot(markerEl);
        root.render(<PropertyMarker featured={index === 0} />);

        // Usar coordenadas originales (NO dispersadas) para mostrar en su ubicación real
        const displayLng = property.longitude;
        const displayLat = property.latitude;

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat([displayLng, displayLat])
          .addTo(map);

        // Animar entrada del marcador
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            markerEl.style.opacity = '1';
            markerEl.style.transform = 'scale(1)';
          });
        });

        // Handler para mostrar popup - usando addEventListener en lugar de onclick
        const showPopup = (e) => {
          e.stopPropagation();

          const popupContent = `
            <div class="property-popup-mini">
              <div class="popup-mini-image">
                <img
                  src="${property.image ? `/storage/${property.image}` : `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=120&fit=crop`}"
                  alt="${property.title}"
                  onerror="this.src='https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=120&fit=crop'"
                />
                <div class="popup-mini-badge">${property.distance}km</div>
              </div>
              <div class="popup-mini-content">
                <h4 class="popup-mini-title">${property.title}</h4>
                <div class="popup-mini-location">📍 ${property.city}</div>
                <div class="popup-mini-specs">
                  <span>🛏️ ${property.bedrooms || 0}</span>
                  <span>🚿 ${property.bathrooms || 0}</span>
                  <span>📐 ${property.area || 0}m²</span>
                </div>
                <div class="popup-mini-price">$${Number(property.price).toLocaleString('es-MX')}</div>
                <button onclick="window.location.href='/properties/${property.id}'" class="popup-mini-button">Ver más →</button>
              </div>
            </div>
          `;

          new mapboxgl.Popup({
            maxWidth: '240px',
            className: 'custom-popup-mini',
            closeButton: true,
            closeOnClick: true
          })
            .setLngLat([displayLng, displayLat])
            .setHTML(popupContent)
            .addTo(map);
        };

        // Agregar event listener con captura para asegurar que se ejecute
        markerEl.addEventListener('click', showPopup, true);

        markersRef.current.push(marker);
      }, index * 50);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      if (map.getLayer('radar-circle-border')) map.removeLayer('radar-circle-border');
      if (map.getLayer('radar-circle')) map.removeLayer('radar-circle');
      if (map.getSource('radar-source')) map.removeSource('radar-source');
    };
  }, [showRadar, radarProperties, radarClickCoords, radarRadius]);

  const handleMapClick = useCallback((e) => {
    // Si el mapa fue arrastrado, no activar el radar
    if (isMapDragging) {
      return;
    }

    // Si el click fue en un popup o marcador, no activar el radar
    if (e.originalEvent.target.closest('.mapboxgl-popup') ||
        e.originalEvent.target.closest('.mapboxgl-marker')) {
      return;
    }

    if (showRadar) {
      handleCloseRadar();
    }

    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }

    const el = document.createElement('div');
    el.innerHTML = `<div class="click-marker"></div>`;

    clickMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat(e.lngLat)
      .addTo(mapInstanceRef.current);

    setRadarClickCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    setShowRadar(true);

    searchPropertiesAtPoint(e.lngLat);
  }, [showRadar, handleCloseRadar, searchPropertiesAtPoint, isMapDragging]);

  const getUserLocation = useCallback(() => {
    setIsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.longitude, position.coords.latitude];
          setUserLocation(location);
          setMapCenter(location);
          setIsLoading(false);

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({ center: location, zoom: 15, duration: 2000 });

            const el = document.createElement('div');
            el.innerHTML = `<div class="user-location-marker"></div>`;

            if (userMarkerRef.current) userMarkerRef.current.remove();
            userMarkerRef.current = new mapboxgl.Marker(el)
              .setLngLat(location)
              .addTo(mapInstanceRef.current);
          }
        },
        () => {
          setIsLoading(false);
        }
      );
    }
  }, []);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current || !mapConfig?.mapboxToken) return;

    try {
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: mapCenter,
        zoom: 13,
        attributionControl: false
      });

      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

      // Detectar cuando el usuario empieza a arrastrar el mapa
      map.on('mousedown', () => {
        mapDragStartRef.current = Date.now();
        setIsMapDragging(false);
      });

      map.on('mousemove', () => {
        // Si el mouse se mueve después de hacer mousedown, es un drag
        if (mapDragStartRef.current) {
          setIsMapDragging(true);
        }
      });

      map.on('mouseup', () => {
        // Después de 100ms, resetear el estado de dragging
        setTimeout(() => {
          setIsMapDragging(false);
          mapDragStartRef.current = null;
        }, 100);
      });

      // También detectar drag con touch (móvil)
      map.on('touchstart', () => {
        mapDragStartRef.current = Date.now();
        setIsMapDragging(false);
      });

      map.on('touchmove', () => {
        if (mapDragStartRef.current) {
          setIsMapDragging(true);
        }
      });

      map.on('touchend', () => {
        setTimeout(() => {
          setIsMapDragging(false);
          mapDragStartRef.current = null;
        }, 100);
      });

      map.on('click', handleMapClick);

      mapInstanceRef.current = map;
    } catch (error) {
      console.error('[MAPA ERROR]', error);
    }
  }, [mapConfig, mapCenter, handleMapClick]);

  useEffect(() => {
    if (isOpen && !mapInstanceRef.current && mapConfig) {
      const timer = setTimeout(initializeMap, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mapConfig, initializeMap]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
        } else if (showRadar) {
          handleCloseRadar();
        } else if (isOpen) {
          handleCloseMap();
        }
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showSearch, showRadar, isOpen, handleCloseRadar, handleCloseMap]);

  const modalPosition = calculateModalPosition();

  return (
    <>
      <div
        ref={elementRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 50,  // Por encima del navbar (40) pero debajo del chatbot (9999)
          display: isMobileMenuOpen ? 'none' : 'block'  // Ocultar cuando el menú móvil esté abierto
        }}
      >
        <button
          {...dragHandlers}
          onClick={(e) => {
            if (!wasDragged && !isDragging) {
              handleOpenModal();
            }
          }}
          className={`floating-map-btn ${isDragging ? 'dragging' : ''}`}
        >
          <div className="btn-glow"></div>
          <div className="btn-content">
            <svg
              className={`btn-icon ${isOpen ? 'hidden' : 'visible'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <svg
              className={`btn-icon ${isOpen ? 'visible' : 'hidden'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {isDragging && (
            <div className="drag-tooltip">Arrastrando...</div>
          )}
        </button>

        {!isOpen && !isDragging && (
          <div className="hover-tooltip">
            Buscar propiedades
            <div className="tooltip-arrow"></div>
          </div>
        )}
      </div>

      {/* Widget de estadísticas flotante - FUERA DEL MODAL */}
      {showRadar && radarProperties.length > 0 && !isOpen && (
        <FloatingStats
          properties={radarProperties}
          radius={radarRadius}
          buttonPosition={position}
        />
      )}

      {isOpen && (
        <div
          className={`map-modal ${isOpen ? 'open' : ''}`}
          style={{
            left: `${modalPosition.x}px`,
            top: `${modalPosition.y}px`,
            width: `${modalPosition.width}px`,
            height: `${modalPosition.height}px`,
          }}
        >
          <div className="modal-header-modern">
            <div className="header-left">
              <div className="header-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              </div>
              <div className="header-info">
                <h3 className="header-title">Radar de Propiedades</h3>
                <div className="header-status">
                  <div className={`status-dot ${isLoading ? 'loading' : 'ready'}`}></div>
                  <span className="status-text">
                    {isLoading ? 'Cargando...' : 'Listo para buscar'}
                  </span>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <button
                onClick={() => setShowSearch(!showSearch)}
                title="Buscar zona"
                className="header-btn"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              <button
                onClick={getUserLocation}
                title="Mi ubicación"
                disabled={isLoading}
                className="header-btn"
              >
                {isLoading ? (
                  <svg className="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleCloseRadar}
                title="Limpiar búsqueda"
                disabled={!showRadar}
                className="header-btn"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button
                onClick={handleCloseMap}
                title="Cerrar mapa"
                className="header-btn close-btn"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {showSearch && (
            <SearchBar
              onSearch={handleSearch}
              onClose={() => setShowSearch(false)}
            />
          )}

          {showRadar && (
            <RadiusSlider
              radius={radarRadius}
              onRadiusChange={handleRadiusChange}
              isSearching={isSearchingRadar}
              propertiesCount={radarProperties.length}
            />
          )}

          <div ref={mapRef} className="map-container-modern">
            {!mapConfig?.mapboxToken && (
              <div className="map-placeholder">
                <div className="placeholder-content">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 113 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p>Token de Mapbox no configurado</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}

      {isSearchingRadar && (
        <div className="loading-overlay-simple">
          <div className="loading-bar-container">
            <div className="loading-bar"></div>
          </div>
          <p className="loading-text-simple">Buscando propiedades...</p>
        </div>
      )}

      <style jsx>{`
        /* ========== BOTÓN FLOTANTE MEJORADO ========== */
        .floating-map-btn {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%);
          border: none;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .floating-map-btn:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.5);
        }

        .floating-map-btn:active {
          transform: translateY(-2px) scale(1.02);
        }

        .floating-map-btn.dragging {
          transform: scale(1.1) rotate(3deg);
          box-shadow: 0 16px 48px rgba(59, 130, 246, 0.6);
        }

        .btn-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .floating-map-btn:hover .btn-glow {
          opacity: 1;
        }

        .btn-content {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-icon {
          width: 28px;
          height: 28px;
          color: white;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: absolute;
        }

        .btn-icon.hidden {
          opacity: 0;
          transform: rotate(180deg) scale(0);
        }

        .btn-icon.visible {
          opacity: 1;
          transform: rotate(0) scale(1);
        }

        .drag-tooltip {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
        }

        .hover-tooltip {
          position: absolute;
          bottom: 70px;
          left: 0;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          white-space: nowrap;
          pointer-events: none;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        html.dark .hover-tooltip {
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
        }

        .tooltip-arrow {
          position: absolute;
          bottom: -6px;
          left: 16px;
          width: 12px;
          height: 12px;
          background: #374151;
          transform: rotate(45deg);
        }

        /* ========== WIDGET ESTADÍSTICAS MINI FIJO ========== */
        .floating-stats-widget-fixed {
          position: fixed;
          z-index: 51;
          animation: slideInLeft 0.3s ease-out;
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .stats-widget-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          padding: 10px 12px;
          transition: all 0.3s;
        }

        html.dark .stats-widget-mini {
          background: rgba(31, 41, 55, 0.95);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .stats-widget-mini:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .stats-mini-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stats-mini-icon {
          font-size: 16px;
        }

        .stats-mini-data {
          display: flex;
          flex-direction: column;
          gap: 0px;
        }

        .stats-mini-count {
          font-size: 16px;
          font-weight: 700;
          color: #10b981;
          line-height: 1;
        }

        .stats-mini-label {
          font-size: 9px;
          color: #6b7280;
          line-height: 1;
        }

        html.dark .stats-mini-label {
          color: #9ca3af;
        }

        .stats-mini-value {
          font-size: 14px;
          font-weight: 700;
          color: #10b981;
        }

        .stats-mini-divider {
          width: 1px;
          height: 24px;
          background: rgba(16, 185, 129, 0.2);
        }

        /* ========== POPUP MINI COMPACTO ========== */
        .property-popup-mini {
          width: 240px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        html.dark .property-popup-mini {
          background: #1f2937;
        }

        .popup-mini-image {
          position: relative;
          width: 100%;
          height: 120px;
          overflow: hidden;
        }

        .popup-mini-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .popup-mini-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(16, 185, 129, 0.95);
          color: white;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .popup-mini-content {
          padding: 12px;
        }

        .popup-mini-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        html.dark .popup-mini-title {
          color: white;
        }

        .popup-mini-location {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        html.dark .popup-mini-location {
          color: #9ca3af;
        }

        .popup-mini-specs {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }

        .popup-mini-specs span {
          font-size: 11px;
          color: #6b7280;
        }

        html.dark .popup-mini-specs span {
          color: #9ca3af;
        }

        .popup-mini-price {
          font-size: 16px;
          font-weight: 700;
          color: #10b981;
          margin-bottom: 10px;
        }

        .popup-mini-button {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: white;
          text-align: center;
          padding: 8px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }

        .popup-mini-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        /* Estilos para el contenedor del popup de Mapbox */
        .custom-popup-mini .mapboxgl-popup-content {
          padding: 0;
          border-radius: 12px;
          box-shadow: none;
        }

        .custom-popup-mini .mapboxgl-popup-close-button {
          width: 24px;
          height: 24px;
          font-size: 18px;
          padding: 0;
          right: 4px;
          top: 4px;
          color: white;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          z-index: 1;
        }

        .custom-popup-mini .mapboxgl-popup-close-button:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        /* ========== MODAL MEJORADO ========== */
        .map-modal {
          position: fixed;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.6);
          z-index: 50;
          opacity: 0;
          transform: scale(0.95) translateY(10px);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        html.dark .map-modal {
          background: rgba(17, 24, 39, 0.98);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .map-modal.open {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        /* ========== HEADER MODERNO ========== */
        .modal-header-modern {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%);
          border-bottom: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 20px 20px 0 0;
        }

        html.dark .modal-header-modern {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
        }

        .header-icon svg {
          width: 22px;
          height: 22px;
          color: white;
        }

        .header-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .header-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        html.dark .header-title {
          color: white;
        }

        .header-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
        }

        .status-dot.loading {
          background: #f59e0b;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-dot.ready {
          background: #10b981;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-text {
          font-size: 12px;
          color: #06b6d4;
          font-weight: 500;
        }

        html.dark .status-text {
          color: #38bdf8;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .header-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
        }

        html.dark .header-btn {
          background: rgba(55, 65, 81, 0.8);
          color: #9ca3af;
        }

        .header-btn:hover {
          background: rgba(6, 182, 212, 0.1);
          color: #06b6d4;
          transform: translateY(-2px);
        }

        .header-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .header-btn svg {
          width: 18px;
          height: 18px;
        }

        .header-btn.close-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* ========== RADIUS SLIDER COMPACTO ========== */
        .radius-slider-compact {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(6, 182, 212, 0.15);
          transition: all 0.3s ease;
          overflow: hidden;
        }

        html.dark .radius-slider-compact {
          background: rgba(31, 41, 55, 0.6);
          border-color: rgba(6, 182, 212, 0.2);
        }

        .radius-header-compact {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          user-select: none;
        }

        .radius-info-compact {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .radius-icon-small {
          width: 18px;
          height: 18px;
          color: #10b981;
          flex-shrink: 0;
        }

        .radius-text-compact {
          font-size: 13px;
          color: #6b7280;
        }

        html.dark .radius-text-compact {
          color: #9ca3af;
        }

        .radius-text-compact strong {
          color: #10b981;
          font-weight: 700;
        }

        .properties-badge {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: white;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .radius-content-compact {
          max-height: 100px;
          padding: 0 16px 12px;
          transition: all 0.3s ease;
        }

        .radius-track-wrapper {
          position: relative;
          margin-bottom: 10px;
        }

        .radius-track-bg-compact {
          position: absolute;
          top: 7px;
          left: 0;
          right: 0;
          height: 4px;
          background: #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          pointer-events: none;
        }

        html.dark .radius-track-bg-compact {
          background: #374151;
        }

        .radius-track-fill-compact {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
          border-radius: 10px;
          transition: width 0.2s ease;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .radius-input-compact {
          position: relative;
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          outline: none;
          cursor: pointer;
          z-index: 1;
          margin: 7px 0;
        }

        .radius-input-compact::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: white;
          border: 2px solid #10b981;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .radius-input-compact::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4);
        }

        .radius-input-compact::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: white;
          border: 2px solid #10b981;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .radius-status-compact {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
        }

        .radius-status-compact.searching {
          background: rgba(6, 182, 212, 0.1);
          color: #0891b2;
        }

        .radius-status-compact.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* ========== MAP CONTAINER ========== */
        .map-container-modern {
          flex: 1;
          overflow: hidden;
          background: #f9fafb;
          border-radius: 0 0 20px 20px;
          position: relative;
        }

        html.dark .map-container-modern {
          background: #111827;
        }

        .map-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .placeholder-content {
          text-align: center;
          color: #9ca3af;
        }

        .placeholder-content svg {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          opacity: 0.3;
        }

        .placeholder-content p {
          font-size: 14px;
          margin: 0;
        }

        /* ========== SEARCH BAR ========== */
        .search-bar-container {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(6, 182, 212, 0.15);
        }

        html.dark .search-bar-container {
          background: rgba(31, 41, 55, 0.6);
          border-color: rgba(6, 182, 212, 0.2);
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px 12px;
          margin-bottom: 8px;
        }

        html.dark .search-bar {
          background: #374151;
          border-color: #4b5563;
        }

        .search-icon {
          font-size: 18px;
        }

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: #111827;
        }

        html.dark .search-input {
          color: white;
        }

        .search-input::placeholder {
          color: #9ca3af;
        }

        .search-clear {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
        }

        .search-clear:hover {
          color: #ef4444;
        }

        .search-button {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .search-close-btn {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #6b7280;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        html.dark .search-close-btn {
          border-color: #4b5563;
          color: #9ca3af;
        }

        .search-close-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* ========== LOADING OVERLAY ========== */
        /* ========== LOADING SIMPLE Y DISCRETO ========== */
        .loading-overlay-simple {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 20px;
          pointer-events: none;
        }

        .loading-bar-container {
          width: 300px;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .loading-bar {
          height: 100%;
          background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6);
          background-size: 200% 100%;
          animation: loadingSlide 1.5s ease-in-out infinite;
          border-radius: 2px;
        }

        .loading-text-simple {
          margin-top: 12px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          padding: 8px 16px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* ========== TOAST ========== */
        .toast-notification {
          position: fixed;
          bottom: 100px;
          right: 20px;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(10px);
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10000;
          max-width: 350px;
          animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-out 3.7s forwards;
        }

        html.dark .toast-notification {
          background: rgba(17, 24, 39, 0.95);
          border-color: rgba(255, 255, 255, 0.15);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(120%);
          }
        }

        .toast-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          font-size: 13px;
          line-height: 1.4;
        }

        .toast-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .toast-close:hover {
          color: white;
          transform: scale(1.1);
        }

        /* ========== CLICK MARKER ========== */
        .click-marker {
          width: 24px;
          height: 24px;
          background: #ef4444;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        /* ========== ANIMATIONS ========== */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        @keyframes loadingSlide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* ========== CLUSTER MARKERS ========== */
        .cluster-marker-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cluster-pulse-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border: 3px solid #10b981;
          border-radius: 50%;
          animation: cluster-pulse 2s ease-out infinite;
        }

        @keyframes cluster-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        .cluster-marker {
          position: relative;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
          z-index: 1;
          transition: all 0.3s;
        }

        .cluster-marker:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.6);
        }

        .cluster-count {
          font-size: 24px;
          font-weight: 700;
          color: white;
          line-height: 1;
        }

        .cluster-label {
          font-size: 9px;
          color: white;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .cluster-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: glow-pulse 2s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        /* ========== PROPERTY MARKERS ========== */
        .property-marker-wrapper {
          position: relative;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .property-pulse {
          position: absolute;
          width: 50px;
          height: 50px;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          animation: property-pulse 2s ease-out infinite;
        }

        @keyframes property-pulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .property-marker {
          position: relative;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          border: 3px solid white;
          z-index: 1;
          transition: all 0.3s;
        }

        .property-marker:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
        }

        .property-marker.featured {
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          width: 48px;
          height: 48px;
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
        }

        .property-icon {
          font-size: 20px;
        }

        .featured-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          animation: badge-bounce 2s ease-in-out infinite;
        }

        @keyframes badge-bounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.1);
          }
        }

        /* ========== USER LOCATION MARKER ========== */
        .user-location-marker {
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: user-location-pulse 2s ease-in-out infinite;
        }

        @keyframes user-location-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3);
          }
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
          .toast-notification {
            right: 10px;
            left: 10px;
            max-width: calc(100% - 20px);
          }

          .loading-card {
            padding: 30px 40px;
          }

          .floating-stats-widget-fixed {
            left: 20px !important;
            top: auto !important;
            bottom: 100px;
          }

          .property-popup-mini {
            width: 220px;
          }

          .popup-mini-image {
            height: 100px;
          }
        }
      `}</style>
    </>
  );
}

export default LayoutMap;
