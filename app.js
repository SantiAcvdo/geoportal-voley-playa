/* ============================================================
   MI PRIMER GEOPORTAL
   Visor de canchas de vóley playa - Área Metropolitana del Valle de Aburrá
   (Bello -> Medellín)
   Leaflet + Proj4Leaflet + Overpass API (OpenStreetMap)
   ============================================================ */

// -------------------------------------------------------------
// 1. Definición de sistemas de referencia de coordenadas (SRC)
//    Leaflet trabaja internamente en EPSG:3857 (Web Mercator) y
//    espera GeoJSON en EPSG:4326 (lat/lon WGS84). Para la
//    "conversión al vuelo" usamos Proj4js con otros dos SRC
//    usados oficialmente en Colombia.
// -------------------------------------------------------------
proj4.defs("EPSG:3116",
  "+proj=tmerc +lat_0=4.596200417 +lon_0=-74.07750791666666 " +
  "+k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:32618",
  "+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs");

// -------------------------------------------------------------
// 2. Mapa base
// -------------------------------------------------------------
const map = L.map('map', { zoomControl: true }).setView([6.30, -75.58], 12); // centro Bello-Medellín

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap, &copy; CARTO',
  maxZoom: 19
});

const baseLayers = {
  "OpenStreetMap": osm,
  "CartoDB Light": carto
};

// Capa de resultados (se llena dinámicamente)
let canchasLayer = L.layerGroup().addTo(map);
let datosOriginales = null; // FeatureCollection completo, sin filtrar

const overlays = { "Canchas de vóley playa": canchasLayer };
L.control.layers(baseLayers, overlays, { collapsed: false }).addTo(map);

// -------------------------------------------------------------
// 3. Mostrar el SRC activo del mapa (requisito: "que me diga el SRC")
// -------------------------------------------------------------
document.getElementById('crsMapa').textContent =
  map.options.crs.code ? map.options.crs.code : 'EPSG:3857 (Web Mercator)';

// -------------------------------------------------------------
// 4. Captura de coordenadas al hacer clic + reproyección al vuelo
//    (requisito: "capturar coordenadas" / "conversión al vuelo")
// -------------------------------------------------------------
map.on('click', function (e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  const destino = document.getElementById('crsSelect').value;

  let texto = `WGS84 (EPSG:4326): ${lat.toFixed(6)}, ${lon.toFixed(6)}`;

  if (destino !== "EPSG:4326") {
    const [x, y] = proj4("EPSG:4326", destino, [lon, lat]);
    texto += ` &nbsp;|&nbsp; ${destino}: X=${x.toFixed(2)}, Y=${y.toFixed(2)}`;
  }

  document.getElementById('coordCapturada').innerHTML = texto;

  L.popup()
    .setLatLng(e.latlng)
    .setContent(`<b>Coordenada capturada</b><br>${texto}`)
    .openOn(map);
});

// -------------------------------------------------------------
// 5. Carga de datos reales: Overpass API (OpenStreetMap)
//    Filtra sport=beachvolleyball dentro del bbox
//    Bello - Medellín (Valle de Aburrá)
//    (requisito: "cargar capas" + cobertura Bello->Medellín)
// -------------------------------------------------------------
const BBOX = "6.13,-75.70,6.42,-75.47"; // south,west,north,east

async function cargarCanchasOSM() {
  const query = `
    [out:json][timeout:25];
    (
      node["sport"="beachvolleyball"](${BBOX});
      way["sport"="beachvolleyball"](${BBOX});
      relation["sport"="beachvolleyball"](${BBOX});
    );
    out center tags;
  `;
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const features = data.elements.map(el => {
      const lat = el.lat || (el.center && el.center.lat);
      const lon = el.lon || (el.center && el.center.lon);
      return {
        type: "Feature",
        properties: {
          nombre: (el.tags && el.tags.name) || "Cancha de vóley playa (sin nombre en OSM)",
          barrio: (el.tags && (el.tags["addr:suburb"] || el.tags["addr:neighbourhood"])) || "",
          municipio: (el.tags && el.tags["addr:city"]) || "",
          osm_id: el.id,
          osm_type: el.type
        },
        geometry: { type: "Point", coordinates: [lon, lat] }
      };
    }).filter(f => f.geometry.coordinates[0] && f.geometry.coordinates[1]);

    datosOriginales = { type: "FeatureCollection", features };
    pintarCapa(datosOriginales);
  } catch (err) {
    console.error("Error consultando Overpass:", err);
    // Respaldo: dataset local mínimo verificado (MEData / Alcaldía de Medellín)
    datosOriginales = FALLBACK_GEOJSON;
    pintarCapa(datosOriginales);
    document.getElementById('coordCapturada').innerHTML =
      "No se pudo conectar a Overpass API. Mostrando dataset local de respaldo.";
  }
}

// -------------------------------------------------------------
// 6. Pintado de capa GeoJSON (Leaflet asume EPSG:4326 por defecto,
//    lo cual es correcto porque OSM y GeoJSON estándar usan WGS84)
// -------------------------------------------------------------
function pintarCapa(geojson) {
  canchasLayer.clearLayers();
  L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: 8,
      fillColor: "#e0a800",
      color: "#7a5b00",
      weight: 1,
      fillOpacity: 0.9
    }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(
        `<b>${p.nombre}</b><br>${p.barrio || ''} ${p.municipio || ''}<br>` +
        `Lat/Lon: ${feature.geometry.coordinates[1].toFixed(6)}, ${feature.geometry.coordinates[0].toFixed(6)}`
      );
    }
  }).addTo(canchasLayer);
}

// -------------------------------------------------------------
// 7. Prefiltro por texto (barrio / municipio / nombre)
//    (requisito: "prefiltro que reconozca")
// -------------------------------------------------------------
document.getElementById('btnFiltrar').addEventListener('click', () => {
  if (!datosOriginales) return;
  const texto = document.getElementById('filtro').value.trim().toLowerCase();
  if (!texto) { pintarCapa(datosOriginales); return; }

  const filtrado = {
    type: "FeatureCollection",
    features: datosOriginales.features.filter(f => {
      const p = f.properties;
      return (p.nombre || '').toLowerCase().includes(texto) ||
             (p.barrio || '').toLowerCase().includes(texto) ||
             (p.municipio || '').toLowerCase().includes(texto);
    })
  };
  pintarCapa(filtrado);
});

document.getElementById('btnReset').addEventListener('click', () => {
  document.getElementById('filtro').value = '';
  if (datosOriginales) pintarCapa(datosOriginales);
});

document.getElementById('btnRecargarOSM').addEventListener('click', cargarCanchasOSM);

// -------------------------------------------------------------
// 8. Dataset de respaldo (offline), verificado en fuentes oficiales
//    MEData - Alcaldía de Medellín / datos.gov.co
// -------------------------------------------------------------
const FALLBACK_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        nombre: "Cancha de vóley playa N.1 - Unidad Deportiva Atanasio Girardot",
        barrio: "Laureles-Estadio",
        municipio: "Medellín"
      },
      geometry: { type: "Point", coordinates: [-75.591129, 6.257519] }
    },
    {
      type: "Feature",
      properties: {
        nombre: "Cancha de vóley playa en arenilla - Unidad Deportiva de Belén (Andrés Escobar Saldarriaga)",
        barrio: "Belén",
        municipio: "Medellín"
      },
      geometry: { type: "Point", coordinates: [-75.6069, 6.2378] }
    }
  ]
};

// -------------------------------------------------------------
// 9. Arranque
// -------------------------------------------------------------
cargarCanchasOSM();
