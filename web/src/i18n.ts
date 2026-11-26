/**
 * Textos de la interfaz. Para añadir catalán: copiar `es` como `ca`, traducir y cambiar `lang`.
 * Uso: t('search.results', { n: 5 })
 */
const es = {
  'app.name': 'TrenAvís',
  'app.tagline': 'App no oficial · Rodalies de Catalunya',
  'app.clock': 'Hora actual',
  'tab.mytrain': 'Mi tren', 'tab.search': 'Buscar', 'tab.station': 'Estación', 'tab.alarms': 'Alarmas', 'tab.more': 'Más',
  'tabs.label': 'Secciones',
  'load.loading': 'Cargando horarios…',
  'load.error': 'No se han podido cargar los horarios. Comprueba tu conexión y vuelve a intentarlo.',
  'load.retry': 'Reintentar',
  'load.offline': 'Sin conexión: usando los horarios guardados en este dispositivo.',
  'nodata.day': 'Renfe no ha publicado horarios para este día. Prueba con otra fecha o consulta la información oficial.',
  'common.from': 'Desde', 'common.to': 'Hasta', 'common.close': 'Cerrar', 'common.now': 'Ahora',
  'common.train': 'Tren {n}', 'common.direction': 'dirección {d}', 'common.scheduled': 'Según horario',
  'common.route': 'Recorrido', 'common.more': 'Ver más',
  'picker.choose': 'Elige estación', 'picker.search': 'Estación, pueblo o ciudad',
  'picker.none': 'No hay ninguna estación ni lugar que coincida con «{q}».',
  'picker.favorites': 'Favoritas', 'picker.all': 'Todas las estaciones', 'picker.stations': 'Estaciones',
  'picker.region': 'Zona', 'picker.direct': 'Sin transbordo', 'picker.transfer': 'Con un transbordo',
  'picker.showAll': 'Ver todas', 'picker.onlyReachable': 'Ver solo las que tienen tren',
  'picker.showingAll': 'Mostrando todas las estaciones.',
  'picker.noneReachable': 'No hay trenes desde esta estación.',
  'picker.near': 'Estaciones cerca de mí', 'picker.locating': 'Buscando tu ubicación…',
  'picker.nearPrivacy': 'Tu ubicación se usa solo en este móvil para calcular la distancia; no se envía a ningún sitio.',
  'picker.nearDenied': 'No has dado permiso de ubicación. Puedes activarlo en los ajustes del navegador o buscar por nombre.',
  'picker.nearError': 'No se ha podido obtener tu ubicación. Busca la estación por nombre.',
  'picker.nearTitle': 'Más cerca de ti', 'picker.nearNone': 'No hay ninguna estación a menos de 30 km.',
  'picker.nearPlace': 'Cerca de {p}',
  'picker.reachFrom': 'Solo estaciones con tren desde {s}.', 'picker.reachTo': 'Solo estaciones con tren hasta {s}.',
  'search.title': 'Buscar trayecto', 'search.sub': 'Elige de dónde a dónde y te enseño los trenes.',
  'search.swap': 'Invertir origen y destino', 'search.trip': 'Trayecto', 'search.when': 'Cuándo',
  'search.isNow': 'Ahora', 'search.options': 'Más opciones', 'search.advanced': 'Configuración avanzada',
  'search.leaveNow': 'Salir ahora', 'search.leaveAt': 'Salir {d} a partir de las {h}', 'search.onDay': 'el',
  'search.today': 'Hoy', 'search.tomorrow': 'Mañana', 'search.otherDay': 'Otro día',
  'search.timePh': 'Por ejemplo 8:30', 'search.timeHelp': 'Escribe la hora: 8:30, 830 o 17h.',
  'search.timeBad': 'No entiendo esa hora. Escríbela así: 8:30', 'search.resultsTitle': '{n} trenes', 'search.date': 'Día', 'search.after': 'Salir a partir de',
  'search.sort': 'Ordenar por', 'search.sort.dep': 'Hora de salida', 'search.sort.dur': 'Más rápido',
  'search.lines': 'Filtrar por línea', 'search.allLines': 'Todas',
  'search.pick': 'Elige origen y destino para ver los trenes.',
  'search.same': 'Elige dos estaciones distintas.',
  'search.results': '{n} opciones · {from} → {to}',
  'search.none': 'No hay trenes directos ni con un transbordo en las próximas 4 horas. Prueba otra hora, quita filtros o elige otra estación.',
  'search.direct': 'Directo', 'search.transfer': '1 transbordo',
  'search.transferAt': 'Cambia en {s} · {m} min para el transbordo',
  'station.title': 'Salidas y llegadas', 'station.sub': 'El panel de la estación, como el del andén.',
  'station.station': 'Estación', 'station.dep': 'Salidas', 'station.arr': 'Llegadas',
  'station.fav.add': 'Añadir a favoritas', 'station.fav.remove': 'Quitar de favoritas',
  'station.pick': 'Elige una estación para ver su panel.',
  'station.tap': 'Toca un tren para ver todas sus paradas.',
  'station.none': 'No quedan trenes hoy con estos filtros.',
  'station.toDest': 'Destino', 'station.fromOrig': 'Procedencia',
  'train.where.notStarted': 'Aún no ha salido. Sale de {s} a las {t}.',
  'train.where.at': 'Ahora está en {s}.', 'train.where.between': 'Ahora va entre {a} y {b}.',
  'train.where.finished': 'Ha llegado a {s}.',
  'train.where.note': 'Posición estimada según el horario. El tiempo real llegará en la próxima versión.',
  'train.board': 'subes', 'train.alight': 'bajas', 'train.stops': 'Paradas',
  'mytrain.title': 'Mi tren', 'mytrain.sub': 'El tren que vas a coger, en directo, parada a parada.',
  'mytrain.soon': 'Muy pronto podrás marcar un tren con «Voy en este» y seguirlo aquí con su retraso en directo.',
  'alarms.title': 'Alarmas', 'alarms.sub': 'Tus trayectos de siempre: te aviso cuándo salir de casa.',
  'alarms.soon': 'Las alarmas llegarán en una próxima versión.',
  'more.title': 'Más', 'more.lines': 'Líneas', 'more.data': 'Datos',
  'more.unofficial': 'App no oficial, sin relación con Renfe, Adif ni la Generalitat de Catalunya.',
  'more.free': 'TrenAvís es gratis y no tiene compras ni anuncios.',
  'more.source': 'Datos: Renfe (data.renfe.com), licencia CC BY 4.0. Pueden contener errores o faltar trenes: comprueba siempre la información oficial.',
  'more.valid': 'Horarios cargados del {a} al {b}. Actualizados: {u}.',
  'more.known': 'Problemas conocidos de los datos',
  'more.known.list': 'RG1: Renfe no publica trenes en fin de semana.|RT2: solo aparecen Tarragona y Salou-PortAventura.|Algunos días no tienen horarios publicados.|No hay información de vías.',
} as const;

export type Key = keyof typeof es;
const dicts: Record<string, Record<Key, string>> = { es };
let lang = 'es';
export const setLang = (l: string) => { if (dicts[l]) { lang = l; document.documentElement.lang = l; } };

export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
