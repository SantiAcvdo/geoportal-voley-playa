// Guarda este archivo en: js/main.js
// Responsabilidad única: arrancar la aplicación y conectar todos los módulos.
// Este es el único archivo que "sabe" de todos los demás.

import { definirSistemasDeCoordenadas } from './config.js';
import { cargarTodasLasCanchas } from './api.js';
import { iniciarMapa, pintarCapa } from './mapa.js';
import { configurarFiltro } from './filtro.js';
import { renderizarTarjetas, actualizarStats } from './ui.js';

let datosOriginales = null;
const loadingEl = document.getElementById('loadingState');

async function recargarDatos() {
  loadingEl.textContent = 'Cargando datos…';
  const { todas, totalOSM, totalManual } = await cargarTodasLasCanchas();
  datosOriginales = todas;

  pintarCapa(datosOriginales);
  renderizarTarjetas(datosOriginales);
  actualizarStats(datosOriginales);

  loadingEl.textContent = `${totalManual} manual(es) + ${totalOSM} OSM = ${todas.features.length} cancha(s) ✓`;
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
  document.getElementById('btnRecargarOSM').addEventListener('click', recargarDatos);
  await recargarDatos();
}

init();
