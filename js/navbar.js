// Guarda este archivo en: js/navbar.js
// Responsabilidad única: menú hamburguesa para pantallas pequeñas (celular).

export function configurarNavbarMovil() {
  const btn = document.getElementById('btnMenuMovil');
  const links = document.getElementById('navLinks');

  btn.addEventListener('click', () => {
    links.classList.toggle('abierto');
    btn.textContent = links.classList.contains('abierto') ? '✕' : '☰';
  });

  // Cierra el menú automáticamente al tocar un link (mejor UX en celular)
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('abierto');
      btn.textContent = '☰';
    });
  });
}
