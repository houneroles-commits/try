import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { Button, Sheet } from './ui';
import { Icon } from './Icon';

export function DashboardTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { updateSettings } = useApp();
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        key: 'welcome',
        icon: 'sprout' as const,
        title: t('tour.welcomeTitle'),
        body: t('tour.welcomeBody'),
      },
      {
        key: 'advice',
        icon: 'drop' as const,
        title: t('tour.adviceTitle'),
        body: t('tour.adviceBody'),
      },
      {
        key: 'quickLog',
        icon: 'calendar' as const,
        title: t('tour.quickLogTitle'),
        body: t('tour.quickLogBody'),
      },
      {
        key: 'records',
        icon: 'download' as const,
        title: t('tour.recordsTitle'),
        body: t('tour.recordsBody'),
      },
    ],
    [t],
  );

  const finish = () => {
    updateSettings({ dashboardTourSeen: true });
    onClose();
  };

  const current = steps[step];

  return (
    <Sheet open={open} onClose={finish} title={current.title}>
      <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 mb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clay text-on-clay">
          <Icon name={current.icon} size={20} />
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">{current.body}</p>
      </div>

      <div className="mb-4 flex justify-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${i === step ? 'bg-clay' : 'bg-line'}`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" full onClick={() => step > 0 ? setStep(step - 1) : finish()}>
          {step > 0 ? t('common.back') : t('common.skip')}
        </Button>
        <Button full onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}>
          {step < steps.length - 1 ? t('common.next') : t('common.done')}
        </Button>
      </div>
    </Sheet>
  );
}
