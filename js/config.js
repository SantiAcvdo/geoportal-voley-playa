// Guarda este archivo en: js/config.js
// Responsabilidad única: constantes y sistemas de referencia de coordenadas.

export const BBOX = "6.13,-75.70,6.42,-75.47"; // south,west,north,east (Bello -> Medellín)
export const CENTRO_MAPA = [6.30, -75.58];
export const ZOOM_INICIAL = 12;
export const RUTA_DATOS_MANUALES = "data/canchas_manuales.geojson";

export function definirSistemasDeCoordenadas() {
  // proj4 se carga como variable global desde el CDN en index.html
  proj4.defs("EPSG:3116",
    "+proj=tmerc +lat_0=4.596200417 +lon_0=-74.07750791666666 " +
    "+k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
  proj4.defs("EPSG:32618",
    "+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs");
}
