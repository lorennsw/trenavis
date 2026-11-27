# Fase 4 – Alarmas ("sal de casa a las X")

## Qué hay
- **Alarmas** guardadas solo en el dispositivo: origen y destino (solo estaciones con tren entre ellas), modo
  **llegar antes de** / **salir después de** (hora de salida del tren) con la hora escrita a mano, **días**
  (L M X J V S D y atajos lunes a viernes / todos los días / fin de semana), **minutos a pie** y **aviso** 0/5/10/15 min antes.
- **Mejor tren**: el último que llega a tiempo, o el primero que sale a partir de la hora. Descarta cancelados y
  transbordos en riesgo, y **suma el retraso real** si el viaje es hoy. Admite un transbordo.
- **"Sal de casa a las X"** = salida real del tren − minutos a pie; **aviso** = eso − minutos de antelación.
- **Vista previa en directo** mientras se crea o edita.
- Tarjetas tipo billete: próximo viaje (hoy, mañana o el día que toque), "Sal en X min" cuando falta poco, aviso, salida de
  casa y tren (al tocarlo se abre su recorrido). Activar/desactivar, editar y borrar con confirmación.
- Si ese día Renfe no ha publicado horarios, se avisa en la tarjeta.

## Pendiente (Fase 5)
- Los avisos en el móvil con la app cerrada (Web Push desde el Worker).

## Tests
`tests/alarms.test.ts`: llegar antes de / salir después de, retraso real (cambia de tren si ya no llega), cancelados,
retraso solo para hoy, sin tren posible, próximo viaje (hoy, mañana, salta fines de semana, días sin horario).
