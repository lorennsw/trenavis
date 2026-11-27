# Fase 6 – Legal, privacidad, accesibilidad, sin conexión y README

## Legal y privacidad
- Páginas: aviso legal (LSSI), privacidad (RGPD/LOPDGDD), cookies y almacenamiento, términos, accesibilidad, fuentes y licencias.
  En la app (Más) y como páginas estáticas en `/legal/<id>.html` (enlace público para Google Play).
- Datos del titular en `web/src/legal/config.ts` (**[pendiente]**).
- Aviso informativo la primera vez (sin consentimiento: solo almacenamiento técnico, art. 22.2 LSSI).
- Más → Tus datos: exportar (JSON, copiar o descargar) y borrar todo (dispositivo, cachés, service worker y servidor).
- Aviso de "app no oficial" en la cabecera, en el aviso inicial y en Más.

## Accesibilidad (WCAG 2.1 AA)
- Revisión con axe-core en Buscar, Recorrido, Estación, formulario de avisos, Más y Línea en directo, en claro y oscuro:
  **sin incidencias** tras las correcciones (contraste de tarjetas canceladas, nombre accesible del selector de estación,
  texto de las filas del panel, "prevista/real" en horas con retraso para lectores de pantalla).
- Ya existía: foco visible, foco atrapado en hojas, Escape para cerrar, botones ≥ 44 px, estado con texto, reducir movimiento.
- Limitación conocida: el mapa no es totalmente accesible (alternativa: Línea en directo).

## Sin conexión
- El service worker guarda la app completa al instalarse (lista `precache.json` generada al compilar con `tools/build-sw.ts`)
  y los horarios se guardan en Cache Storage. Probado: sin conexión la app se abre y muestra horarios.
- Cada publicación cambia la versión del service worker, así que se actualiza solo.

## Instalación
- Botón "Instalar" de un toque en Android (beforeinstallprompt). Chrome la considera instalable sin errores.
- Guía para iPhone (Safari → Añadir a pantalla de inicio).

## README
- Guía paso a paso para Windows, estructura, comandos, dependencias y por qué, fuentes, costes.
- El encargo original está en `docs/PROMPT.md`.
