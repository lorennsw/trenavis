# Fase 2 – Buscar, Estación y detalle de tren (horarios estáticos)

## Qué hay
- **Frontend** en `web/` (Vite + React + TypeScript), mobile-first, modo claro/oscuro automático.
- **Buscar**: origen/destino con buscador de estaciones (ignora tildes), invertir, día, "salir a partir de", "Ahora",
  orden por salida o más rápido, filtro por línea. Directos y con **un transbordo** como máximo (mínimo 4 min para cambiar),
  marcados con la estación y el tiempo de cambio. Se descartan transbordos que otra opción mejora.
- **Estación**: panel de salidas/llegadas desde ahora, filtro por las líneas de esa estación, estaciones **favoritas** (★).
- **Detalle de tren**: recorrido completo con horas, tramo del usuario resaltado ("subes"/"bajas") y posición **estimada por horario** si es hoy.
- Pestañas Mi tren y Alarmas con aviso de "próximamente" (fases 3 y 4). Más: líneas, fuente y problemas conocidos de los datos.
- Las vistas se refrescan solas cada 15 s. Todas las horas se calculan en hora de Madrid.
- Datos guardados en el dispositivo (Cache Storage): sin conexión se usan los últimos horarios descargados.
- Textos en `web/src/i18n.ts`, listo para añadir catalán.
- Tipografías Inter y Space Grotesk servidas desde la propia web (sin Google Fonts, por privacidad).
- Colores de línea propios, todos con contraste ≥ 4.5:1.

## Lógica (probada con Vitest, `tests/timetable.test.ts`)
`web/src/core/timetable.ts` (horario del día, panel, posición) y `web/src/core/search.ts` (búsqueda).
Casos límite cubiertos: trenes pasada la medianoche (aparecen de madrugada con la hora correcta), días sin horario,
transbordos demasiado justos, sentido contrario, filtros.

## Pendiente para fases siguientes
- Tiempo real (retrasos, cancelados, "a su hora", "Voy en este", Mi tren) → Fase 3.
- Vía: Renfe no la publica en el GTFS.
- Hay viajes etiquetados como R2S que hacen el recorrido de la R15 (Flix–Estació de França): a revisar en la Fase 3.
- PWA instalable (manifest, service worker, icono) → Fase 6 (o antes si se quiere).

## Probar en local
```
npm install
npm run dev      # abre http://localhost:5173
```
