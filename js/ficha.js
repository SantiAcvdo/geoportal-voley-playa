// Guarda este archivo en: js/ficha.js
// Responsabilidad única: gestionar el modal con la ficha técnica completa de cada cancha.

import { irACancha } from './mapa.js';
import { abrirModalReporte } from './comunidad.js';
import { esFavorita, toggleFavorito } from './favoritos.js';
import { mostrarToast } from './toast.js';

let canchaActual = null;

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function abrirFichaCancha(feature) {
  if (!feature) return;
  canchaActual = feature;
  const p = feature.properties || {};
  const [lon, lat] = feature.geometry.coordinates;

  const modal = document.getElementById('modalFicha');
  if (!modal) return;

  // Foto o fallback
  const fotoEl = document.getElementById('fichaFoto');
  const fotoUrl = p.foto || 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=80';
  fotoEl.style.backgroundImage = `url('${fotoUrl}')`;

  // Título y ubicación
  document.getElementById('fichaNombre').textContent = p.nombre || 'Cancha de vóley playa';
  document.getElementById('fichaUbicacion').textContent = `📍 ${[p.barrio, p.municipio].filter(Boolean).join(', ') || 'Valle de Aburrá'}`;
  
  // Badges
  const badgeTipo = document.getElementById('fichaBadgeTipo');
  badgeTipo.textContent = p.tipo || 'Pública';
  badgeTipo.className = `ficha-badge tipo-${(p.tipo || 'publica').toLowerCase().replace(/\s+/g, '-')}`;

  const badgeVerif = document.getElementById('fichaBadgeVerificada');
  if (p.verificada) {
    badgeVerif.innerHTML = '✅ Verificada';
    badgeVerif.className = 'ficha-badge badge-verificada';
  } else {
    badgeVerif.innerHTML = '⚠️ Por confirmar';
    badgeVerif.className = 'ficha-badge badge-unverified';
  }

  // Botón favorito en ficha
  const btnFav = document.getElementById('btnFichaFavorito');
  const favActiva = esFavorita(p.id);
  btnFav.classList.toggle('activo', favActiva);
  btnFav.setAttribute('aria-label', favActiva ? 'Quitar de favoritas' : 'Añadir a favoritas');
  btnFav.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="${favActiva ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    <span>${favActiva ? 'En favoritas' : 'Guardar'}</span>
  `;

  // Amenidades y Servicios
  const serv = p.servicios || {};
  document.getElementById('fichaArena').textContent = serv.tipo_arena || 'Arena deportiva de río / sílice';
  document.getElementById('fichaNumCanchas').textContent = serv.num_canchas ? `${serv.num_canchas} cancha(s)` : '1 o más canchas';
  document.getElementById('fichaIluminacion').textContent = serv.iluminacion ? 'Disponible (juego nocturno)' : 'Solo luz natural / no confirmada';
  document.getElementById('fichaDuchas').textContent = serv.duchas ? 'Duchas y vestuarios disponibles' : 'Sin duchas exclusivas';
  document.getElementById('fichaParqueadero').textContent = serv.parqueadero ? 'Parqueadero en el complejo' : 'En vía pública / zonas aledañas';
  document.getElementById('fichaAccesibilidad').textContent = serv.accesibilidad ? 'Rampas y acceso PMR' : 'Acceso peatonal estándar';

  // Horarios y Reserva
  document.getElementById('fichaHorario').textContent = p.horario || 'Lunes a Domingo 6:00 a.m. - 10:00 p.m. (Sujeto a reservas)';
  document.getElementById('fichaCosto').textContent = p.costo ? `${p.costo}` : 'Gratuito con reserva previa';
  document.getElementById('fichaCondicion').textContent = p.condicion_acceso || 'Ingresar a la plataforma de reservas municipal o presentar documento de identidad.';

  // Botón directo a reserva
  const btnReserva = document.getElementById('btnFichaIrReserva');
  const linkReserva = p.link_reserva || (p.tipo === 'Pública' && p.municipio === 'Medellín' ? 'https://simon.inder.gov.co' : '');
  if (linkReserva && linkReserva.startsWith('http')) {
    btnReserva.href = linkReserva;
    btnReserva.hidden = false;
    btnReserva.textContent = linkReserva.includes('inder.gov.co') ? 'Reservar en INDER SIMON' : 'Reservar vía Web / WhatsApp';
  } else if (linkReserva && linkReserva.startsWith('mailto:')) {
    btnReserva.href = linkReserva;
    btnReserva.hidden = false;
    btnReserva.textContent = 'Solicitar reserva por correo';
  } else {
    btnReserva.hidden = true;
  }

  // Botón Cómo llegar (Google Maps)
  const btnComoLlegar = document.getElementById('btnFichaComoLlegar');
  btnComoLlegar.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

  // Coordenadas con selector
  actualizarCoordenadasFicha(lat, lon);

  // Consultar clima en vivo de la cancha
  cargarClimaCancha(lat, lon);

  // Cargar comentarios
  cargarComentariosCancha(p.id);

  // Mostrar modal
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  // Actualizar hash URL para poder compartir
  if (p.id) {
    history.replaceState(null, '', `#cancha=${p.id}`);
  }
}

async function cargarClimaCancha(lat, lon) {
  const box = document.getElementById('fichaClimaBox');
  if (!box) return;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    box.innerHTML = '';
    return;
  }

  box.innerHTML = `
    <div class="clima-loading">
      <span>⏳ Consultando pronóstico meteorológico en vivo…</span>
    </div>
  `;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m,uv_index&timezone=America%2FBogota`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const cur = data.current || {};

    const temp = cur.temperature_2m !== undefined ? Math.round(cur.temperature_2m) : '--';
    const viento = cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m) : '--';
    const uv = cur.uv_index !== undefined ? Number(cur.uv_index).toFixed(1) : '--';
    const precip = cur.precipitation !== undefined ? Number(cur.precipitation) : 0;

    const esLluvia = precip > 0.1;
    const badgeTexto = esLluvia ? '🌧️ Posible lluvia en la zona' : '☀️ Ideal para jugar';
    const badgeClase = esLluvia ? 'clima-badge-lluvia' : 'clima-badge-ideal';
    const icono = esLluvia ? '🌧️' : '☀️';

    box.innerHTML = `
      <div class="clima-info-left">
        <div class="clima-icono-principal">${icono}</div>
        <div class="clima-detalles-principales">
          <span class="clima-titulo">Clima en tiempo real</span>
          <span class="clima-temp">${temp}°C</span>
        </div>
      </div>
      <div class="clima-grid-stats">
        <div class="clima-stat-item">
          <span class="clima-stat-label">Viento</span>
          <span class="clima-stat-val">${viento} km/h</span>
        </div>
        <div class="clima-stat-item">
          <span class="clima-stat-label">Índice UV</span>
          <span class="clima-stat-val">${uv}</span>
        </div>
      </div>
      <div class="clima-badge-estado ${badgeClase}">
        ${badgeTexto}
      </div>
    `;
  } catch (err) {
    console.warn('Error al cargar clima de cancha:', err);
    box.innerHTML = `
      <div class="clima-loading">
        <span>🌤️ Pronóstico meteorológico temporalmente no disponible</span>
      </div>
    `;
  }
}

function actualizarCoordenadasFicha(lat, lon) {
  const selectCrs = document.getElementById('fichaCrsSelect');
  const coordTexto = document.getElementById('fichaCoordTexto');
  const destino = selectCrs ? selectCrs.value : 'EPSG:4326';

  let txt = `WGS84: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  if (destino !== 'EPSG:4326' && window.proj4) {
    try {
      const [x, y] = proj4('EPSG:4326', destino, [lon, lat]);
      txt = `${destino} -> X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}`;
    } catch (e) {
      console.warn('Error transformando coordenadas:', e);
    }
  }
  coordTexto.textContent = txt;
}

export function cerrarFichaCancha() {
  const modal = document.getElementById('modalFicha');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
  canchaActual = null;
  if (location.hash.startsWith('#cancha=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

import { supabase } from './supabase.js';

// Comentarios y valoraciones
const COMENTARIOS_LOCAL_KEY = 'voleyplaya_amva_comentarios_locales';

function obtenerComentariosLocales(canchaId) {
  try {
    const raw = localStorage.getItem(`${COMENTARIOS_LOCAL_KEY}_${canchaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function guardarComentarioLocal(canchaId, comentario) {
  try {
    const list = obtenerComentariosLocales(canchaId);
    list.unshift(comentario);
    localStorage.setItem(`${COMENTARIOS_LOCAL_KEY}_${canchaId}`, JSON.stringify(list));
  } catch (e) {
    console.warn(e);
  }
}

async function cargarComentariosCancha(canchaId) {
  const lista = document.getElementById('fichaListaComentarios');
  if (!lista) return;

  lista.innerHTML = '<div style="color: var(--texto-mutado); font-size: 0.82rem; padding: 10px;">Cargando opiniones…</div>';

  let comentarios = [];

  // 1. Intentar cargar desde Supabase
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .select('*')
      .eq('cancha_id', canchaId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && Array.isArray(data) && data.length > 0) {
      comentarios = data.map(d => ({
        nombre: d.nombre || d.nombre_usuario || 'Deportista',
        texto: d.comentario || d.texto || d.detalle || '',
        rating: d.rating || d.calificacion || 5,
        fecha: d.created_at ? new Date(d.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Reciente'
      }));
    }
  } catch (err) {
    console.warn('No se pudieron obtener comentarios de Supabase:', err);
  }

  // 2. Combinar con comentarios locales (por si se agregaron offline o la tabla está vacía)
  const locales = obtenerComentariosLocales(canchaId);
  const combinados = [...locales, ...comentarios.filter(c => !locales.some(l => l.texto === c.texto && l.nombre === c.nombre))];

  lista.innerHTML = '';

  if (combinados.length === 0) {
    lista.innerHTML = `
      <div class="comentario-vacio">
        <span>🏐</span>
        <p>Aún no hay comentarios sobre esta cancha. ¡Sé el primero en compartir qué tal está la arena y el ambiente!</p>
      </div>
    `;
    return;
  }

  combinados.forEach(c => {
    const item = document.createElement('div');
    const esConvocatoria = (c.texto && c.texto.startsWith('[CONVOCATORIA]')) || c.tipo === 'convocatoria';
    const textoLimpio = esConvocatoria ? c.texto.replace(/^\[CONVOCATORIA\]\s*/, '') : c.texto;
    item.className = esConvocatoria ? 'comentario-item comentario-convocatoria' : 'comentario-item';

    const headerBadge = esConvocatoria
      ? '<span class="chip-convocatoria-badge">🏐 Convocatoria de juego</span>'
      : `<span class="comentario-estrellas">${'★'.repeat(c.rating || 5)}</span>`;

    item.innerHTML = `
      <div class="comentario-header">
        <strong>${escaparHTML(c.nombre)}</strong>
        ${headerBadge}
        <span class="comentario-fecha">${escaparHTML(c.fecha || 'Reciente')}</span>
      </div>
      <p class="comentario-texto">${escaparHTML(textoLimpio)}</p>
    `;
    lista.appendChild(item);
  });
}

export function configurarFicha() {
  const modal = document.getElementById('modalFicha');
  const btnCerrar = document.getElementById('btnCerrarFicha');
  if (!modal) return;

  btnCerrar?.addEventListener('click', cerrarFichaCancha);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarFichaCancha();
  });

  // Cerrar con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      cerrarFichaCancha();
    }
  });

  // Selector de coordenadas dentro de la ficha
  const selectCrs = document.getElementById('fichaCrsSelect');
  selectCrs?.addEventListener('change', () => {
    if (canchaActual) {
      const [lon, lat] = canchaActual.geometry.coordinates;
      actualizarCoordenadasFicha(lat, lon);
    }
  });

  // Botón Copiar Coordenadas
  document.getElementById('btnFichaCopiarCoords')?.addEventListener('click', () => {
    const texto = document.getElementById('fichaCoordTexto').textContent;
    navigator.clipboard.writeText(texto).then(() => {
      mostrarToast('📋 Coordenadas copiadas al portapapeles', 'exito');
    }).catch(() => {
      mostrarToast('No se pudieron copiar las coordenadas.', 'advertencia');
    });
  });

  // Botón Ver en Mapa desde la Ficha
  document.getElementById('btnFichaVerMapa')?.addEventListener('click', () => {
    if (!canchaActual) return;
    const [lon, lat] = canchaActual.geometry.coordinates;
    cerrarFichaCancha();
    const hero = document.getElementById('hero');
    hero?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      irACancha(lat, lon);
    }, 500);
  });

  // Botón Compartir Ficha
  document.getElementById('btnFichaCompartir')?.addEventListener('click', () => {
    if (!canchaActual) return;
    const url = `${window.location.origin}${window.location.pathname}#cancha=${canchaActual.properties.id}`;
    if (navigator.share) {
      navigator.share({
        title: `${canchaActual.properties.nombre} — VoleyPlaya AMVA`,
        text: `¡Mira esta cancha de vóley playa en ${canchaActual.properties.municipio}!`,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        mostrarToast('🔗 ¡Enlace de la cancha copiado al portapapeles!', 'exito');
      });
    }
  });

  // Botón Compartir Cancha (WhatsApp / Web Share API)
  document.getElementById('btnFichaCompartir')?.addEventListener('click', async () => {
    if (!canchaActual) return;
    const p = canchaActual.properties;
    const url = `${window.location.origin}${window.location.pathname}#cancha=${p.id}`;
    const titulo = `${p.nombre} — VoleyPlaya AMVA`;
    const texto = `¡Vamos a jugar vóley playa en ${p.nombre} (${p.municipio})! Mira la ubicación y horarios aquí:`;

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Error al compartir nativo:', err);
      }
    }

    // Fallback portapapeles
    try {
      await navigator.clipboard.writeText(`${texto} ${url}`);
      mostrarToast('Enlace copiado al portapapeles para compartir', 'exito');
    } catch {
      prompt('Copia este enlace para compartir:', `${texto} ${url}`);
    }
  });

  // Botón Reportar desde la Ficha
  document.getElementById('btnFichaReportar')?.addEventListener('click', () => {
    if (!canchaActual) return;
    const p = canchaActual.properties;
    cerrarFichaCancha();
    abrirModalReporte({ id: p.id, nombre: p.nombre });
  });

  // Botón Favorito dentro de la ficha
  document.getElementById('btnFichaFavorito')?.addEventListener('click', () => {
    if (!canchaActual) return;
    const p = canchaActual.properties;
    const esFav = toggleFavorito(p.id);
    const btn = document.getElementById('btnFichaFavorito');
    btn.classList.toggle('activo', esFav);
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="${esFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      <span>${esFav ? 'En favoritas' : 'Guardar'}</span>
    `;
    mostrarToast(esFav ? 'Agregada a tus canchas favoritas' : 'Eliminada de favoritas', 'favorito');

    // Sincronizar tarjeta en pantalla si existe
    const cardFavBtn = document.querySelector(`.btn-fav-card[data-id="${p.id}"]`);
    if (cardFavBtn) {
      cardFavBtn.classList.toggle('activo', esFav);
    }
  });

  // Selector de Tipo de Publicación (Reseña vs Convocatoria)
  const tipoSelect = document.getElementById('comentarioTipo');
  const ratingSelect = document.getElementById('comentarioRating');
  const textoInput = document.getElementById('comentarioTexto');

  tipoSelect?.addEventListener('change', () => {
    if (tipoSelect.value === 'convocatoria') {
      if (ratingSelect) ratingSelect.hidden = true;
      if (textoInput) textoInput.placeholder = '¿Cuándo y a qué hora quieres jugar? Ej: Este sábado 4:00 PM nos faltan 2 para jugar cuartetas.';
    } else {
      if (ratingSelect) ratingSelect.hidden = false;
      if (textoInput) textoInput.placeholder = '¿Cómo está la arena, la malla, la iluminación y la reserva?';
    }
  });

  // Formulario nuevo comentario o convocatoria
  const formComentario = document.getElementById('formNuevoComentario');
  formComentario?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canchaActual) return;

    const nombre = document.getElementById('comentarioNombre').value.trim();
    const texto = document.getElementById('comentarioTexto').value.trim();
    const esConvo = tipoSelect?.value === 'convocatoria';
    const rating = esConvo ? 5 : parseInt(ratingSelect?.value || '5', 10);

    if (!nombre || !texto) {
      mostrarToast('Por favor completa tu nombre y el mensaje.', 'advertencia');
      return;
    }

    const textoGuardar = esConvo ? `[CONVOCATORIA] ${texto}` : texto;

    const nuevo = {
      nombre,
      texto: textoGuardar,
      rating,
      fecha: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    };

    guardarComentarioLocal(canchaActual.properties.id, nuevo);

    // Intentar sincronizar con Supabase
    try {
      supabase.from('comentarios').insert({
        cancha_id: canchaActual.properties.id,
        nombre: nombre,
        comentario: textoGuardar,
        rating: rating
      }).then(({ error }) => {
        if (error) console.warn('Aviso Supabase comentarios:', error.message);
      });
    } catch (err) {
      console.warn('Error enviando comentario a Supabase:', err);
    }

    cargarComentariosCancha(canchaActual.properties.id);
    formComentario.reset();
    if (ratingSelect) ratingSelect.hidden = false;
    mostrarToast(esConvo ? '¡Convocatoria de juego publicada!' : '¡Reseña publicada con éxito!', 'exito');

    window.dispatchEvent(new CustomEvent('comentarioAgregado', {
      detail: { canchaId: canchaActual.properties.id, rating }
    }));
  });
}

