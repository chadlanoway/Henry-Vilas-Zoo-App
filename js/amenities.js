(function () {
    const LABELS_GEOJSON_URL = './geojson/labels.geojson';

    let amenityFeaturesCache = [];

    function getAmenityAliases(value) {
        if (!value) return [];

        const aliasMap = {
            'picnic': 'picnic',
            'picnic site': 'picnic',
            'playground': 'playground',
            'parking': 'parking',
            'restroom': 'restroom',
            'restrooms': 'restroom',
            'toilet': 'restroom',
            'toilets': 'restroom',
            'information': 'information',
            'info': 'information',
            'gifts': 'gifts',
            'gift': 'gifts',
            'gift shop': 'gifts',
            'food': 'food',
            'restaurant': 'food',
            'concessions': 'food',
            'beach': 'beach',
            'basketball': 'basketball',
            'basketball court': 'basketball',
            'soccer': 'soccer',
            'soccer field': 'soccer',
            'tennis': 'tennis',
            'tennis court': 'tennis',
            'tennis courts': 'tennis'
        };

        return [...new Set(
            String(value)
                .toLowerCase()
                .split(',')
                .map(part => part.trim())
                .filter(Boolean)
                .map(part => aliasMap[part])
                .filter(Boolean)
        )];
    }

    async function loadAmenityFeatures() {
        const response = await fetch(LABELS_GEOJSON_URL, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Failed to load labels.geojson (${response.status})`);
        }

        const geojson = await response.json();
        const features = Array.isArray(geojson.features) ? geojson.features : [];

        amenityFeaturesCache = features.filter((feature) => {
            if (!feature || feature.geometry?.type !== 'Point') return false;
            const typeValue = feature.properties?.type || '';
            return getAmenityAliases(typeValue).length > 0;
        });

        console.log('Loaded amenity features:', amenityFeaturesCache.length);
    }

    function getFeatureLngLat(feature) {
        const coords = feature?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;

        return {
            lng: coords[0],
            lat: coords[1]
        };
    }

    function distanceSq(a, b) {
        const dx = a.lng - b.lng;
        const dy = a.lat - b.lat;
        return dx * dx + dy * dy;
    }

    function getDeviceLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lng: position.coords.longitude,
                        lat: position.coords.latitude
                    });
                },
                (error) => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    async function routeToNearestAmenity(selectedAmenity) {
        if (!selectedAmenity) return;

        if (!window.zooBuildRouteTo) {
            console.error('zooBuildRouteTo not available');
            return;
        }

        if (!amenityFeaturesCache.length) {
            await loadAmenityFeatures();
        }

        const normalizedSelectedAmenity =
            getAmenityAliases(selectedAmenity)[0] || selectedAmenity;

        const userLoc = await getDeviceLocation();

        const candidates = amenityFeaturesCache
            .map((feature) => ({
                amenityTypes: getAmenityAliases(feature.properties?.type || ''),
                lngLat: getFeatureLngLat(feature),
                rawType: feature.properties?.type || ''
            }))
            .filter((item) =>
                item.lngLat &&
                item.amenityTypes.includes(normalizedSelectedAmenity)
            );

        console.log('Selected amenity:', selectedAmenity);
        console.log('Normalized amenity:', normalizedSelectedAmenity);
        console.log('Candidate count:', candidates.length);
        console.log('Candidate raw types:', candidates.map(c => c.rawType));

        if (!candidates.length) {
            alert(`No ${normalizedSelectedAmenity} found.`);
            return;
        }

        let nearest = candidates[0];
        let bestDist = distanceSq(userLoc, nearest.lngLat);

        for (let i = 1; i < candidates.length; i++) {
            const dist = distanceSq(userLoc, candidates[i].lngLat);
            if (dist < bestDist) {
                bestDist = dist;
                nearest = candidates[i];
            }
        }

        await window.zooBuildRouteTo(nearest.lngLat, userLoc);
    }

    function collapseZooPanel() {
        const panelWrap = document.getElementById('zoo-panel-wrap');
        const panelTab = document.getElementById('zoo-panel-tab');

        if (!panelWrap || !panelTab) return;

        panelWrap.classList.add('collapsed');
        panelTab.setAttribute('aria-expanded', 'false');
    }

    function initAmenitiesSelect() {
        const select = document.getElementById('amenitySelect');
        if (!select) return;

        select.addEventListener('change', async (event) => {
            const amenity = event.target.value;
            if (!amenity) return;

            try {
                await routeToNearestAmenity(amenity);
                collapseZooPanel();
            } catch (err) {
                console.error(err);
                alert(err.message || 'Routing failed.');
            }
        });
    }

    function init() {
        if (!window.zooMap) {
            console.error('zooMap not ready yet');
            return;
        }

        loadAmenityFeatures().then(() => {
            initAmenitiesSelect();
        }).catch((err) => {
            console.error('Amenities init failed:', err);
        });
    }

    if (window.zooMap && window.zooMap.loaded()) {
        init();
    } else {
        const check = setInterval(() => {
            if (window.zooMap && window.zooMap.loaded()) {
                clearInterval(check);
                init();
            }
        }, 50);
    }
})();