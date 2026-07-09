import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useApp } from '../state/AppContext';

const CLERK_ON = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
import { KEYS, load, save, uid } from '../lib/storage';
import { CROPS, CROP_IDS } from '../lib/season';
import type { CropId, HubFarmer } from '../lib/types';
import { Icon } from '../components/Icon';
import { Button, Chip, EmptyState, Field, Sheet, inputCls } from '../components/ui';

const blank = () => ({ name: '', crop: 'maize' as CropId, location: '', fieldSizeHa: '0.5', phone: '', note: '' });

export default function Hub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateSettings } = useApp();
  const [farmers, setFarmers] = useState<HubFarmer[]>(() => load(KEYS.hubFarmers, [] as HubFarmer[]));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank());

  const persist = (next: HubFarmer[]) => {
    setFarmers(next);
    save(KEYS.hubFarmers, next);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    persist([
      {
        id: uid(),
        name: form.name.trim(),
        crop: form.crop,
        location: form.location.trim(),
        fieldSizeHa: Math.max(0, parseFloat(form.fieldSizeHa) || 0),
        phone: form.phone.trim() || undefined,
        note: form.note.trim() || undefined,
        createdAt: new Date().toISOString(),
      },
      ...farmers,
    ]);
    setForm(blank());
    setAdding(false);
  };

  const remove = (id: string) => persist(farmers.filter((f) => f.id !== id));

  return (
    <div className="min-h-dvh">
      {/* header */}
      <header className="relative overflow-hidden bg-soil text-bg dark:text-ink px-5 pt-8 pb-6 rounded-b-[2rem]">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{ background: 'linear-gradient(160deg, rgb(var(--c-umber)) 0%, rgb(var(--c-soil)) 70%)' }}
        />
        <div className="absolute inset-0 glow-radial opacity-70 pointer-events-none" aria-hidden />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-bg/80 dark:text-ink/70">{t('hub.leaderHi')}</p>
            <h1 className="text-3xl font-display font-bold text-bg dark:text-ink">{t('hub.title')}</h1>
            <p className="text-sm text-bg/75 dark:text-ink/70">{t('hub.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {CLERK_ON && <UserButton afterSignOutUrl="/welcome" />}
            <button
              onClick={() => navigate('/settings')}
              className="tap rounded-full bg-bg/15 p-2 text-bg dark:text-ink backdrop-blur"
              aria-label={t('nav.settings')}
            >
              <Icon name="settings" size={20} />
            </button>
          </div>
        </div>
        <div className="relative mt-5 inline-flex items-center gap-2 rounded-2xl bg-bg/12 backdrop-blur px-4 py-2"
             style={{ backgroundColor: 'rgb(var(--c-bg) / 0.14)' }}>
          <Icon name="globe" size={18} />
          <span className="font-bold text-bg dark:text-ink">
            {t('hub.farmerCount', { count: farmers.length })}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-24">
        <div className="mt-4">
          <Button full icon="plus" onClick={() => setAdding(true)}>{t('hub.addFarmer')}</Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {farmers.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState icon="sprout" title={t('hub.emptyTitle')} hint={t('hub.emptyHint')} />
            </div>
          ) : (
            farmers.map((f) => (
              <div key={f.id} className="card p-4 flex items-start gap-3">
                <span className="text-2xl" aria-hidden>{CROPS[f.crop].emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink truncate">{f.name}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {t(`crops.${f.crop}`)}{f.location ? ` · ${f.location}` : ''} · {f.fieldSizeHa} {t('common.ha')}
                  </p>
                  {f.phone && (
                    <p className="text-xs text-ink-faint mt-0.5 flex items-center gap-1">
                      <Icon name="phone" size={12} /> {f.phone}
                    </p>
                  )}
                  {f.note && <p className="text-xs text-ink-soft mt-1">{f.note}</p>}
                </div>
                <button onClick={() => remove(f.id)} className="tap text-ink-faint px-1" aria-label={t('common.delete')}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => { updateSettings({ appMode: 'personal' }); navigate('/', { replace: true }); }}
          className="tap mt-8 text-sm font-semibold text-clay-strong flex items-center gap-1 mx-auto"
        >
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
        <Button full onClick={submit} className="mt-1">{t('common.save')}</Button>
      </Sheet>
    </div>
  );
}
