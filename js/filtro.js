// Guarda este archivo en: js/filtro.js
// Responsabilidad única: filtrado avanzado (texto, municipio, tipo, costo, reserva, favoritas),
// ordenamiento y autocompletado/sugerencias de búsqueda.

import { esFavorita } from './favoritos.js';
import { obtenerUbicacionUsuario, calcularDistanciaKm } from './geolocalizacion.js';

export function normalizar(texto) {
  return (texto || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function coincideTexto(feature, textoBuscado) {
  if (!textoBuscado) return true;
  const q = normalizar(textoBuscado);
  const p = feature.properties || {};
  const campos = [p.nombre, p.barrio, p.municipio, p.tipo, p.acceso, p.condicion_acceso];
  return campos.some(campo => normalizar(campo).includes(q));
}

export function filtrarColeccion(geojson, criterios = {}) {
  if (!geojson || !geojson.features) return { type: 'FeatureCollection', features: [] };

  const {
    texto = '',
    municipio = 'todos',
    tipo = 'todos',
    costo = 'todos',
    reserva = 'todos',
    soloFavoritas = false,
    orden = 'relevancia'
  } = criterios;

  const ubicacion = obtenerUbicacionUsuario();

  // Filtrar
  let features = geojson.features.filter(f => {
    const p = f.properties || {};

    // 1. Texto libre
    if (!coincideTexto(f, texto)) return false;

    // 2. Municipio
    if (municipio !== 'todos') {
      const muniNorm = normalizar(p.municipio);
      if (muniNorm !== normalizar(municipio)) return false;
    }

    // 3. Tipo
    if (tipo !== 'todos') {
      const tipoNorm = normalizar(p.tipo);
      if (tipoNorm !== normalizar(tipo)) return false;
    }

    // 4. Costo
    if (costo !== 'todos') {
      const costoVal = (p.costo || '').toLowerCase();
      if (costo === 'gratis' && !costoVal.includes('gratuito')) return false;
      if (costo === 'pago' && !costoVal.includes('costo') && !costoVal.includes('variable')) return false;
    }

    // 5. Reserva
    if (reserva !== 'todos') {
      if (reserva === 'si' && p.reserva_requerida !== true) return false;
      if (reserva === 'no' && p.reserva_requerida === true) return false;
    }

    // 6. Favoritas
    if (soloFavoritas) {
      if (!esFavorita(p.id)) return false;
    }

    return true;
  });

  // Calcular distancia si hay ubicación
  features.forEach(f => {
    if (ubicacion && f.geometry && f.geometry.coordinates) {
      const [lon, lat] = f.geometry.coordinates;
      f.distanciaKm = calcularDistanciaKm(ubicacion.lat, ubicacion.lon, lat, lon);
    } else {
      delete f.distanciaKm;
    }
  });

  // Ordenar
  if (orden === 'distancia' && ubicacion) {
    features.sort((a, b) => (a.distanciaKm || 9999) - (b.distanciaKm || 9999));
  } else if (orden === 'nombre_asc') {
    features.sort((a, b) => (a.properties.nombre || '').localeCompare(b.properties.nombre || ''));
  } else if (orden === 'nombre_desc') {
    features.sort((a, b) => (b.properties.nombre || '').localeCompare(a.properties.nombre || ''));
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

export function configurarFiltro(obtenerDatosOriginales, alFiltrar) {
  const inputFiltro = document.getElementById('filtro');
  const btnFiltrar = document.getElementById('btnFiltrar');
  const btnReset = document.getElementById('btnReset');
  const selectMunicipio = document.getElementById('filtroMunicipio');
  const selectTipo = document.getElementById('filtroTipo');
  const selectCosto = document.getElementById('filtroCosto');
  const selectOrden = document.getElementById('filtroOrden');
  const btnSoloFavoritas = document.getElementById('btnFiltroFavoritas');
  const sugerenciasEl = document.getElementById('sugerenciasBusqueda');

  let estadoFiltros = {
    texto: '',
    municipio: 'todos',
    tipo: 'todos',
    costo: 'todos',
    reserva: 'todos',
    soloFavoritas: false,
    orden: 'relevancia'
  };

  function ejecutarFiltro() {
    const datos = obtenerDatosOriginales();
    if (!datos) return;

    estadoFiltros.texto = inputFiltro ? inputFiltro.value : '';
    estadoFiltros.municipio = selectMunicipio ? selectMunicipio.value : 'todos';
    estadoFiltros.tipo = selectTipo ? selectTipo.value : 'todos';
    estadoFiltros.costo = selectCosto ? selectCosto.value : 'todos';
    estadoFiltros.orden = selectOrden ? selectOrden.value : 'relevancia';

    const filtrado = filtrarColeccion(datos, estadoFiltros);
    alFiltrar(filtrado, estadoFiltros.texto, estadoFiltros);
  }

  // Event listeners
  btnFiltrar?.addEventListener('click', ejecutarFiltro);
  selectMunicipio?.addEventListener('change', ejecutarFiltro);
  selectTipo?.addEventListener('change', ejecutarFiltro);
  selectCosto?.addEventListener('change', ejecutarFiltro);
  selectOrden?.addEventListener('change', ejecutarFiltro);

  inputFiltro?.addEventListener('input', () => {
    actualizarSugerencias();
    ejecutarFiltro();
  });

  inputFiltro?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      ocultarSugerencias();
      ejecutarFiltro();
    }
  });

  // Sugerencias de autocompletado
  function actualizarSugerencias() {
    if (!sugerenciasEl || !inputFiltro) return;
    const val = normalizar(inputFiltro.value);
    if (val.length < 2) {
      ocultarSugerencias();
      return;
    }

    const datos = obtenerDatosOriginales();
    if (!datos || !datos.features) return;

    const matches = [];
    datos.features.forEach(f => {
      const p = f.properties || {};
      if (matches.length >= 6) return;
      if (normalizar(p.nombre).includes(val) || normalizar(p.barrio).includes(val)) {
        matches.push({
          id: p.id,
          titulo: p.nombre,
          sub: [p.barrio, p.municipio].filter(Boolean).join(', ')
        });
      }
    });

    if (matches.length === 0) {
      ocultarSugerencias();
      return;
    }

    sugerenciasEl.innerHTML = matches.map(m => `
      <div class="sugerencia-item" data-id="${m.id}" data-titulo="${m.titulo}">
        <span class="sugerencia-icono">🏐</span>
        <div class="sugerencia-texto">
          <strong>${m.titulo}</strong>
          <small>${m.sub}</small>
        </div>
      </div>
    `).join('');

    sugerenciasEl.hidden = false;

    sugerenciasEl.querySelectorAll('.sugerencia-item').forEach(item => {
      item.addEventListener('click', () => {
        inputFiltro.value = item.getAttribute('data-titulo');
        ocultarSugerencias();
        ejecutarFiltro();
      });
    });
  }

  function ocultarSugerencias() {
    if (sugerenciasEl) sugerenciasEl.hidden = true;
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-row') && !e.target.closest('#sugerenciasBusqueda')) {
      ocultarSugerencias();
    }
  });

  // Toggle Solo Favoritas
  btnSoloFavoritas?.addEventListener('click', () => {
    estadoFiltros.soloFavoritas = !estadoFiltros.soloFavoritas;
    btnSoloFavoritas.classList.toggle('activo', estadoFiltros.soloFavoritas);
    ejecutarFiltro();
  });

  // Botón Reset
  btnReset?.addEventListener('click', () => {
    if (inputFiltro) inputFiltro.value = '';
    if (selectMunicipio) selectMunicipio.value = 'todos';
    if (selectTipo) selectTipo.value = 'todos';
    if (selectCosto) selectCosto.value = 'todos';
    if (selectOrden) selectOrden.value = 'relevancia';
    estadoFiltros.soloFavoritas = false;
    btnSoloFavoritas?.classList.remove('activo');
    ocultarSugerencias();
    ejecutarFiltro();
  });

  // Acciones rápidas del hero
  document.querySelectorAll('.hero-pill-filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipoAccion = btn.getAttribute('data-filtro');
      if (tipoAccion === 'gratis') {
        if (selectCosto) selectCosto.value = 'gratis';
      } else if (tipoAccion === 'favoritas') {
        estadoFiltros.soloFavoritas = true;
        btnSoloFavoritas?.classList.add('activo');
      } else if (tipoAccion === 'publicas') {
        if (selectTipo) selectTipo.value = 'Pública';
      }
      ejecutarFiltro();
      const tarjetasSec = document.getElementById('tarjetas');
      tarjetasSec?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  return { ejecutarFiltro };
}
