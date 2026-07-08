import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { PRICES } from '../lib/farmdata';
import type { CropId } from '../lib/types';
import { Icon } from '../components/Icon';
import { SectionTitle } from '../components/ui';

export default function Prices() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useApp();

  const all = Object.keys(PRICES.crops) as CropId[];
  const mine = profile?.crops.filter((c) => all.includes(c)) ?? [];
  const rest = all.filter((c) => !mine.includes(c));
  const ordered = [...mine, ...rest];

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10">
      <button onClick={() => navigate(-1)} className="tap flex items-center gap-1 text-sm font-semibold text-clay-strong mb-2">
        <Icon name="chevronLeft" size={18} /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-extrabold text-ink">{t('tools.pricesTitle')}</h1>
      <p className="text-sm text-ink-soft mt-1">{t('tools.updated', { date: PRICES.updated })}</p>

      {ordered.map((crop) => {
        const c = PRICES.crops[crop]!;
        return (
          <div key={crop}>
            <SectionTitle>{t(`crops.${crop}`)} · <span className="normal-case text-ink-faint">{c.unit}</span></SectionTitle>
            <div className="card divide-y divide-line/60">
              {Object.entries(c.markets).map(([market, price]) => (
                <div key={market} className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 text-ink font-semibold text-sm">
                    <Icon name="pin" size={16} className="text-clay-strong" /> {market}
                  </span>
                  <span className="font-extrabold text-ink">
                    {PRICES.currency} {price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-ink-faint mt-6 text-balance">{t('tools.indicativeNote')}</p>
    </div>
  );
}
