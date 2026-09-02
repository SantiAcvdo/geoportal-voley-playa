// Guarda este archivo en: js/ui.js
// Responsabilidad única: tarjetas, especificaciones y estadísticas.

import { irACancha } from './mapa.js';

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function claseImagen(tipo, verificada) {
  if (!verificada) return 'no-confirmada';
  if (tipo === 'Universitaria') return 'universitaria';
  if (tipo === 'Privada') return 'privada';
  return 'publica';
}

function iconoCosto(costo) {
  if (costo === 'Gratuito') return '🆓';
  if (costo === 'Con costo') return '💳';
  if (costo === 'Variable') return '💰';
  return '❔';
}

function textoReserva(reserva) {
  if (reserva === true) return '📅 Reserva requerida';
  if (reserva === false) return '🚶 Sin reserva indicada';
  return '❔ Reserva no confirmada';
}

export function renderizarTarjetas(geojson) {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';

  if (geojson.features.length === 0) {
    grid.innerHTML = '<p style="color:#888;">No se encontraron canchas con ese criterio.</p>';
    return;
  }

  geojson.features.forEach(feature => {
    const p = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const clase = claseImagen(p.tipo, p.verificada);
    const tipo = escaparHTML(p.tipo || 'No confirmado');
    const costo = escaparHTML(p.costo || 'Sin información');
    const acceso = escaparHTML(p.acceso || 'Sin información');
    const condicion = escaparHTML(p.condicion_acceso || 'Sin información.');

    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-photo ${clase}">
        <span class="card-badge">${tipo}</span>
        🏐
      </div>
      <div class="card-body">
        <div class="card-title">${escaparHTML(p.nombre)}</div>
        <div class="card-location">📍 ${escaparHTML([p.barrio, p.municipio].filter(Boolean).join(', ') || 'Ubicación sin detallar')}</div>
        <div class="card-specs">
          <span class="spec">🏷️ ${acceso}</span>
          <span class="spec">${textoReserva(p.reserva_requerida)}</span>
          <span class="spec">${iconoCosto(p.costo)} ${costo}</span>
        </div>
        <div class="card-condition">ℹ️ ${condicion}</div>
        <div class="card-verification ${p.verificada ? '' : 'card-unverified'}">
          ${p.verificada ? '✅ Información proporcionada/verificada' : '⚠️ Información por confirmar'}
        </div>
      </div>
      <div class="card-footer">
        <button type="button">Ver en el mapa</button>
      </div>
    `;

    card.querySelector('button').addEventListener('click', () => {
      document.getElementById('hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => irACancha(lat, lon), 350);
    });

    grid.appendChild(card);
  });
}

export function actualizarStats(geojson) {
  const features = geojson.features;
  const total = features.length;
  const municipios = new Set(features.map(f => f.properties.municipio).filter(Boolean));
  const publicas = features.filter(f => {
    const acceso = f.properties.acceso || '';
    return acceso.toLowerCase().includes('público');
  }).length;
  const privadas = features.filter(f => {
    const acceso = f.properties.acceso || '';
    return acceso.toLowerCase().includes('privado');
  }).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statMunicipios').textContent = municipios.size;
  document.getElementById('statPublicas').textContent = publicas;
  document.getElementById('statPrivadas').textContent = privadas;
}