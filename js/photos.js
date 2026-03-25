const uploadBtn = document.getElementById('uploadPhotoBtn');
const photoInput = document.getElementById('zooPhotoInput');
const statusEl = document.getElementById('zooPhotoStatus');
const map = window.zooMap;

const API_BASE = 'https://euwzj2bjm2.execute-api.us-east-1.amazonaws.com';
const UPLOAD_URL_ROUTE = `${API_BASE}/zoo-photos/upload-url`;
const METADATA_ROUTE = `${API_BASE}/zoo-photos/metadata`;

/*
    Set this to the route that returns your saved photo metadata records.
    Expected response examples:
    - [{ photo_id, filename, s3_url, lat, lon, uploaded_at, source }]
    - { items: [...] }
*/
const PHOTO_POINTS_ROUTE = `${API_BASE}/zoo-photos`;

const PHOTO_SOURCE_ID = 'zoo-photo-points';
const PHOTO_LAYER_ID = 'zoo-photo-points-layer';

let photoLayerEnabled = false;
let photoInteractionBound = false;

function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function closeActivePopup() {
    if (typeof window.zooCloseActivePopup === 'function') {
        window.zooCloseActivePopup();
    }
}

function setActivePopup(popup) {
    if (typeof window.zooSetActivePopup === 'function') {
        window.zooSetActivePopup(popup);
    }
}

function getDeviceLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported on this device.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

async function getExifCoordinates(file) {
    if (!window.exifr) return null;

    try {
        const gps = await window.exifr.gps(file);
        if (!gps) return null;

        if (
            typeof gps.latitude === 'number' &&
            typeof gps.longitude === 'number'
        ) {
            return {
                lat: gps.latitude,
                lon: gps.longitude,
                source: 'exif'
            };
        }

        return null;
    } catch (err) {
        console.warn('EXIF read failed:', err);
        return null;
    }
}

function sanitizeFilename(name) {
    const cleaned = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9.\-_]/g, '');

    return cleaned || `photo-${Date.now()}.jpg`;
}

async function requestUploadUrl(file) {
    const payload = {
        filename: sanitizeFilename(file.name),
        contentType: file.type || 'image/jpeg'
    };

    const response = await fetch(UPLOAD_URL_ROUTE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload URL request failed: ${response.status} ${text}`);
    }

    return response.json();
}

async function uploadToS3(uploadUrl, file) {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type || 'image/jpeg'
        },
        body: file
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`S3 upload failed: ${response.status} ${text}`);
    }
}

async function saveMetadata(record) {
    const response = await fetch(METADATA_ROUTE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Metadata save failed: ${response.status} ${text}`);
    }

    return response.json();
}

async function fetchPhotoRecords() {
    const response = await fetch(PHOTO_POINTS_ROUTE, {
        method: 'GET'
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Photo fetch failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log('PHOTO GET RAW RESPONSE:', data);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.photos)) return data.photos;
    if (Array.isArray(data.body)) return data.body;

    if (typeof data.body === 'string') {
        try {
            const parsed = JSON.parse(data.body);
            if (Array.isArray(parsed)) return parsed;
            if (Array.isArray(parsed.items)) return parsed.items;
            if (Array.isArray(parsed.photos)) return parsed.photos;
        } catch (err) {
            console.warn('Could not parse string body from photo response:', err);
        }
    }

    console.warn('PHOTO GET RESPONSE DID NOT MATCH EXPECTED SHAPE:', data);
    return [];
}

function unwrapValue(value) {
    if (value == null) return value;

    if (typeof value === 'object') {
        if ('N' in value) return Number(value.N);
        if ('S' in value) return value.S;
    }

    return value;
}

function pickNumber(record, ...keys) {
    for (const key of keys) {
        const raw = unwrapValue(record[key]);
        const num = Number(raw);
        if (Number.isFinite(num)) return num;
    }
    return null;
}

function pickString(record, ...keys) {
    for (const key of keys) {
        const raw = unwrapValue(record[key]);
        if (raw != null && raw !== '') return String(raw);
    }
    return '';
}

function recordsToGeoJson(records) {
    console.log('PHOTO RECORDS BEFORE GEOJSON:', records);

    const features = records
        .map((record, index) => {
            const lat = pickNumber(record, 'lat', 'latitude');
            const lon = pickNumber(record, 'lon', 'lng', 'longitude');

            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                console.warn('Skipping photo record due to bad coords:', index, record);
                return null;
            }

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                properties: {
                    photo_id: pickString(record, 'photo_id', 'id'),
                    filename: pickString(record, 'filename', 'name') || 'Photo',
                    s3_url: pickString(record, 's3_url', 'file_url', 'url'),
                    uploaded_at: pickString(record, 'uploaded_at'),
                    source: pickString(record, 'source'),
                    content_type: pickString(record, 'content_type')
                }
            };
        })
        .filter(Boolean);

    console.log('PHOTO GEOJSON FEATURES:', features);

    return {
        type: 'FeatureCollection',
        features
    };
}

function ensurePhotoSourceAndLayer() {
    if (!map.getSource(PHOTO_SOURCE_ID)) {
        map.addSource(PHOTO_SOURCE_ID, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });
    }

    if (!map.getLayer(PHOTO_LAYER_ID)) {
        map.addLayer(
            {
                id: PHOTO_LAYER_ID,
                type: 'circle',
                source: PHOTO_SOURCE_ID,
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        14, 8,
                        18, 14
                    ],
                    'circle-color': '#fffc4da0',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffffc2',
                    'circle-opacity': 1,
                    'circle-stroke-opacity': 1
                }
            },
            'buildings'
        );
    }
}

function buildPhotoPopupHtml(feature) {
    const props = feature.properties || {};
    const imageUrl = escapeHtml(props.s3_url || '');
    const filename = escapeHtml(props.filename || 'Photo');
    const uploadedAt = props.uploaded_at
        ? new Date(props.uploaded_at).toLocaleString()
        : '';
    const uploadedAtSafe = escapeHtml(uploadedAt);
    const sourceSafe = escapeHtml(props.source || '');

    return `
        <div class="zoo-photo-popup">
            <div class="zoo-photo-popup-title">${filename}</div>
            ${imageUrl ? `<img class="zoo-photo-popup-img" src="${imageUrl}" alt="${filename}">` : ''}
            <div class="zoo-photo-popup-meta">
                ${uploadedAtSafe ? `<div><strong>Uploaded:</strong> ${uploadedAtSafe}</div>` : ''}
                ${sourceSafe ? `<div><strong>Location source:</strong> ${sourceSafe}</div>` : ''}
            </div>
        </div>
    `;
}

function bindPhotoInteractions() {
    if (photoInteractionBound) return;
    photoInteractionBound = true;

    map.on('click', PHOTO_LAYER_ID, (e) => {
        const feature = e.features && e.features[0];
        if (!feature) return;

        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            className: 'cartoon-popup zoo-photo-map-popup',
            offset: 16,
            maxWidth: '320px'
        })
            .setLngLat(e.lngLat)
            .setHTML(buildPhotoPopupHtml(feature))
            .addTo(map);

        setActivePopup(popup);
    });

    map.on('mouseenter', PHOTO_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', PHOTO_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
    });

    map.on('dragstart', closeActivePopup);
    map.on('zoomstart', closeActivePopup);
    map.on('rotatestart', closeActivePopup);
    map.on('pitchstart', closeActivePopup);
}

async function loadPhotoPoints() {
    ensurePhotoSourceAndLayer();
    bindPhotoInteractions();

    const records = await fetchPhotoRecords();
    console.log('PHOTO RECORD COUNT:', records.length);

    const geojson = recordsToGeoJson(records);
    console.log('PHOTO FEATURE COUNT:', geojson.features.length);
    console.log('PHOTO GEOJSON:', geojson);

    const source = map.getSource(PHOTO_SOURCE_ID);
    if (source) {
        source.setData(geojson);
    }

    if (map.getLayer(PHOTO_LAYER_ID)) {
        console.log(
            'PHOTO LAYER VISIBILITY:',
            map.getLayoutProperty(PHOTO_LAYER_ID, 'visibility')
        );
    }
}

async function reloadPhotoPoints() {
    try {
        await loadPhotoPoints();
    } catch (err) {
        console.error('Photo layer refresh failed:', err);
    }
}

function setPhotoLayerVisibility(isVisible) {
    photoLayerEnabled = Boolean(isVisible);

    if (map.getLayer(PHOTO_LAYER_ID)) {
        map.setLayoutProperty(
            PHOTO_LAYER_ID,
            'visibility',
            photoLayerEnabled ? 'visible' : 'none'
        );
    }

    closeActivePopup();

    window.dispatchEvent(new CustomEvent('zoo:photo-visibility-changed'));
}

async function togglePhotoLayer() {
    if (!map.loaded()) return;

    if (!map.getSource(PHOTO_SOURCE_ID) || !map.getLayer(PHOTO_LAYER_ID)) {
        await loadPhotoPoints();
        setPhotoLayerVisibility(true);
        return;
    }

    setPhotoLayerVisibility(!photoLayerEnabled);

    if (photoLayerEnabled) {
        await reloadPhotoPoints();
    }
}

function isPhotoLayerVisible() {
    return photoLayerEnabled;
}

window.zooTogglePhotoLayer = togglePhotoLayer;
window.zooPhotoLayerVisible = isPhotoLayerVisible;
window.zooReloadPhotoPoints = reloadPhotoPoints;

async function handleSelectedFile(file) {
    if (!file) return;

    uploadBtn.disabled = true;
    closeActivePopup();

    try {
        setStatus('Getting device location...');
        let deviceCoords = null;

        try {
            deviceCoords = await getDeviceLocation();
        } catch (err) {
            console.warn('Device geolocation unavailable:', err);
        }

        setStatus('Scanning photo EXIF...');
        const exifCoords = await getExifCoordinates(file);

        const finalCoords = exifCoords || deviceCoords;

        if (!finalCoords) {
            throw new Error('No EXIF GPS found and device location was unavailable.');
        }

        const coordSource = exifCoords ? 'exif' : 'device';

        setStatus('Requesting upload URL...');
        const uploadInfo = await requestUploadUrl(file);

        setStatus('Uploading photo...');
        await uploadToS3(uploadInfo.uploadUrl, file);

        setStatus('Saving metadata...');
        await saveMetadata({
            photo_id: uploadInfo.photoId,
            filename: file.name,
            s3_key: uploadInfo.s3Key,
            s3_url: uploadInfo.fileUrl,
            lat: finalCoords.lat,
            lon: finalCoords.lon,
            source: coordSource,
            content_type: file.type || 'image/jpeg',
            uploaded_at: new Date().toISOString()
        });

        await reloadPhotoPoints();
        //setPhotoLayerVisibility(true);
        setStatus('Photo uploaded successfully.');
    } catch (err) {
        console.error(err);
        setStatus(`Upload failed: ${err.message}`);
    } finally {
        uploadBtn.disabled = false;
        photoInput.value = '';
    }
}

if (uploadBtn && photoInput) {
    uploadBtn.addEventListener('click', () => {
        closeActivePopup();
        setStatus('Choose a photo to upload.');
        photoInput.click();
    });

    photoInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleSelectedFile(file);
        }
    });
}

if (map.loaded()) {
    reloadPhotoPoints();
} else {
    map.on('load', () => {
        reloadPhotoPoints();
    });
}