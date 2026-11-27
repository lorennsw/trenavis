import { useEffect, useId, useState } from 'react';
import type { Run } from '../core/timetable';
import { cleanPlatform, platformKey } from '../core/platform';
import { useApp } from '../context';
import { t } from '../i18n';

/** Apuntar "tu vía" para los trenes de esta línea y sentido en una estación. Se guarda solo en el dispositivo. */
export function PlatformEditor({ run, station }: { run: Run; station: string }) {
  const { tt, platforms, setPlatform } = useApp();
  const key = platformKey(run, station);
  const saved = key ? platforms[key] ?? '' : '';
  const [value, setValue] = useState(saved);
  const [msg, setMsg] = useState('');
  const id = useId();
  useEffect(() => { setValue(saved); }, [saved]);
  if (!key) return null;

  const name = (s: string) => tt.stations.get(s)?.name ?? s;
  const i = run.stations.indexOf(station);
  const next = run.stations[i + 1];
  const applies = next
    ? t('platform.applies', { l: run.trip.l, d: name(run.stations[run.stations.length - 1]), n: name(next) })
    : t('platform.appliesEnd', { l: run.trip.l, n: name(run.stations[i - 1]) });

  const save = () => {
    const v = cleanPlatform(value);
    setPlatform(key, v);
    setMsg(v ? t('platform.saved', { v }) : '');
  };

  return (
    <section className="via-ed" aria-labelledby={`${id}-t`}>
      <h4 id={`${id}-t`}>{t('platform.title', { s: name(station) })}</h4>
      <p className="hint">{applies}</p>
      <label className="f" htmlFor={`${id}-i`}>{t('platform.label')}</label>
      <div className="via-row">
        <input id={`${id}-i`} type="text" maxLength={5} autoComplete="off" placeholder="7" value={value}
          onChange={(e) => { setValue(e.target.value); setMsg(''); }} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
        <button className="btn pri" onClick={save} disabled={(cleanPlatform(value) ?? '') === saved}>{t('platform.save')}</button>
      </div>
      {saved && <button className="linkbtn" onClick={() => { setPlatform(key, null); setValue(''); setMsg(''); }}>{t('platform.delete')}</button>}
      <p className="hint" role="status">{msg}</p>
      <p className="hint">{t('platform.privacy')}</p>
    </section>
  );
}
