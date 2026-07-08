import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PESTS } from '../lib/farmdata';
import { Icon } from '../components/Icon';
import { Chip, EmptyState, inputCls } from '../components/ui';

export default function Pests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useApp();
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(false);

  const myCrops = profile?.crops ?? [];

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return PESTS.filter((p) => {
      if (mineOnly && myCrops.length && !p.crops.some((c) => myCrops.includes(c))) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.symptoms.toLowerCase().includes(term) ||
        p.crops.some((c) => t(`crops.${c}`).toLowerCase().includes(term) || c.includes(term))
      );
    });
  }, [q, mineOnly, myCrops, t]);

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10">
      <button onClick={() => navigate(-1)} className="tap flex items-center gap-1 text-sm font-semibold text-clay-strong mb-2">
        <Icon name="chevronLeft" size={18} /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-extrabold text-ink">{t('tools.pestsTitle')}</h1>
      <p className="text-sm text-ink-soft mt-1 mb-3">{t('tools.pestsSub')}</p>

      <input
        className={inputCls}
        placeholder={t('tools.searchPests')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {myCrops.length > 0 && (
        <div className="flex gap-2 mt-3">
          <Chip active={!mineOnly} onClick={() => setMineOnly(false)}>{t('tools.allCrops')}</Chip>
          <Chip active={mineOnly} onClick={() => setMineOnly(true)}>{t('tools.myCrops')}</Chip>
        </div>
      )}

      <div className="space-y-3 mt-4">
        {results.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>{p.emoji}</span>
              <h2 className="font-extrabold text-ink">{p.name}</h2>
            </div>
            <p className="text-xs text-ink-faint mt-1">
              {t('tools.affects')}: {p.crops.map((c) => t(`crops.${c}`)).join(', ')}
            </p>
            <p className="text-sm text-ink mt-2"><span className="font-bold">{t('tools.symptoms')}: </span>{p.symptoms}</p>
            <p className="text-sm text-ink mt-1.5"><span className="font-bold text-clay-strong">{t('tools.treatment')}: </span>{p.treatment}</p>
          </div>
        ))}
        {results.length === 0 && (
          <EmptyState icon="alert" title={t('tools.noResults')} />
        )}
      </div>
    </div>
  );
}
