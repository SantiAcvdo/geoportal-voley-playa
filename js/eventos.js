// Guarda este archivo en: js/eventos.js
// Responsabilidad única: cargar y mostrar eventos publicados desde Supabase.

import { supabase } from './supabase.js';

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatearFecha(fecha) {
  if (!fecha) return 'Fecha por confirmar';

  const fechaLocal = new Date(`${fecha}T00:00:00`);
  return fechaLocal.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function crearTarjetaEvento(evento) {
  const imagen = evento.imagen_url?.trim();
  const imagenHTML = imagen
    ? `<img src="${escaparHTML(imagen)}" alt="${escaparHTML(evento.titulo)}" class="evento-imagen" loading="lazy">`
    : '<div class="evento-imagen evento-imagen-generica">🏐</div>';

  const enlace = evento.enlace_externo?.trim();
  const boton = enlace
    ? `<a class="evento-enlace" href="${escaparHTML(enlace)}" target="_blank" rel="noopener noreferrer">Más información</a>`
    : '';

  const tarjeta = document.createElement('article');
  tarjeta.className = 'evento-card';
  tarjeta.innerHTML = `
    ${imagenHTML}
    <div class="evento-contenido">
      <span class="evento-tipo">${escaparHTML(evento.tipo_evento || 'Evento')}</span>
      <h3>${escaparHTML(evento.titulo)}</h3>
      <p class="evento-resumen">${escaparHTML(evento.resumen)}</p>
      <div class="evento-dato">📅 ${escaparHTML(formatearFecha(evento.fecha_evento))}</div>
      <div class="evento-dato">🕒 ${escaparHTML(evento.hora_evento || 'Hora por confirmar')}</div>
      <div class="evento-dato">📍 ${escaparHTML(evento.lugar)}, ${escaparHTML(evento.municipio)}</div>
      ${evento.descripcion ? `<p class="evento-descripcion">${escaparHTML(evento.descripcion)}</p>` : ''}
      ${boton}
    </div>
  `;

  return tarjeta;
}

function mostrarEstado(mensaje, tipo = 'info') {
  const estado = document.getElementById('eventosEstado');
  estado.textContent = mensaje;
  estado.className = `eventos-estado ${tipo}`;
  estado.hidden = false;
}

export async function cargarEventos() {
  const contenedor = document.getElementById('eventosGrid');
  contenedor.innerHTML = '';
  mostrarEstado('Cargando eventos…');

  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('eventos')
    .select('id, titulo, resumen, descripcion, municipio, lugar, fecha_evento, hora_evento, tipo_evento, imagen_url, enlace_externo')
    .eq('publicado', true)
    .gte('fecha_evento', hoy)
    .order('fecha_evento', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Error cargando eventos:', error);
    mostrarEstado('No se pudieron cargar los eventos. Intenta nuevamente.', 'error');
    return;
  }

  if (!data || data.length === 0) {
    mostrarEstado('Todavía no hay eventos publicados.', 'vacio');
    return;
  }

  data.forEach(evento => contenedor.appendChild(crearTarjetaEvento(evento)));
  document.getElementById('eventosEstado').hidden = true;
}

export function configurarVentanaEventos() {
  const modal = document.getElementById('modalEventos');
  const abrir = document.getElementById('btnAbrirEventos');
  const cerrar = document.getElementById('btnCerrarEventos');

  abrir.addEventListener('click', async () => {
    modal.hidden = false;
    await cargarEventos();
  });

  cerrar.addEventListener('click', () => {
    modal.hidden = true;
  });

  modal.addEventListener('click', evento => {
    if (evento.target === modal) modal.hidden = true;
  });
}