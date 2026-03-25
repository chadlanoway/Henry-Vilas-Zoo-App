const map = window.zooMap;

if (!map) {
    throw new Error('window.zooMap is not available. Make sure animals.js loads after the map is created.');
}

/*
    Manual animal lookup table.
    Fill this in as you go.

    key = text shown in dropdown
    layer = source-layer name in the vector tiles
    matchField = attribute field in that layer to match against
    matchValue = exact value to search for
*/
const ANIMAL_LOOKUP = [
    { name: 'African Lions', layer: 'enclosures', matchField: 'type', matchValue: 'lion' },
    { name: 'White Rhinoceros', layer: 'enclosures', matchField: 'type', matchValue: 'rhinoceros' },
    { name: 'Giraffe', layer: 'enclosures', matchField: 'type', matchValue: 'giraffe' },
    { name: 'Aldabra Tortoise', layer: 'enclosures', matchField: 'type', matchValue: 'tortoise' },
    { name: 'Snapping Turtle', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Leopard Gecko', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Desert Tortoise', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Rattlesnake', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Giant African Millipede', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Gila Monster', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Golfodulcean Poison Dart Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Green Anaconda', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Green & Black Poison Dart Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Lemur Leaf Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Madagascar Hissing Cockroach', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Monarch Butterfly', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Ornate Box Turtle', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Piranha', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Red-Eye Leaf Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Reticulated Glass Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Sebsas Short Tailed Bat', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Standings Day Gecko', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Yellow & Blue Poison Dart Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Yellow-Banded Poison Dart Frog', layer: 'buildings', matchField: 'name', matchValue: 'Discovery Center and Herpetarium' },
    { name: 'Blue & Yellow Macaw', layer: 'buildings', matchField: 'name', matchValue: 'Tropical Rainforest Aviary' },
    { name: 'Blue Crowned Motmot', layer: 'buildings', matchField: 'name', matchValue: 'Tropical Rainforest Aviary' },
    { name: 'Capybara', layer: 'enclosures', matchField: 'type', matchValue: 'capybara' },
    { name: 'River Otters', layer: 'enclosures', matchField: 'type', matchValue: 'river otter' },
    { name: 'Geoffroys Marmosert', layer: 'buildings', matchField: 'name', matchValue: 'Tropical Rainforest Aviary' },
    { name: 'Helmeted Curassow', layer: 'buildings', matchField: 'name', matchValue: 'Tropical Rainforest Aviary' },
    { name: 'White Faced Whistling Duck', layer: 'buildings', matchField: 'name', matchValue: 'Tropical Rainforest Aviary' },
    { name: 'Aardvark', layer: 'buildings', matchField: 'name', matchValue: "children's zoo green barn" },
    { name: 'Meerkat', layer: 'buildings', matchField: 'name', matchValue: "children's zoo green barn" },
    { name: 'Red Panda', layer: 'buildings', matchField: 'name', matchValue: "children's zoo green barn" },
    { name: 'White Handed Gibbon', layer: 'buildings', matchField: 'name', matchValue: "children's zoo green barn" },
    { name: 'American & Chilean Flamingos', layer: 'enclosures', matchField: 'type', matchValue: 'flamingo' },
    { name: 'Alligator', layer: 'enclosures', matchField: 'type', matchValue: 'alligator' },
    { name: 'Alpaca', layer: 'buildings', matchField: 'name', matchValue: 'Savanna and High Plains' },
    { name: 'Bactrian Camel', layer: 'enclosures', matchField: 'type', matchValue: 'camel' },
    { name: 'Somali Wild Ass', layer: 'enclosures', matchField: 'type', matchValue: 'somali wild ass' },
    { name: 'Polar Bears', layer: 'enclosures', matchField: 'type', matchValue: 'polar bear' },
    { name: 'Grizzly Bears', layer: 'enclosures', matchField: 'type', matchValue: 'grizzly bear' },
    { name: 'Harbor Seals', layer: 'enclosures', matchField: 'type', matchValue: 'seals' },
    { name: 'Black & White Ruffed Lemur', layer: 'buildings', matchField: 'name', matchValue: 'primates' },
    { name: 'Bornean Orangutan', layer: 'buildings', matchField: 'name', matchValue: 'primates' },
    { name: 'Ring Tailed Lemur', layer: 'buildings', matchField: 'name', matchValue: 'primates' },
    { name: 'Amure Tigers', layer: 'enclosures', matchField: 'type', matchValue: 'tiger' },
    { name: 'Badgers', layer: 'enclosures', matchField: 'type', matchValue: 'badger' },
    { name: 'Bison', layer: 'enclosures', matchField: 'type', matchValue: 'bison' },
    { name: 'Sandhill Cranes', layer: 'enclosures', matchField: 'type', matchValue: 'sandhill crane' },
    { name: "Children's Zoo Train", layer: 'buildings', matchField: 'name', matchValue: 'zoo train' },
    { name: 'Goat Feeding', layer: 'enclosures', matchField: 'type', matchValue: 'goat feeding' }
];

let animalMarker = null;

function createAnimalMarker() {
    const el = document.createElement('div');
    el.className = 'zoo-animal-marker';

    return new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
    });
}

function ensureAnimalMarker() {
    if (!animalMarker) {
        animalMarker = createAnimalMarker();
    }
    return animalMarker;
}

function clearAnimalMarker() {
    if (animalMarker) {
        animalMarker.remove();
        animalMarker = null;
    }
}

function collapseZooPanel() {
    const panelWrap = document.getElementById('zoo-panel-wrap');
    const panelTab = document.getElementById('zoo-panel-tab');

    if (!panelWrap || !panelTab) return;

    panelWrap.classList.add('collapsed');
    panelTab.setAttribute('aria-expanded', 'false');
}

function getFeatureCenter(feature) {
    const geom = feature.geometry;

    if (!geom) return null;

    if (geom.type === 'Point') {
        return geom.coordinates;
    }

    if (geom.type === 'Polygon') {
        const ring = geom.coordinates?.[0];
        if (!ring || !ring.length) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const coord of ring) {
            const [x, y] = coord;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    if (geom.type === 'MultiPolygon') {
        const firstPoly = geom.coordinates?.[0]?.[0];
        if (!firstPoly || !firstPoly.length) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const coord of firstPoly) {
            const [x, y] = coord;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    return null;
}

function zoomToAnimal(animalConfig) {
    const features = map.querySourceFeatures('zoo', {
        sourceLayer: animalConfig.layer,
        filter: ['==', ['get', animalConfig.matchField], animalConfig.matchValue]
    });

    if (!features.length) {
        console.warn('No matching feature found for:', animalConfig);
        return;
    }

    const feature = features[0];
    const center = getFeatureCenter(feature);

    if (!center) {
        console.warn('Could not determine center for feature:', feature);
        return;
    }

    ensureAnimalMarker()
        .setLngLat(center)
        .addTo(map);

    map.easeTo({
        center,
        zoom: 18,
        pitch: 35,
        bearing: map.getBearing(),
        duration: 1000
    });

    collapseZooPanel();
}

function populateAnimalDropdown() {
    const select = document.getElementById('animalSelect');
    if (!select) return;

    ANIMAL_LOOKUP
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((animal) => {
            const option = document.createElement('option');
            option.value = animal.name;
            option.textContent = animal.name;
            select.appendChild(option);
        });

    select.addEventListener('change', (event) => {
        const selectedName = event.target.value;
        if (!selectedName) return;

        const animalConfig = ANIMAL_LOOKUP.find((item) => item.name === selectedName);
        if (!animalConfig) return;

        zoomToAnimal(animalConfig);
    });
}

function setupAnimalMarkerClear() {
    map.on('click', () => {
        clearAnimalMarker();

        const select = document.getElementById('animalSelect');
        if (select) {
            select.value = '';
        }
    });
}

if (map.loaded()) {
    populateAnimalDropdown();
    setupAnimalMarkerClear();
} else {
    map.on('load', () => {
        populateAnimalDropdown();
        setupAnimalMarkerClear();
    });
}