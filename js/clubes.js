// Guarda este archivo en: js/clubes.js
// Responsabilidad única: cargar y pintar publicaciones de clubes desde Supabase.

import { supabase } from './supabase.js';

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function crearTarjetaClub(publicacion) {
  const imagen = publicacion.imagen_url?.trim();

  const imagenHTML = imagen
    ? `
      <img
        src="${escaparHTML(imagen)}"
        alt="${escaparHTML(publicacion.nombre_club)}"
        class="club-imagen"
        loading="lazy"
      />
    `
    : `
      <div class="club-imagen club-imagen-generica">
        🏐
      </div>
    `;

  const instagram = publicacion.instagram_url?.trim();
  const contacto = publicacion.contacto_url?.trim();

  const enlaces = [
    instagram
      ? `
        <a href="${escaparHTML(instagram)}"
           target="_blank"
           rel="noopener noreferrer">
          Instagram
        </a>
      `
      : '',

    contacto
      ? `
        <a href="${escaparHTML(contacto)}"
           target="_blank"
           rel="noopener noreferrer">
          Contacto
        </a>
      `
      : ''
  ].filter(Boolean).join('');

  const tarjeta = document.createElement('article');
  tarjeta.className = 'club-card';

  tarjeta.innerHTML = `
    ${imagenHTML}

    <div class="club-contenido">
      <span class="club-etiqueta">
        ${escaparHTML(publicacion.nombre_club)}
      </span>

      <h3>${escaparHTML(publicacion.titulo)}</h3>

      <p class="club-resumen">
        ${escaparHTML(publicacion.resumen)}
      </p>

      <div class="club-dato">
        📍 ${escaparHTML(publicacion.municipio)}
      </div>

      ${
        publicacion.cancha_nombre
          ? `
            <div class="club-dato">
              🏐 Entrena en:
              ${escaparHTML(publicacion.cancha_nombre)}
            </div>
          `
          : ''
      }

      ${
        publicacion.contenido
          ? `
            <p class="club-contenido-texto">
              ${escaparHTML(publicacion.contenido)}
            </p>
          `
          : ''
      }

      ${
        enlaces
          ? `<div class="club-enlaces">${enlaces}</div>`
          : ''
      }
    </div>
  `;

  return tarjeta;
}

function mostrarEstadoClubes(mensaje, tipo = 'info') {
  const estado = document.getElementById('clubesEstado');

  estado.textContent = mensaje;
  estado.className = `clubes-estado ${tipo}`;
  estado.hidden = false;
}

export async function cargarClubes() {
  const grid = document.getElementById('clubesGrid');

  grid.innerHTML = '';
  mostrarEstadoClubes('Cargando publicaciones…');

  const { data, error } = await supabase
    .from('clubes_blog')
    .select(`
      id,
      nombre_club,
      titulo,
      resumen,
      contenido,
      municipio,
      cancha_nombre,
      imagen_url,
      instagram_url,
      contacto_url,
      fecha_publicacion
    `)
    .eq('publicado', true)
    .order('fecha_publicacion', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error cargando clubes:', error);
    mostrarEstadoClubes(
      'No se pudieron cargar las publicaciones.',
      'error'
    );
    return;
  }

  if (!data || data.length === 0) {
    mostrarEstadoClubes(
      'Todavía no hay publicaciones de clubes.',
      'vacio'
    );
    return;
  }

  data.forEach(publicacion => {
    grid.appendChild(crearTarjetaClub(publicacion));
  });

  document.getElementById('clubesEstado').hidden = true;
}