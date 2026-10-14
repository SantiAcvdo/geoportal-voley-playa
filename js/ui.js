// Guarda este archivo en: js/ui.js
// Responsabilidad única: renderizado de tarjetas con fotos reales, badges, amenidades,
// estados de favoritos, paginación, skeletons y estadísticas.

import { irACancha } from './mapa.js';
import { abrirModalReporte } from './comunidad.js';
import { abrirFichaCancha } from './ficha.js';
import { esFavorita, toggleFavorito, actualizarContadorFavoritos } from './favoritos.js';
import { mostrarToast } from './toast.js';

let paginaActual = 1;
const CANCHAS_POR_PAGINA = 9;
let ultimoGeojson = null;

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function iconoCosto(costo) {
  if (!costo) return '🆓';
  const c = costo.toLowerCase();
  if (c.includes('gratuito')) return '🆓';
  if (c.includes('costo')) return '💳';
  if (c.includes('variable')) return '💰';
  return '❔';
}

export function renderizarSkeletons(cantidad = 6) {
  const grid = document.getElementById('cardsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < cantidad; i++) {
    const sk = document.createElement('div');
    sk.className = 'card-skeleton';
    sk.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line title"></div>
        <div class="skeleton-line sub"></div>
        <div class="skeleton-pills">
          <div class="skeleton-pill"></div>
          <div class="skeleton-pill"></div>
        </div>
      </div>
    `;
    grid.appendChild(sk);
  }
}

export function renderizarTarjetas(geojson, resetearPagina = true) {
  const grid = document.getElementById('cardsGrid');
  if (!grid) return;

  if (resetearPagina) {
    paginaActual = 1;
  }
  ultimoGeojson = geojson;

  const totalFeatures = geojson.features.length;

  if (paginaActual === 1) {
    grid.innerHTML = '';
  }

  // Contador de resultados
  const contadorEl = document.getElementById('tarjetasContador');
  if (contadorEl) {
    contadorEl.textContent = `${totalFeatures} cancha(s) encontrada(s)`;
  }

  if (totalFeatures === 0) {
    grid.innerHTML = `
      <div class="sin-resultados">
        <div class="sin-res-icono">🏖️</div>
        <h3>No encontramos canchas con estos filtros</h3>
        <p>Prueba buscando con otro término, cambiando de municipio o quitando el filtro de favoritas.</p>
        <button id="btnLimpiarDesdeVacio" class="btn btn-secondary">Limpiar filtros de búsqueda</button>
      </div>
    `;
    document.getElementById('btnLimpiarDesdeVacio')?.addEventListener('click', () => {
      document.getElementById('btnReset')?.click();
    });
    actualizarBotonCargarMas(0, 0);
    return;
  }

  const limite = paginaActual * CANCHAS_POR_PAGINA;
  const featuresAMostrar = geojson.features.slice(0, limite);

  // Limpiar grid para repintar ordenadamente
  grid.innerHTML = '';

  featuresAMostrar.forEach(feature => {
    const p = feature.properties || {};
    const [lon, lat] = feature.geometry.coordinates;
    const esFav = esFavorita(p.id);

    const tipo = escaparHTML(p.tipo || 'Pública');
    const costo = escaparHTML(p.costo || 'Gratuito');
    const serv = p.servicios || {};

    // Foto de portada con fallback
    const foto = p.foto || 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=700&q=80';

    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-id', p.id || '');

    // Tag distancia si el usuario tiene GPS activo
    let tagDistancia = '';
    if (typeof feature.distanciaKm === 'number') {
      const distTexto = feature.distanciaKm < 1
        ? `${Math.round(feature.distanciaKm * 1000)} m`
        : `${feature.distanciaKm.toFixed(1)} km`;
      tagDistancia = `<span class="card-distancia-chip">A ${distTexto}</span>`;
    }

    // Chip de calificación refinado
    let chipRating = '';
    if (typeof p.rating_promedio === 'number' && p.rating_total > 0) {
      chipRating = `<span class="chip-item chip-rating">★ ${p.rating_promedio.toFixed(1)} (${p.rating_total})</span>`;
    } else {
      chipRating = `<span class="chip-item chip-sin-rating">Nuevo</span>`;
    }

    card.innerHTML = `
      <div class="card-photo-wrapper">
        <img
          src="${foto}"
          alt="${escaparHTML(p.nombre)}"
          class="card-img"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=700&q=80'"
        />
        <div class="card-badges-top">
          <span class="card-badge badge-${tipo.toLowerCase().replace(/\s+/g, '-')}">${tipo}</span>
          ${p.verificada ? '<span class="card-badge badge-verif">Verificada</span>' : '<span class="card-badge badge-unverif">Por confirmar</span>'}
        </div>
        ${tagDistancia}
      </div>

      <div class="card-body">
        <h3 class="card-title">${escaparHTML(p.nombre)}</h3>
        <div class="card-location" title="Ver en mapa">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${escaparHTML([p.barrio, p.municipio].filter(Boolean).join(', ') || 'Valle de Aburrá')}</span>
        </div>

        <div class="card-chips">
          ${chipRating}
          <span class="chip-item">${costo}</span>
          <span class="chip-item">${p.reserva_requerida ? 'Reserva requerida' : 'Acceso libre'}</span>
          ${serv.iluminacion ? '<span class="chip-item chip-luz">Iluminación</span>' : ''}
          ${serv.duchas ? '<span class="chip-item chip-duchas">Duchas</span>' : ''}
        </div>

        <div class="card-condition">
          <strong>Acceso:</strong> ${escaparHTML(p.condicion_acceso || 'Según normas del escenario.')}
        </div>
      </div>

      <div class="card-footer">
        <button class="btn-card-details btn-ficha" type="button">
          Ver detalles
        </button>
        <div class="card-footer-icons">
          <a
            class="btn-card-icon btn-rutas"
            href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}"
            target="_blank"
            rel="noopener noreferrer"
            title="Cómo llegar con Google Maps"
            aria-label="Cómo llegar con Google Maps"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </a>
          <button
            class="btn-card-icon btn-fav-card ${esFav ? 'activo' : ''}"
            data-id="${p.id || ''}"
            title="${esFav ? 'Quitar de favoritas' : 'Guardar en favoritas'}"
            aria-label="Favorito"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${esFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
        </div>
      </div>
    `;

    // Conectar eventos
    card.querySelector('.btn-ficha')?.addEventListener('click', () => {
      abrirFichaCancha(feature);
    });

    card.querySelector('.card-location')?.addEventListener('click', () => {
      const hero = document.getElementById('hero');
      hero?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => irACancha(lat, lon), 600);
    });

    const btnFavCard = card.querySelector('.btn-fav-card');
    btnFavCard?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nuevaEsFav = toggleFavorito(p.id);
      btnFavCard.classList.toggle('activo', nuevaEsFav);
      const svg = btnFavCard.querySelector('svg');
      if (svg) svg.setAttribute('fill', nuevaEsFav ? 'currentColor' : 'none');
      mostrarToast(
        nuevaEsFav ? 'Guardada en tus favoritas' : 'Eliminada de favoritas',
        'favorito'
      );
    });

    grid.appendChild(card);
  });

  actualizarBotonCargarMas(totalFeatures, limite);
}

function actualizarBotonCargarMas(total, mostrados) {
  let btnCargar = document.getElementById('btnCargarMasCanchas');
  if (!btnCargar) {
    const contenedorAccion = document.getElementById('tarjetasPaginacion');
    if (!contenedorAccion) return;
    btnCargar = document.createElement('button');
    btnCargar.id = 'btnCargarMasCanchas';
    btnCargar.className = 'btn btn-secondary btn-cargar-mas';
    btnCargar.addEventListener('click', () => {
      paginaActual++;
      if (ultimoGeojson) renderizarTarjetas(ultimoGeojson, false);
    });
    contenedorAccion.appendChild(btnCargar);
  }

  if (total > mostrados) {
    btnCargar.hidden = false;
    const restantes = total - mostrados;
    btnCargar.innerHTML = `Mostrar más canchas (+${restantes} restantes)`;
  } else {
    btnCargar.hidden = true;
  }
}

export function actualizarStats(geojson) {
  const features = geojson.features || [];
  const municipios = new Set(features.map(f => f.properties.municipio).filter(Boolean));
  const publicas = features.filter(f => (f.properties.tipo || '').toLowerCase().includes('públic')).length;
  const privadas = features.filter(f => (f.properties.tipo || '').toLowerCase().includes('privad')).length;

  document.getElementById('statTotal').textContent = features.length;
  document.getElementById('statMunicipios').textContent = municipios.size;
  document.getElementById('statPublicas').textContent = publicas;
  document.getElementById('statPrivadas').textContent = privadas;

  actualizarContadorFavoritos();
}