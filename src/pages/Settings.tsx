import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { downloadCSV } from '../lib/records';
import { LANGUAGES } from '../i18n';
import type { Language, ThemeMode } from '../lib/types';
import { Icon, type IconName } from '../components/Icon';
import { Button, Field, SectionTitle, Toast, inputCls } from '../components/ui';
import { load, save } from '../lib/storage';
import { subscribePush } from '../lib/push';

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '';

// WhatsApp "scan to chat" link. Twilio sandbox needs the farmer to send
// "join <code>" first — put YOUR sandbox code below (from the Twilio console,
// e.g. "join lucky-tiger") so the QR pre-fills it. Override via env if you like.
const env = (import.meta as any).env ?? {};
const WA_NUMBER: string = env.VITE_WHATSAPP_NUMBER ?? '14155238886';
const WA_JOIN: string = env.VITE_WHATSAPP_JOIN ?? 'join'; // e.g. 'join lucky-tiger'
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_JOIN)}`;

function Toggle({
  checked,
  onChange,
  label,
  hint,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  icon: IconName;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
    >
      <Icon name={icon} size={20} className="text-clay-strong shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-ink text-sm">{label}</span>
        {hint && <span className="block text-xs text-ink-soft mt-0.5">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-clay' : 'bg-line'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

interface AlertPrefs {
  phone: string;
  optIn: boolean;
}

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings, updateSettings, profile, records, clearAll, weather } = useApp();
  const [toast, setToast] = useState('');
  const [alertPrefs, setAlertPrefs] = useState<AlertPrefs>(() =>
    load('lima.alerts', { phone: '', optIn: false }),
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  // Generate the "scan to chat on WhatsApp" QR once (client-side, works offline).
  useEffect(() => {
    QRCode.toDataURL(WA_LINK, { margin: 1, width: 240 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, []);

  const flash = (msg: string, ms = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  };

  const saveAlerts = async (prefs: AlertPrefs) => {
    setAlertPrefs(prefs);
    save('lima.alerts', prefs);
    if (!API_BASE) {
      flash(t('settings.alertsSaved'));
      return;
    }
    try {
      const subscription = prefs.optIn ? await subscribePush() : null;
      const res = await fetch(`${API_BASE}/api/alerts/optin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: prefs.phone,
          optIn: prefs.optIn,
          lat: weather?.lat ?? profile?.location?.lat,
          lon: weather?.lon ?? profile?.location?.lon,
          language: settings.language,
          subscription,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'send_failed');
      if (data.whatsapp === 'sent') flash(t('settings.alertsWhatsappSent'), 4000);
      else if (data.whatsapp === 'simulated') flash(t('settings.alertsSimulated'), 4000);
      else flash(t('settings.alertsSaved'));
    } catch (e) {
      flash(`${t('settings.alertsFailed')}: ${(e as Error).message}`, 6000);
    }
  };

  const askNotifications = async () => {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10">
      <h1 className="text-2xl font-extrabold text-ink">{t('settings.title')}</h1>

      {/* language */}
      <SectionTitle>{t('settings.language')}</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            aria-pressed={settings.language === l.code}
            onClick={() => updateSettings({ language: l.code as Language })}
            className={`tap card py-3.5 font-bold text-ink text-sm ${
              settings.language === l.code
                ? 'border-2 border-clay bg-clay-soft/30'
                : ''
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* theme */}
      <SectionTitle>{t('settings.theme')}</SectionTitle>
      <div className="inline-flex w-full rounded-xl bg-surface-2 p-1">
        {(
          [
            ['light', 'sun'],
            ['dark', 'moon'],
            ['system', 'settings'],
          ] as [ThemeMode, IconName][]
        ).map(([mode, icon]) => (
          <button
            key={mode}
            aria-pressed={settings.theme === mode}
            onClick={() => updateSettings({ theme: mode })}
            className={`tap flex-1 min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-colors ${
              settings.theme === mode
                ? 'bg-surface text-ink shadow-card'
                : 'text-ink-faint'
            }`}
          >
            <Icon name={icon} size={15} />
            {t(`settings.${mode}`)}
          </button>
        ))}
      </div>

      {/* accessibility */}
      <SectionTitle>{t('settings.accessibility')}</SectionTitle>
      <div className="inline-flex w-full rounded-xl bg-surface-2 p-1">
        {(
          [
            ['normal', 'settings.textNormal'],
            ['large', 'settings.textLarge'],
          ] as ['normal' | 'large', string][]
        ).map(([size, label]) => (
          <button
            key={size}
            aria-pressed={(settings.textSize ?? 'normal') === size}
            onClick={() => updateSettings({ textSize: size })}
            className={`tap flex-1 min-h-[44px] rounded-lg flex items-center justify-center gap-1.5 font-bold transition-colors ${
              size === 'large' ? 'text-lg' : 'text-sm'
            } ${
              (settings.textSize ?? 'normal') === size
                ? 'bg-surface text-ink shadow-card'
                : 'text-ink-faint'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="card divide-y divide-line/60 mt-2">
        <Toggle
          icon="sun"
          checked={!!settings.highContrast}
          onChange={(v) => updateSettings({ highContrast: v })}
          label={t('settings.sunlight')}
          hint={t('settings.sunlightHint')}
        />
        <button
          onClick={() => navigate('/welcome')}
          className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
        >
          <Icon name="globe" size={19} className="text-clay-strong" />
          <span className="flex-1 font-bold text-ink text-sm">{t('settings.switchMode')}</span>
          <Icon name="chevronRight" size={16} className="text-ink-faint" />
        </button>
      </div>

      {/* farm profile */}
      <SectionTitle>{t('settings.profile')}</SectionTitle>
      <div className="card divide-y divide-line/60">
        <button
          className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
          onClick={() => navigate('/onboarding')}
        >
          <Icon name="edit" size={19} className="text-clay-strong" />
          <span className="flex-1">
            <span className="block font-bold text-ink text-sm">
              {t('settings.editProfile')}
            </span>
            {profile && (
              <span className="block text-xs text-ink-soft mt-0.5">
                {profile.crops.map((c) => t(`crops.${c}`)).join(' · ')} ·{' '}
                {profile.fieldSizeHa} {t('common.ha')}
              </span>
            )}
          </span>
          <Icon name="chevronRight" size={16} className="text-ink-faint" />
        </button>
      </div>

      {/* app behaviour */}
      <SectionTitle>{t('app.name')}</SectionTitle>
      <div className="card divide-y divide-line/60">
        <Toggle
          icon="sparkle"
          checked={settings.show3D}
          onChange={(v) => updateSettings({ show3D: v })}
          label={t('settings.threeD')}
          hint={t('settings.threeDHint')}
        />
        <Toggle
          icon="download"
          checked={settings.dataSaver}
          onChange={(v) => updateSettings({ dataSaver: v })}
          label={t('settings.dataSaver')}
          hint={t('settings.dataSaverHint')}
        />
        <Toggle
          icon="speaker"
          checked={settings.voiceReplies}
          onChange={(v) => updateSettings({ voiceReplies: v })}
          label={t('settings.voiceReplies')}
        />
      </div>

      {/* alerts */}
      <SectionTitle>{t('settings.alerts')}</SectionTitle>
      <div className="card px-4 py-4">
        <p className="text-xs text-ink-soft mb-3">{t('settings.alertsHint')}</p>
        <Field label={t('settings.phoneNumber')}>
          <input
            type="tel"
            inputMode="tel"
            className={inputCls}
            value={alertPrefs.phone}
            placeholder={t('settings.phonePlaceholder')}
            onChange={(e) =>
              setAlertPrefs({ ...alertPrefs, phone: e.target.value })
            }
          />
        </Field>
        <Toggle
          icon="phone"
          checked={alertPrefs.optIn}
          onChange={(v) => void saveAlerts({ ...alertPrefs, optIn: v })}
          label={t('settings.alertsOptIn')}
        />
        {!API_BASE && alertPrefs.optIn && (
          <p className="text-[11px] text-ink-faint mt-1 px-1">
            {t('settings.alertsNeedServer')}
          </p>
        )}
        {'Notification' in window && Notification.permission === 'default' && (
          <Button
            variant="secondary"
            full
            className="mt-2"
            onClick={() => void askNotifications()}
          >
            {t('settings.notifications')}
          </Button>
        )}

        {/* Scan-to-chat-on-WhatsApp QR (collapsible) */}
        <div className="mt-3 border-t border-line/60 pt-3">
          <button
            onClick={() => setShowQR((v) => !v)}
            aria-expanded={showQR}
            className="tap w-full flex items-center gap-3 text-left"
          >
            <Icon name="camera" size={19} className="text-clay-strong shrink-0" />
            <span className="flex-1 font-bold text-ink text-sm">
              {t('settings.scanWhatsapp')}
            </span>
            <Icon
              name={showQR ? 'chevronDown' : 'chevronRight'}
              size={16}
              className="text-ink-faint"
            />
          </button>
          {showQR && (
            <div className="mt-3 flex flex-col items-center text-center">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="WhatsApp QR code"
                  className="w-44 h-44 rounded-xl bg-white p-2 shadow-card"
                />
              ) : (
                <p className="text-xs text-ink-faint py-10">…</p>
              )}
              <p className="text-xs text-ink-soft mt-2 max-w-[16rem]">
                {t('settings.scanWhatsappHint')}
              </p>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-clay-strong mt-2 underline"
              >
                {t('settings.openWhatsapp')}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* data */}
      <SectionTitle>{t('nav.data')}</SectionTitle>
      <div className="card divide-y divide-line/60">
        <button
          className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2 disabled:opacity-50"
          onClick={() => downloadCSV(records)}
          disabled={records.length === 0}
        >
          <Icon name="download" size={19} className="text-clay-strong" />
          <span className="flex-1 font-bold text-ink text-sm">
            {t('settings.exportCsv')}
          </span>
          <span className="text-xs font-semibold text-ink-faint">
            {records.length}
          </span>
        </button>
        <button
          className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
          onClick={() => {
            if (confirmReset) clearAll();
            else {
              setConfirmReset(true);
              setTimeout(() => setConfirmReset(false), 4000);
            }
          }}
        >
          <Icon name="trash" size={19} className="text-danger" />
          <span className={`flex-1 font-bold text-sm ${confirmReset ? 'text-danger' : 'text-ink'}`}>
            {confirmReset ? t('settings.resetConfirm') : t('settings.reset')}
          </span>
        </button>
      </div>

      {/* about */}
      <SectionTitle>{t('settings.about')}</SectionTitle>
      <div className="card divide-y divide-line/60">
        <div className="px-4 py-4">
          <p className="text-sm text-ink-soft leading-relaxed">
            {t('settings.aboutBody')}
          </p>
          <p className="text-xs text-ink-faint mt-2 font-semibold">
            {t('settings.version')} 0.1.0
          </p>
        </div>
        <button
          onClick={() => navigate('/about')}
          className="tap w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
        >
          <Icon name="alert" size={19} className="text-clay-strong" />
          <span className="flex-1 font-bold text-ink text-sm">{t('hub.helpAbout')}</span>
          <Icon name="chevronRight" size={16} className="text-ink-faint" />
        </button>
      </div>

      <Toast show={!!toast} text={toast} />
    </div>
  );
}
