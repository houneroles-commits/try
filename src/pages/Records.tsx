import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { downloadCSV } from '../lib/records';
import { CROPS } from '../lib/season';
import type { CropId, RecordKind } from '../lib/types';
import { Icon, type IconName } from '../components/Icon';
import { Button, EmptyState, Field, Sheet, Toast, inputCls } from '../components/ui';

const KIND_ICON: Record<RecordKind, IconName> = {
  rain: 'rain',
  irrigation: 'drop',
  harvest: 'sprout',
};

export default function Records() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { records, addRecord, deleteRecord, profile } = useApp();
  const [kind, setKind] = useState<RecordKind | null>(null);
  const [toast, setToast] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formKind, setFormKind] = useState<RecordKind>('irrigation');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState('5');
  const [formCrop, setFormCrop] = useState<CropId | ''>(profile?.crops[0] ?? '');
  const [formNote, setFormNote] = useState('');

  const sorted = records.slice().sort((a, b) => b.date.localeCompare(a.date));
  const amounts = kind === 'harvest' ? [5, 10, 25, 50, 100] : [2, 5, 10, 20, 30];

  const log = (amount: number) => {
    if (!kind) return;
    addRecord({
      kind,
      date: new Date().toISOString().slice(0, 10),
      amount,
      crop: kind === 'harvest' ? profile?.crops[0] : undefined,
    });
    setKind(null);
    setToast(t('home.logged'));
    setTimeout(() => setToast(''), 1800);
  };

  const saveDetailedEntry = () => {
    const amount = Number(formAmount);
    if (!formDate || !Number.isFinite(amount) || amount <= 0) return;
    addRecord({
      kind: formKind,
      date: formDate,
      amount,
      crop: formKind === 'harvest' && formCrop ? formCrop : undefined,
      note: formNote.trim() || undefined,
    });
    setSheetOpen(false);
    setFormAmount('5');
    setFormNote('');
    setToast(t('home.logged'));
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-5">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="tap flex items-center justify-center rounded-full text-ink-soft active:bg-surface-2 -ml-2"
          aria-label={t('common.back')}
        >
          <Icon name="chevronLeft" size={22} />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold text-ink">
          {t('records.title')}
        </h1>
        {records.length > 0 && (
          <button
            className="tap flex items-center justify-center rounded-full text-clay-strong active:bg-surface-2"
            onClick={() => downloadCSV(records)}
            aria-label={t('data.exportCsv')}
          >
            <Icon name="download" size={20} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink-soft">{t('records.logGuide')}</p>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          {t('records.addDetailedEntry')}
        </Button>
      </div>

      {/* add buttons — 2 taps total: pick kind, pick amount */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {(['rain', 'irrigation', 'harvest'] as RecordKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className="card tap flex flex-col items-center gap-1.5 py-4 active:bg-surface-2"
          >
            <span className="text-clay-strong">
              <Icon name={KIND_ICON[k]} size={24} />
            </span>
            <span className="text-sm font-bold text-ink">{t(`records.${k}`)}</span>
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={t('records.empty')}
          hint={t('records.emptyHint')}
        />
      ) : (
        <div className="card divide-y divide-line/60 mb-8">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  r.kind === 'harvest'
                    ? 'bg-sun/20 text-sun'
                    : 'bg-clay-soft/40 text-clay-strong'
                }`}
              >
                <Icon name={KIND_ICON[r.kind]} size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-sm">
                  {t(`records.${r.kind}`)}
                  {r.crop && (
                    <span className="font-semibold text-ink-soft">
                      {' '}· {CROPS[r.crop].emoji} {t(`crops.${r.crop}`)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-faint font-semibold">
                  {new Date(r.date + 'T12:00:00').toLocaleDateString(i18n.language, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className="font-extrabold text-ink">
                {r.amount}
                <span className="text-xs font-semibold text-ink-faint">
                  {' '}{r.kind === 'harvest' ? t('common.kg') : t('common.mm')}
                </span>
              </span>
              <button
                className="tap flex items-center justify-center text-ink-faint active:text-danger"
                onClick={() => {
                  deleteRecord(r.id);
                  setToast(t('records.deleted'));
                  setTimeout(() => setToast(''), 1500);
                }}
                aria-label={t('common.delete')}
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t('records.detailTitle')}>
        <Field label={t('records.selectKind')}>
          <div className="grid grid-cols-3 gap-2">
            {(['rain', 'irrigation', 'harvest'] as RecordKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setFormKind(k)}
                className={`tap card py-3 text-sm font-bold ${formKind === k ? 'border-2 border-clay bg-clay-soft/30' : ''}`}
              >
                {t(`records.${k}`)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('records.entryDate')}>
          <input type="date" className={inputCls} value={formDate} onChange={(e) => setFormDate(e.target.value)} />
        </Field>
        <Field label={t('records.entryAmount')}>
          <input type="number" min="0" step="0.1" className={inputCls} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
        </Field>
        {formKind === 'harvest' && (
          <Field label={t('records.cropLabel')}>
            <select className={inputCls} value={formCrop} onChange={(e) => setFormCrop(e.target.value as CropId)}>
              <option value="">{t('records.cropLabel')}</option>
              {profile?.crops.map((c) => (
                <option key={c} value={c}>{t(`crops.${c}`)}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t('records.entryNote')}>
          <textarea className={inputCls} rows={3} value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder={t('records.notePlaceholder')} />
        </Field>
        <Button full onClick={saveDetailedEntry} icon="check">
          {t('records.saveEntry')}
        </Button>
      </Sheet>

      <Sheet
        open={kind !== null}
        onClose={() => setKind(null)}
        title={kind === 'harvest' ? t('records.amountKg') : t('records.amountMm')}
      >
        <div className="grid grid-cols-5 gap-2 pb-2">
          {amounts.map((a) => (
            <button
              key={a}
              onClick={() => log(a)}
              className="tap card flex items-center justify-center py-4 text-lg font-extrabold text-clay-strong active:bg-clay-soft/50"
            >
              {a}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-ink-faint">
          {kind === 'harvest' ? t('common.kg') : t('common.mm')}
        </p>
      </Sheet>
      <Toast show={!!toast} text={toast} />
    </div>
  );
}
