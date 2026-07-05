import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { Icon, type IconName } from './Icon';
import { KEYS, load, save } from '../lib/storage';

const TABS: { to: string; icon: IconName; key: string }[] = [
  { to: '/', icon: 'home', key: 'nav.home' },
  { to: '/assistant', icon: 'chat', key: 'nav.assistant' },
  { to: '/weather', icon: 'cloud', key: 'nav.weather' },
  { to: '/data', icon: 'chart', key: 'nav.data' },
  { to: '/settings', icon: 'settings', key: 'nav.settings' },
];

function OfflineBanner() {
  const { online } = useApp();
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden bg-umber text-bg"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold">
            <Icon name="wifiOff" size={14} />
            {t('common.offline')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InstallPrompt() {
  const { t } = useTranslation();
  const [evt, setEvt] = useState<any>(null);
  const [dismissed, setDismissed] = useState<boolean>(() =>
    load(KEYS.installDismissed, false),
  );
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  if (!evt || dismissed) return null;
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-20 inset-x-3 z-40 card flex items-center gap-3 p-3 shadow-float"
    >
      <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink">{t('install.title')}</p>
        <p className="text-xs text-ink-soft">{t('install.body')}</p>
      </div>
      <button
        className="tap px-3 text-sm font-bold text-clay-strong"
        onClick={() => void evt.prompt().finally(() => setEvt(null))}
      >
        {t('install.install')}
      </button>
      <button
        className="tap px-1 text-ink-faint"
        aria-label={t('install.dismiss')}
        onClick={() => {
          setDismissed(true);
          save(KEYS.installDismissed, true);
        }}
      >
        <Icon name="x" size={18} />
      </button>
    </motion.div>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <div className="min-h-dvh flex flex-col">
      <OfflineBanner />
      <main className="flex-1 pb-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <InstallPrompt />
      <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line safe-bottom"
        aria-label="Main"
      >
        <div className="mx-auto max-w-lg grid grid-cols-5">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `tap flex flex-col items-center justify-center gap-0.5 py-2 min-h-[60px] ${
                  isActive ? 'text-clay-strong' : 'text-ink-faint'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center rounded-full px-4 py-0.5 transition-colors ${
                      isActive ? 'bg-clay-soft/60' : ''
                    }`}
                  >
                    <Icon name={tab.icon} size={22} />
                  </span>
                  <span className="text-[11px] font-semibold">{t(tab.key)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
