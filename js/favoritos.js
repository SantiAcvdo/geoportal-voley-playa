// Guarda este archivo en: js/favoritos.js
// Responsabilidad única: gestionar el guardado y consulta de canchas favoritas en localStorage.

const STORAGE_KEY = 'voleyplaya_amva_favoritos';

export function obtenerFavoritos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error leyendo favoritos de localStorage:', e);
    return [];
  }
}

export function esFavorita(id) {
  if (!id) return false;
  const favs = obtenerFavoritos();
  return favs.includes(String(id));
}

export function toggleFavorito(id) {
  if (!id) return false;
  const favs = obtenerFavoritos();
  const idStr = String(id);
  const index = favs.indexOf(idStr);
  let ahoraEsFavorita = false;

  if (index >= 0) {
    favs.splice(index, 1);
    ahoraEsFavorita = false;
  } else {
    favs.push(idStr);
    ahoraEsFavorita = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch (e) {
    console.warn('Error guardando favorito en localStorage:', e);
  }

  actualizarContadorFavoritos();
  return ahoraEsFavorita;
}

export function actualizarContadorFavoritos() {
  const favs = obtenerFavoritos();
  const count = favs.length;
  
  const badges = document.querySelectorAll('.fav-count-badge');
  badges.forEach(badge => {
    badge.textContent = count;
    badge.hidden = count === 0;
  });

  const statFavs = document.getElementById('statFavoritos');
  if (statFavs) {
    statFavs.textContent = count;
  }
}

