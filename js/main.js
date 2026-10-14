// Guarda este archivo en: js/main.js
// Responsabilidad única: inicializar módulos, coordinar carga de datos y eventos principales.

import { definirSistemasDeCoordenadas } from './config.js';
import { cargarManual, cargarOverpass, FALLBACK_GEOJSON } from './api.js';
import { iniciarMapa, pintarCapa, irAResultados, irACancha } from './mapa.js';
import { configurarFiltro } from './filtro.js';
import { renderizarTarjetas, actualizarStats, renderizarSkeletons } from './ui.js';
import { configurarNavbarMovil } from './navbar.js';
import { configurarComunidad } from './comunidad.js';
import { configurarVentanaEventos } from './eventos.js';
import { configurarFicha, abrirFichaCancha } from './ficha.js';
import { actualizarContadorFavoritos } from './favoritos.js';
import { solicitarGeolocalizacion, obtenerUbicacionUsuario } from './geolocalizacion.js';
import { mostrarToast } from './toast.js';
import { supabase } from './supabase.js';

let manualFeatures = [];
let osmFeatures = [];
let datosOriginales = { type: 'FeatureCollection', features: [] };
let filtroControlador = null;

const loadingEl = document.getElementById('loadingState');
let temporizadorVuelo = null;

function refrescarVista(mantenerFiltros = true) {
  datosOriginales = { type: 'FeatureCollection', features: [...manualFeatures, ...osmFeatures] };
  
  if (mantenerFiltros && filtroControlador) {
    filtroControlador.ejecutarFiltro();
  } else {
    pintarCapa(datosOriginales);
    renderizarTarjetas(datosOriginales);
  }

  actualizarStats(datosOriginales);
  verificarHashInicial();
}

async function cargarPrimeroLoLocal() {
  if (loadingEl) loadingEl.textContent = 'Cargando canchas verificadas del AMVA…';
  renderizarSkeletons(6);

  try {
    manualFeatures = await cargarManual();
  } catch (error) {
    console.error('Error cargando datos manuales:', error);
    manualFeatures = FALLBACK_GEOJSON.features;
  }

  refrescarVista(false);
  if (loadingEl) {
    loadingEl.textContent = `${manualFeatures.length} canchas verificadas ✓ · Buscando datos en OpenStreetMap…`;
  }
}

async function cargarLuegoOSM() {
  try {
    osmFeatures = await cargarOverpass(14000);
    refrescarVista(true);
    if (loadingEl) {
      loadingEl.textContent = `${manualFeatures.length} verificadas + ${osmFeatures.length} OSM = ${datosOriginales.features.length} canchas totales ✓`;
    }
  } catch (error) {
    console.warn('Overpass no respondió:', error);
    if (loadingEl) {
      loadingEl.textContent = `${manualFeatures.length} canchas verificadas activas (OSM en espera, pulsa "Recargar")`;
    }
    mostrarToast('OpenStreetMap tardó en responder. Mostrando las 20 canchas verificadas.', 'info', 4000);
  }
}

async function recargarTodo() {
  osmFeatures = [];
  mostrarToast('Actualizando datos de canchas…', 'info');
  await cargarPrimeroLoLocal();
  await cargarLuegoOSM();
}

function alFiltrar(filtrado, textoBuscado, criterios) {
  pintarCapa(filtrado);
  renderizarTarjetas(filtrado);

  const hayTexto = textoBuscado && textoBuscado.trim().length > 0;
  const hayFiltrosActivos = criterios.municipio !== 'todos' || criterios.tipo !== 'todos' || criterios.costo !== 'todos' || criterios.soloFavoritas;

  if (loadingEl) {
    if (filtrado.features.length === 0) {
      loadingEl.textContent = 'Sin resultados para los filtros actuales';
    } else if (hayTexto || hayFiltrosActivos) {
      loadingEl.textContent = `Mostrando ${filtrado.features.length} de ${datosOriginales.features.length} canchas`;
    } else {
      loadingEl.textContent = `${filtrado.features.length} cancha(s) disponible(s)`;
    }
  }

  window.clearTimeout(temporizadorVuelo);
  if (hayTexto && filtrado.features.length > 0) {
    temporizadorVuelo = window.setTimeout(() => {
      irAResultados(filtrado);
    }, 450);
  }
}

// Comprueba si la URL contiene #cancha=id para abrir la ficha directamente
function verificarHashInicial() {
  const hash = window.location.hash;
  if (!hash.startsWith('#cancha=')) return;

  const canchaId = hash.replace('#cancha=', '').trim();
  if (!canchaId || !datosOriginales.features.length) return;

  const match = datosOriginales.features.find(f => f.properties.id === canchaId);
  if (match) {
    setTimeout(() => {
      abrirFichaCancha(match);
      const [lon, lat] = match.geometry.coordinates;
      irACancha(lat, lon);
    }, 300);
  }
}

// Configurar modales informativos (Guía INDER y Sobre el proyecto)
function configurarModalesInformativos() {
  // Modal Guía INDER
  const modalGuia = document.getElementById('modalGuiaInder');
  const btnAbrirGuia = document.getElementById('btnAbrirGuiaInder');
  const btnCerrarGuia = document.getElementById('btnCerrarGuiaInder');

  btnAbrirGuia?.addEventListener('click', () => {
    if (modalGuia) modalGuia.hidden = false;
  });
  btnCerrarGuia?.addEventListener('click', () => {
    if (modalGuia) modalGuia.hidden = true;
  });
  modalGuia?.addEventListener('click', (e) => {
    if (e.target === modalGuia) modalGuia.hidden = true;
  });

  // Modal Sobre el proyecto
  const modalSobre = document.getElementById('modalSobre');
  const btnAbrirSobre = document.getElementById('btnAbrirSobre');
  const btnCerrarSobre = document.getElementById('btnCerrarSobre');

  btnAbrirSobre?.addEventListener('click', () => {
    if (modalSobre) modalSobre.hidden = false;
  });
  btnCerrarSobre?.addEventListener('click', () => {
    if (modalSobre) modalSobre.hidden = true;
  });
  modalSobre?.addEventListener('click', (e) => {
    if (e.target === modalSobre) modalSobre.hidden = true;
  });

  // Tecla Escape para modales informativos
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalGuia && !modalGuia.hidden) modalGuia.hidden = true;
      if (modalSobre && !modalSobre.hidden) modalSobre.hidden = true;
    }
  });
}

// Configurar botón "Canchas cerca de mí" con GPS
function configurarGeolocalizacionUI() {
  const botonesGPS = [
    document.getElementById('btnGpsHero'),
    document.getElementById('btnGpsSearch'),
    document.getElementById('btnGpsMap')
  ].filter(Boolean);

  botonesGPS.forEach(btn => {
    btn.addEventListener('click', () => {
      solicitarGeolocalizacion(
        () => {
          // Si el filtro de orden está disponible, cambiar a distancia
          const selectOrden = document.getElementById('filtroOrden');
          if (selectOrden) selectOrden.value = 'distancia';
          if (filtroControlador) filtroControlador.ejecutarFiltro();
        },
        () => {}
      );
    });
  });
}

// Configurar botón de favoritas en navbar
function configurarFavoritosNav() {
  const btnFavNav = document.getElementById('btnNavFavoritos');
  btnFavNav?.addEventListener('click', () => {
    const btnSoloFav = document.getElementById('btnFiltroFavoritas');
    if (btnSoloFav) {
      btnSoloFav.click();
      document.getElementById('tarjetas')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// FAQ Accordion
function configurarFAQ() {
  const items = document.querySelectorAll('.faq-item-header');
  items.forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      const isOpen = parent.classList.contains('activo');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('activo'));
      if (!isOpen) {
        parent.classList.add('activo');
      }
    });
  });
}

async function init() {
  definirSistemasDeCoordenadas();
  iniciarMapa();
  actualizarContadorFavoritos();

  filtroControlador = configurarFiltro(() => datosOriginales, alFiltrar);
  configurarNavbarMovil();
  configurarComunidad();
  configurarVentanaEventos();
  configurarFicha();
  configurarModalesInformativos();
  configurarGeolocalizacionUI();
  configurarFavoritosNav();
  configurarFAQ();

  document.getElementById('btnRecargarOSM')?.addEventListener('click', recargarTodo);

  window.addEventListener('hashchange', verificarHashInicial);

  await cargarPrimeroLoLocal();
  cargarLuegoOSM();
}

init();