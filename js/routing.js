const map = window.zooMap;

if (!map) {
    throw new Error('window.zooMap is not available. Make sure routing.js loads after the map is created.');
}

const ROUTE_SOURCE_ID = 'zoo-route-source';
const ROUTE_LINE_ID = 'zoo-route-line';
const ROUTE_GLOW_ID = 'zoo-route-glow';
const ROUTE_DEST_ID = 'zoo-route-destination';
const ROUTE_HIT_AREA_ID = 'zoo-route-hit-area';

const ROUTE_API_URL = 'https://euwzj2bjm2.execute-api.us-east-1.amazonaws.com/route';

let routingArmed = false;
let routeRequestInFlight = false;
let userLocationMarker = null;
let destinationMarker = null;
let tooltipEl = null;
let routeActive = false;

function hasActiveRoute() {
    return routeActive;
}

function getOrCreateTooltip() {
    if (tooltipEl) return tooltipEl;

    tooltipEl = document.createElement('div');
    tooltipEl.id = 'zoo-route-tooltip';
    tooltipEl.className = 'zoo-route-tooltip';
    tooltipEl.setAttribute('role', 'status');
    tooltipEl.setAttribute('aria-live', 'polite');
    tooltipEl.hidden = true;

    document.body.appendChild(tooltipEl);
    return tooltipEl;
}

function showTooltip(message, isError = false) {
    const el = getOrCreateTooltip();
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.hidden = false;
}

function hideTooltip() {
    const el = getOrCreateTooltip();
    el.hidden = true;
}

function setRoutingButtonState() {
    const btn = document.getElementById('widget-route');
    if (!btn) return;
    btn.classList.toggle('has-route', routeActive);
    btn.classList.toggle('active', routingArmed);
    btn.classList.toggle('loading', routeRequestInFlight);
    btn.setAttribute('aria-pressed', String(routingArmed));
    btn.disabled = routeRequestInFlight;
}

function ensureRouteLayers() {
    if (!map.getSource(ROUTE_SOURCE_ID)) {
        map.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    }

    if (!map.getLayer(ROUTE_GLOW_ID)) {
        map.addLayer({
            id: ROUTE_GLOW_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            filter: ['==', ['geometry-type'], 'LineString'],
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#f4e27a',
                'line-width': 10,
                'line-opacity': 0.55,
                'line-blur': 1.2
            }
        });
    }

    if (!map.getLayer(ROUTE_LINE_ID)) {
        map.addLayer({
            id: ROUTE_LINE_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            filter: ['==', ['geometry-type'], 'LineString'],
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#21468e',
                'line-width': 6,
                'line-opacity': 0.75
            }
        });
    }

    if (!map.getLayer(ROUTE_HIT_AREA_ID)) {
        map.addLayer({
            id: ROUTE_HIT_AREA_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            filter: ['==', ['geometry-type'], 'LineString'],
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#000000',
                'line-width': 20,
                'line-opacity': 0
            }
        });
    }
}

function clearRoute() {
    routeActive = false;
    if (map.getSource(ROUTE_SOURCE_ID)) {
        map.getSource(ROUTE_SOURCE_ID).setData({
            type: 'FeatureCollection',
            features: []
        });
    }

    if (destinationMarker) {
        destinationMarker.remove();
        destinationMarker = null;
    }

    if (userLocationMarker) {
        userLocationMarker.remove();
        userLocationMarker = null;
    }

    routingArmed = false;
    routeRequestInFlight = false;
    setRoutingButtonState();
    map.easeTo({
        bearing: 0,
        pitch: map.getPitch(),
        duration: 500
    });
}

function createUserLocationMarker() {
    const wrapper = document.createElement('div');
    wrapper.className = 'zoo-user-location-marker-wrap';

    const dot = document.createElement('div');
    dot.className = 'zoo-user-location-marker';

    wrapper.appendChild(dot);

    return new maplibregl.Marker({
        element: wrapper,
        anchor: 'center'
    });
}

function createDestinationMarker() {
    const el = document.createElement('div');
    el.className = 'zoo-route-destination-marker';
    return new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
    });
}

function getDeviceLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported in this browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lng: position.coords.longitude,
                    lat: position.coords.latitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    reject(new Error('Location access was denied.'));
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    reject(new Error('Location information is unavailable.'));
                } else if (error.code === error.TIMEOUT) {
                    reject(new Error('Location request timed out.'));
                } else {
                    reject(new Error('Unable to get your location.'));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

async function requestRoute(startLngLat, endLngLat) {
    const response = await fetch(ROUTE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            profile: 'foot-walking',
            start: {
                lng: startLngLat.lng,
                lat: startLngLat.lat
            },
            end: {
                lng: endLngLat.lng,
                lat: endLngLat.lat
            }
        })
    });

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        throw new Error('Route service returned an unreadable response.');
    }

    if (!response.ok) {
        throw new Error(payload?.error || 'Route request failed.');
    }

    if (!payload?.route || payload.route.type !== 'FeatureCollection') {
        throw new Error('Route service did not return GeoJSON.');
    }

    return payload;
}

function fitRoute(geojson) {
    const lineFeature = geojson.features.find((f) => f.geometry?.type === 'LineString');
    if (!lineFeature || !lineFeature.geometry?.coordinates?.length) return;

    const bounds = new maplibregl.LngLatBounds();

    lineFeature.geometry.coordinates.forEach((coord) => bounds.extend(coord));

    map.fitBounds(bounds, {
        padding: {
            top: 100,
            right: 100,
            bottom: 140,
            left: 100
        },
        duration: 900
    });
}

function getBearing(fromCoord, toCoord) {
    const [lng1, lat1] = fromCoord;
    const [lng2, lat2] = toCoord;

    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const lambda1 = lng1 * Math.PI / 180;
    const lambda2 = lng2 * Math.PI / 180;

    const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
    const x =
        Math.cos(phi1) * Math.sin(phi2) -
        Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function orientMapToRouteDestination(routeGeojson, startLngLat = null) {
    const lineFeature = routeGeojson?.features?.find(
        (feature) => feature.geometry?.type === 'LineString'
    );

    const coords = lineFeature?.geometry?.coordinates;
    if (!coords || !coords.length) return;

    const destinationCoord = coords[coords.length - 1];

    const fromCoord = startLngLat
        ? [startLngLat.lng, startLngLat.lat]
        : [map.getCenter().lng, map.getCenter().lat];

    const bearing = getBearing(fromCoord, destinationCoord);

    map.easeTo({
        center: destinationCoord,
        bearing,
        pitch: map.getPitch(),
        duration: 900
    });
}

async function buildRouteTo(endLngLat, startLngLatOverride = null) {
    if (routeRequestInFlight) return;

    routeRequestInFlight = true;
    setRoutingButtonState();
    showTooltip('Getting route.');

    try {
        const startLngLat = startLngLatOverride || await getDeviceLocation();

        if (!userLocationMarker) {
            userLocationMarker = createUserLocationMarker();
        }

        userLocationMarker
            .setLngLat([startLngLat.lng, startLngLat.lat])
            .addTo(map);

        if (!destinationMarker) {
            destinationMarker = createDestinationMarker();
        }

        destinationMarker
            .setLngLat([endLngLat.lng, endLngLat.lat])
            .addTo(map);

        const payload = await requestRoute(startLngLat, endLngLat);

        ensureRouteLayers();
        map.getSource(ROUTE_SOURCE_ID).setData(payload.route);
        routeActive = true;

        fitRoute(payload.route);

        window.setTimeout(() => {
            orientMapToRouteDestination(payload.route, startLngLat);
        }, 950);

        const distanceMeters = payload.summary?.distance_meters;
        const durationSeconds = payload.summary?.duration_seconds;

        const parts = [];
        if (typeof distanceMeters === 'number') {
            parts.push(`${(distanceMeters / 1000).toFixed(2)} km`);
        }
        if (typeof durationSeconds === 'number') {
            parts.push(`${Math.round(durationSeconds / 60)} min`);
        }

        showTooltip(
            parts.length
                ? `Route ready: ${parts.join(' • ')}. Tap route again to clear.`
                : 'Route ready. Tap route again to clear.'
        );

        routingArmed = false;
        setRoutingButtonState();
        window.setTimeout(hideTooltip, 2600);
    } catch (error) {
        console.error('Routing error:', error);
        showTooltip(error.message || 'Unable to build route.', true);
    } finally {
        routeRequestInFlight = false;
        setRoutingButtonState();
    }
}

async function handleMapClick(event) {
    if (!routingArmed || routeRequestInFlight) return;

    await buildRouteTo({
        lng: event.lngLat.lng,
        lat: event.lngLat.lat
    });
}

function armRouting() {
    routingArmed = !routingArmed;
    setRoutingButtonState();

    if (routingArmed) {
        showTooltip('Click the map to choose a destination.');
    } else {
        hideTooltip();
    }
}

function bindCursorBehavior() {
    const setPointer = () => {
        map.getCanvas().style.cursor = 'pointer';
    };

    const clearPointer = () => {
        if (!routingArmed) {
            map.getCanvas().style.cursor = '';
        }
    };

    map.on('mouseenter', ROUTE_HIT_AREA_ID, setPointer);
    map.on('mouseleave', ROUTE_HIT_AREA_ID, clearPointer);
}

function initRoutingWidget() {
    const btn = document.getElementById('widget-route');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (hasActiveRoute()) {
            clearRoute();
            routingArmed = false;
            hideTooltip();
            setRoutingButtonState();
            showTooltip('Route cleared.');
            window.setTimeout(hideTooltip, 1800);
            return;
        }

        armRouting();
    });

    map.on('click', handleMapClick);
    ensureRouteLayers();
    bindCursorBehavior();
    setRoutingButtonState();
}

window.zooClearRoute = clearRoute;
window.zooBuildRouteTo = buildRouteTo;

if (map.loaded()) {
    initRoutingWidget();
} else {
    map.on('load', initRoutingWidget);
}