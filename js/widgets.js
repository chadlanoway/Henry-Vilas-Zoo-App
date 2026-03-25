const map = window.zooMap;

if (!map) {
    throw new Error('window.zooMap is not available. Make sure widgets.js loads after the map is created.');
}

const DEFAULT_VIEW = {
    center: [-89.41296024079732, 43.059350084177574],
    zoom: 16,
    pitch: 35,
    bearing: 0
};

const BASEMAP_LAYERS = {
    dark: 'osm-base',
    light: 'osm-light',
    lightNoLabels: 'osm-light-nolabels',
    topo: 'osm-topo'
};

let userLocationMarker = null;
let activeBasemap = 'dark';

function closeActivePopup() {
    if (typeof window.zooCloseActivePopup === 'function') {
        window.zooCloseActivePopup();
    }
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

function flyToUserLocation() {
    closeActivePopup();

    if (!navigator.geolocation) {
        alert('Geolocation is not supported in this browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;
            const accuracy = position.coords.accuracy;

            console.log('User location:', { lat, lng, accuracy });

            if (!userLocationMarker) {
                userLocationMarker = createUserLocationMarker();
            }

            userLocationMarker
                .setLngLat([lng, lat])
                .addTo(map);

            map.easeTo({
                center: [lng, lat],
                zoom: 17,
                pitch: 35,
                bearing: map.getBearing(),
                duration: 1200
            });
        },
        (error) => {
            let message = 'Unable to get your location.';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Location access was denied.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'Location information is unavailable.';
            } else if (error.code === error.TIMEOUT) {
                message = 'Location request timed out.';
            }
            alert(message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function setBasemap(basemapKey) {
    closeActivePopup();

    Object.entries(BASEMAP_LAYERS).forEach(([key, layerId]) => {
        if (!map.getLayer(layerId)) return;

        map.setLayoutProperty(
            layerId,
            'visibility',
            key === basemapKey ? 'visible' : 'none'
        );
    });

    activeBasemap = basemapKey;
    updateBasemapUi();
}

function updateBasemapUi() {
    const menu = document.getElementById('zoo-basemap-menu');
    if (!menu) return;

    const buttons = menu.querySelectorAll('.zoo-basemap-option');
    buttons.forEach((btn) => {
        const isActive = btn.dataset.basemap === activeBasemap;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function updatePhotoToggleUi() {
    const btn = document.getElementById('widget-photos');
    if (!btn) return;

    const isActive = typeof window.zooPhotoLayerVisible === 'function'
        ? window.zooPhotoLayerVisible()
        : false;

    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
}

function toggleBasemapMenu() {
    const menu = document.getElementById('zoo-basemap-menu');
    const btn = document.getElementById('widget-basemap');

    if (!menu || !btn) return;

    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
}

function closeBasemapMenu() {
    const menu = document.getElementById('zoo-basemap-menu');
    const btn = document.getElementById('widget-basemap');

    if (!menu || !btn) return;

    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
}

function buildWidgets() {
    if (document.getElementById('zoo-widgets')) return;

    const wrap = document.createElement('div');
    wrap.id = 'zoo-widgets';
    wrap.className = 'zoo-widgets';

    wrap.innerHTML = `
        <button class="zoo-widget-btn" type="button" id="widget-zoom-in" aria-label="Zoom in" title="Zoom in">
            +
        </button>

        <button class="zoo-widget-btn" type="button" id="widget-zoom-out" aria-label="Zoom out" title="Zoom out">
            −
        </button>

        <button class="zoo-widget-btn" type="button" id="widget-locate" aria-label="Locate me" title="Locate me">
            ⦿
        </button>

        <button class="zoo-widget-btn" type="button" id="widget-compass" aria-label="Reset north" title="Reset north">
            ⟳
        </button>

        <button class="zoo-widget-btn" type="button" id="widget-route" aria-label="Route to clicked location" title="Route to clicked location" aria-pressed="false">
            <svg class="zoo-widget-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19a3 3 0 1 1 2.83-4H15V9.83A3 3 0 1 1 17 10V17H8.83A3 3 0 0 1 6 19Zm0-2a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
            </svg>
        </button>
        
        <button class="zoo-widget-btn" type="button" id="widget-photos" aria-label="Toggle photo points" title="Toggle photo points" aria-pressed="false">
            <svg class="zoo-widget-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 6.5h2.1l1.1-1.7c.2-.3.5-.5.9-.5h1.8c.4 0 .7.2.9.5L15 6.5h2A3 3 0 0 1 20 9.5v7A3 3 0 0 1 17 19.5H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Zm5 9.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm0-1.8a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z"/>
            </svg>
        </button>

        <button class="zoo-widget-btn" type="button" id="widget-basemap" aria-label="Change basemap" title="Change basemap" aria-expanded="false">
            <svg class="zoo-widget-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20V6.5Zm6 10.2 5 1.8V7.3L9 5.5v11.2Zm-4 .8 2-.9V5.6l-2 .9v10.2Zm11-9.9v11l3-1.3V6.3l-3 1.3Z" />
            </svg>
        </button>

        <div class="zoo-basemap-menu" id="zoo-basemap-menu" aria-label="Basemap options">
            <button class="zoo-basemap-option active" type="button" data-basemap="dark" aria-pressed="true">
                Dark
            </button>
            <button class="zoo-basemap-option" type="button" data-basemap="light" aria-pressed="false">
                Light
            </button>
            <button class="zoo-basemap-option" type="button" data-basemap="lightNoLabels" aria-pressed="false">
                Light No Labels
            </button>
            <button class="zoo-basemap-option" type="button" data-basemap="topo" aria-pressed="false">
                Topo
            </button>
        </div>

        <button class="zoo-widget-btn zoo-widget-btn-reset" type="button" id="widget-reset-view" aria-label="Reset view" title="Reset view">
            🏠
        </button>
    `;

    document.body.appendChild(wrap);

    const zoomInBtn = document.getElementById('widget-zoom-in');
    const zoomOutBtn = document.getElementById('widget-zoom-out');
    const locateBtn = document.getElementById('widget-locate');
    const compassBtn = document.getElementById('widget-compass');
    const photosBtn = document.getElementById('widget-photos');
    const basemapBtn = document.getElementById('widget-basemap');
    const resetBtn = document.getElementById('widget-reset-view');
    const basemapMenu = document.getElementById('zoo-basemap-menu');

    zoomInBtn.addEventListener('click', () => {
        closeActivePopup();
        map.zoomTo(map.getZoom() + 1, { duration: 300 });
    });

    zoomOutBtn.addEventListener('click', () => {
        closeActivePopup();
        map.zoomTo(map.getZoom() - 1, { duration: 300 });
    });

    locateBtn.addEventListener('click', () => {
        flyToUserLocation();
    });

    compassBtn.addEventListener('click', () => {
        closeActivePopup();
        map.easeTo({
            bearing: 0,
            duration: 500
        });
    });

    photosBtn.addEventListener('click', async () => {
        closeActivePopup();

        if (typeof window.zooTogglePhotoLayer === 'function') {
            await window.zooTogglePhotoLayer();
            updatePhotoToggleUi();
        }
    });

    basemapBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleBasemapMenu();
    });

    basemapMenu.addEventListener('click', (event) => {
        const option = event.target.closest('.zoo-basemap-option');
        if (!option) return;

        const basemapKey = option.dataset.basemap;
        if (!basemapKey) return;

        setBasemap(basemapKey);
        closeBasemapMenu();
    });

    document.addEventListener('click', (event) => {
        if (!wrap.contains(event.target)) {
            closeBasemapMenu();
        }
    });

    resetBtn.addEventListener('click', () => {
        closeActivePopup();
        map.easeTo({
            center: DEFAULT_VIEW.center,
            zoom: DEFAULT_VIEW.zoom,
            pitch: DEFAULT_VIEW.pitch,
            bearing: DEFAULT_VIEW.bearing,
            duration: 900
        });
    });

    const updateCompassState = () => {
        const bearing = map.getBearing();
        compassBtn.style.transform = `rotate(${-bearing}deg)`;
    };

    map.on('rotate', updateCompassState);
    updateCompassState();
    updateBasemapUi();

    window.addEventListener('zoo:photo-visibility-changed', updatePhotoToggleUi);
    updatePhotoToggleUi();
}

if (map.loaded()) {
    buildWidgets();
} else {
    map.on('load', buildWidgets);
}