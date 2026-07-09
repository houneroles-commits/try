import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Sheet } from './ui';
import { Icon, type IconName } from './Icon';

/** First-run welcome tour for a Hub leader. Explains what the hub does and
 *  ends with a call to add their first farmer. */
export function HubTour({
  open,
  onClose,
  onAddFarmer,
}: {
  open: boolean;
  onClose: () => void;
  onAddFarmer: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      { icon: 'globe' as IconName, title: t('hubTour.welcomeTitle'), body: t('hubTour.welcomeBody') },
      { icon: 'plus' as IconName, title: t('hubTour.addTitle'), body: t('hubTour.addBody') },
      { icon: 'rain' as IconName, title: t('hubTour.statusTitle'), body: t('hubTour.statusBody') },
      { icon: 'chat' as IconName, title: t('hubTour.detailTitle'), body: t('hubTour.detailBody') },
    ],
    [t],
  );

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <Sheet open={open} onClose={onClose} title={current.title}>
      <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 mb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clay text-on-clay shadow-glow">
          <Icon name={current.icon} size={20} />
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">{current.body}</p>
      </div>

      <div className="mb-4 flex justify-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-clay' : 'bg-line'}`} />
        ))}
      </div>

      {isLast ? (
        <div className="flex flex-col gap-2">
          <Button full icon="plus" onClick={onAddFarmer}>{t('hubTour.addFirst')}</Button>
          <Button variant="ghost" full onClick={onClose}>{t('hubTour.explore')}</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={() => (step > 0 ? setStep(step - 1) : onClose())}>
            {step > 0 ? t('common.back') : t('common.skip')}
          </Button>
          <Button full onClick={() => setStep(step + 1)}>{t('common.next')}</Button>
        </div>
      )}
    </Sheet>
  );
}
