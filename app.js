/* ============================================================
   MI PRIMER GEOPORTAL
   Visor de canchas de vóley playa - Área Metropolitana del Valle de Aburrá
   (Bello -> Medellín)
   Leaflet + Proj4Leaflet + Overpass API (OSM) + capa manual editable
   ============================================================ */

// -------------------------------------------------------------
// 1. Sistemas de referencia de coordenadas (SRC)
// -------------------------------------------------------------
proj4.defs("EPSG:3116",
  "+proj=tmerc +lat_0=4.596200417 +lon_0=-74.07750791666666 " +
  "+k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:32618",
  "+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs");

// -------------------------------------------------------------
// 2. Mapa base
// -------------------------------------------------------------
const map = L.map('map', { zoomControl: false }).setView([6.30, -75.58], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap, &copy; CARTO',
  maxZoom: 19
});

L.control.layers(
  { "Estándar (OSM)": osm, "Claro (CartoDB)": carto },
  {},
  { position: 'bottomright', collapsed: true }
).addTo(map);

let canchasLayer = L.layerGroup().addTo(map);
let datosOriginales = null;

// -------------------------------------------------------------
// 3. Icono personalizado
// -------------------------------------------------------------
function iconoCancha(tipo) {
  const color = tipo === 'Privada' ? '#2d9cdb' : '#f2b705';
  const borde = tipo === 'Privada' ? '#0a4a70' : '#7a5b00';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color}; width:22px; height:22px; border-radius:50% 50% 50% 0;
      transform: rotate(-45deg); border:2px solid ${borde};
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);">
      <span style="transform: rotate(45deg); font-size:11px;">🏐</span>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22]
  });
}

// -------------------------------------------------------------
// 4. SRC activo del mapa
// -------------------------------------------------------------
document.getElementById('crsMapa').textContent =
  map.options.crs.code ? map.options.crs.code : 'EPSG:3857 (Web Mercator)';

// -------------------------------------------------------------
// 5. Captura de coordenadas + reproyección al vuelo
// -------------------------------------------------------------
let marcadorClic = null;
map.on('click', function (e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  const destino = document.getElementById('crsSelect').value;

  let texto = `WGS84: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  if (destino !== "EPSG:4326") {
    const [x, y] = proj4("EPSG:4326", destino, [lon, lat]);
    texto += ` · ${destino}: X=${x.toFixed(2)}, Y=${y.toFixed(2)}`;
  }
  document.getElementById('coordCapturada').textContent = texto;

  if (marcadorClic) map.removeLayer(marcadorClic);
  marcadorClic = L.circleMarker(e.latlng, {
    radius: 6, color: '#e63946', fillColor: '#e63946', fillOpacity: 1
  }).addTo(map);

  L.popup()
    .setLatLng(e.latlng)
    .setContent(`<div class="popup-title">📍 Coordenada capturada</div><div class="popup-row">${texto}</div>`)
    .openOn(map);
});

// -------------------------------------------------------------
// 6. Carga de datos: OSM (Overpass) + capa manual editable
// -------------------------------------------------------------
const BBOX = "6.13,-75.70,6.42,-75.47";
const loadingEl = document.getElementById('loadingState');
const counterEl = document.getElementById('counterBadge');

async function cargarOverpass() {
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
  const resp = await fetch(url);
  const data = await resp.json();
  return data.elements.map(el => {
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    return {
      type: "Feature",
      properties: {
        nombre: (el.tags && el.tags.name) || "Cancha de vóley playa (OSM, sin nombre)",
        barrio: (el.tags && (el.tags["addr:suburb"] || el.tags["addr:neighbourhood"])) || "",
        municipio: (el.tags && el.tags["addr:city"]) || "",
        tipo: "OSM",
        fuente: "OpenStreetMap"
      },
      geometry: { type: "Point", coordinates: [lon, lat] }
    };
  }).filter(f => f.geometry.coordinates[0] && f.geometry.coordinates[1]);
}

async function cargarManual() {
  const resp = await fetch('canchas_manuales.geojson');
  const data = await resp.json();
  return data.features;
}

async function cargarTodasLasCanchas() {
  loadingEl.textContent = "Cargando datos…";
  let osmFeatures = [];
  let manualFeatures = [];

  const resultados = await Promise.allSettled([cargarOverpass(), cargarManual()]);

  if (resultados[0].status === 'fulfilled') osmFeatures = resultados[0].value;
  if (resultados[1].status === 'fulfilled') manualFeatures = resultados[1].value;

  if (osmFeatures.length === 0 && manualFeatures.length === 0) {
    manualFeatures = FALLBACK_GEOJSON.features;
  }

  datosOriginales = { type: "FeatureCollection", features: [...manualFeatures, ...osmFeatures] };
  pintarCapa(datosOriginales);

  loadingEl.textContent =
    `${manualFeatures.length} manual(es) + ${osmFeatures.length} OSM = ${datosOriginales.features.length} cancha(s) ✓`;
}

// -------------------------------------------------------------
// 7. Pintado de capa
// -------------------------------------------------------------
function pintarCapa(geojson) {
  canchasLayer.clearLayers();
  L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: iconoCancha(feature.properties.tipo) }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(
        `<div class="popup-title">🏐 ${p.nombre}</div>
         <div class="popup-row">${[p.barrio, p.municipio].filter(Boolean).join(', ') || 'Ubicación sin barrio registrado'}</div>
         ${p.tipo ? `<div class="popup-row">Tipo: ${p.tipo}</div>` : ''}
         <div class="popup-row">Lat/Lon: ${feature.geometry.coordinates[1].toFixed(6)}, ${feature.geometry.coordinates[0].toFixed(6)}</div>`
      );
    }
  }).addTo(canchasLayer);

  counterEl.textContent = `${geojson.features.length} cancha(s) visible(s)`;
}

// -------------------------------------------------------------
// 8. Prefiltro por texto — búsqueda flexible (no exacta)
//    - Ignora mayúsculas/minúsculas
//    - Ignora tildes (á/a, é/e, í/i, ó/o, ú/u, ñ/n)
//    - Ignora espacios extra
//    - Coincidencia parcial: "medell" ya encuentra "Medellín"
// -------------------------------------------------------------
function normalizar(texto) {
  return (texto || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')              // separa letra + tilde
    .replace(/[\u0300-\u036f]/g, '') // elimina las tildes
    .replace(/\s+/g, ' ');         // colapsa espacios múltiples
}

function coincide(feature, textoBuscado) {
  const q = normalizar(textoBuscado);
  const p = feature.properties;
  const campos = [p.nombre, p.barrio, p.municipio, p.tipo];
  return campos.some(campo => normalizar(campo).includes(q));
}

document.getElementById('btnFiltrar').addEventListener('click', () => {
  if (!datosOriginales) return;
  const texto = document.getElementById('filtro').value;
  if (!normalizar(texto)) { pintarCapa(datosOriginales); return; }

  const filtrado = {
    type: "FeatureCollection",
    features: datosOriginales.features.filter(f => coincide(f, texto))
  };
  pintarCapa(filtrado);

  if (filtrado.features.length === 0) {
    loadingEl.textContent = `Sin resultados para "${texto}"`;
  } else {
    loadingEl.textContent = `${filtrado.features.length} resultado(s) para "${texto}"`;
  }
});

document.getElementById('btnReset').addEventListener('click', () => {
  document.getElementById('filtro').value = '';
  if (datosOriginales) pintarCapa(datosOriginales);
});

// Filtrado en vivo mientras se escribe (opcional, además del botón/Enter)
document.getElementById('filtro').addEventListener('input', () => {
  document.getElementById('btnFiltrar').click();
});

document.getElementById('filtro').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btnFiltrar').click();
});

document.getElementById('btnRecargarOSM').addEventListener('click', cargarTodasLasCanchas);

// -------------------------------------------------------------
// 9. Mostrar / ocultar capa
// -------------------------------------------------------------
document.getElementById('chkCanchas').addEventListener('change', (e) => {
  if (e.target.checked) map.addLayer(canchasLayer);
  else map.removeLayer(canchasLayer);
});

// -------------------------------------------------------------
// 10. Colapsar / mostrar sidebar
// -------------------------------------------------------------
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleSidebar');
const showBtn = document.getElementById('showSidebar');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.add('collapsed');
  showBtn.classList.add('visible');
});
showBtn.addEventListener('click', () => {
  sidebar.classList.remove('collapsed');
  showBtn.classList.remove('visible');
});

// -------------------------------------------------------------
// 11. Respaldo mínimo si TODO falla
// -------------------------------------------------------------
const FALLBACK_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        nombre: "Cancha de vóley playa N.1 - Unidad Deportiva Atanasio Girardot",
        barrio: "Laureles-Estadio", municipio: "Medellín", tipo: "Pública"
      },
      geometry: { type: "Point", coordinates: [-75.591129, 6.257519] }
    }
  ]
};

// -------------------------------------------------------------
// 12. Arranque
// -------------------------------------------------------------
cargarTodasLasCanchas();