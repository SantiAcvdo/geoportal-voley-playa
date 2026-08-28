// Guarda este archivo en: js/ui.js
// Responsabilidad única: tarjetas de canchas y barra de estadísticas.

import { irACancha } from './mapa.js';

export function renderizarTarjetas(geojson) {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';

  if (geojson.features.length === 0) {
    grid.innerHTML = '<p style="color:#888;">No se encontraron canchas con ese criterio.</p>';
    return;
  }

  geojson.features.forEach(f => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const esPrivada = p.tipo === 'Privada';
    const claseTipo = esPrivada ? 'privada' : 'publica';
    const etiquetaTipo = p.tipo === 'OSM' ? 'OpenStreetMap' : (p.tipo || 'Sin clasificar');

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-photo ${claseTipo}">
        <span class="card-badge">${etiquetaTipo}</span>
        🏐
      </div>
      <div class="card-body">
        <div class="card-title">${p.nombre}</div>
        <div class="card-location">📍 ${[p.barrio, p.municipio].filter(Boolean).join(', ') || 'Ubicación sin detallar'}</div>
      </div>
      <div class="card-footer">
        <button type="button">Ver en el mapa</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', () => irACancha(lat, lon));
    grid.appendChild(card);
  });
}

export function actualizarStats(geojson) {
  const total = geojson.features.length;
  const municipios = new Set(geojson.features.map(f => f.properties.municipio).filter(Boolean));
  const publicas = geojson.features.filter(f => f.properties.tipo === 'Pública' || f.properties.tipo === 'OSM').length;
  const privadas = geojson.features.filter(f => f.properties.tipo === 'Privada').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statMunicipios').textContent = municipios.size;
  document.getElementById('statPublicas').textContent = publicas;
  document.getElementById('statPrivadas').textContent = privadas;
}
