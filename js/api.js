// Guarda este archivo en: js/api.js
// Responsabilidad única: obtener los datos de canchas (Overpass + archivo manual).
// Diseñado para carga PROGRESIVA: lo local (rápido) se puede pintar de inmediato,
// lo externo (Overpass, más lento) se pide aparte y se combina cuando llegue.

import { BBOX, RUTA_DATOS_MANUALES } from './config.js';

export const FALLBACK_GEOJSON = {
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

// Datos propios: siempre deberían responder casi al instante porque están
// en el mismo dominio (Vercel), no dependen de un servicio externo.
export async function cargarManual() {
  const resp = await fetch(RUTA_DATOS_MANUALES);
  if (!resp.ok) throw new Error('No se pudo leer canchas_manuales.geojson');
  const data = await resp.json();
  return data.features;
}

// Overpass API es un servicio externo público y a veces tarda varios
// segundos en responder. Le ponemos un límite de espera (AbortController)
// para no dejar al usuario esperando indefinidamente.
export async function cargarOverpass(timeoutMs = 12000) {
  const query = `
    [out:json][timeout:20];
    (
      node["sport"="beachvolleyball"](${BBOX});
      way["sport"="beachvolleyball"](${BBOX});
      relation["sport"="beachvolleyball"](${BBOX});
    );
    out center tags;
  `;
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { signal: controller.signal });
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
  } finally {
    clearTimeout(timer);
  }
}