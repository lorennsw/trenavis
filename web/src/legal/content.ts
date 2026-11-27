/**
 * Textos legales (España / UE). Formato sencillo: secciones con título, párrafos y listas.
 * Dentro del texto: **negrita** y [enlace](https://…). Se usan en la app y para generar páginas estáticas.
 */
import { APP_URL, LEGAL_UPDATED, TITULAR } from './config';

export interface Section { h?: string; p?: string[]; ul?: string[] }
export interface LegalDoc { id: LegalId; title: string; intro?: string; sections: Section[] }
export type LegalId = 'aviso-legal' | 'privacidad' | 'cookies' | 'terminos' | 'accesibilidad' | 'fuentes';

const T = TITULAR;
const UNOFFICIAL = 'TrenAvís es una **app no oficial**, sin relación con Renfe, Adif ni la Generalitat de Catalunya. Solo usa los nombres de líneas y estaciones para identificar el servicio.';

export const LEGAL: LegalDoc[] = [
  {
    id: 'aviso-legal', title: 'Aviso legal',
    intro: 'Información exigida por la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI).',
    sections: [
      { h: 'Titular', ul: [`**Nombre:** ${T.nombre}`, `**NIF/NIE o documento:** ${T.documento}`, `**Domicilio:** ${T.domicilio}`, `**Correo de contacto:** ${T.email}`, `**Sitio web:** [${APP_URL}](${APP_URL})`] },
      { h: 'Objeto', p: ['TrenAvís ofrece información de horarios, salidas y llegadas, trenes en directo y avisos para los trenes de Rodalies de Catalunya.', UNOFFICIAL] },
      { h: 'Gratuidad', p: ['TrenAvís es **gratuita**. No tiene compras, suscripciones, anuncios ni ningún cargo. No recibe dinero de terceros por mostrar información.'] },
      { h: 'Propiedad intelectual', p: ['El código, el diseño, el icono y los textos de TrenAvís son obra de su titular. Los datos de horarios y tiempo real son de Renfe y se usan con su licencia (ver «Fuentes de datos y licencias»). Las marcas de terceros pertenecen a sus dueños.'] },
      { h: 'Responsabilidad', p: ['La información procede de terceros y puede tener errores o retrasos. Consulta los términos de uso.'] },
      { h: 'Ley aplicable', p: ['Se aplica la legislación española.'] },
    ],
  },
  {
    id: 'privacidad', title: 'Política de privacidad',
    intro: `Cómo trata TrenAvís tus datos, conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). Última actualización: ${LEGAL_UPDATED}.`,
    sections: [
      { h: 'Resumen', ul: ['**Sin registro ni cuentas.** No te pedimos nombre, correo, teléfono ni ubicación.', 'Casi todo se guarda **solo en tu dispositivo**.', 'En el servidor solo se guarda lo imprescindible para enviarte notificaciones con la app cerrada, y **solo si las activas**.', 'Sin analítica, sin publicidad y sin vender datos a nadie.'] },
      { h: 'Responsable del tratamiento', ul: [`${T.nombre}`, `${T.documento}`, `${T.domicilio}`, `Contacto: ${T.email}`] },
      { h: 'Datos que se guardan solo en tu dispositivo', p: ['Se guardan en el almacenamiento de tu navegador (no salen de tu dispositivo):'], ul: ['Tus avisos de salida (trayecto, modo, hora, días, minutos a pie y antelación).', 'El tren que sigues («Voy en este»), que se borra solo a las 24 horas.', 'Estaciones favoritas, tu última búsqueda y la última estación consultada.', 'Tus notas de vía («tu nota»).', 'Preferencias: notificaciones activadas, tema claro/oscuro y si ya has visto el aviso de almacenamiento.', 'Una copia de los horarios para poder usar la app sin conexión.'] },
      { h: 'Ubicación', p: ['Si tocas «Estaciones cerca de mí», el navegador te pide permiso y tu ubicación se usa **solo en tu dispositivo** para calcular la distancia a las estaciones. **No se envía a ningún servidor** ni se guarda.'] },
      { h: 'Datos que se guardan en el servidor (solo si activas las notificaciones)', p: ['Para que las notificaciones lleguen con la app cerrada, el servidor (Cloudflare) guarda:'], ul: ['El **identificador de notificaciones** de tu dispositivo: en la web, la suscripción push que da tu navegador (una dirección técnica y unas claves de cifrado); en la app de Android, el token de Firebase Cloud Messaging. No contiene tu nombre ni tu número.', 'Qué notificaciones quieres (retrasos del tren seguido y/o avisos de salida).', 'De cada aviso de salida: estaciones de origen y destino, modo, hora, días, minutos a pie, antelación y los próximos viajes calculados (tren y horas).', 'Del tren seguido: su identificador, horas y el último retraso notificado.'] },
      { h: 'Finalidad', ul: ['Mostrar horarios, el estado de los trenes y calcular a qué hora salir.', 'Enviarte las notificaciones que has pedido.'] },
      { h: 'Base legal', p: ['La **ejecución del servicio** que solicitas al activar las funciones (art. 6.1.b RGPD). No usamos tus datos para nada más.'] },
      { h: 'Plazos de conservación', ul: ['Datos del dispositivo: hasta que los borres (Más → Tus datos) o borres los datos del navegador.', 'Tren seguido en el servidor: se borra al dejar de seguirlo, al llegar o, como máximo, a las **24 horas**.', 'Avisos de salida en el servidor: hasta que borres el aviso o desactives las notificaciones; los viajes ya pasados se borran a los 2 días.', 'Suscripción o token: se borra al **desactivar todas las notificaciones**, al usar «Borrar todos mis datos», al desinstalar la app (cuando el servicio indica que ya no existe) o cuando caduca.'] },
      { h: 'Encargados del tratamiento y servicios de terceros', ul: ['**Cloudflare, Inc.** (servidor de datos y notificaciones). Procesa tu dirección IP al conectarte, de forma técnica.', '**GitHub, Inc.** (alojamiento de la web). Puede registrar tu IP en sus registros técnicos.', '**Servicio push de tu navegador** (Google Firebase Cloud Messaging, Apple Push Notification service o Mozilla). En la web recibe las notificaciones **cifradas**: no puede leer su contenido.',
        '**Google Firebase Cloud Messaging** (solo en la app de Android, si activas las notificaciones): entrega las notificaciones a tu móvil. Para ello Google genera un token del dispositivo y un identificador de instalación de Firebase, y procesa el texto de cada notificación (por ejemplo, «Sal de casa en 5 min · R4 de las 08:25»). No se usa para publicidad ni para analítica.', '**OpenStreetMap Foundation**: solo si abres el mapa, tu navegador descarga los mapas de sus servidores, que ven tu IP.', 'Algunos de estos proveedores están en EE. UU.; las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. y/o en cláusulas contractuales tipo.'] },
      { h: 'Tus derechos', p: ['Puedes ejercer los derechos de **acceso, rectificación, supresión, oposición, limitación y portabilidad** escribiendo a ' + T.email + '. Como no te identificamos, lo más rápido es usar **Más → Tus datos**: exporta todo lo que guarda la app o bórralo (incluido lo del servidor).', 'Si crees que no hemos tratado bien tus datos, puedes reclamar ante la **Agencia Española de Protección de Datos** ([www.aepd.es](https://www.aepd.es)).'] },
      { h: 'Menores', p: ['TrenAvís no recoge datos que identifiquen a las personas. Si en el futuro hubiera cuentas, solo podrían crearlas mayores de 14 años o con el consentimiento de sus padres o tutores.'] },
      { h: 'Seguridad', p: ['Todas las conexiones van cifradas (HTTPS). En la web, las notificaciones se cifran de extremo a extremo antes de enviarlas; en la app de Android viajan por la conexión cifrada de Firebase.'] },
      { h: 'Cambios', p: ['Si cambia esta política, se indicará la fecha de actualización y, si el cambio es importante, se avisará en la app.'] },
    ],
  },
  {
    id: 'cookies', title: 'Cookies y almacenamiento',
    sections: [
      { p: ['TrenAvís **no usa cookies**, ni de analítica ni de publicidad.', 'Solo usa el almacenamiento técnico del navegador **necesario** para que la app funcione (localStorage, Cache Storage y un service worker). Este uso está exento de consentimiento (art. 22.2 LSSI), por eso no hay banner para aceptar o rechazar: solo un aviso informativo la primera vez.'] },
      { h: 'Qué se guarda', ul: ['**Preferencias y datos de la app** (localStorage): avisos de salida, tren seguido, favoritas, notas de vía, notificaciones y tema.', '**Horarios** (Cache Storage): para usar la app sin conexión.', '**Service worker** (solo en la web): recibe las notificaciones y permite abrir la app sin conexión.', 'En la **app de Android** se guarda lo mismo dentro de la propia app; se borra al desinstalarla.'] },
      { h: 'Cómo borrarlo', p: ['Desde **Más → Tus datos → Borrar todos mis datos**, o borrando los datos del sitio en los ajustes de tu navegador.'] },
      { h: 'Si cambia', p: ['Si algún día se añadieran cookies no necesarias, se pedirá tu consentimiento antes, con las opciones «Aceptar» y «Rechazar» igual de visibles.'] },
    ],
  },
  {
    id: 'terminos', title: 'Términos de uso',
    sections: [
      { h: 'El servicio', p: ['TrenAvís muestra horarios, el estado de los trenes y calcula a qué hora salir, con datos públicos de Renfe. Es gratuita.', UNOFFICIAL] },
      { h: 'Exactitud de la información', p: ['Los datos vienen de terceros y **pueden tener errores, retrasos o faltar trenes** (por ejemplo, Renfe no publica algunos días ni las vías). **Comprueba siempre la información oficial** en la estación o en los canales de Renfe y Rodalies.', 'Las notificaciones **pueden llegar tarde o no llegar** (por el móvil, la conexión, el modo de ahorro de batería o los servicios de terceros). No dependas solo de ellas para no perder un tren.'] },
      { h: 'Limitación de responsabilidad', p: ['En la medida en que lo permita la ley, el titular no se hace responsable de los daños derivados de errores, retrasos o falta de información, de que una notificación no llegue o llegue tarde, ni de las decisiones tomadas a partir de la información de la app.'] },
      { h: 'Uso correcto', ul: ['No intentes dañar, saturar o acceder sin permiso a la app ni a su servidor.', 'No uses la app para fines ilegales.'] },
      { h: 'Cambios', p: ['Estos términos pueden cambiar. Se indicará la fecha de actualización.'] },
      { h: 'Ley aplicable', p: ['Se rigen por la legislación española.'] },
    ],
  },
  {
    id: 'accesibilidad', title: 'Declaración de accesibilidad',
    sections: [
      { p: ['TrenAvís quiere que la puedan usar todas las personas. El objetivo es cumplir las **Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1, nivel AA**.'] },
      { h: 'Situación de cumplimiento', p: ['**Parcialmente conforme**, según una evaluación propia.'] },
      { h: 'Qué se ha hecho', ul: ['Contraste suficiente en modo claro y oscuro, también en los colores de las líneas.', 'Se puede usar con teclado y con lector de pantalla: botones con nombre, foco visible y el foco se mantiene dentro de las ventanas emergentes.', 'El estado de los trenes siempre se indica con texto, no solo con color.', 'Botones de al menos 44 px, texto de al menos 13 px y se respeta el tamaño de letra del sistema.', 'Se respeta la preferencia de «reducir movimiento».'] },
      { h: 'Limitaciones conocidas', ul: ['El **mapa** no es totalmente accesible con lector de pantalla. Alternativa: la vista «Línea en directo» muestra la misma información como lista.', 'Las insignias de línea dependen del texto de la línea (R1, R2…), no de un nombre largo.'] },
      { h: 'Contacto', p: [`Si encuentras una barrera, escribe a ${T.email} e intentaremos resolverla.`] },
      { h: 'Fecha', p: [`Declaración preparada el ${LEGAL_UPDATED}.`] },
    ],
  },
  {
    id: 'fuentes', title: 'Fuentes de datos y licencias',
    sections: [
      { h: 'Datos', ul: ['**Datos: Renfe.** Horarios (GTFS) y tiempo real (GTFS-Realtime) de [data.renfe.com](https://data.renfe.com), con licencia [Creative Commons Atribución 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.es). TrenAvís adapta los datos (filtra Rodalies de Catalunya y los combina) y puede contener errores que no son de Renfe.', '**Mapas y municipios: © colaboradores de OpenStreetMap**, con licencia [ODbL](https://www.openstreetmap.org/copyright).', '**Municipios**: también del fichero de estaciones de Renfe (data.renfe.com, CC BY 4.0).'] },
      { h: 'Tipografías', ul: ['**Inter**, de Rasmus Andersson — SIL Open Font License 1.1.', '**Space Grotesk**, de Florian Karsten — SIL Open Font License 1.1.', 'Se sirven desde la propia web (sin Google Fonts).'] },
      { h: 'Librerías', ul: ['React y React DOM — MIT.', 'Leaflet (mapa) — BSD-2-Clause.', 'Fontsource (paquetes de tipografías) — MIT.', 'Capacitor (app de Android) — MIT.', 'Firebase Cloud Messaging de Google (notificaciones de la app de Android) — servicio de Google, Condiciones de Firebase.', 'Vite, TypeScript, Vitest y Wrangler (herramientas de desarrollo) — MIT / Apache-2.0.'] },
      { h: 'Icono e imágenes', p: ['El icono y los gráficos de TrenAvís son propios. No se usan logos ni colores corporativos de Renfe, Rodalies ni Adif.'] },
    ],
  },
];

export const legalDoc = (id: string) => LEGAL.find((d) => d.id === id);
