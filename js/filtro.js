// Guarda este archivo en: js/filtro.js
// Responsabilidad única: normalizar texto y filtrar el FeatureCollection (prefiltro flexible).

function normalizar(texto) {
  return (texto || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function coincide(feature, textoBuscado) {
  const q = normalizar(textoBuscado);
  const p = feature.properties;
  const campos = [p.nombre, p.barrio, p.municipio, p.tipo];
  return campos.some(campo => normalizar(campo).includes(q));
}

export function filtrarDatos(geojson, textoBuscado) {
  if (!normalizar(textoBuscado)) return geojson;
  return {
    type: "FeatureCollection",
    features: geojson.features.filter(f => coincide(f, textoBuscado))
  };
}

// Conecta los inputs/botones del DOM con una función de callback que recibe
// el FeatureCollection ya filtrado. Así filtro.js no necesita saber nada
// del mapa ni de las tarjetas.
export function configurarFiltro(obtenerDatosOriginales, alFiltrar) {
  const inputFiltro = document.getElementById('filtro');
  const btnFiltrar = document.getElementById('btnFiltrar');
  const btnReset = document.getElementById('btnReset');

  function ejecutarFiltro() {
    const datos = obtenerDatosOriginales();
    if (!datos) return;
    const texto = inputFiltro.value;
    const filtrado = filtrarDatos(datos, texto);
    alFiltrar(filtrado, texto);
  }

  btnFiltrar.addEventListener('click', ejecutarFiltro);
  inputFiltro.addEventListener('input', ejecutarFiltro);
  inputFiltro.addEventListener('keydown', (e) => { if (e.key === 'Enter') ejecutarFiltro(); });

  btnReset.addEventListener('click', () => {
    inputFiltro.value = '';
    ejecutarFiltro();
  });
}
