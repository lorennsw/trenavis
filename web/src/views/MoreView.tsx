import { useApp } from '../context';
import { t } from '../i18n';
import { LineChip } from '../components/LineChip';

const ymd = (s: string) => `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;

export function MoreView() {
  const { meta, lineIds } = useApp();
  return (
    <>
      <h3>{t('more.lines')}</h3>
      <div className="filters">{lineIds.map((l) => <LineChip key={l} id={l} />)}</div>
      <h3>{t('more.data')}</h3>
      <div className="menu">
        <p>{t('more.source')}</p>
        <p>{t('more.valid', { a: ymd(meta.validFrom), b: ymd(meta.validTo), u: new Date(meta.generatedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' }) })}</p>
        <h4>{t('more.known')}</h4>
        <ul>{t('more.known.list').split('|').map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <p className="note">{t('more.free')} {t('more.unofficial')}</p>
    </>
  );
}
