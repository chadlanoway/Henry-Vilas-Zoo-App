function normalizeAmenityType(value) {
    return String(value || '')
        .toLowerCase()
        .trim();
}

function getAmenityIconName(typeValue) {
    const parts = String(typeValue || '')
        .split(',')
        .map(v => normalizeAmenityType(v))
        .filter(Boolean);

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

    for (const part of parts) {
        if (aliasMap[part]) {
            return aliasMap[part];
        }
    }

    return null;
}

function loadAmenityIcons(map) {
    const iconNames = [
        'picnic',
        'playground',
        'parking',
        'restroom',
        'information',
        'gifts',
        'food',
        'beach',
        'basketball',
        'soccer',
        'tennis'
    ];

    let loadedCount = 0;

    iconNames.forEach((name) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            if (!map.hasImage(name)) {
                map.addImage(name, img);
            }

            loadedCount += 1;

            if (loadedCount === iconNames.length) {
                initAmenityIcons(map);
            }
        };

        img.onerror = () => {
            console.error(`Failed to load icon: ${name}.svg`);
            loadedCount += 1;

            if (loadedCount === iconNames.length) {
                initAmenityIcons(map);
            }
        };

        img.src = `./icons/${name}.svg`;
    });
}

function initAmenityIcons(map) {
    if (map.getLayer('amenity-icons')) return;

    map.addLayer({
        id: 'amenity-icons',
        type: 'symbol',
        source: 'zoo',
        'source-layer': 'labels',
        minzoom: 12,
        layout: {
            'icon-image': [
                'match',
                ['slice', ['downcase', ['get', 'type']], 0, 999],

                'picnic', 'picnic',
                'picnic site', 'picnic',

                'playground', 'playground',

                'parking', 'parking',

                'restroom', 'restroom',
                'restrooms', 'restroom',
                'toilet', 'restroom',
                'toilets', 'restroom',

                'information', 'information',
                'info', 'information',

                'gifts', 'gifts',
                'gift', 'gifts',
                'gift shop', 'gifts',

                'food', 'food',
                'restaurant', 'food',
                'concessions', 'food',

                'beach', 'beach',

                'basketball', 'basketball',
                'basketball court', 'basketball',

                'soccer', 'soccer',
                'soccer field', 'soccer',

                'tennis', 'tennis',
                'tennis court', 'tennis',
                'tennis courts', 'tennis',

                // fallback for non-exact matches / multi-value rows
                [
                    'case',
                    ['>=', ['index-of', 'picnic', ['downcase', ['get', 'type']]], 0], 'picnic',
                    ['>=', ['index-of', 'playground', ['downcase', ['get', 'type']]], 0], 'playground',
                    ['>=', ['index-of', 'parking', ['downcase', ['get', 'type']]], 0], 'parking',
                    ['>=', ['index-of', 'restroom', ['downcase', ['get', 'type']]], 0], 'restroom',
                    ['>=', ['index-of', 'restrooms', ['downcase', ['get', 'type']]], 0], 'restroom',
                    ['>=', ['index-of', 'information', ['downcase', ['get', 'type']]], 0], 'information',
                    ['>=', ['index-of', 'info', ['downcase', ['get', 'type']]], 0], 'information',
                    ['>=', ['index-of', 'gift', ['downcase', ['get', 'type']]], 0], 'gifts',
                    ['>=', ['index-of', 'food', ['downcase', ['get', 'type']]], 0], 'food',
                    ['>=', ['index-of', 'concession', ['downcase', ['get', 'type']]], 0], 'food',
                    ['>=', ['index-of', 'beach', ['downcase', ['get', 'type']]], 0], 'beach',
                    ['>=', ['index-of', 'basketball', ['downcase', ['get', 'type']]], 0], 'basketball',
                    ['>=', ['index-of', 'soccer', ['downcase', ['get', 'type']]], 0], 'soccer',
                    ['>=', ['index-of', 'tennis', ['downcase', ['get', 'type']]], 0], 'tennis',
                    'information'
                ]
            ],

            'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0.55,
                16, 0.75,
                18, 1.0
            ],

            'icon-anchor': 'center',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
        }
    });

    map.moveLayer('amenity-icons');
}

function initWaterLabels(map) {
    if (map.getLayer('water-labels')) return;

    map.addLayer({
        id: 'water-labels',
        type: 'symbol',
        source: 'zoo',
        'source-layer': 'water_labels',
        minzoom: 10,
        layout: {
            'text-field': ['get', 'id'],
            'text-font': ['Open Sans Italic', 'Arial Unicode MS Regular'],
            'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 10,
                18, 16
            ],
            'text-anchor': 'center',
            'text-justify': 'center',
            'text-offset': [0, 0],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-padding': 2
        },
        paint: {
            'text-color': '#2c6e91',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
            'text-halo-blur': 0.5,
            'text-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0,
                15, 1
            ]
        }
    });
}

function initEnclosureLabels(map) {
    if (map.getLayer('enclosure-labels')) return;

    map.addLayer({
        id: 'enclosure-labels',
        type: 'symbol',
        source: 'zoo',
        'source-layer': 'enclosure_labels',
        minzoom: 16.1,
        layout: {
            'text-field': ['get', 'id'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 11,
                16, 14,
                18, 18
            ],
            'text-anchor': 'center',
            'text-justify': 'center',
            'text-offset': [0, 0.2],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-padding': 2
        },
        paint: {
            'text-color': '#31463a',
            'text-halo-color': '#f7f5ea',
            'text-halo-width': 2,
            'text-halo-blur': 0.5,
            'text-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0,
                15, 1
            ]
        }
    });

    map.moveLayer('enclosure-labels');
}

function waitForMap() {
    const map = window.zooMap;

    if (!map) {
        setTimeout(waitForMap, 50);
        return;
    }

    const initAll = () => {
        initEnclosureLabels(map);
        initWaterLabels(map);
        loadAmenityIcons(map);

        if (map.getLayer('water-labels')) {
            map.moveLayer('water-labels');
        }
        if (map.getLayer('amenity-icons')) {
            map.moveLayer('amenity-icons');
        }
    };

    if (map.isStyleLoaded()) {
        initAll();
    } else {
        map.once('load', initAll);
    }
}

waitForMap();