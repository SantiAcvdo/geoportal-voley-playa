// Guarda este archivo en: js/toast.js
// Responsabilidad única: mostrar notificaciones toast discretas y modernas.

let contenedorToast = null;

function obtenerContenedor() {
  if (!contenedorToast) {
    contenedorToast = document.getElementById('toastContainer');
    if (!contenedorToast) {
      contenedorToast = document.createElement('div');
      contenedorToast.id = 'toastContainer';
      contenedorToast.className = 'toast-container';
      document.body.appendChild(contenedorToast);
    }
  }
  return contenedorToast;
}

export function mostrarToast(mensaje, tipo = 'info', duracion = 3200) {
  const contenedor = obtenerContenedor();
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo} toast-enter`;

  const iconos = {
    info: 'ℹ️',
    exito: '✅',
    advertencia: '⚠️',
    error: '❌',
    favorito: '❤️',
    gps: '📍'
  };

  const icono = iconos[tipo] || 'ℹ️';

  toast.innerHTML = `
    <span class="toast-icono">${icono}</span>
    <span class="toast-mensaje">${mensaje}</span>
  `;

  contenedor.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-visible');
  });

  // Temporizador para salida
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duracion);
}

