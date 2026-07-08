/** Small shared UI primitives — big tap targets, warm surfaces. */
import { AnimatePresence, motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';

/* ---------------------------------------------------------------- Button */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  full?: boolean;
  size?: 'md' | 'lg';
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-clay to-clay-strong text-on-clay active:brightness-95 shadow-glow font-semibold',
  secondary:
    'bg-surface-2 text-ink active:bg-line/80 border border-line font-semibold',
  ghost: 'bg-transparent text-clay-strong active:bg-clay-soft/40 font-semibold',
  danger: 'bg-danger text-on-danger active:opacity-90 font-semibold',
};

export function Button({
  variant = 'primary',
  icon,
  full,
  size = 'md',
  className = '',
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      className={`tap inline-flex items-center justify-center gap-2 rounded-2xl px-5 transition-colors disabled:opacity-45 disabled:pointer-events-none ${
        size === 'lg' ? 'min-h-[56px] text-lg' : 'text-base'
      } ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 24 : 20} />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Chip */
export function Chip({
  active,
  onClick,
  children,
  icon,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`tap inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
        active
          ? 'bg-soil text-bg border-soil dark:bg-clay dark:text-on-clay dark:border-clay'
          : 'bg-surface text-ink-soft border-line active:bg-surface-2'
      }`}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------- SectionTitle */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2 px-1">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-soft">
        <span className="inline-block h-4 w-1 rounded-full bg-gradient-to-b from-clay to-sun" aria-hidden />
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- EmptyState */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-clay-soft/50 text-clay-strong flex items-center justify-center">
        <Icon name={icon} size={28} />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-soft max-w-[26ch] text-balance">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- Skeleton */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-2 ${className}`}
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------ SourceBadge */
export function SourceBadge({ source }: { source: 'live' | 'cache' | 'demo' }) {
  const { t } = useTranslation();
  if (source === 'live')
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        <span className="w-1.5 h-1.5 rounded-full bg-clay inline-block" />
        {t('common.liveData')}
      </span>
    );
  const label = source === 'cache' ? t('common.cachedData') : t('common.demoData');
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        source === 'demo'
          ? 'bg-sun/20 text-ink-soft'
          : 'bg-surface-2 text-ink-soft'
      }`}
    >
      {source === 'demo' && <Icon name="sparkle" size={12} />}
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------- Sheet */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-soil/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-3xl shadow-float px-5 pt-3 pb-6 safe-bottom max-h-[88dvh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            {title && (
              <h3 className="text-lg font-bold text-ink mb-3">{title}</h3>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- Field */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold text-ink-soft mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full tap rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint focus:border-clay';

/* ---------------------------------------------------------------- Toast */
export function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-24 inset-x-0 z-50 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          <div className="bg-soil text-bg dark:bg-surface-2 dark:text-ink rounded-full px-5 py-2.5 text-sm font-semibold shadow-float flex items-center gap-2">
            <Icon name="check" size={16} />
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
