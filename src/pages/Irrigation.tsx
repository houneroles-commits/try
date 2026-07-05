import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { adviseIrrigation } from '../lib/irrigation';
import { CROP_IDS, CROPS } from '../lib/season';
import type { CropId, SoilId } from '../lib/types';
import { AdviceCard } from '../components/AdviceCard';
import { Icon } from '../components/Icon';
import { Field, inputCls } from '../components/ui';

export default function Irrigation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, weather, lastWatered, setLastWatered, records } = useApp();

  const [crop, setCrop] = useState<CropId>(profile?.crops[0] ?? 'maize');
  const [soil, setSoil] = useState<SoilId>(profile?.soil ?? 'loam');
  const [sizeHa, setSizeHa] = useState<number>(profile?.fieldSizeHa ?? 1);
  const [watered, setWatered] = useState<string>(lastWatered.slice(0, 10));

  const advice = useMemo(() => {
    if (!weather) return null;
    return adviseIrrigation({
      crop,
      soil,
      fieldSizeHa: sizeHa || 0.1,
      lastWatered: watered,
      plantingDate: profile?.plantingDates[crop],
      weather,
      records,
    });
  }, [weather, crop, soil, sizeHa, watered, profile, records]);

  return (
    <div className="mx-auto max-w-lg px-4 pt-5">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate(-1)}
          className="tap flex items-center justify-center rounded-full text-ink-soft active:bg-surface-2 -ml-2"
          aria-label={t('common.back')}
        >
          <Icon name="chevronLeft" size={22} />
        </button>
        <h1 className="text-2xl font-extrabold text-ink">{t('irrigation.title')}</h1>
      </div>
      <p className="text-sm text-ink-soft mb-5">{t('irrigation.subtitle')}</p>

      {/* live result at the top — updates as inputs change */}
      {advice && (
        <div className="mb-6">
          <AdviceCard advice={advice} fieldSizeHa={sizeHa || 0.1} />
        </div>
      )}

      {/* crop picker */}
      <Field label={t('irrigation.crop')}>
        <div className="grid grid-cols-4 gap-2">
          {CROP_IDS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              aria-pressed={crop === c}
              className={`tap card flex flex-col items-center gap-1 py-3 ${
                crop === c ? 'border-clay border-2 bg-clay-soft/30' : ''
              }`}
            >
              <span className="text-xl" aria-hidden>{CROPS[c].emoji}</span>
              <span className="text-[11px] font-bold text-ink">{t(`crops.${c}`)}</span>
            </button>
          ))}
        </div>
      </Field>

      {/* soil picker */}
      <Field label={t('irrigation.soil')}>
        <div className="grid grid-cols-3 gap-2">
          {(['sand', 'loam', 'clay'] as SoilId[]).map((s) => (
            <button
              key={s}
              onClick={() => setSoil(s)}
              aria-pressed={soil === s}
              className={`tap card py-3 text-sm font-bold text-ink ${
                soil === s ? 'border-clay border-2 bg-clay-soft/30' : ''
              }`}
            >
              {t(`soils.${s}`)}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('irrigation.fieldSize')}>
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            step={0.1}
            className={inputCls}
            value={sizeHa}
            onChange={(e) => setSizeHa(parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label={t('irrigation.lastWatered')}>
          <input
            type="date"
            className={inputCls}
            value={watered}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              if (e.target.value) {
                setWatered(e.target.value);
                setLastWatered(new Date(e.target.value).toISOString());
              }
            }}
          />
        </Field>
      </div>

      <div className="card p-4 mt-2 mb-8 bg-surface-2 border-0">
        <p className="text-xs leading-relaxed text-ink-soft">
          <Icon name="alert" size={13} className="inline mr-1 -mt-0.5 text-sun" />
          {t('irrigation.assumptions')}
        </p>
      </div>
    </div>
  );
}
