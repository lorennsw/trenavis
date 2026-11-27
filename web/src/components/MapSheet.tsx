import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context';
import { runsOn } from '../core/timetable';
import { lineColor } from '../core/lines';
import { delayOf, runStatus } from '../core/live';
import { t } from '../i18n';
import { Sheet } from './Sheet';

/** Mapa en directo (Leaflet + OpenStreetMap): líneas, estaciones y trenes con posición GPS. */
export default function MapSheet({ line, onClose }: { line?: string; onClose: () => void }) {
  const { tt, rt, now, lineIds, openTrain } = useApp();
  const [filter, setFilter] = useState<string | null>(line ?? null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ base: L.LayerGroup; trains: L.LayerGroup } | null>(null);
  const runs = useMemo(() => new Map(runsOn(tt, now.date).map((r) => [r.trip.id, r])), [tt, now.date]);

  // Crear el mapa una vez
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Datos: Renfe',
    }).addTo(m);
    layers.current = { base: L.layerGroup().addTo(m), trains: L.layerGroup().addTo(m) };
    map.current = m;
    setTimeout(() => m.invalidateSize(), 50);
    return () => { m.remove(); map.current = null; };
  }, []);

  // Líneas y estaciones
  useEffect(() => {
    const m = map.current, lg = layers.current;
    if (!m || !lg) return;
    lg.base.clearLayers();
    const pts: L.LatLngExpression[] = [];
    const shown = new Set<string>();
    for (const [id, l] of tt.lines) {
      if (filter && id !== filter) continue;
      const seq = l.stations[0] ?? [];
      const ll = seq.map((s) => tt.stations.get(s)).filter(Boolean).map((s) => [s!.lat, s!.lon] as [number, number]);
      L.polyline(ll, { color: lineColor(id), weight: 4, opacity: 0.8 }).addTo(lg.base);
      for (const s of seq) shown.add(s);
      pts.push(...ll);
    }
    for (const s of shown) {
      const st = tt.stations.get(s);
      if (st) L.circleMarker([st.lat, st.lon], { radius: 4, color: '#1240e0', weight: 2, fillColor: '#fff', fillOpacity: 1 }).bindTooltip(st.name).addTo(lg.base);
    }
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [20, 20] });
  }, [tt, filter]);

  // Trenes (se refresca con el tiempo real)
  const count = useRef(0);
  useEffect(() => {
    const lg = layers.current;
    if (!lg) return;
    lg.trains.clearLayers();
    count.current = 0;
    for (const v of rt.vehicles.values()) {
      const run = runs.get(v.tripId);
      const lid = run?.trip.l ?? v.label?.split('-')[0] ?? '';
      if (filter && lid !== filter) continue;
      const st = run ? runStatus(run, rt, now.date, now.date, now.min) : null;
      const delay = st ? delayOf(st) : 0;
      const icon = L.divIcon({ className: 'trainpin', html: `<span style="background:${lineColor(lid)}">${lid}</span>${delay > 0 ? `<i>+${delay}</i>` : ''}`, iconSize: [72, 26], iconAnchor: [20, 13] });
      const mk = L.marker([v.lat, v.lon], { icon, keyboard: true, title: `${lid} ${t('common.train', { n: run?.num ?? v.label ?? '' })}${delay ? ` +${delay} min` : ''}` }).addTo(lg.trains);
      if (run) mk.on('click', () => openTrain(run, now.date));
      count.current++;
    }
  }, [rt, runs, filter, now.date, now.min, openTrain]);

  return (
    <Sheet title={<>🗺 {t('map.title')}</>} onClose={onClose}>
      <div className="filters" role="group" aria-label={t('search.lines')}>
        <button className="fl" aria-pressed={!filter} onClick={() => setFilter(null)}>{t('map.all')}</button>
        {lineIds.map((id) => <button key={id} className="fl" aria-pressed={filter === id} onClick={() => setFilter(id)}>{id}</button>)}
      </div>
      <div ref={box} className="mapbox" role="application" aria-label={t('map.title')} />
      <p className="hint" role="status">{rt.stale ? t('rt.stale') : t('map.trains', { n: [...rt.vehicles.values()].filter((v) => !filter || (runs.get(v.tripId)?.trip.l ?? v.label?.split('-')[0]) === filter).length })}</p>
      <p className="hint">{t('map.privacy')}</p>
    </Sheet>
  );
}
