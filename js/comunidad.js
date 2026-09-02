// Guarda este archivo en: js/comunidad.js
// Responsabilidad única: abrir el formulario de reportes y enviarlo a Supabase.

import { supabase } from './supabase.js';

let canchaSeleccionada = null;

function escaparHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function mostrarMensaje(texto, tipo = 'info') {
  const mensaje = document.getElementById('comunidadMensaje');
  mensaje.textContent = texto;
  mensaje.className = `comunidad-mensaje ${tipo}`;
  mensaje.hidden = false;
}

function cerrarModal() {
  const modal = document.getElementById('modalReporte');
  modal.hidden = true;
  document.getElementById('formReporte').reset();
  document.getElementById('comunidadMensaje').hidden = true;
  canchaSeleccionada = null;
}

export function abrirModalReporte(cancha) {
  canchaSeleccionada = cancha;

  document.getElementById('reporteCanchaNombre').textContent = cancha.nombre;
  document.getElementById('reporteCanchaId').textContent = `ID: ${cancha.id}`;
  document.getElementById('modalReporte').hidden = false;
  document.getElementById('reporteNombre').focus();
}

async function enviarReporte(evento) {
  evento.preventDefault();

  if (!canchaSeleccionada?.id) {
    mostrarMensaje('No se encontró el identificador de la cancha.', 'error');
    return;
  }

  const boton = document.getElementById('btnEnviarReporte');
  const nombre = document.getElementById('reporteNombre').value.trim();
  const tipo = document.getElementById('reporteTipo').value;
  const detalle = document.getElementById('reporteDetalle').value.trim();

  if (nombre.length < 2) {
    mostrarMensaje('Escribe un nombre válido.', 'error');
    return;
  }

  if (detalle.length < 5) {
    mostrarMensaje('Describe un poco mejor el problema.', 'error');
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Enviando…';
  document.getElementById('comunidadMensaje').hidden = true;

  const { error } = await supabase
    .from('reportes')
    .insert({
      cancha_id: canchaSeleccionada.id,
      nombre_reportante: nombre,
      tipo_reporte: tipo,
      detalle,
      resuelto: false
    });

  boton.disabled = false;
  boton.textContent = 'Enviar reporte';

  if (error) {
    console.error('Error enviando reporte:', error);
    mostrarMensaje(`No se pudo enviar el reporte: ${error.message}`, 'error');
    return;
  }

  mostrarMensaje('Reporte enviado. Gracias por ayudarnos a mantener la información actualizada.', 'exito');
  document.getElementById('formReporte').reset();
}

export function configurarComunidad() {
  document.getElementById('btnCerrarReporte').addEventListener('click', cerrarModal);
  document.getElementById('btnCancelarReporte').addEventListener('click', cerrarModal);
  document.getElementById('formReporte').addEventListener('submit', enviarReporte);

  document.getElementById('modalReporte').addEventListener('click', evento => {
    if (evento.target.id === 'modalReporte') cerrarModal();
  });
}