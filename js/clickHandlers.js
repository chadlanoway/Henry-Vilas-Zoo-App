
const initialView = {
    center: [-89.41296024079732, 43.059350084177574],
    zoom: 15.75,
    pitch: 35,
    bearing: 0
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function closeZooPopup() {
    if (window.zooActivePopup) {
        window.zooActivePopup.remove();
        window.zooActivePopup = null;
    }
}

function setZooPopup(popup) {
    closeZooPopup();
    window.zooActivePopup = popup;

    popup.on('close', () => {
        if (window.zooActivePopup === popup) {
            window.zooActivePopup = null;
        }
    });

    return popup;
}

window.zooCloseActivePopup = closeZooPopup;
window.zooSetActivePopup = setZooPopup;

/////  BUILDING POP UPS  /////
function toTitleCase(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function buildExhibitPopupHtml(feature) {
    const props = feature.properties || {};
    const description = props.description ? escapeHtml(props.description) : 'No description available.';
    const name = props.name
        ? escapeHtml(toTitleCase(props.name))
        : 'No name available.';

    return `
        <div class="cartoon-popup-title">${name}</div>
        <div class="cartoon-popup-body">${description}</div>
    `;
}

function initBuildingClickHandlers(map) {
    map.on('click', 'buildings', (e) => {
        const feature = e.features && e.features[0];
        if (!feature) return;

        const props = feature.properties || {};
        const typeValue = String(props.type || '').toLowerCase().trim();

        if (typeValue !== 'exhibit' && typeValue !== 'public') {
            closeZooPopup();
            return;
        }

        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            className: 'cartoon-popup',
            offset: 14
        })
            .setLngLat(e.lngLat)
            .setHTML(buildExhibitPopupHtml(feature))
            .addTo(map);

        setZooPopup(popup);
    });

    map.on('mouseenter', 'buildings', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'buildings', () => {
        map.getCanvas().style.cursor = '';
    });
}

function waitForMap() {
    const map = window.zooMap;

    if (!map) {
        setTimeout(waitForMap, 50);
        return;
    }

    if (map.isStyleLoaded()) {
        initBuildingClickHandlers(map);
    } else {
        map.on('load', () => initBuildingClickHandlers(map));
    }
}

waitForMap();