// Guarda este archivo en: js/main.js
// Responsabilidad única: arrancar la aplicación y conectar todos los módulos.
// CARGA PROGRESIVA: primero se pintan las canchas manuales (rápidas),
// y las de OSM se agregan después sin bloquear la primera vista.

import { definirSistemasDeCoordenadas } from './config.js';
import { cargarManual, cargarOverpass, FALLBACK_GEOJSON } from './api.js';
import { iniciarMapa, pintarCapa, irAResultados } from './mapa.js';
import { configurarFiltro } from './filtro.js';
import { renderizarTarjetas, actualizarStats } from './ui.js';
import { configurarNavbarMovil } from './navbar.js';

let manualFeatures = [];
let osmFeatures = [];
let datosOriginales = { type: "FeatureCollection", features: [] };
const loadingEl = document.getElementById('loadingState');
let temporizadorVuelo = null;

function refrescarVista() {
  datosOriginales = {
    type: "FeatureCollection",
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
  } catch (err) {
    console.error('Error cargando datos manuales:', err);
    manualFeatures = FALLBACK_GEOJSON.features;
  }
  refrescarVista();
  loadingEl.textContent = `${manualFeatures.length} cancha(s) verificada(s) ✓ · Buscando más en OpenStreetMap…`;
}

async function cargarLuegoOSM() {
  try {
    osmFeatures = await cargarOverpass();
    refrescarVista();
    loadingEl.textContent =
      `${manualFeatures.length} manual(es) + ${osmFeatures.length} OSM = ${datosOriginales.features.length} cancha(s) ✓`;
  } catch (err) {
    console.warn('Overpass no respondió a tiempo, se mantienen solo las canchas verificadas:', err);
    loadingEl.textContent =
      `${manualFeatures.length} cancha(s) verificada(s) ✓ (OpenStreetMap no respondió, usa "Recargar")`;
  }
}

async function recargarTodo() {
  await cargarPrimeroLoLocal();
  await cargarLuegoOSM();
}

// Se ejecuta cada vez que el buscador filtra resultados.
function alFiltrar(filtrado, textoBuscado) {
  pintarCapa(filtrado);
  renderizarTarjetas(filtrado);

  const hayBusqueda = textoBuscado && textoBuscado.trim().length > 0;

  if (hayBusqueda) {
    loadingEl.textContent = filtrado.features.length === 0
      ? `Sin resultados para "${textoBuscado}"`
      : `${filtrado.features.length} resultado(s) para "${textoBuscado}"`;

    // Debounce: espera a que el usuario deje de escribir 400ms antes de
    // mover el mapa, para que no "salte" con cada letra que teclea.
    window.clearTimeout(temporizadorVuelo);
    if (filtrado.features.length > 0) {
      temporizadorVuelo = window.setTimeout(() => {
        document.getElementById('hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
        irAResultados(filtrado);
      }, 400);
    }
  } else {
    // Búsqueda vacía (botón "Limpiar" o input borrado): no mover el mapa.
    loadingEl.textContent = `${filtrado.features.length} cancha(s) mostrada(s)`;
  }
}

async function init() {
  definirSistemasDeCoordenadas();
  iniciarMapa();
  configurarFiltro(() => datosOriginales, alFiltrar);
  configurarNavbarMovil();
  document.getElementById('btnRecargarOSM').addEventListener('click', recargarTodo);

  await cargarPrimeroLoLocal();
  cargarLuegoOSM();
}

init();