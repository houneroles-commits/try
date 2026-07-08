import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { FERTILIZER } from '../lib/farmdata';
import { CROPS } from '../lib/season';
import type { CropId } from '../lib/types';
import { Icon } from '../components/Icon';
import { Chip, Field, inputCls } from '../components/ui';

const ALL = Object.keys(FERTILIZER) as CropId[];

export default function Fertilizer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useApp();

  const [crop, setCrop] = useState<CropId>(profile?.crops[0] ?? 'maize');
  const [ha, setHa] = useState<string>(String(profile?.fieldSizeHa ?? 0.5));

  const size = Math.max(0, parseFloat(ha) || 0);
  const plan = FERTILIZER[crop];
  const kg = (perHa: number) => Math.round(perHa * size);

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10">
      <button onClick={() => navigate(-1)} className="tap flex items-center gap-1 text-sm font-semibold text-clay-strong mb-2">
        <Icon name="chevronLeft" size={18} /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-extrabold text-ink">{t('tools.fertilizerTitle')}</h1>
      <p className="text-sm text-ink-soft mt-1 mb-4">{t('tools.fertilizerSub')}</p>

      <p className="text-sm font-semibold text-ink-soft mb-2">{t('tools.chooseCrop')}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL.map((c) => (
          <Chip key={c} active={crop === c} onClick={() => setCrop(c)}>
            {CROPS[c].emoji} {t(`crops.${c}`)}
          </Chip>
        ))}
      </div>

      <Field label={t('tools.fieldSizeHa')}>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          className={inputCls}
          value={ha}
          onChange={(e) => setHa(e.target.value)}
        />
      </Field>

      <div className="card p-5 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden>{CROPS[crop].emoji}</span>
          <h2 className="font-extrabold text-ink text-lg">{t(`crops.${crop}`)}</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('tools.atPlanting')}</p>
              <p className="font-bold text-ink">{plan.basal.name}</p>
            </div>
            <p className="text-xl font-extrabold text-clay-strong">{kg(plan.basal.kgPerHa)} {t('common.kg')}</p>
          </div>

          {plan.topDress.kgPerHa > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('tools.duringGrowth')}</p>
                <p className="font-bold text-ink">{plan.topDress.name}</p>
              </div>
              <p className="text-xl font-extrabold text-clay-strong">{kg(plan.topDress.kgPerHa)} {t('common.kg')}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-ink-soft mt-4">{plan.note}</p>
      </div>

      <p className="text-xs text-ink-faint mt-4 text-balance">{t('tools.fertNote')}</p>
    </div>
  );
}
