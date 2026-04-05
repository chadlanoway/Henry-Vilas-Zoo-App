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
* Amenity labels and icons derived from GeoJSON
* **Amenity finder dropdown** (restrooms, food, gifts, etc.) that routes to the nearest matching location
* Animal finder dropdown that zooms to a selected exhibit
* Photo uploads using EXIF GPS when available, with device location fallback
* Visitor photo points with styled popups
* **Dynamic routing system:**

  * Walking routes within the zoo
  * Automatic **drive + walk routing** when outside the zoo boundary
  * Route styling that differentiates walking vs driving segments
  * Map orientation aligned to destination
* Mobile-friendly sliding info panel with tabbed controls

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
│   ├── amenities.js
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

The routing system supports both simple and multi-stage navigation depending on the user’s location.

If the user is inside the zoo boundary, a walking route is generated directly to the destination.
If the user is outside the zoo boundary, the app:
Finds the nearest parking location relative to the destination
Generates a driving route from the user to that parking point
Generates a walking route from parking to the destination
Combines both routes into a single visual path

Routes are styled to visually distinguish segments:

Driving: solid line
Walking: dashed line with shared color styling

The map also automatically orients toward the destination after routing for a more intuitive navigation experience.

### Amenities

Amenity data is loaded from a GeoJSON dataset and includes locations such as restrooms, food, gifts, and recreational areas.

The amenity dropdown allows users to:

* Select a category (e.g., Restrooms)
* Automatically find the **nearest matching amenity**
* Generate a route to that location using the routing system

Amenity types support multiple values per feature (e.g., "restroom, water"), allowing flexible matching and categorization.


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
