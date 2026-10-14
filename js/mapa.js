// Guarda este archivo en: js/mapa.js
// Responsabilidad única: inicializar Leaflet, capas base, pintar pines de canchas y volar a coordenadas.

import { CENTRO_MAPA, ZOOM_INICIAL } from './config.js';
import { abrirFichaCancha } from './ficha.js';

export let map;
export let canchasLayer;
let marcadorClic = null;
let resaltadoTemporal = null;

export function iniciarMapa() {
  map = L.map('map', { zoomControl: false }).setView(CENTRO_MAPA, ZOOM_INICIAL);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
  }).addTo(map);

  const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap, &copy; CARTO', maxZoom: 19
  });

  const satelital = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics', maxZoom: 19 }
  );

  const etiquetasSatelital = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Labels &copy; Esri', maxZoom: 19, opacity: 0.9 }
  );
  const satelitalConEtiquetas = L.layerGroup([satelital, etiquetasSatelital]);

  L.control.layers(
    { "🗺️ Calles (OSM)": osm, "🏙️ Claro (Voyager)": carto, "🛰️ Satelital (Esri)": satelitalConEtiquetas },
    {}, { position: 'bottomright', collapsed: true }
  ).addTo(map);

  canchasLayer = L.layerGroup().addTo(map);

  const crsEl = document.getElementById('crsMapa');
  if (crsEl) {
    crsEl.textContent = map.options.crs.code || 'EPSG:3857';
  }

  // Capturar coordenadas al hacer clic con tecla Shift o botón habilitado
  map.on('click', (e) => {
    capturarCoordenada(e);
  });

  return map;
}

export function capturarCoordenada(e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  const destinoSelect = document.getElementById('crsSelect');
  const destino = destinoSelect ? destinoSelect.value : 'EPSG:4326';
  let texto = `WGS84: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;

  if (destino !== 'EPSG:4326' && window.proj4) {
    try {
      const [x, y] = proj4('EPSG:4326', destino, [lon, lat]);
      texto += ` · ${destino}: X=${x.toFixed(2)}, Y=${y.toFixed(2)}`;
    } catch (err) {
      console.warn(err);
    }
  }

  const coordCaptEl = document.getElementById('coordCapturada');
  if (coordCaptEl) coordCaptEl.textContent = texto;

  if (marcadorClic) map.removeLayer(marcadorClic);
  marcadorClic = L.circleMarker(e.latlng, {
    radius: 7, color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.9
  }).addTo(map);
}

function iconoCancha(tipo) {
  const t = (tipo || '').toLowerCase();
  let colorFondo = '#0f7d7a';
  let colorBorde = '#074846';
  let emoji = '🏐';

  if (t.includes('privad')) {
    colorFondo = '#2563eb';
    colorBorde = '#1d4ed8';
  } else if (t.includes('universitar')) {
    colorFondo = '#8b5cf6';
    colorBorde = '#6d28d9';
    emoji = '🎓';
  } else if (t.includes('osm')) {
    colorFondo = '#64748b';
    colorBorde = '#334155';
  }

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div class="pin-marker-inner" style="background:${colorFondo}; border-color:${colorBorde};">
        <span class="pin-marker-emoji">${emoji}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

export function pintarCapa(geojson) {
  canchasLayer.clearLayers();
  L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => {
      const marker = L.marker(latlng, { icon: iconoCancha(feature.properties.tipo) });
      return marker;
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      const [lon, lat] = feature.geometry.coordinates;

      const popupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-header">
            <span class="map-popup-badge">${p.tipo || 'Pública'}</span>
            <strong class="map-popup-title">${p.nombre}</strong>
          </div>
          <div class="map-popup-body">
            <div class="map-popup-row">📍 ${[p.barrio, p.municipio].filter(Boolean).join(', ') || 'Valle de Aburrá'}</div>
            <div class="map-popup-row">💰 ${p.costo || 'Gratuito con reserva'}</div>
          </div>
          <div class="map-popup-actions">
            <button class="btn-popup-ficha" data-cancha-id="${p.id || ''}" type="button">
              🔍 Ver Ficha Completa
            </button>
            <a class="btn-popup-ruta" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" rel="noopener noreferrer">
              🚗 Cómo llegar
            </a>
          </div>
        </div>
      `;

      layer.bindPopup(popupHtml, { maxWidth: 300, minWidth: 240, className: 'leaflet-popup-custom' });

      layer.on('popupopen', () => {
        const btn = document.querySelector(`.btn-popup-ficha[data-cancha-id="${p.id || ''}"]`);
        btn?.addEventListener('click', () => {
          abrirFichaCancha(feature);
        });
      });
    }
  }).addTo(canchasLayer);
}

function resaltarPunto(lat, lon) {
  if (resaltadoTemporal) map.removeLayer(resaltadoTemporal);
  resaltadoTemporal = L.circleMarker([lat, lon], {
    radius: 22, color: '#f59e0b', weight: 4, fillColor: '#f59e0b', fillOpacity: 0.35
  }).addTo(map);

  window.setTimeout(() => {
    if (resaltadoTemporal) {
      map.removeLayer(resaltadoTemporal);
      resaltadoTemporal = null;
    }
  }, 4000);
}

function abrirPopupEnCoordenada(lat, lon, markerSeleccionado = null) {
  if (markerSeleccionado) {
    markerSeleccionado.openPopup();
    return;
  }
  canchasLayer.eachLayer(layer => {
    if (layer.getLatLng) {
      const ll = layer.getLatLng();
      if (Math.abs(ll.lat - lat) < 0.0001 && Math.abs(ll.lng - lon) < 0.0001) {
        layer.openPopup();
      }
    }
  });
}

export function irACancha(lat, lon, markerSeleccionado = null) {
  map.flyTo([lat, lon], 17, { animate: true, duration: 1.2 });
  resaltarPunto(lat, lon);

  window.setTimeout(() => {
    abrirPopupEnCoordenada(lat, lon, markerSeleccionado);
  }, 1250);
}

export function irAResultados(geojson) {
  const features = geojson.features;
  if (!features || features.length === 0) return;

  if (features.length === 1) {
    const [lon, lat] = features[0].geometry.coordinates;
    irACancha(lat, lon);
    return;
  }

  const bounds = L.latLngBounds(
    features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]])
  );
  map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true, duration: 1.2 });
}