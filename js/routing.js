const map = window.zooMap;

if (!map) {
    throw new Error('window.zooMap is not available. Make sure routing.js loads after the map is created.');
}

const ROUTE_SOURCE_ID = 'zoo-route-source';
const ROUTE_LINE_ID = 'zoo-route-line';
const ROUTE_GLOW_ID = 'zoo-route-glow';
const ROUTE_DEST_ID = 'zoo-route-destination';
const ROUTE_HIT_AREA_ID = 'zoo-route-hit-area';
const ZOO_BOUNDARY_GEOJSON_URL = './geojson/zoo_boundary.geojson';
const ROUTE_API_URL = 'https://euwzj2bjm2.execute-api.us-east-1.amazonaws.com/route';

let routingArmed = false;
let routeRequestInFlight = false;
let userLocationMarker = null;
let destinationMarker = null;
let tooltipEl = null;
let routeActive = false;
let zooBoundaryCache = null;

async function loadZooBoundary() {
    if (zooBoundaryCache) return zooBoundaryCache;

    const response = await fetch(ZOO_BOUNDARY_GEOJSON_URL, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error(`Failed to load zoo_boundary.geojson (${response.status})`);
    }

    const geojson = await response.json();
    zooBoundaryCache = geojson.features || [];

    return zooBoundaryCache;
}

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
                'line-opacity': 0.5,
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
                'line-dasharray': [
                    'match',
                    ['get', 'mode'],
                    'walking', ['literal', [0.6, 1.4]],
                    ['literal', [1, 0]]
                ],
                'line-opacity': 0.8
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

async function requestRoute(startLngLat, endLngLat, profile = 'foot-walking') {
    const response = await fetch(ROUTE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            profile,
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

const LABELS_GEOJSON_URL = './geojson/labels.geojson';

let parkingFeaturesCache = null;

function normalizeAmenityType(value) {
    return String(value || '')
        .toLowerCase()
        .trim();
}

function getRouteLineFeature(routeGeojson) {
    return routeGeojson?.features?.find(
        (feature) => feature.geometry?.type === 'LineString'
    ) || null;
}

function distanceSq(a, b) {
    const dx = a.lng - b.lng;
    const dy = a.lat - b.lat;
    return dx * dx + dy * dy;
}

async function loadParkingFeatures() {
    if (parkingFeaturesCache) return parkingFeaturesCache;

    const response = await fetch(LABELS_GEOJSON_URL, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to load labels.geojson (${response.status})`);
    }

    const geojson = await response.json();
    const features = Array.isArray(geojson.features) ? geojson.features : [];

    parkingFeaturesCache = features.filter((feature) => {
        if (!feature || feature.geometry?.type !== 'Point') return false;

        const typeValue = String(feature.properties?.type || '')
            .toLowerCase()
            .split(',')
            .map(part => part.trim());

        return typeValue.includes('parking');
    });

    return parkingFeaturesCache;
}

function pointInRing(point, ring) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];

        const intersect =
            ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

function pointInPolygon(point, polygonCoords) {
    if (!polygonCoords?.length) return false;

    const outerRing = polygonCoords[0];
    if (!pointInRing(point, outerRing)) return false;

    for (let i = 1; i < polygonCoords.length; i++) {
        if (pointInRing(point, polygonCoords[i])) return false;
    }

    return true;
}

function isPointInsideGeometry(point, geometry) {
    if (!geometry) return false;

    if (geometry.type === 'Polygon') {
        return pointInPolygon(point, geometry.coordinates);
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygonCoords) =>
            pointInPolygon(point, polygonCoords)
        );
    }

    return false;
}

async function isUserInsideZooBoundary(userLngLat) {
    const features = await loadZooBoundary();

    const point = [userLngLat.lng, userLngLat.lat];

    return features.some((feature) =>
        isPointInsideGeometry(point, feature.geometry)
    );
}

async function getNearestParkingToDestination(destinationLngLat) {
    const parkingFeatures = await loadParkingFeatures();

    const candidates = parkingFeatures
        .map((feature) => {
            const coords = feature.geometry?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return null;

            return {
                lng: coords[0],
                lat: coords[1],
                feature
            };
        })
        .filter(Boolean);

    if (!candidates.length) {
        throw new Error('No parking points were found in labels.geojson.');
    }

    let nearest = candidates[0];
    let bestDist = distanceSq(destinationLngLat, nearest);

    for (let i = 1; i < candidates.length; i++) {
        const dist = distanceSq(destinationLngLat, candidates[i]);
        if (dist < bestDist) {
            bestDist = dist;
            nearest = candidates[i];
        }
    }

    return nearest;
}

function tagRouteFeatures(routeGeojson, mode) {
    return (routeGeojson.features || []).map((feature) => ({
        ...feature,
        properties: {
            ...(feature.properties || {}),
            mode
        }
    }));
}

function mergeRoutes(drivingPayload, walkingPayload) {
    return {
        type: 'FeatureCollection',
        features: [
            ...tagRouteFeatures(drivingPayload.route, 'driving'),
            ...tagRouteFeatures(walkingPayload.route, 'walking')
        ]
    };
}

function getCombinedSummary(drivingPayload, walkingPayload) {
    return {
        distance_meters:
            (drivingPayload.summary?.distance_meters || 0) +
            (walkingPayload.summary?.distance_meters || 0),
        duration_seconds:
            (drivingPayload.summary?.duration_seconds || 0) +
            (walkingPayload.summary?.duration_seconds || 0)
    };
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

        let routeGeojson;
        let summary;
        let tooltipMessage = '';

        const userInsideZoo = await isUserInsideZooBoundary(startLngLat);

        if (userInsideZoo) {
            const walkingPayload = await requestRoute(
                startLngLat,
                endLngLat,
                'foot-walking'
            );

            routeGeojson = {
                type: 'FeatureCollection',
                features: tagRouteFeatures(walkingPayload.route, 'walking')
            };

            summary = walkingPayload.summary || {};
            tooltipMessage = 'Walking route ready.';
        } else {
            const parkingLngLat = await getNearestParkingToDestination(endLngLat);

            const drivingPayload = await requestRoute(
                startLngLat,
                parkingLngLat,
                'driving-car'
            );

            const walkingPayload = await requestRoute(
                parkingLngLat,
                endLngLat,
                'foot-walking'
            );

            routeGeojson = mergeRoutes(drivingPayload, walkingPayload);
            summary = getCombinedSummary(drivingPayload, walkingPayload);

            tooltipMessage = 'Drive to parking, then walk to destination.';
        }

        ensureRouteLayers();
        map.getSource(ROUTE_SOURCE_ID).setData(routeGeojson);
        routeActive = true;
        fitRoute(routeGeojson);

        const distanceMeters = summary?.distance_meters;
        const durationSeconds = summary?.duration_seconds;

        const parts = [];
        if (typeof distanceMeters === 'number' && distanceMeters > 0) {
            parts.push(`${(distanceMeters / 1000).toFixed(2)} km`);
        }
        if (typeof durationSeconds === 'number' && durationSeconds > 0) {
            parts.push(`${Math.round(durationSeconds / 60)} min`);
        }

        showTooltip(
            parts.length
                ? `${tooltipMessage} ${parts.join(' • ')}. Tap route again to clear.`
                : `${tooltipMessage} Tap route again to clear.`
        );

        routingArmed = false;
        setRoutingButtonState();
        window.setTimeout(hideTooltip, 3200);
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