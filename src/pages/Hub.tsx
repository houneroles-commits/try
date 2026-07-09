import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useApp } from '../state/AppContext';
import { CROPS, CROP_IDS } from '../lib/season';
import {
  avatarColor, geocode, initials, loadFarmers, rainNext48h, saveFarmers, statusFromRain,
  type FarmerStatus,
} from '../lib/hub';
import type { CropId, HubFarmer } from '../lib/types';
import { Icon, type IconName } from '../components/Icon';
import { Button, Chip, EmptyState, Field, Sheet, inputCls } from '../components/ui';
import { HubTour } from '../components/HubTour';
import { KEYS, load, save } from '../lib/storage';
import { useCloud } from '../lib/cloud';

const CLERK_ON = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const blank = () => ({ name: '', crop: 'maize' as CropId, location: '', fieldSizeHa: '0.5', phone: '', note: '' });

export default function Hub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateSettings } = useApp();
  const cloud = useCloud();

  const [farmers, setFarmers] = useState<HubFarmer[]>(() => loadFarmers());
  const [status, setStatus] = useState<Record<string, FarmerStatus>>({});
  const [q, setQ] = useState('');
  const [cropFilter, setCropFilter] = useState<CropId | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank());
  const [showTour, setShowTour] = useState(() => !load(KEYS.hubTourSeen, false));

  const closeTour = () => { setShowTour(false); save(KEYS.hubTourSeen, true); };

  const persist = (next: HubFarmer[]) => { setFarmers(next); saveFarmers(next); };

  // Cloud sync: when a leader is signed in, load their farmers from the server
  // (and push up any farmers that only existed locally).
  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    (async () => {
      try {
        const state = await cloud.getState();
        if (!alive) return;
        if (state.farmers.length > 0) {
          setFarmers(state.farmers);
          saveFarmers(state.farmers);
        } else {
          for (const f of loadFarmers()) await cloud.upsertFarmer(f);
        }
      } catch {
        /* offline → keep whatever is local */
      }
    })();
    return () => { alive = false; };
  }, [cloud]);

  // Fetch each farmer's rain status (lightweight, once per farmer with coords).
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const f of farmers) {
        if (f.lat == null || f.lon == null || status[f.id]) continue;
        try {
          const mm = await rainNext48h(f.lat, f.lon);
          if (alive) setStatus((s) => ({ ...s, [f.id]: statusFromRain(mm) }));
        } catch {
          if (alive) setStatus((s) => ({ ...s, [f.id]: 'unknown' }));
        }
      }
    })();
    return () => { alive = false; };
  }, [farmers]);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const geo = form.location.trim() ? await geocode(form.location.trim()) : null;
    const farmer: HubFarmer = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: form.name.trim(),
      crop: form.crop,
      location: geo?.label ?? form.location.trim(),
      lat: geo?.lat,
      lon: geo?.lon,
      fieldSizeHa: Math.max(0, parseFloat(form.fieldSizeHa) || 0),
      phone: form.phone.trim() || undefined,
      note: form.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    persist([farmer, ...farmers]);
    if (cloud) await cloud.upsertFarmer(farmer).catch(() => {});
    setForm(blank());
    setSaving(false);
    setAdding(false);
  };

  const remove = (id: string) => {
    persist(farmers.filter((f) => f.id !== id));
    if (cloud) cloud.deleteFarmer(id).catch(() => {});
  };

  // Derived: stats, crop breakdown, filtered list.
  const rainCount = farmers.filter((f) => status[f.id] === 'rain').length;
  const dryCount = farmers.filter((f) => status[f.id] === 'dry').length;
  const cropCount = new Set(farmers.map((f) => f.crop)).size;
  const cropsPresent = useMemo(
    () => CROP_IDS.filter((c) => farmers.some((f) => f.crop === c)),
    [farmers],
  );
  const filtered = farmers.filter((f) => {
    if (cropFilter !== 'all' && f.crop !== cropFilter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return f.name.toLowerCase().includes(term) || f.location.toLowerCase().includes(term);
  });

  const tiles: { icon: IconName; value: number; label: string; tint: string }[] = [
    { icon: 'sprout', value: farmers.length, label: t('hub.statFarmers'), tint: 'bg-clay-soft text-clay-strong' },
    { icon: 'rain', value: rainCount, label: t('hub.statRain'), tint: 'bg-sky/15 text-sky' },
    { icon: 'drop', value: dryCount, label: t('hub.statWater'), tint: 'bg-sun/25 text-sun' },
    { icon: 'chart', value: cropCount, label: t('hub.statCrops'), tint: 'bg-clay-soft text-clay-strong' },
  ];

  return (
    <div className="min-h-dvh">
      {/* premium header */}
      <header className="relative overflow-hidden bg-soil text-bg dark:text-ink px-5 pt-8 pb-7 rounded-b-[2rem]">
        <div className="absolute inset-0" aria-hidden
          style={{ background: 'linear-gradient(160deg, rgb(var(--c-umber)) 0%, rgb(var(--c-soil)) 70%)' }} />
        <div className="absolute inset-0 glow-radial opacity-70 pointer-events-none" aria-hidden />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-bg/80 dark:text-ink/70">{t('hub.leaderHi')}</p>
            <h1 className="text-3xl font-display font-bold text-bg dark:text-ink">{t('hub.title')}</h1>
            <p className="text-sm text-bg/75 dark:text-ink/70">{t('hub.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTour(true)}
              className="tap rounded-full bg-bg/15 p-2 text-bg dark:text-ink backdrop-blur" aria-label={t('hubTour.replay')}>
              <Icon name="sparkle" size={20} />
            </button>
            {CLERK_ON && <UserButton afterSignOutUrl="/welcome" />}
            <button onClick={() => navigate('/settings')}
              className="tap rounded-full bg-bg/15 p-2 text-bg dark:text-ink backdrop-blur" aria-label={t('nav.settings')}>
              <Icon name="settings" size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-24">
        {/* stat tiles */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {tiles.map((tile) => (
            <div key={tile.label} className="card p-3.5 bg-gradient-to-br from-surface to-surface-2/50 shadow-card">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile.tint}`}>
                <Icon name={tile.icon} size={18} />
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink tabular-nums">{tile.value}</p>
              <p className="text-[11px] font-semibold text-ink-soft leading-tight">{tile.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><Icon name="pin" size={16} /></span>
            <input className={`${inputCls} pl-9`} placeholder={t('hub.search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button icon="plus" onClick={() => setAdding(true)}>{t('hub.add')}</Button>
        </div>

        {/* crop filter chips */}
        {cropsPresent.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Chip active={cropFilter === 'all'} onClick={() => setCropFilter('all')}>{t('tools.allCrops')}</Chip>
            {cropsPresent.map((c) => (
              <Chip key={c} active={cropFilter === c} onClick={() => setCropFilter(c)}>
                {CROPS[c].emoji} {t(`crops.${c}`)}
              </Chip>
            ))}
          </div>
        )}

        {/* roster */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {farmers.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState icon="sprout" title={t('hub.emptyTitle')} hint={t('hub.emptyHint')}
                action={<Button icon="plus" onClick={() => setAdding(true)}>{t('hub.addFarmer')}</Button>} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="sm:col-span-2"><EmptyState icon="pin" title={t('tools.noResults')} /></div>
          ) : (
            filtered.map((f) => {
              const st = status[f.id];
              return (
                <button key={f.id} onClick={() => navigate(`/hub/farmer/${f.id}`)}
                  className="card tap text-left p-4 flex items-start gap-3 bg-gradient-to-br from-surface to-surface-2/40 active:brightness-95">
                  <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-on-clay font-extrabold shrink-0 ${avatarColor(f.name)}`}>
                    {initials(f.name) || CROPS[f.crop].emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-ink truncate">{f.name}</span>
                      {st === 'rain' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky/15 text-sky">🌧 {t('hub.chipRain')}</span>}
                      {st === 'dry' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sun/20 text-clay-strong">💧 {t('hub.chipWater')}</span>}
                    </span>
                    <span className="block text-xs text-ink-soft mt-0.5 truncate">
                      {CROPS[f.crop].emoji} {t(`crops.${f.crop}`)}{f.location ? ` · ${f.location}` : ''}
                    </span>
                    <span className="block text-[11px] text-ink-faint mt-0.5">
                      {f.fieldSizeHa} {t('common.ha')}{f.phone ? ` · 📱 ${f.phone}` : ''}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); remove(f.id); }}
                    className="tap text-ink-faint px-1 -m-1" aria-label={t('common.delete')}>
                    <Icon name="trash" size={16} />
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* crop breakdown */}
        {cropsPresent.length > 0 && (
          <p className="mt-5 text-xs text-ink-faint text-center">
            {cropsPresent.map((c) => `${CROPS[c].emoji} ${farmers.filter((f) => f.crop === c).length}`).join('   ·   ')}
          </p>
        )}

        <button onClick={() => { updateSettings({ appMode: 'personal' }); navigate('/', { replace: true }); }}
          className="tap mt-8 text-sm font-semibold text-clay-strong flex items-center gap-1 mx-auto">
          <Icon name="chevronLeft" size={16} /> {t('hub.switchPersonal')}
        </button>
      </div>

      {/* add-farmer sheet */}
      <Sheet open={adding} onClose={() => setAdding(false)} title={t('hub.addFarmer')}>
        <Field label={t('hub.fName')}>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <p className="text-sm font-semibold text-ink-soft mb-1.5">{t('hub.fCrop')}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CROP_IDS.map((c) => (
            <Chip key={c} active={form.crop === c} onClick={() => setForm({ ...form, crop: c })}>
              {CROPS[c].emoji} {t(`crops.${c}`)}
            </Chip>
          ))}
        </div>
        <Field label={t('hub.fLocation')}>
          <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t('hub.fLocationPh')} />
        </Field>
        <Field label={t('hub.fFieldSize')}>
          <input type="number" inputMode="decimal" min="0" step="0.1" className={inputCls} value={form.fieldSizeHa} onChange={(e) => setForm({ ...form, fieldSizeHa: e.target.value })} />
        </Field>
        <Field label={t('hub.fPhone')}>
          <input type="tel" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254…" />
        </Field>
        <Field label={t('hub.fNote')}>
          <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        <Button full onClick={submit} disabled={saving} className="mt-1">
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      </Sheet>

      <HubTour
        open={showTour}
        onClose={closeTour}
        onAddFarmer={() => { closeTour(); setAdding(true); }}
      />
    </div>
  );
}
