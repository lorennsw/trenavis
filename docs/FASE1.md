# Fase 1 – Datos

## Fuentes (confirmadas en data.renfe.com, licencia **CC BY 4.0**)
| Dato | URL |
|---|---|
| GTFS estático (toda Cercanías) | https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip |
| Trip updates | https://gtfsrt.renfe.com/trip_updates.json (`.pb`) |
| Vehicle positions | https://gtfsrt.renfe.com/vehicle_positions.json (`.pb`) |
| Alertas | https://gtfsrt.renfe.com/alerts.json (`.pb`) |
| Estaciones (CSV) | https://ssl.renfe.com/ftransit/Fichero_estaciones/estaciones.csv |

Rodalies de Catalunya = rutas con `route_id` que empieza por `51T`; sus `trip_id` empiezan por `51`.

## Decisión de arquitectura que te afecta
El GTFS pesa 15 MB comprimido / **276 MB descomprimido** (`stop_times.txt`). Un Worker gratuito no puede procesarlo (128 MB de memoria, 10 ms de CPU).
Por eso la conversión se hace con `tools/build-gtfs.ts` (7 s en local) y el workflow `.github/workflows/update-data.yml` la ejecuta cada día en GitHub Actions y sube el resultado al KV del Worker. El Worker solo sirve datos y consulta el tiempo real. Es un cambio respecto al README ("Cron Trigger descarga el GTFS"); necesito tu OK.

## Calidad de los datos de Cataluña (ver `docs/calidad-datos.md`)
- 19 líneas, 210 estaciones, 34 472 viajes válidos (de 34 638). Sin paradas desconocidas ni horas incoherentes.
- **Sin cabeceras de destino**: `trip_headsign` viene vacío; el destino se deduce de la última parada.
- **Calendario corto y con un hueco**: solo hay 30 días (24 nov–23 dic) y **faltan del 30 nov al 4 dic**. Cada servicio es de un único día.
- **RG1 (Maçanet–Portbou)**: 18 paradas y ~51–68 viajes/día laborable, pero **ningún viaje sábado ni domingo**. Parece una omisión del feed.
- **RT2**: solo 2 paradas (Tarragona–Salou/PortAventura). Parece corto; hay que contrastarlo con la web oficial.
- R7 tiene menos días de servicio que el resto.
- 141 viajes con menos de 2 paradas (descartados) y 25 sin horarios.
- 543 viajes pasan de medianoche (horas ≥ 24:00, soportadas).
- **Tiempo real**: ~140 viajes de Rodalies con posición y retraso, 11 alertas. Los `trip_id` casan con el GTFS. Los `stopTimeUpdate` suelen traer solo la próxima parada, no el recorrido entero. En alertas, los textos en castellano y catalán vienen ambos marcados como `es`.

## API (Worker)
`/api/meta`, `/api/stations`, `/api/lines`, `/api/trips/:linea`, `/api/realtime/{trip-updates,vehicles,alerts}`.
Tiempo real con caché de 30 s; si Renfe falla, devuelve el último dato bueno con `stale: true`.

## Probarlo
```
npm install
npm run data:build && npm run data:quality
npm test
```
