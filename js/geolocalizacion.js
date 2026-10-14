// Guarda este archivo en: js/geolocalizacion.js
// Responsabilidad única: capturar ubicación del usuario, calcular distancias (Haversine) y pintar pin de usuario.

import { map } from './mapa.js';
import { mostrarToast } from './toast.js';

let ubicacionUsuario = null; // { lat, lon }
let marcadorUsuario = null;
let circuloPrecision = null;

// Fórmula de Haversine para distancia en kilómetros
export function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function obtenerUbicacionUsuario() {
  return ubicacionUsuario;
}

export function pintarUbicacionEnMapa(lat, lon, precision = 50) {
  if (!map) return;

  if (marcadorUsuario) map.removeLayer(marcadorUsuario);
  if (circuloPrecision) map.removeLayer(circuloPrecision);

  const iconoUsuario = L.divIcon({
    className: 'marcador-usuario-wrapper',
    html: `
      <div class="pulso-usuario"></div>
      <div class="punto-usuario">📍</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  circuloPrecision = L.circle([lat, lon], {
    radius: Math.min(precision, 300),
    color: '#2563eb',
    weight: 1,
    fillColor: '#3b82f6',
    fillOpacity: 0.15
  }).addTo(map);

  marcadorUsuario = L.marker([lat, lon], { icon: iconoUsuario })
    .addTo(map)
    .bindPopup(`
      <div class="popup-title">📍 ¡Estás aquí!</div>
      <div class="popup-row">Mostrando canchas ordenadas por cercanía a tu posición.</div>
    `);

  map.flyTo([lat, lon], 14, { animate: true, duration: 1.2 });
  marcadorUsuario.openPopup();
}

export function solicitarGeolocalizacion(onExito, onError) {
  if (!navigator.geolocation) {
    mostrarToast('Tu navegador no soporta geolocalización.', 'error');
    if (onError) onError('No soportado');
    return;
  }

  mostrarToast('Obteniendo tu ubicación actual…', 'info', 2000);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      ubicacionUsuario = { lat: latitude, lon: longitude };
      pintarUbicacionEnMapa(latitude, longitude, accuracy);
      mostrarToast('📍 ¡Ubicación detectada! Canchas ordenadas por cercanía.', 'gps');
      if (onExito) onExito(ubicacionUsuario);
    },
    (err) => {
      console.warn('Error obteniendo geolocalización:', err);
      let msg = 'No se pudo obtener tu ubicación.';
      if (err.code === 1) msg = 'Permiso de ubicación denegado. Puedes buscar por municipio.';
      else if (err.code === 2) msg = 'Posición no disponible.';
      mostrarToast(msg, 'advertencia');
      if (onError) onError(err);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

