// Guarda este archivo en: js/main.js
// Responsabilidad única: arrancar la aplicación y conectar todos los módulos.
// CARGA PROGRESIVA: primero se pintan las canchas manuales (rápidas),
// y las de OSM se agregan después sin bloquear la primera vista.

import { definirSistemasDeCoordenadas } from './config.js';
import { cargarManual, cargarOverpass, FALLBACK_GEOJSON } from './api.js';
import { iniciarMapa, pintarCapa } from './mapa.js';
import { configurarFiltro } from './filtro.js';
import { renderizarTarjetas, actualizarStats } from './ui.js';

let manualFeatures = [];
let osmFeatures = [];
let datosOriginales = { type: "FeatureCollection", features: [] };
const loadingEl = document.getElementById('loadingState');

function refrescarVista() {
  datosOriginales = {
    type: "FeatureCollection",
    features: [...manualFeatures, ...osmFeatures]
  };
  pintarCapa(datosOriginales);
  renderizarTarjetas(datosOriginales);
  actualizarStats(datosOriginales);
}

// Paso 1: pintar de inmediato lo que ya tenemos localmente (rápido)
async function cargarPrimeroLoLocal() {
  loadingEl.textContent = 'Cargando canchas verificadas…';
  try {
    manualFeatures = await cargarManual();
  } catch (err) {
    console.error('Error cargando datos manuales:', err);
    manualFeatures = FALLBACK_GEOJSON.features; // último recurso
  }
  refrescarVista();
  loadingEl.textContent = `${manualFeatures.length} cancha(s) verificada(s) ✓ · Buscando más en OpenStreetMap…`;
}

// Paso 2: en segundo plano, sumar lo que traiga Overpass (puede tardar)
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

function alFiltrar(filtrado, textoBuscado) {
  pintarCapa(filtrado);
  renderizarTarjetas(filtrado);
  if (textoBuscado && textoBuscado.trim()) {
    loadingEl.textContent = filtrado.features.length === 0
      ? `Sin resultados para "${textoBuscado}"`
      : `${filtrado.features.length} resultado(s) para "${textoBuscado}"`;
  }
}

async function init() {
  definirSistemasDeCoordenadas();
  iniciarMapa();
  configurarFiltro(() => datosOriginales, alFiltrar);
  document.getElementById('btnRecargarOSM').addEventListener('click', recargarTodo);

  // No se espera (await) la cadena completa: se dispara y la UI ya
  // reacciona en cuanto cargarPrimeroLoLocal() termina, sin esperar a Overpass.
  await cargarPrimeroLoLocal();
  cargarLuegoOSM();
}

init();