# Fase 3 – Tiempo real

## Qué hay
- **Tiempo real cada 30 s** (solo con la página visible): retrasos, cancelados, paradas que se salta el tren,
  posiciones GPS y avisos. Si Renfe no responde: "Sin datos en tiempo real" y se usan los horarios previstos.
- **Estado siempre con texto**: "A su hora", "+7 min", "Cancelado", "Según horario", "Sin datos en tiempo real".
- **Estación**: hora prevista tachada y real en rojo, cancelados tachados, trenes que salen tarde siguen en el panel,
  avisos que afectan a la estación (plegables).
- **Buscar**: hora real, estado por tren, "Transbordo en riesgo" si el retraso se come el cambio, filtros
  "Ocultar cancelados" y "Solo a su hora" (en Configuración avanzada).
- **Recorrido del tren**: horas reales por parada, posición GPS (o estimada), "No para aquí", botones
  **Voy en este** y **Línea en directo**.
- **Mi tren**: cuenta atrás ("Sale en X min" / "Llegas en X min"), retraso, aviso de la línea, tu tramo parada a parada,
  "Recorrido completo", "Línea en directo", "Dejar de seguir". Cinta fija arriba en las demás pestañas.
  Se guarda solo en el dispositivo y se borra a las 24 h. Si sigues un tren, la app se abre en Mi tren.
- **Línea en directo**: estado de la línea (normal / retrasos / incidencia), avisos, selector de sentido y diagrama
  vertical con los trenes en su estación o entre dos.
- **Mapa en directo** (Leaflet + OpenStreetMap, se descarga solo al abrirlo): líneas, estaciones y trenes con retraso.
- **Más → Líneas**: estado de cada línea y acceso a su vista en directo y al mapa.

## Decisiones sobre los datos de Renfe
- Retrasos negativos (adelantos de 40 min…) son ruido: se tratan como "a su hora".
- El feed solo trae los trenes en marcha; los futuros salen como "Según horario" (salvo cancelados, que sí vienen).
- La posición GPS da la estación en la que está o a la que va el tren: "en X" o "entre X e Y".
- Una línea está "con retrasos" si ≥ 30 % de sus trenes en marcha llevan ≥ 5 min o están cancelados; "incidencia" si hay avisos.

## Privacidad
- El mapa descarga las teselas de tile.openstreetmap.org al abrirlo (OSM ve la IP). Se indicará en la política de privacidad.

## Tests
`tests/live.test.ts`: estado, retrasos negativos, cancelados, paradas saltadas, posición GPS/estimada, sentido de los trenes,
colocación en la línea, estado de línea, transbordos en riesgo, Mi tren (búsqueda y cuenta atrás).
