# Mi primer geoportal — Canchas de vóley playa (Bello → Medellín)

Visor geográfico web que muestra la ubicación de canchas de vóley playa en el
Área Metropolitana del Valle de Aburrá, desde Bello hasta Medellín.

## 1. Objetivo del trabajo

- Montar un visor geográfico ligero, publicado en una URL pública (Vercel).
- Cargar capas geográficas (puntos de canchas de vóley playa).
- Mostrar el sistema de referencia de coordenadas (SRC) activo del mapa.
- Reproyectar coordenadas entre distintos SRC (conversión al vuelo).
- Capturar coordenadas al hacer clic sobre el mapa.
- Aplicar un prefiltro por barrio/municipio/nombre.

## 2. Arquitectura

Es una aplicación **100% frontend** (sin backend ni base de datos propia),
lo que la hace "libre" de costos de servidor y fácil de desplegar:

```
Navegador (Leaflet + Proj4Leaflet)
        │
        ├── OpenStreetMap tiles (capa base)
        ├── Overpass API → consulta en vivo: sport=beachvolleyball
        │     dentro del bbox Bello–Medellín (6.13,-75.70,6.42,-75.47)
        └── Dataset local de respaldo (fallback) si Overpass no responde,
              construido con datos oficiales de MEData (Alcaldía de Medellín)
```

No se necesita backend propio: los datos abiertos ya existen en OpenStreetMap
(etiqueta `sport=beachvolleyball`) y se consultan directamente desde el
navegador vía Overpass API. Esto resuelve el punto "backend y frontend libre"
sin tener que montar un servidor GIS.

### ¿Por qué no GeoServer ("Geolibre")?

GeoServer es la opción "más camelluda": requiere servidor Java, base de datos
espacial (PostGIS) y hosting propio — no es compatible con un despliegue
estático en Vercel. Para un primer geoportal de un solo tipo de capa (puntos),
Leaflet + GeoJSON + Overpass es suficiente, gratis y se despliega en segundos.
Si más adelante quieres GeoServer, el mismo frontend puede apuntar a un
servicio WFS/WMS en vez de a Overpass, cambiando solo la función `cargarCanchasOSM()`.

## 3. Librerías usadas

| Librería | Uso |
|---|---|
| [Leaflet](https://leafletjs.com/) | Motor del mapa (open source) |
| [Proj4js](https://github.com/proj4js/proj4js) | Transformación entre sistemas de coordenadas |
| [Proj4Leaflet](https://github.com/kartena/Proj4Leaflet) | Puente entre Proj4js y Leaflet |
| Overpass API | Fuente de datos abiertos (OpenStreetMap) |

## 4. Sistemas de coordenadas soportados

- **EPSG:4326** — WGS84 lat/lon (formato nativo de GeoJSON y del clic en Leaflet).
- **EPSG:3116** — MAGNA-SIRGAS / Colombia Bogotá (oficial en Colombia, IGAC).
- **EPSG:32618** — UTM zona 18N (usado en cartografía técnica de Antioquia).

Al hacer clic en el mapa, la aplicación captura la coordenada en WGS84 y la
reproyecta "al vuelo" con Proj4js al sistema seleccionado en el combo superior.

## 5. Cómo correr el proyecto localmente

No requiere instalación ni build (HTML+JS+CSS puro):

```bash
git clone <URL_DE_TU_REPO>
cd geoportal-voley-playa
# abre index.html con Live Server de VS Code, o:
npx serve .
```

## 6. Despliegue en Vercel

1. Sube el proyecto a un repositorio de GitHub.
2. Entra a [vercel.com](https://vercel.com) → **New Project** → importa el repo.
3. Framework preset: **Other** (proyecto estático, no requiere build command).
4. Deploy. Obtendrás una URL pública tipo `https://tu-proyecto.vercel.app`.

## 7. Prefiltro

El campo de texto superior filtra las canchas cargadas por nombre, barrio o
municipio (ej. escribir "Bello" o "Belén" y pulsar **Filtrar**). El botón
**Quitar filtro** restaura todos los puntos cargados.

## 8. Fuentes de datos

- OpenStreetMap / Overpass API — capa principal, en vivo.
- MEData (Alcaldía de Medellín) — dataset de respaldo verificado.
- [datos.gov.co](https://www.datos.gov.co) — escenarios deportivos INDER Medellín.

## 9. Cobertura Bello–Medellín

El bbox de consulta (`6.13,-75.70,6.42,-75.47`) cubre desde el norte de Bello
hasta el sur de Medellín. Si Bello no tiene canchas de vóley playa registradas
en OpenStreetMap, el mapa simplemente no mostrará puntos allí — se recomienda
verificar con el INDER Bello o el portal de datos abiertos del municipio y,
si existen, añadirlos al `FALLBACK_GEOJSON` en `app.js`.

## 10. Entregables

- [x] URL pública (Vercel)
- [x] Repositorio en GitHub
- [x] Documentación (este README)
