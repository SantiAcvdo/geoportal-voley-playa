// Guarda este archivo en: js/api.js
// Responsabilidad única: obtener los datos de canchas (Overpass + archivo manual).

import { BBOX, RUTA_DATOS_MANUALES } from './config.js';

const FALLBACK_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        nombre: "Cancha de vóley playa N.1 - Unidad Deportiva Atanasio Girardot",
        barrio: "Laureles-Estadio", municipio: "Medellín", tipo: "Pública"
      },
      geometry: { type: "Point", coordinates: [-75.591129, 6.257519] }
    }
  ]
};

async function cargarOverpass() {
  const query = `
    [out:json][timeout:25];
    (
      node["sport"="beachvolleyball"](${BBOX});
      way["sport"="beachvolleyball"](${BBOX});
      relation["sport"="beachvolleyball"](${BBOX});
    );
    out center tags;
  `;
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
  const resp = await fetch(url);
  const data = await resp.json();

  return data.elements.map(el => {
    const lat = el.lat || (el.center && el.center.lat);
    const lon = el.lon || (el.center && el.center.lon);
    return {
      type: "Feature",
      properties: {
        nombre: (el.tags && el.tags.name) || "Cancha de vóley playa (OSM, sin nombre)",
        barrio: (el.tags && (el.tags["addr:suburb"] || el.tags["addr:neighbourhood"])) || "",
        municipio: (el.tags && el.tags["addr:city"]) || "",
        tipo: "OSM",
        fuente: "OpenStreetMap"
      },
      geometry: { type: "Point", coordinates: [lon, lat] }
    };
  }).filter(f => f.geometry.coordinates[0] && f.geometry.coordinates[1]);
}

async function cargarManual() {
  const resp = await fetch(RUTA_DATOS_MANUALES);
  const data = await resp.json();
  return data.features;
}

// Combina ambas fuentes y devuelve siempre un FeatureCollection válido,
// incluso si una de las dos fuentes falla.
export async function cargarTodasLasCanchas() {
  const resultados = await Promise.allSettled([cargarOverpass(), cargarManual()]);

  let osmFeatures = resultados[0].status === 'fulfilled' ? resultados[0].value : [];
  let manualFeatures = resultados[1].status === 'fulfilled' ? resultados[1].value : [];

  if (osmFeatures.length === 0 && manualFeatures.length === 0) {
    manualFeatures = FALLBACK_GEOJSON.features;
  }

  return {
    todas: { type: "FeatureCollection", features: [...manualFeatures, ...osmFeatures] },
    totalOSM: osmFeatures.length,
    totalManual: manualFeatures.length
  };
}
