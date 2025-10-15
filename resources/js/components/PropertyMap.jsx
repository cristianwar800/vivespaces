import React, { useEffect, useState, useRef } from 'react';

function PropertyMap() {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(true);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // Obtener token de Mapbox desde API
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
            console.error('Error obteniendo token desde API:', error);
        }
        return null;
    };

    // Generar coordenadas fijas basadas en ID de propiedad y ciudad
    const generateFixedCoordinates = (propertyId, city) => {
        const neighborhoodCoords = {
            'guadalajara': [
                [20.6597, -103.3496], [20.6720, -103.3560], [20.6850, -103.3420], [20.6650, -103.3380], [20.6450, -103.3580]
            ],
            'zapopan': [
                [20.7214, -103.3909], [20.7350, -103.4100], [20.7180, -103.3750], [20.7050, -103.4200], [20.7400, -103.3800]
            ],
            'providencia': [
                [20.6668, -103.3918], [20.6720, -103.3950], [20.6620, -103.3880], [20.6700, -103.3850], [20.6640, -103.3970]
            ],
            'americana': [
                [20.6724, -103.3670], [20.6780, -103.3720], [20.6680, -103.3620], [20.6750, -103.3600], [20.6690, -103.3740]
            ],
            'chapalita': [
                [20.6889, -103.4178], [20.6920, -103.4200], [20.6860, -103.4150], [20.6900, -103.4100], [20.6880, -103.4250]
            ],
            'tlaquepaque': [
                [20.6406, -103.3370], [20.6350, -103.3320], [20.6460, -103.3420], [20.6380, -103.3290], [20.6430, -103.3450]
            ],
            'tonala': [
                [20.6244, -103.2329], [20.6200, -103.2280], [20.6290, -103.2380], [20.6180, -103.2350], [20.6270, -103.2250]
            ],
            'centro': [
                [20.6597, -103.3496], [20.6620, -103.3520], [20.6580, -103.3470], [20.6640, -103.3440], [20.6560, -103.3530]
            ]
        };

        const cityKey = (city || 'guadalajara').toLowerCase().trim();
        let availableCoords = neighborhoodCoords[cityKey] || neighborhoodCoords['guadalajara'];

        const index = propertyId % availableCoords.length;
        const baseCoords = availableCoords[index];

        const offsetSeed = (propertyId * 7919) % 10000;
        const latOffset = (offsetSeed % 100) / 100000 * 0.003;
        const lngOffset = ((offsetSeed / 100) % 100) / 100000 * 0.003;

        return [
            baseCoords[0] + latOffset,
            baseCoords[1] + lngOffset
        ];
    };

    // Cargar propiedades
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
            loadMapbox();
        }
    }, [loadingProperties, properties]);

    const loadMapbox = async () => {
        try {
            const mapboxToken = await getMapboxToken();

            if (!mapboxToken) {
                setMapError('Token de Mapbox no encontrado.');
                return;
            }

            if (!document.querySelector('link[href*="mapbox-gl"]')) {
                const mapboxCSS = document.createElement('link');
                mapboxCSS.rel = 'stylesheet';
                mapboxCSS.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
                document.head.appendChild(mapboxCSS);
            }

            if (!window.mapboxgl) {
                const script = document.createElement('script');
                script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
                script.onload = () => initializeMap(mapboxToken);
                script.onerror = () => setMapError('Error al cargar Mapbox GL JS');
                document.head.appendChild(script);
            } else {
                initializeMap(mapboxToken);
            }
        } catch (error) {
            setMapError('Error al cargar el mapa: ' + error.message);
        }
    };

    const initializeMap = async (token) => {
        try {
            const mapboxgl = window.mapboxgl;
            mapboxgl.accessToken = token;

            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }

            const defaultCenter = [-103.3496, 20.6597];

            const map = new mapboxgl.Map({
                container: 'property-map',
                style: 'mapbox://styles/mapbox/streets-v12',
                center: defaultCenter,
                zoom: 12
            });

            mapInstanceRef.current = map;
            map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

            map.on('load', () => {
                if (properties.length > 0) {
                    const bounds = new mapboxgl.LngLatBounds();
                    const markers = [];

                    properties.forEach(property => {
                        try {
                            const coordinates = generateFixedCoordinates(
                                property.id,
                                property.city || 'guadalajara'
                            );

                            if (coordinates && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
                                // Crear popup HTML
                                const popupHTML = `
                                    <div style="min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 320px;">
                                        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.3;">
                                            ${property.title}
                                        </h3>
                                        <div style="margin-bottom: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
                                            <span style="background: #10b981; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; text-transform: capitalize;">
                                                ${property.type || 'Propiedad'}
                                            </span>
                                            <span style="background: ${property.is_active ? '#059669' : '#dc2626'}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">
                                                ${property.is_active ? 'Disponible' : 'No disponible'}
                                            </span>
                                        </div>
                                        <p style="margin: 8px 0; font-weight: 700; color: #10b981; font-size: 20px;">
                                            $${Number(property.price).toLocaleString('es-MX')}
                                        </p>
                                        <p style="margin: 8px 0; font-size: 13px; color: #6b7280; line-height: 1.4;">
                                            📍 ${property.address}, ${property.city}
                                        </p>
                                        <div style="display: flex; gap: 12px; margin: 12px 0; font-size: 12px; color: #6b7280; justify-content: space-between;">
                                            <span>🛏️ ${property.bedrooms || 0} hab</span>
                                            <span>🚿 ${property.bathrooms || 0} baños</span>
                                            <span>📐 ${property.area || 0}m²</span>
                                        </div>
                                        ${property.description ? `
                                            <p style="margin: 10px 0; font-size: 12px; color: #6b7280; line-height: 1.4; max-height: 36px; overflow: hidden;">
                                                ${property.description.substring(0, 80)}${property.description.length > 80 ? '...' : ''}
                                            </p>
                                        ` : ''}
                                        <button onclick="window.location.href='/properties/${property.id}'"
                                                style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; margin-top: 10px; width: 100%;">
                                            Ver Detalles
                                        </button>
                                    </div>
                                `;

                                // Crear popup
                                const popup = new mapboxgl.Popup({
                                    offset: 25,
                                    closeButton: true,
                                    closeOnClick: false,
                                    maxWidth: '340px'
                                }).setHTML(popupHTML);

                                // Crear marcador DIV personalizado PERO sin reposicionamiento
                                const markerDiv = document.createElement('div');
                                markerDiv.innerHTML = `
                                    <div style="
                                        width: 40px;
                                        height: 40px;
                                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                        border: 3px solid #ffffff;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 18px;
                                        cursor: pointer;
                                        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                                        transform: translate(-50%, -50%);
                                        position: absolute;
                                        pointer-events: auto;
                                    ">🏠</div>
                                `;

                                // Calcular posición en píxeles del mapa
                                const point = map.project([coordinates[1], coordinates[0]]);

                                // Posicionar marcador con coordenadas de píxeles
                                markerDiv.style.left = point.x + 'px';
                                markerDiv.style.top = point.y + 'px';
                                markerDiv.style.position = 'absolute';
                                markerDiv.style.zIndex = '100';

                                // Agregar al contenedor del mapa
                                const mapContainer = map.getContainer();
                                mapContainer.appendChild(markerDiv);

                                // Agregar click listener
                                markerDiv.addEventListener('click', () => {
                                    popup.setLngLat([coordinates[1], coordinates[0]]).addTo(map);
                                });

                                // Función para actualizar posición del marcador al mover/zoom
                                const updateMarkerPosition = () => {
                                    const newPoint = map.project([coordinates[1], coordinates[0]]);
                                    markerDiv.style.left = newPoint.x + 'px';
                                    markerDiv.style.top = newPoint.y + 'px';
                                };

                                // Actualizar posición en eventos del mapa
                                map.on('move', updateMarkerPosition);
                                map.on('zoom', updateMarkerPosition);
                                map.on('rotate', updateMarkerPosition);
                                map.on('pitch', updateMarkerPosition);

                                // Guardar referencia para limpieza
                                markers.push({
                                    element: markerDiv,
                                    coordinates: [coordinates[1], coordinates[0]],
                                    updatePosition: updateMarkerPosition
                                });

                                bounds.extend([coordinates[1], coordinates[0]]);
                            }
                        } catch (error) {
                            console.error(`Error procesando propiedad ${property.id}:`, error);
                        }
                    });

                    // Ajustar bounds
                    if (markers.length > 0) {
                        setTimeout(() => {
                            if (markers.length === 1) {
                                map.setZoom(15);
                            } else {
                                map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
                            }
                        }, 500);
                    }

                    console.log(`${markers.length} marcadores agregados exitosamente`);
                }

                setMapLoaded(true);
                setMapError(null);
            });

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
                background: '#f9fafb',
                borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #10b981',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#6b7280', margin: 0 }}>Cargando propiedades...</p>
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
                background: '#fef2f2',
                borderRadius: '12px'
            }}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>Error al cargar el mapa</h3>
                    <p style={{ color: '#991b1b', margin: '0 0 16px 0' }}>{mapError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
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
                    overflow: hidden;
                    position: relative;
                }

                .mapboxgl-popup-content {
                    padding: 0;
                    border-radius: 12px;
                }
            `}</style>
            <div style={{ height: '500px', width: '100%' }}>
                <div id="property-map" ref={mapRef}></div>
            </div>
        </>
    );
}

export default PropertyMap;
