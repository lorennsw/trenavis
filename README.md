# Prompt para Claude Code — TrenAvís

Quiero construir **TrenAvís**, una app web instalable (PWA) para los trenes de Rodalies de Catalunya: horarios, salidas y llegadas, recorrido de cada tren, trenes en directo, seguimiento de "mi tren" con avisos de retraso y alarmas diarias que te dicen cuándo salir de casa.

Te paso un prototipo HTML (`trenavis.html`) con el diseño y el flujo. Úsalo como referencia visual y de funcionalidades, pero constrúyelo bien desde cero, con datos reales.

Trabaja **por fases** (al final) y enséñame el resultado de cada una antes de seguir. Si algo no está claro o no se puede hacer, pregúntame antes de inventarlo.

---

## 1. Stack y arquitectura

- **Frontend**: Vite + React + TypeScript. PWA instalable (manifest, service worker, icono, pantalla de inicio), mobile-first, modo claro y oscuro automático.
- **Backend**: Cloudflare Workers (plan gratuito) con:
  - **Cron Trigger** que descarga a diario el GTFS estático de Cercanías de Renfe, filtra solo Rodalies de Catalunya y lo convierte en JSON compacto (estaciones, líneas, viajes, paradas y horas), guardado en KV o R2.
  - **Consulta del GTFS-Realtime** (trip updates, vehicle positions si existen, service alerts) cada 30-60 s, con caché, expuesta en una API propia para evitar CORS.
  - **Base de datos** Cloudflare D1 (o KV) para las suscripciones push y la configuración mínima de los avisos (ver privacidad).
  - **Envío de Web Push** con claves VAPID.
- **Hosting**: frontend en GitHub Pages; Worker en Cloudflare.
- **Antes de empezar**:
  - Busca en data.renfe.com las URLs actuales de los feeds (GTFS estático y GTFS-Realtime de Cercanías) y confirma su licencia (creo que es CC BY 4.0).
  - Comprueba la calidad de los datos de Cataluña: hay usuarios que reportan que el GTFS omite trenes de la RG1 (Maçanet–Figueres/Portbou) y de la RT2. Avísame de lo que encuentres.
- **Gestión de errores**: si Renfe no responde o los datos llegan mal, usar los últimos datos buenos guardados, mostrar "sin datos en tiempo real" y no romper la app. Sin conexión: horarios estáticos guardados en el dispositivo.

## 2. Secciones (barra inferior con 5 pestañas)

1. **Mi tren**
   - Muestra el tren que el usuario marca como "Voy en este".
   - Cuenta atrás ("sale en X min" / "llegas en X min"), recorrido de su tramo parada a parada con la hora prevista y la real (tachar la prevista si hay retraso) y estado: a su hora, +X min o cancelado.
   - Botones "Recorrido completo", "Línea en directo" y "Dejar de seguir".
   - Cinta fija arriba con el tren seguido cuando el usuario está en otra pestaña.
2. **Buscar**
   - Origen y destino (con buscador de estaciones y botón de invertir), hora "salir a partir de" y botón "Ahora".
   - Lista de trenes con salida, llegada, duración, línea, número de tren, dirección y estado en tiempo real.
   - Filtros: por línea (R1, R2, R2 Nord, R2 Sud, R3, R4, R7, R8, R11, R13, R14, R15, R16, R17, RG1, RL3, RL4… las que haya en los datos), ocultar cancelados y solo a su hora. Orden por hora o por el más rápido.
   - Trayectos con un transbordo como máximo, marcados como tal y con el tiempo de transbordo.
   - Botones "Recorrido" y "Voy en este" en cada tren.
3. **Estación**
   - Panel de Salidas / Llegadas de la estación elegida, como el del andén: hora, línea, destino o procedencia, número de tren, vía (si el dato existe), estado y hora real.
   - Filtro por línea y estaciones favoritas.
   - Al tocar un tren se abre su recorrido.
4. **Alarmas**
   - Alarmas recurrentes por trayecto, con estos campos:
     - origen y destino;
     - modo "llegar antes de" o "salir después de", y la hora;
     - días (L M X J V S D, con los atajos "lunes a viernes", "todos los días" y "fin de semana");
     - minutos a pie hasta la estación;
     - "avisarme 0/5/10/15 min antes de salir".
   - La app busca el mejor tren: el último que llega a tiempo o el primero después de la hora. Descarta los cancelados, suma el retraso real y calcula "sal de casa a las X".
   - Vista previa en directo mientras se crea la alarma.
   - Activar/desactivar, editar y borrar con confirmación.
5. **Más**
   - Líneas: estado de cada una (normal / retrasos / incidencia), su lista de estaciones, incidencias y botón "Ver trenes en directo".
   - Ajustes de avisos: retrasos del tren seguido, alarmas de salida y permiso de notificaciones.
   - Legal, accesibilidad, fuentes de datos y "Tus datos" (exportar y borrar).

## 3. Funciones "plus" (como la app oficial y más)

- **Detalle de tren**: al tocar cualquier tren (en Buscar, Estación, Mi tren o la vista de línea) se abre su recorrido completo, de la primera a la última parada, con:
  - la hora prevista y la real de cada parada (tachar la prevista si hay retraso);
  - las paradas ya pasadas marcadas;
  - la posición actual ("en X" o "entre X e Y");
  - el tramo del usuario resaltado, con "subes" y "bajas";
  - botones "Voy en este" y "Ver la línea en directo".
- **Línea en directo (visor de trenes)**: diagrama vertical de cada línea, con selector de sentido y todos los trenes que circulan ahora, colocados en la estación o entre dos estaciones. Usa vehicle positions si existen; si no, estima la posición con los trip updates. Cada tren muestra su número y su retraso; al tocarlo se abre su detalle. Se actualiza solo.
- **Mapa interactivo** con Leaflet + OpenStreetMap (con su atribución) que muestre las estaciones y los trenes en circulación.
- **Incidencias**: service alerts por línea y por estación, y aviso si afectan a una alarma o al tren seguido.
- **Accesibilidad de estaciones** (ascensor, acceso sin escalones) si los datos lo incluyen.
- Las vistas abiertas se actualizan cada 15-30 s sin recargar la página.

## 4. Notificaciones

- **Tren seguido**: avisar cuando cambia el retraso, cuando se cancela y cuando vuelve a ir a su hora. No repetir el mismo aviso.
- **Alarmas**: avisar a la hora calculada, recalculada con el retraso real del momento.
- Tienen que llegar **con la app cerrada**, por Web Push desde el Worker. El servidor revisa cada minuto qué avisos tocan.
- En iPhone, Web Push solo funciona si la PWA está instalada en la pantalla de inicio (iOS 16.4 o superior). Explicarlo en la app con una guía de "cómo instalar".
- Opción de desactivar cada tipo de aviso. Al desactivarlos todos, se borra la suscripción del servidor.

## 5. Privacidad y legal (España / UE)

**Datos mínimos (privacidad desde el diseño)**
- Sin registro ni cuentas. No pedir nombre, correo, teléfono ni ubicación.
- En el dispositivo: alarmas, tren seguido, favoritos y ajustes.
- En el servidor, solo lo imprescindible para que los avisos lleguen con la app cerrada: la suscripción push (identificador técnico) y, por cada aviso, el trayecto, los días, la hora, los minutos de antelación y el ID del tren seguido. Nada que identifique a la persona.
- Esos datos se borran al desactivar los avisos, al borrar la alarma o al dejar de seguir el tren. Los trenes seguidos se borran solos a las 24 h.

**Páginas legales (accesibles desde Más y desde el pie de la web)**
- **Aviso legal (LSSI)**: titular, NIF, domicilio y correo de contacto. Déjalos como "pendiente" para que yo los rellene. Que diga que es gratis, sin compras ni anuncios.
- **Política de privacidad (RGPD / LOPDGDD)**: responsable, qué datos se guardan y dónde (dispositivo / servidor), finalidad, base legal (ejecución del servicio, art. 6.1.b), plazos de conservación, encargados del tratamiento (Cloudflare, GitHub, servicios push del navegador), derechos (acceso, rectificación, supresión, oposición, portabilidad) y reclamación ante la AEPD. Edad: no se recogen datos personales; si algún día hay cuentas, mínimo 14 años o consentimiento de los padres.
- **Cookies y almacenamiento**: sin cookies de analítica ni de publicidad. Solo almacenamiento técnico necesario (art. 22.2 LSSI), sin banner de consentimiento, con un aviso informativo la primera vez. Si alguna vez se añaden cookies no necesarias, pedir consentimiento previo con "aceptar" y "rechazar" igual de visibles.
- **Términos de uso**: los datos vienen de terceros y pueden tener errores, retrasos o faltar trenes; comprobar siempre la información oficial; los avisos pueden llegar tarde; limitación de responsabilidad; uso correcto; cambios en los términos; ley española.
- **Accesibilidad**: declaración de cumplimiento de WCAG 2.1 AA y contacto para reportar barreras.
- **Fuentes de datos y licencias**: "Datos: Renfe" con su licencia (CC BY 4.0 si se confirma), OpenStreetMap, tipografías y librerías con sus licencias.

**Reglas generales**
- Aviso visible de "App no oficial, sin relación con Renfe, Adif ni la Generalitat de Catalunya".
- No usar logos, colores corporativos ni nombres de marca de Renfe o Rodalies como nombre o icono de la app. Solo los nombres de líneas y estaciones, para identificar el servicio.
- "Tus datos": exportar en JSON (copiar o descargar) y "Borrar todos mis datos" con confirmación, que borre también lo guardado en el servidor.
- Nada de dark patterns, cargos ocultos, reseñas falsas ni afirmaciones sin respaldo (no decir "100 % exacto" ni "nunca perderás un tren").
- Sin SDKs de terceros innecesarios. Sin analítica. Lista en el README las dependencias que uses y por qué.
- Solo imágenes e iconos propios o con licencia libre, con su atribución.

## 6. Accesibilidad (WCAG 2.1 AA)

- Contraste suficiente en modo claro y oscuro.
- Todo usable con teclado y con lector de pantalla (roles, etiquetas, foco visible y gestión del foco en las hojas o modales).
- El estado del tren no se indica solo con color: siempre también con texto.
- Botones de al menos 44 px, textos de al menos 13 px y tamaño de letra ampliable.
- Texto alternativo en imágenes e iconos con significado.
- Respetar "reducir movimiento".

## 7. Diseño

- Como el prototipo: franja superior de color, tarjetas tipo billete, panel de salidas estilo andén y recorrido vertical con puntos.
- Tipografías Space Grotesk (títulos y horas) e Inter (texto).
- Un color de marca propio (no el de Renfe) y colores propios para las líneas.
- Icono de la app y pantalla de bienvenida propios: diséñalos tú en SVG.
- Estados vacíos, de carga (skeletons) y de error en todas las vistas.
- Todo el texto en español, con un sistema de traducciones preparado para añadir catalán.

## 8. Calidad

- Código organizado por módulos: datos GTFS, tiempo real, búsqueda y transbordos, alarmas, notificaciones, UI y legal.
- Tests (Vitest) de:
  - la búsqueda de trayectos y transbordos;
  - "mejor tren" y "hora de salir de casa";
  - el cálculo de la posición de los trenes;
  - casos límite: cambio de día, trenes después de medianoche, cancelados y sin datos en tiempo real.
- Lighthouse: PWA instalable y buena puntuación en rendimiento y accesibilidad.
- README paso a paso, pensado para alguien que usa **Windows** y no es experto:
  - instalar Node y las dependencias;
  - crear las cuentas de GitHub y de Cloudflare;
  - generar las claves VAPID;
  - configurar los secretos;
  - desplegar el Worker y el frontend en GitHub Pages;
  - instalar la app en Android y en iPhone.
- Opcional, al final: empaquetarla para Google Play como TWA (Bubblewrap) y explicarme los pasos y el coste de la cuenta de desarrollador.

## 9. Fases (enséñame cada una antes de seguir)

1. **Datos**: descarga y conversión del GTFS, comprobación de la calidad de los datos de Cataluña, API básica.
2. **Buscar, Estación y detalle de tren** con horarios estáticos.
3. **Tiempo real**: retrasos, cancelaciones, Mi tren, Línea en directo, mapa e incidencias.
4. **Alarmas** con el cálculo de "sal de casa a las X".
5. **Notificaciones push** con la app cerrada (tren seguido y alarmas) y base de datos del servidor.
6. **Legal, privacidad, accesibilidad, icono**, README y despliegue final.
