// Guarda este archivo en: js/mapa.js
// Responsabilidad única: crear el mapa Leaflet, pintar capas y capturar coordenadas.

import { CENTRO_MAPA, ZOOM_INICIAL } from './config.js';

export let map;
export let canchasLayer;
let marcadorClic = null;

export function iniciarMapa() {
  map = L.map('map', { zoomControl: false }).setView(CENTRO_MAPA, ZOOM_INICIAL);
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

  canchasLayer = L.layerGroup().addTo(map);

  document.getElementById('crsMapa').textContent =
    map.options.crs.code || 'EPSG:3857';

  map.on('click', capturarCoordenada);

  return map;
}

function capturarCoordenada(e) {
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
}

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

export function pintarCapa(geojson) {
  canchasLayer.clearLayers();
  L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: iconoCancha(feature.properties.tipo) }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(
        `<div class="popup-title">🏐 ${p.nombre}</div>
         <div class="popup-row">${[p.barrio, p.municipio].filter(Boolean).join(', ') || 'Sin barrio registrado'}</div>
         ${p.tipo ? `<div class="popup-row">Tipo: ${p.tipo}</div>` : ''}
         <div class="popup-row">Lat/Lon: ${feature.geometry.coordinates[1].toFixed(6)}, ${feature.geometry.coordinates[0].toFixed(6)}</div>`
      );
    }
  }).addTo(canchasLayer);
}

// Permite que otros módulos (ej. las tarjetas) centren el mapa en una cancha
export function irACancha(lat, lon) {
  map.setView([lat, lon], 16, { animate: true });
  canchasLayer.eachLayer(layer => {
    const ll = layer.getLatLng();
    if (Math.abs(ll.lat - lat) < 0.00001 && Math.abs(ll.lng - lon) < 0.00001) {
      layer.openPopup();
    }
  });
}
