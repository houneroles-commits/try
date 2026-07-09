import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CROPS } from '../lib/season';
import {
  addRecord, avatarColor, deleteRecord, getFarmer, getRecords, initials, rainNext48h,
} from '../lib/hub';
import { useCloud } from '../lib/cloud';
import type { FarmRecord, HubFarmer, RecordKind } from '../lib/types';
import { Icon } from '../components/Icon';
import { Button, Sheet, Skeleton, inputCls } from '../components/ui';

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';

export default function FarmerDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const cloud = useCloud();
  const [farmer, setFarmer] = useState<HubFarmer | undefined>(() => getFarmer(id));

  const [rain, setRain] = useState<number | null>(null);
  const [rainLoading, setRainLoading] = useState(true);
  const [records, setRecords] = useState<FarmRecord[]>(() => getRecords(id));

  // When signed in, load this farmer + records from the cloud.
  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    cloud.getState()
      .then((s) => {
        if (!alive) return;
        const f = s.farmers.find((x) => x.id === id);
        if (f) setFarmer(f);
        setRecords(s.records[id] ?? []);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [cloud, id]);
  const [logKind, setLogKind] = useState<RecordKind | null>(null);
  const [amount, setAmount] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let alive = true;
    if (farmer?.lat != null && farmer?.lon != null) {
      rainNext48h(farmer.lat, farmer.lon)
        .then((mm) => alive && setRain(mm))
        .catch(() => alive && setRain(null))
        .finally(() => alive && setRainLoading(false));
    } else {
      setRainLoading(false);
    }
    return () => { alive = false; };
  }, [farmer]);

  if (!farmer) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <p className="text-ink-soft">{t('hub.notFound')}</p>
        <Button className="mt-4" icon="chevronLeft" onClick={() => navigate('/hub')}>{t('common.back')}</Button>
      </div>
    );
  }

  const advice =
    rain == null ? t('hub.noWeather')
    : rain >= 10 ? t('hub.adviceRain', { mm: rain })
    : t('hub.adviceDry', { mm: rain });

  const logRecord = () => {
    if (!logKind) return;
    const amt = Math.max(0, parseFloat(amount) || 0);
    if (amt <= 0) return;
    const next = addRecord(id, { kind: logKind, date: new Date().toISOString().slice(0, 10), amount: amt, crop: farmer.crop });
    setRecords(next);
    if (cloud) cloud.saveRecords(id, next).catch(() => {});
    setLogKind(null);
    setAmount('');
  };

  const removeRecord = (rid: string) => {
    const next = deleteRecord(id, rid);
    setRecords(next);
    if (cloud) cloud.saveRecords(id, next).catch(() => {});
  };

  const ask = async () => {
    const qn = question.trim();
    if (!qn || !API_BASE) return;
    setAsking(true);
    setAnswer('');
    try {
      const system = `You are Lima, a farming assistant. Advise the leader helping this farmer. ` +
        `Farmer: ${farmer.name}. Crop: ${farmer.crop}. Location: ${farmer.location || 'unknown'}. ` +
        `Rain expected next 2 days: ${rain ?? 'unknown'} mm. Keep it short and practical.`;
      const r = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: [{ role: 'user', content: qn }] }),
      });
      const data = await r.json();
      setAnswer(data.text || t('common.error'));
    } catch {
      setAnswer(t('common.error'));
    } finally {
      setAsking(false);
    }
  };

  const waLink = farmer.phone
    ? `https://wa.me/${farmer.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(advice)}`
    : null;

  return (
    <div className="min-h-dvh">
      <header className="relative overflow-hidden bg-soil text-bg dark:text-ink px-5 pt-7 pb-6 rounded-b-[2rem]">
        <div className="absolute inset-0" aria-hidden
          style={{ background: 'linear-gradient(160deg, rgb(var(--c-umber)) 0%, rgb(var(--c-soil)) 70%)' }} />
        <div className="absolute inset-0 glow-radial opacity-70 pointer-events-none" aria-hidden />
        <div className="relative">
          <button onClick={() => navigate('/hub')} className="tap flex items-center gap-1 text-sm font-semibold text-bg/90 dark:text-ink/80 mb-3">
            <Icon name="chevronLeft" size={18} /> {t('hub.title')}
          </button>
          <div className="flex items-center gap-3">
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-on-clay text-xl font-extrabold shadow-glow ${avatarColor(farmer.name)}`}>
              {initials(farmer.name) || CROPS[farmer.crop].emoji}
            </span>
            <div>
              <h1 className="text-2xl font-display font-bold text-bg dark:text-ink">{farmer.name}</h1>
              <p className="text-sm text-bg/80 dark:text-ink/75">
                {CROPS[farmer.crop].emoji} {t(`crops.${farmer.crop}`)}{farmer.location ? ` · ${farmer.location}` : ''} · {farmer.fieldSizeHa} {t('common.ha')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-24">
        {/* weather advice */}
        <div className="card p-5 mt-4 shadow-glow">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{t('hub.todayAdvice')}</p>
          {rainLoading ? (
            <Skeleton className="h-8 mt-2 w-3/4" />
          ) : (
            <p className="text-lg font-bold text-ink mt-1 leading-snug">{advice}</p>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-clay-strong">
              <Icon name="chat" size={16} /> {t('hub.sendWhatsapp')}
            </a>
          )}
        </div>

        {/* ask AI on behalf */}
        <div className="card p-5 mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint mb-2">{t('hub.askAi')}</p>
          <div className="flex gap-2">
            <input className={inputCls} placeholder={t('hub.askPlaceholder')} value={question}
              onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} />
            <Button icon="send" onClick={ask} disabled={asking || !API_BASE}>{t('assistant.send')}</Button>
          </div>
          {!API_BASE && <p className="text-[11px] text-ink-faint mt-2">{t('assistant.offlineNote')}</p>}
          {asking && <p className="text-sm text-ink-soft mt-3">{t('assistant.thinking')}</p>}
          {answer && <p className="text-sm text-ink mt-3 whitespace-pre-wrap bg-surface-2/60 rounded-xl p-3">{answer}</p>}
        </div>

        {/* records */}
        <div className="mt-5 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-soft">{t('records.title')}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {([['rain', 'rain', 'home.logRain'], ['irrigation', 'drop', 'home.logIrrigation'], ['harvest', 'sprout', 'home.logHarvest']] as const).map(
            ([k, icon, label]) => (
              <button key={k} onClick={() => setLogKind(k)} className="card tap flex flex-col items-center gap-1.5 py-4 active:bg-surface-2">
                <span className="text-clay-strong"><Icon name={icon} size={22} /></span>
                <span className="text-xs font-bold text-ink">{t(label)}</span>
              </button>
            ),
          )}
        </div>

        <div className="mt-3 space-y-2">
          {records.length === 0 ? (
            <p className="text-sm text-ink-faint text-center py-4">{t('records.empty')}</p>
          ) : (
            records.map((r) => (
              <div key={r.id} className="card flex items-center gap-3 px-4 py-2.5">
                <Icon name={r.kind === 'rain' ? 'rain' : r.kind === 'irrigation' ? 'drop' : 'sprout'} size={18} className="text-clay-strong" />
                <span className="flex-1 text-sm font-semibold text-ink">{t(`records.${r.kind}`)}</span>
                <span className="text-sm font-bold text-ink">{r.amount} {r.kind === 'harvest' ? t('common.kg') : t('common.mm')}</span>
                <span className="text-xs text-ink-faint">{r.date}</span>
                <button onClick={() => removeRecord(r.id)} className="tap text-ink-faint px-1" aria-label={t('common.delete')}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Sheet open={logKind !== null} onClose={() => setLogKind(null)}
        title={logKind === 'harvest' ? t('records.amountKg') : t('records.amountMm')}>
        <input type="number" inputMode="decimal" min="0" className={inputCls} value={amount}
          onChange={(e) => setAmount(e.target.value)} autoFocus />
        <Button full className="mt-3" onClick={logRecord}>{t('common.save')}</Button>
      </Sheet>
    </div>
  );
}
