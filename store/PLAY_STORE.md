# Publicar TrenAvís en Google Play

Todo lo que pide Google, preparado. Quien abra la cuenta (mayor de 18) solo tiene que copiar y pegar.

## 0. Antes de empezar
- **Cuenta de desarrollador**: https://play.google.com/console → pago único de **25 $**. Cuenta *personal*.
  Google pide verificar la identidad (documento) y un teléfono.
- **Archivo de la app**: el `.aab` de la última versión en https://github.com/lorennsw/trenavis/releases
- **Política de privacidad (URL)**: https://trenavis.lorennsw.workers.dev/legal/privacidad
- Rellenar antes los datos del titular en `web/src/legal/config.ts` (aparecen en la política).

## 1. Crear la app
Play Console → **Crear aplicación**
- Nombre: **TrenAvís – horarios de tren**
- Idioma predeterminado: **Español (España)**
- Aplicación o juego: **Aplicación** · Gratis o de pago: **Gratis**
- Aceptar las declaraciones.

## 2. Ficha de Play Store (Crecer → Presencia en Play Store → Ficha principal)
**Nombre (30):** TrenAvís – horarios de tren

**Descripción breve (80):**
Horarios, trenes en directo y avisos para salir de casa a tiempo. No oficial.

**Descripción completa:**
```
TrenAvís te ayuda a moverte en los trenes de Rodalies de Catalunya: horarios, salidas y llegadas, trenes en directo y avisos para salir de casa a tiempo.

• Buscar trayectos: de una estación a otra, directos o con un transbordo, con la hora real y el retraso.
• Panel de estación: salidas y llegadas como en el andén. Guarda tus estaciones favoritas y apunta tu vía habitual.
• Mi tren: marca el tren que vas a coger y sigue su cuenta atrás, su posición y su retraso en directo.
• Avisos de salida: dinos tu trayecto de siempre, a qué hora quieres llegar y cuánto tardas a pie. TrenAvís elige el mejor tren y te avisa de cuándo salir de casa, teniendo en cuenta el retraso real.
• Notificaciones con la app cerrada: retrasos y cancelaciones del tren que sigues.
• Línea en directo y mapa con los trenes que circulan, e incidencias de cada línea.
• Funciona sin conexión con los últimos horarios descargados. Modo claro y oscuro.

Sin registro, sin anuncios y sin compras. Tus datos se guardan en tu móvil.

TrenAvís es una app NO OFICIAL, sin relación con Renfe, Adif ni la Generalitat de Catalunya. Datos: Renfe (data.renfe.com), licencia CC BY 4.0. La información puede contener errores o retrasos: comprueba siempre la información oficial.
```
**Recursos gráficos** (carpeta `store/`):
- Icono 512×512: `web/public/icon-512.png`
- Imagen destacada 1024×500: `store/imagen-destacada.png`
- Capturas de teléfono (mínimo 2): `store/capturas/*.png`

**Categoría:** Viajes y guías · **Etiquetas:** Transporte público, Trenes
**Correo de contacto:** el del titular · **Sitio web:** https://trenavis.lorennsw.workers.dev

## 3. Contenido de la aplicación (Política → Contenido de la aplicación)
- **Política de privacidad:** la URL de arriba.
- **Acceso a la aplicación:** todas las funciones están disponibles sin restricciones (no hay inicio de sesión).
- **Anuncios:** No, la app no contiene anuncios.
- **Clasificación de contenido:** categoría *Referencia, noticias o educación* (o *Utilidad*). Responder **No** a violencia,
  sexualidad, lenguaje, drogas, apuestas, interacción entre usuarios y compras. Resultado esperado: **PEGI 3**.
- **Público objetivo:** **13 años o más** (marcar 13-15, 16-17 y 18+). No está dirigida a niños.
- **Apps de noticias:** No. **Apps gubernamentales:** No (y la app es no oficial).
- **Funciones financieras / salud:** No.

### Seguridad de los datos (formulario)
- ¿Recopila o comparte datos de usuario? **Sí** (solo si se activan las notificaciones).
- ¿Todos los datos se cifran en tránsito? **Sí**.
- ¿Los usuarios pueden pedir que se eliminen? **Sí** (Más → Tus datos → Borrar todos mis datos, o desactivando las notificaciones).
- Tipos de datos:
  - **Identificadores del dispositivo u otros identificadores** (token de notificaciones de Firebase):
    recopilado · no compartido · **opcional** · finalidad: **Funciones de la aplicación**.
  - **Actividad en la aplicación → Otro contenido generado por el usuario** (estaciones, días y horas de los avisos de salida y
    tren seguido, para enviar las notificaciones): recopilado · no compartido · **opcional** · finalidad: **Funciones de la aplicación**.
- **Ubicación: NO** se recopila (si se usa «Estaciones cerca de mí», se calcula solo en el móvil y no se envía).
- No hay datos personales (nombre, correo, teléfono), ni financieros, ni de salud, ni contactos, ni fotos.

## 4. Prueba cerrada (obligatoria para cuentas personales nuevas)
Google exige **al menos 12 personas probando durante 14 días seguidos** antes de publicar.
1. Probar y publicar → **Pruebas → Prueba cerrada** → Crear canal → subir el `.aab`.
2. **Testers:** crear una lista con los correos de Gmail de 12+ personas (familia, amigos) con Android.
3. Enviarles el enlace de participación; tienen que **aceptar** e **instalar** la app desde ese enlace, y no desinstalarla en 14 días.
4. Pasados los 14 días: **Solicitar acceso a producción** (responder unas preguntas sobre la prueba) → crear la versión de
   producción con el mismo `.aab` (o uno más nuevo) → **Enviar a revisión**. La primera revisión suele tardar unos días.

## 5. Firma de la app (importante)
- Google Play usa **Firma de apps de Google Play**: al subir el primer `.aab`, Google guarda su propia clave para firmar la app.
  Nuestra clave (guardada en Cloudflare) pasa a ser la **clave de subida**.
- En Play Console → **Configuración → Integridad de la app**, copia la **huella SHA-256 del certificado de firma de la app** y
  pásamela: la añado para que los enlaces de la web abran la app.

## 6. Actualizaciones
Cada cambio en `main` genera un `.aab` nuevo (con número de versión mayor) en Releases. En Play Console:
Producción → **Crear nueva versión** → subir el `.aab` → Enviar a revisión.
