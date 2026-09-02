// Guarda este archivo en: js/main.js
// Responsabilidad única: arrancar la aplicación y conectar todos los módulos.

import { definirSistemasDeCoordenadas } from './config.js';
import { cargarManual, cargarOverpass, FALLBACK_GEOJSON } from './api.js';
import { iniciarMapa, pintarCapa, irAResultados } from './mapa.js';
import { configurarFiltro } from './filtro.js';
import { renderizarTarjetas, actualizarStats } from './ui.js';
import { configurarNavbarMovil } from './navbar.js';
import { configurarComunidad } from './comunidad.js';
import { supabase } from './supabase.js';

let manualFeatures = [];
let osmFeatures = [];
let datosOriginales = { type: 'FeatureCollection', features: [] };
const loadingEl = document.getElementById('loadingState');
let temporizadorVuelo = null;

function refrescarVista() {
  datosOriginales = {
    type: 'FeatureCollection',
    features: [...manualFeatures, ...osmFeatures]
  };

  pintarCapa(datosOriginales);
  renderizarTarjetas(datosOriginales);
  actualizarStats(datosOriginales);
}

async function cargarPrimeroLoLocal() {
  loadingEl.textContent = 'Cargando canchas verificadas…';

  try {
    manualFeatures = await cargarManual();
  } catch (error) {
    console.error('Error cargando datos manuales:', error);
    manualFeatures = FALLBACK_GEOJSON.features;
  }

  refrescarVista();
  loadingEl.textContent =
    `${manualFeatures.length} cancha(s) verificada(s) ✓ · Buscando más en OpenStreetMap…`;
}

async function cargarLuegoOSM() {
  try {
    osmFeatures = await cargarOverpass();
    refrescarVista();

    loadingEl.textContent =
      `${manualFeatures.length} manual(es) + ${osmFeatures.length} OSM = ${datosOriginales.features.length} cancha(s) ✓`;
  } catch (error) {
    console.warn('Overpass no respondió a tiempo:', error);
    loadingEl.textContent =
      `${manualFeatures.length} cancha(s) verificada(s) ✓ (OpenStreetMap no respondió, usa "Recargar")`;
  }
}

async function recargarTodo() {
  osmFeatures = [];
  await cargarPrimeroLoLocal();
  await cargarLuegoOSM();
}

function alFiltrar(filtrado, textoBuscado) {
  pintarCapa(filtrado);
  renderizarTarjetas(filtrado);

  const hayBusqueda = textoBuscado && textoBuscado.trim().length > 0;

  if (!hayBusqueda) {
    loadingEl.textContent = `${filtrado.features.length} cancha(s) mostrada(s)`;
    return;
  }

  loadingEl.textContent = filtrado.features.length === 0
    ? `Sin resultados para "${textoBuscado}"`
    : `${filtrado.features.length} resultado(s) para "${textoBuscado}"`;

  window.clearTimeout(temporizadorVuelo);

  if (filtrado.features.length > 0) {
    temporizadorVuelo = window.setTimeout(() => {
      document.getElementById('hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
      irAResultados(filtrado);
    }, 400);
  }
}

async function verificarSupabase() {
  try {
    const { error } = await supabase.from('comentarios').select('id').limit(1);
    if (error) console.warn('Supabase respondió:', error.message);
  } catch (error) {
    console.warn('No se pudo verificar Supabase:', error.message);
  }
}

async function init() {
  definirSistemasDeCoordenadas();
  iniciarMapa();
  configurarFiltro(() => datosOriginales, alFiltrar);
  configurarNavbarMovil();
  configurarComunidad();

  document.getElementById('btnRecargarOSM').addEventListener('click', recargarTodo);

  await cargarPrimeroLoLocal();
  cargarLuegoOSM();
  verificarSupabase();
}

init();