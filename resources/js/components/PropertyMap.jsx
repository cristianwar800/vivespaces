import React, { useEffect, useState } from 'react';

function PropertyMap() {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(true);

    // Cargar propiedades de la base de datos
    useEffect(() => {
        const loadProperties = async () => {
            try {
                const response = await fetch('/api/properties-map', {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Propiedades cargadas:', data.properties);
                    setProperties(data.properties || []);
                }
            } catch (error) {
                console.error('Error cargando propiedades:', error);
            } finally {
                setLoadingProperties(false);
            }
        };

        loadProperties();
    }, []);

    useEffect(() => {
        if (!loadingProperties) {
            loadLeaflet();
        }
    }, [loadingProperties, properties]);

    const loadLeaflet = async () => {
        try {
            // Cargar CSS de Leaflet
            if (!document.querySelector('link[href*="leaflet"]')) {
                const leafletCSS = document.createElement('link');
                leafletCSS.rel = 'stylesheet';
                leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(leafletCSS);
            }

            // Cargar JavaScript de Leaflet
            if (!window.L) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = initializeMap;
                script.onerror = () => setMapError('Error al cargar Leaflet');
                document.head.appendChild(script);
            } else {
                initializeMap();
            }
        } catch (error) {
            setMapError('Error al cargar el mapa');
        }
    };

    const getCoordinatesFromCity = (city, address, index) => {
        const cityCoordinates = {
            'guadalajara': [20.6597, -103.3496],
            'zapopan': [20.7214, -103.3909],
            'tlaquepaque': [20.6406, -103.3370],
            'tonala': [20.6244, -103.2329],
            'providencia': [20.6668, -103.3918],
            'americana': [20.6724, -103.3670],
            'chapalita': [20.6889, -103.4178],
            'centro': [20.6597, -103.3496],
            'default': [20.6597, -103.3496]
        };

        const cityKey = (city || '').toLowerCase().trim();
        let baseCoords = cityCoordinates[cityKey] || cityCoordinates['default'];

        // Buscar por colonias en la dirección
        const addressLower = (address || '').toLowerCase();
        if (addressLower.includes('providencia')) {
            baseCoords = cityCoordinates['providencia'];
        } else if (addressLower.includes('americana')) {
            baseCoords = cityCoordinates['americana'];
        } else if (addressLower.includes('chapalita')) {
            baseCoords = cityCoordinates['chapalita'];
        } else if (addressLower.includes('centro')) {
            baseCoords = cityCoordinates['centro'];
        }

        // Agregar variación pequeña para evitar superposición
        const variation = 0.005;
        const latVariation = (Math.random() - 0.5) * variation;
        const lngVariation = (Math.random() - 0.5) * variation;

        return [
            baseCoords[0] + latVariation,
            baseCoords[1] + lngVariation
        ];
    };

    const initializeMap = () => {
        try {
            const L = window.L;

            // Limpiar contenedor del mapa
            const mapContainer = document.getElementById('property-map');
            if (mapContainer) {
                mapContainer.innerHTML = '';
            }

            // Centro de Guadalajara
            const defaultCenter = [20.6597, -103.3496];

            // Crear mapa
            const map = L.map('property-map', {
                center: defaultCenter,
                zoom: 12,
                scrollWheelZoom: true,
                zoomControl: true
            });

            // Agregar tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
            }).addTo(map);

            console.log('Mapa inicializado, propiedades:', properties.length);

            // Array para guardar todos los marcadores
            const markers = [];

            if (properties.length > 0) {
                properties.forEach((property, index) => {
                    try {
                        // Generar coordenadas
                        const coordinates = property.latitude && property.longitude
                            ? [parseFloat(property.latitude), parseFloat(property.longitude)]
                            : getCoordinatesFromCity(
                                property.city || 'guadalajara',
                                property.address || '',
                                index
                            );

                        console.log(`Propiedad ${property.id}:`, coordinates);

                        // Verificar que las coordenadas son válidas
                        if (coordinates && coordinates.length === 2 &&
                            !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {

                            const marker = L.marker(coordinates);
                            markers.push(marker);
                            marker.addTo(map);

                            const popupContent = `
                                <div style="min-width: 200px; font-family: Inter, sans-serif;">
                                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                                        ${property.title}
                                    </h3>
                                    <div style="margin-bottom: 8px;">
                                        <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                                            ${property.type || 'Propiedad'}
                                        </span>
                                        ${property.is_active ?
                                            '<span style="background: #059669; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 4px;">Disponible</span>' :
                                            '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 4px;">No disponible</span>'
                                        }
                                    </div>
                                    <p style="margin: 4px 0; font-weight: bold; color: #10b981; font-size: 18px;">
                                        $${Number(property.price).toLocaleString('es-MX')} MXN
                                    </p>
                                    <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
                                        📍 ${property.address}, ${property.city}${property.state ? ', ' + property.state : ''}
                                    </p>
                                    <div style="display: flex; gap: 8px; margin: 8px 0; font-size: 12px; color: #6b7280;">
                                        <span>🛏️ ${property.bedrooms || 0}</span>
                                        <span>🚿 ${property.bathrooms || 0}</span>
                                        <span>📐 ${property.area || 0}m²</span>
                                    </div>
                                    ${property.description ? `
                                        <p style="margin: 8px 0; font-size: 13px; color: #6b7280; font-style: italic; max-height: 40px; overflow: hidden;">
                                            ${property.description.substring(0, 100)}${property.description.length > 100 ? '...' : ''}
                                        </p>
                                    ` : ''}
                                    <button onclick="window.location.href='/properties/${property.id}'"
                                            style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 8px; width: 100%; font-weight: 500;">
                                        Ver Detalles
                                    </button>
                                </div>
                            `;

                            marker.bindPopup(popupContent);
                        }
                    } catch (error) {
                        console.error(`Error procesando propiedad ${property.id}:`, error);
                    }
                });

                // CORREGIDO: Ajustar vista solo si hay marcadores válidos
                if (markers.length > 1) {
                    try {
                        const group = new L.featureGroup(markers);
                        const bounds = group.getBounds();

                        // Verificar que bounds es válido antes de usar pad
                        if (bounds && bounds.isValid && bounds.isValid()) {
                            map.fitBounds(bounds.pad(0.1));
                        } else {
                            console.log('Bounds inválido, usando vista predeterminada');
                            map.setView(defaultCenter, 12);
                        }
                    } catch (error) {
                        console.error('Error ajustando vista del mapa:', error);
                        map.setView(defaultCenter, 12);
                    }
                } else if (markers.length === 1) {
                    // Si solo hay un marcador, centrar en él
                    map.setView(markers[0].getLatLng(), 14);
                }

                console.log(`${markers.length} marcadores agregados al mapa`);
            } else {
                // No hay propiedades
                const noPropertiesPopup = L.popup()
                    .setLatLng(defaultCenter)
                    .setContent(`
                        <div style="text-align: center; padding: 10px;">
                            <h3>No hay propiedades disponibles</h3>
                            <p>Agrega algunas propiedades para verlas en el mapa</p>
                        </div>
                    `)
                    .openOn(map);
            }

            setMapLoaded(true);
            setMapError(null);
        } catch (error) {
            console.error('Error inicializando mapa:', error);
            setMapError('Error al inicializar el mapa: ' + error.message);
        }
    };

    if (loadingProperties) {
        return (
            <div style={{
                height: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #d1d5db',
                        borderTop: '4px solid #10b981',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p>Cargando propiedades...</p>
                </div>
            </div>
        );
    }

    if (mapError) {
        return (
            <div style={{
                height: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f4f6',
                borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h3>Error al cargar el mapa</h3>
                    <p>{mapError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '8px 16px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        Recargar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                #property-map {
                    height: 500px;
                    width: 100%;
                    border-radius: 12px;
                }
            `}</style>
            <div style={{ height: '500px', width: '100%' }}>
                <div id="property-map"></div>
            </div>
        </>
    );
}

export default PropertyMap;
