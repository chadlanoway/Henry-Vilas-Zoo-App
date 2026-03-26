# Henry Vilas Zoo Interactive Map

🚀 **Live Demo:**
https://chadlanoway.github.io/Henry-Vilas-Zoo-App/

---

An interactive web map for Henry Vilas Zoo built with **MapLibre GL JS** and a custom hosted vector tileset. The app is designed for mobile and desktop use and includes animal search, amenity icons, user photo uploads, and simple route generation from the visitor’s current location.

## Live Architecture

This project is split into a lightweight frontend and a few hosted services:

* **Frontend:** GitHub Pages
* **Vector tiles:** TileServer GL hosted on AWS App Runner
* **Photo upload + metadata API:** AWS API Gateway + Lambda + S3 + DynamoDB
* **Routing API:** AWS API Gateway + Lambda

## Features

* Custom zoo basemap using hosted **vector tiles**
* Multiple background basemap options
* 3D buildings and styled zoo layers
* Amenity icons and labels
* Animal finder dropdown that zooms to a selected exhibit
* Photo uploads using EXIF GPS when available, with device location fallback
* Visitor photo points and popups
* Route generation from the user’s current location to a clicked destination
* Mobile-friendly sliding info panel

## Tech Stack

* **Frontend:** HTML, CSS, vanilla JavaScript modules
* **Map library:** MapLibre GL JS
* **Tile hosting:** TileServer GL on AWS App Runner
* **Static hosting:** GitHub Pages
* **Photo storage:** Amazon S3
* **Photo metadata:** DynamoDB
* **API layer:** API Gateway + Lambda

## Project Structure

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── widgets.js
│   ├── clickHandlers.js
│   ├── labels.js
│   ├── animals.js
│   ├── photos.js
│   └── routing.js
└── img/
    ├── henry-vilas-zoo-logo.png
    ├── greenspace.png
    └── icons/
        ├── picnic.svg
        ├── playground.svg
        ├── parking.svg
        ├── restroom.svg
        ├── information.svg
        ├── gifts.svg
        ├── food.svg
        ├── beach.svg
        ├── basketball.svg
        ├── soccer.svg
        └── tennis.svg
```

## How It Works

### Map and Tiles

The app loads a custom vector tileset from a TileServer GL endpoint hosted on AWS App Runner. Raster basemaps are provided separately and can be switched in the interface.

### Animal Finder

The animal dropdown is populated from a lookup list and zooms to the matching exhibit or enclosure feature when selected.

### Photo Uploads

Users can upload a photo from the app. The upload flow requests a presigned S3 URL from the backend, uploads the image directly to S3, and then stores the metadata through the API. If the image contains EXIF GPS coordinates, those are used. Otherwise, the app falls back to device geolocation.

### Routing

The routing widget lets the user choose a destination on the map and requests a route from the routing API using the device’s current location. The route is drawn as a styled GeoJSON line on top of the map.

## Deployment

### Frontend

The frontend is deployed as a static site on GitHub Pages.

### Vector Tiles

The zoo tileset is served from a TileServer GL container hosted on AWS App Runner.

### API Services

Photo upload and routing are handled by API Gateway + Lambda endpoints.

## Configuration Notes

The current project uses hosted service URLs directly in the frontend. Before reusing this project, review and update:

* the TileServer GL endpoint in `index.html`
* the photo API base/routes in `photos.js`
* the routing API URL in `routing.js`

You may also want to update any cache-busting query strings on local CSS/JS asset references when publishing new frontend versions.

## Local Development

You can run the frontend locally with any simple static server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Known Requirements

* Browser geolocation must be enabled for routing and some photo uploads
* CORS must be correctly configured for:

  * GitHub Pages origin
  * localhost during development
  * S3 presigned upload requests
* The map is optimized for modern browsers with JavaScript enabled

## Future Improvements

* Walk / bike / drive route mode toggle
* Better route clearing UX
* More exhibit metadata and popup content
* Additional mobile layout tuning
* User-contributed map content moderation
* Interior routing or zoo-path-only routing

## Credits

* Henry Vilas Zoo
* OpenStreetMap contributors
* CARTO basemaps
* OpenTopoMap
* MapLibre GL JS
