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
  btnFav.innerHTML = favActiva ? '❤️ Guardada en favoritas' : '🤍 Añadir a favoritas';

  // Amenidades y Servicios
  const serv = p.servicios || {};
  document.getElementById('fichaArena').textContent = serv.tipo_arena || 'Arena deportiva de río / sílice';
  document.getElementById('fichaNumCanchas').textContent = serv.num_canchas ? `${serv.num_canchas} cancha(s)` : '1 o más canchas';
  document.getElementById('fichaIluminacion').textContent = serv.iluminacion ? '✅ Disponible (juego nocturno)' : '⚠️ Solo luz natural / no confirmada';
  document.getElementById('fichaDuchas').textContent = serv.duchas ? '✅ Duchas y vestuarios disponibles' : '❌ Sin duchas exclusivas';
  document.getElementById('fichaParqueadero').textContent = serv.parqueadero ? '✅ Parqueadero en el complejo' : '⚠️ En vía pública / zonas aledañas';
  document.getElementById('fichaAccesibilidad').textContent = serv.accesibilidad ? '✅ Rampa y acceso PMR' : '⚠️ Acceso peatonal estándar';

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
    btnReserva.textContent = linkReserva.includes('inder.gov.co') ? '📅 Reservar en INDER SIMON' : '💬 Reservar vía Web / WhatsApp';
  } else if (linkReserva && linkReserva.startsWith('mailto:')) {
    btnReserva.href = linkReserva;
    btnReserva.hidden = false;
    btnReserva.textContent = '✉️ Solicitar reserva por correo';
  } else {
    btnReserva.hidden = true;
  }

  // Botón Cómo llegar (Google Maps)
  const btnComoLlegar = document.getElementById('btnFichaComoLlegar');
  btnComoLlegar.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

  // Coordenadas con selector
  actualizarCoordenadasFicha(lat, lon);

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
    item.className = 'comentario-item';
    const estrellas = '⭐'.repeat(c.rating || 5);
    item.innerHTML = `
      <div class="comentario-header">
        <strong>${escaparHTML(c.nombre)}</strong>
        <span class="comentario-estrellas">${estrellas}</span>
        <span class="comentario-fecha">${escaparHTML(c.fecha || 'Reciente')}</span>
      </div>
      <p class="comentario-texto">${escaparHTML(c.texto)}</p>
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
    btn.innerHTML = esFav ? '❤️ Guardada en favoritas' : '🤍 Añadir a favoritas';
    mostrarToast(esFav ? `❤️ Agregada a tus favoritas` : `🤍 Eliminada de favoritas`, 'favorito');

    // Sincronizar tarjeta en pantalla si existe
    const cardFavBtn = document.querySelector(`.btn-fav-card[data-id="${p.id}"]`);
    if (cardFavBtn) {
      cardFavBtn.classList.toggle('activo', esFav);
    }
  });

  // Formulario nuevo comentario
  const formComentario = document.getElementById('formNuevoComentario');
  formComentario?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!canchaActual) return;

    const nombre = document.getElementById('comentarioNombre').value.trim();
    const texto = document.getElementById('comentarioTexto').value.trim();
    const rating = parseInt(document.getElementById('comentarioRating').value || '5', 10);

    if (!nombre || !texto) {
      mostrarToast('Por favor completa tu nombre y comentario.', 'advertencia');
      return;
    }

    const nuevo = {
      nombre,
      texto,
      rating,
      fecha: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    };

    guardarComentarioLocal(canchaActual.properties.id, nuevo);

    // Intentar sincronizar con Supabase
    try {
      supabase.from('comentarios').insert({
        cancha_id: canchaActual.properties.id,
        nombre: nombre,
        comentario: texto,
        rating: rating
      }).then(({ error }) => {
        if (error) console.warn('Aviso Supabase comentarios:', error.message);
      });
    } catch (err) {
      console.warn('Error enviando comentario a Supabase:', err);
    }

    cargarComentariosCancha(canchaActual.properties.id);
    formComentario.reset();
    mostrarToast('✅ ¡Comentario publicado con éxito!', 'exito');
  });
}

