# TrenAvís

**Horarios, trenes en directo y avisos de salida para Rodalies de Catalunya.**
App web instalable (PWA), gratis, sin anuncios y sin cuentas.

👉 **Abrir la app:** https://trenavis.lorennsw.workers.dev

(La dirección antigua, lorennsw.github.io/trenavis, redirige aquí y copia tus datos.)

> TrenAvís es una **app no oficial**, sin relación con Renfe, Adif ni la Generalitat de Catalunya.
> Los datos pueden tener errores o faltar trenes: comprueba siempre la información oficial.

---

## Qué hace

- **Buscar**: trenes de una estación a otra, directos o con un transbordo, con la hora real y el retraso.
- **Estación**: panel de salidas y llegadas como el del andén, con estaciones favoritas y "tu nota" de vía.
- **Mi tren**: sigue el tren que vas a coger ("Voy en este"), con cuenta atrás y retraso en directo.
- **Avisos de salida**: tu trayecto de siempre y te dice a qué hora salir de casa (con el retraso real).
- **Notificaciones con la app cerrada**: retrasos del tren que sigues y aviso de salida.
- **Línea en directo** y **mapa** con los trenes que circulan, e **incidencias** de cada línea.
- Funciona **sin conexión** con los últimos horarios descargados. Modo claro/oscuro.

## Cómo está hecha (en una frase por pieza)

| Pieza | Qué hace | Dónde |
|---|---|---|
| **Web (PWA)** | La app que ves. Vite + React + TypeScript. | `web/` → Cloudflare (`app-host/`) |
| **API (Worker)** | Sirve horarios y tiempo real, guarda las notificaciones y las envía cada minuto. | `worker/` → Cloudflare Workers |
| **Datos** | Cada día descarga el GTFS de Renfe, filtra Rodalies y lo sube a Cloudflare. | `tools/` + GitHub Actions |
| **Base de datos** | Suscripciones push y datos mínimos de los avisos. | Cloudflare D1 |
| **Almacén** | Horarios procesados, claves de notificaciones. | Cloudflare KV |

```
Renfe (GTFS + tiempo real) ──► GitHub Actions (cada día) ──► Cloudflare KV
                                                              │
   Móvil (web/app) ◄──── API Cloudflare Worker ◄──────────────┘
        ▲                    │  cron cada minuto
        └── notificación ◄───┘  (Web Push)
```

---

## Guía paso a paso (Windows)

No hace falta ser experto: sigue los pasos en orden. Todo es **gratis**.

### 1. Instalar lo necesario

1. **Node.js** (versión LTS): descárgalo de https://nodejs.org → "LTS" → instala con todas las opciones por defecto.
2. **Git**: descárgalo de https://git-scm.com/download/win → instala con las opciones por defecto.
3. Comprueba que funcionan: abre **PowerShell** (tecla Windows → escribe "PowerShell") y escribe:
   ```powershell
   node -v
   git --version
   ```
   Deben salir dos números de versión.

### 2. Descargar el proyecto y probarlo en tu ordenador

```powershell
git clone https://github.com/lorennsw/trenavis.git
cd trenavis
npm install          # descarga las dependencias (tarda un poco la primera vez)
npm run dev          # abre la app en http://localhost:5173
npm test             # pasa los tests
```

La versión local usa la API ya publicada, así que funciona sin configurar nada más.

### 3. Crear las cuentas

1. **GitHub** (https://github.com/signup): donde vive el código y se publica la web.
2. **Cloudflare** (https://dash.cloudflare.com/sign-up): el servidor (API, datos y notificaciones). No pide tarjeta.

> Si eres menor, las cuentas de pago (Google Play, Apple) las tiene que abrir un adulto. GitHub y Cloudflare son gratis.

### 4. Configurar Cloudflare

1. En Cloudflare: **Storage & Databases → KV → Create** → nombre `trenavis-data`. Copia su **ID**.
2. Copia tu **Account ID** (en **Workers & Pages**, columna derecha). Entra una vez en Workers & Pages para elegir tu subdominio `*.workers.dev`.
3. Pon los dos IDs en `worker/wrangler.toml` (`account_id` y el `id` del KV).
4. Crea un **token**: https://dash.cloudflare.com/profile/api-tokens → **Create Token** → plantilla
   **"Edit Cloudflare Workers"** → en la política de cuenta añade también **D1 → Edit** → elige tu cuenta → **Create** → copia el token.

La **base de datos D1**, las **claves de notificaciones (VAPID)** y el token de administración se crean **solos** la
primera vez que se despliega. No hay que generarlos a mano.

### 5. Configurar GitHub

1. En tu repositorio: **Settings → Secrets and variables → Actions → New repository secret**
   → nombre `CLOUDFLARE_API_TOKEN` → pega el token. (Nunca lo pegues en el código ni en un chat.)
2. (Opcional) **Settings → Pages → Source: GitHub Actions**: solo para la redirección desde la dirección antigua.
3. Si tu usuario no es `lorennsw`, cambia la dirección de la API en `web/src/api.ts` y la web en `web/src/legal/config.ts`
   y en `worker/src/push.ts` (`SUBJECT`).

### 6. Desplegar

- **API y datos**: pestaña **Actions → "Desplegar Worker y actualizar datos GTFS" → Run workflow**.
  Después se ejecuta solo **cada día** y cada vez que cambias `worker/` o `tools/`.
- **Web**: se publica sola en Cloudflare en cada cambio a `main` (workflow "Publicar web en Cloudflare").
  GitHub Pages solo sirve una redirección desde la dirección antigua.
- **Municipios y pueblos** (OpenStreetMap): workflow mensual "Actualizar municipios y lugares". Puedes lanzarlo a mano.

### 7. Rellenar los datos legales

Edita `web/src/legal/config.ts` con el **nombre, documento, domicilio y correo** del titular (aparecen en el aviso legal y
la política de privacidad). Ten en cuenta que el domicilio será público.

### 8. App de Android (independiente, con notificaciones por Firebase)

La carpeta `android/` es la app de Android hecha con **Capacitor**: lleva la web dentro y no necesita Chrome.
GitHub la compila sola (workflow "App Android") y publica el **APK** (instalar directamente) y el **AAB** (Google Play)
en **Releases**. La firma se guarda en Cloudflare y es siempre la misma, así que cada versión se instala encima.

Para que la app tenga notificaciones hace falta **Firebase** (gratis):
1. https://console.firebase.google.com → Crear proyecto (sin Google Analytics).
2. Añadir app **Android** con el paquete `io.github.lorennsw.trenavis` → descargar `google-services.json`.
3. Configuración del proyecto → Cuentas de servicio → **Generar nueva clave privada** (archivo secreto).
4. En GitHub → Settings → Secrets → Actions: `GOOGLE_SERVICES_JSON` (contenido de `google-services.json`) y
   `FIREBASE_SERVICE_ACCOUNT` (contenido de la clave privada).
5. Lanzar los workflows "Desplegar Worker…" (pasa la clave al servidor) y "App Android".

Publicar en Google Play: guía completa en `store/PLAY_STORE.md` (textos, capturas, formularios y prueba cerrada).

**iPhone**: sin cuenta de Apple Developer (99 $/año) no se puede instalar una app en iPhone fuera de la App Store.
En iPhone se usa la web con «Añadir a pantalla de inicio» (con notificaciones, iOS 16.4+).

### 9. Instalar la app en el móvil

- **Android**: descarga el **APK** de la última versión en https://github.com/lorennsw/trenavis/releases y ábrelo
  (permite «instalar apps de origen desconocido»). O desde Chrome, toca **«Instalar»** en la web.
- **iPhone (Safari, iOS 16.4+)**: abre la web en Safari → **Compartir** → **Añadir a pantalla de inicio** → ábrela desde el icono.
  En iPhone las notificaciones **solo** funcionan así.
- Después: **Más → Notificaciones** para activar las notificaciones.

---

## Estructura

```
web/            App (React). core/ = lógica pura probada con tests (horarios, búsqueda, tiempo real, avisos)
android/        App de Android (Capacitor). capacitor.config.ts = su configuración
app-host/       Sirve la web en Cloudflare (trenavis.lorennsw.workers.dev)
store/          Material y guía para Google Play
worker/         API en Cloudflare Workers (datos, tiempo real, notificaciones push, cron)
tools/          Scripts: conversión GTFS, informe de calidad, OSM, planificación de avisos, páginas legales
shared/         Tipos compartidos entre web y Worker
tests/          Tests (Vitest)
docs/           Fases, informe de calidad de datos, solicitud a Adif, encargo original
.github/        Workflows (datos diarios, web, OSM mensual)
```

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | App en local (http://localhost:5173) |
| `npm test` | Tests |
| `npm run typecheck` | Comprobar tipos |
| `npm run build` | Compilar la web (y páginas legales, service worker) en `dist/` |
| `npm run data:build` | Descargar y convertir el GTFS a `data/out/` |
| `npm run data:quality` | Informe de calidad de los datos |
| `npm run worker:dev` | API en local |

## Dependencias y por qué

| Paquete | Por qué | Licencia |
|---|---|---|
| react, react-dom | Interfaz de la app | MIT |
| leaflet | Mapa en directo (se descarga solo al abrir el mapa) | BSD-2 |
| @fontsource/inter, @fontsource/space-grotesk | Tipografías servidas desde la propia web (sin Google Fonts, por privacidad) | OFL / MIT |
| vite, @vitejs/plugin-react | Compilar la web | MIT |
| typescript, tsx | Tipos y ejecutar scripts | Apache-2.0 / MIT |
| vitest | Tests | MIT |
| wrangler, @cloudflare/workers-types | Desplegar y probar el Worker | MIT / Apache-2.0 |
| @capacitor/* | App de Android (visor, notificaciones, pantalla de inicio, barra de estado, botón atrás) | MIT |
| axe-core | Revisión de accesibilidad (solo desarrollo) | MPL-2.0 |

Sin analítica, sin publicidad y sin SDKs de terceros. Las notificaciones push se cifran sin librerías externas
(`worker/src/webpush.ts`).

## Fuentes de datos y licencias

- **Datos: Renfe** — horarios (GTFS) y tiempo real (GTFS-Realtime) de [data.renfe.com](https://data.renfe.com), licencia **CC BY 4.0**.
- **Mapas y municipios: © colaboradores de OpenStreetMap**, licencia ODbL.
- Icono y diseño propios. No se usan logos ni colores corporativos de Renfe, Rodalies ni Adif.

## Costes

Todo cabe en los planes **gratuitos** de GitHub y Cloudflare para un uso normal. Si se superan los límites gratuitos,
Cloudflare deja de responder hasta el día siguiente; no cobra nada. Opcional: Google Play (25 $ una vez) y Apple (99 $/año).

## Problemas conocidos de los datos

Ver `docs/calidad-datos.md`: RG1 sin trenes en fin de semana, RT2 con solo 2 paradas, días sin horario publicado y
sin información de vías (se puede apuntar "tu nota"; solicitud a Adif en `docs/solicitud-adif-vias.md`).

## Documentación por fases

`docs/FASE1.md` (datos) · `docs/FASE2.md` (buscar y estación) · `docs/FASE3.md` (tiempo real) ·
`docs/FASE4.md` (avisos de salida) · `docs/FASE5.md` (notificaciones push) · `docs/FASE6.md` (legal, accesibilidad, sin conexión)
