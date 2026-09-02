// Guarda este archivo en: js/clubes-page.js
// Responsabilidad única: iniciar la página independiente de clubes.

import { cargarClubes } from './clubes.js';
import { configurarNavbarMovil } from './navbar.js';

async function iniciarPaginaClubes() {
  configurarNavbarMovil();
  await cargarClubes();
}

iniciarPaginaClubes();