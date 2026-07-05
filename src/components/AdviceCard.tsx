import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import type { IrrigationAdvice } from '../lib/types';
import { Icon, type IconName } from './Icon';
import { SourceBadge } from './ui';

const LOOK: Record<
  IrrigationAdvice['action'],
  { icon: IconName; wrap: string; iconWrap: string }
> = {
  irrigate: {
    icon: 'drop',
    wrap: 'border-clay/60',
    iconWrap: 'bg-clay text-on-clay',
  },
  skip_rain: {
    icon: 'rain',
    wrap: 'border-sky/50',
    iconWrap: 'bg-sky text-bg',
  },
  wait: {
    icon: 'check',
    wrap: 'border-line',
    iconWrap: 'bg-surface-2 text-ink-soft',
  },
};

export function AdviceCard({
  advice,
  fieldSizeHa,
  onAdjust,
}: {
  advice: IrrigationAdvice;
  fieldSizeHa: number;
  onAdjust?: () => void;
}) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const look = LOOK[advice.action];
  const cropName = t(`crops.${advice.crop}`);

  let headline = '';
  let reason = '';
  if (advice.action === 'irrigate') {
    headline = t('advice.irrigateNow');
    reason = t('advice.irrigateReason', {
      crop: cropName,
      deficit: advice.deficit,
    });
  } else if (advice.action === 'skip_rain') {
    headline = t('advice.skipRain');
    reason = t('advice.skipRainReason', { mm: advice.rain48 });
  } else {
    headline = t('advice.waitTitle');
    reason = t('advice.waitReason', {
      crop: cropName,
      days: t('common.day', { count: advice.daysUntilCheck }),
    });
  }

  return (
    <div className={`card p-4 border-2 ${look.wrap}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          {t('advice.title')}
        </span>
        <SourceBadge source={advice.source} />
      </div>
      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${look.iconWrap}`}
        >
          <Icon name={look.icon} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-extrabold text-ink leading-tight">
            {headline}
          </h3>
          {advice.action === 'irrigate' && (
            <p className="text-clay-strong font-bold mt-0.5">
              {t('advice.irrigateAmount', { mm: advice.mm })}
              <span className="block text-xs font-semibold text-ink-soft">
                {t('advice.irrigateLitres', {
                  litres: advice.litres.toLocaleString(),
                  ha: fieldSizeHa,
                })}
              </span>
            </p>
          )}
          <p className="text-sm text-ink-soft mt-1.5 leading-snug">{reason}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          className="tap flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-sm font-semibold text-ink-soft py-2.5"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
        >
          <Icon
            name="chevronDown"
            size={16}
            className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
          {t('advice.details')}
        </button>
        {onAdjust && (
          <button
            className="tap flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-clay-soft/50 text-sm font-bold text-clay-strong py-2.5"
            onClick={onAdjust}
          >
            <Icon name="edit" size={15} />
            {t('advice.openTool')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                [t('advice.deficit'), `${advice.deficit} mm`],
                [t('advice.rain48'), `${advice.rain48} mm`],
                [t('advice.threshold'), `${advice.threshold} mm`],
                [t('advice.cropUse'), `${advice.etc} mm`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-2 px-3 py-2">
                  <dt className="text-[11px] font-semibold text-ink-faint">{k}</dt>
                  <dd className="font-bold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-ink-faint mt-2">{t('advice.basedOn')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
