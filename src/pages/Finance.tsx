import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { KEYS, load, save, uid } from '../lib/storage';
import { Icon } from '../components/Icon';
import { Button, EmptyState, Field, Sheet, inputCls } from '../components/ui';

type EntryType = 'income' | 'expense';
interface Entry {
  id: string;
  type: EntryType;
  amount: number;
  note: string;
  date: string;
}

const CURRENCY = 'KES';

export default function Finance() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>(() => load(KEYS.finances, [] as Entry[]));
  const [adding, setAdding] = useState<EntryType | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const persist = (next: Entry[]) => {
    setEntries(next);
    save(KEYS.finances, next);
  };

  const income = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = income - expense;

  const submit = () => {
    const amt = Math.max(0, parseFloat(amount) || 0);
    if (!adding || amt <= 0) return;
    persist([
      { id: uid(), type: adding, amount: amt, note: note.trim(), date: new Date().toISOString().slice(0, 10) },
      ...entries,
    ]);
    setAdding(null);
    setAmount('');
    setNote('');
  };

  const remove = (id: string) => persist(entries.filter((e) => e.id !== id));
  const money = (n: number) => `${CURRENCY} ${n.toLocaleString()}`;

  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-10">
      <button onClick={() => navigate(-1)} className="tap flex items-center gap-1 text-sm font-semibold text-clay-strong mb-2">
        <Icon name="chevronLeft" size={18} /> {t('common.back')}
      </button>
      <h1 className="text-2xl font-extrabold text-ink">{t('tools.financeTitle')}</h1>
      <p className="text-sm text-ink-soft mt-1 mb-4">{t('tools.financeSub')}</p>

      {/* summary */}
      <div className="card p-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-ink-soft">{t('tools.totalIncome')}</span>
          <span className="font-bold text-ink">{money(income)}</span>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-ink-soft">{t('tools.totalExpense')}</span>
          <span className="font-bold text-ink">{money(expense)}</span>
        </div>
        <div className="flex justify-between items-baseline border-t border-line pt-3">
          <span className="font-bold text-ink">{net >= 0 ? t('tools.netProfit') : t('tools.netLoss')}</span>
          <span className={`text-2xl font-extrabold ${net >= 0 ? 'text-clay-strong' : 'text-danger'}`}>
            {money(Math.abs(net))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button variant="secondary" icon="plus" onClick={() => setAdding('income')}>{t('tools.addIncome')}</Button>
        <Button variant="secondary" icon="plus" onClick={() => setAdding('expense')}>{t('tools.addExpense')}</Button>
      </div>

      {/* ledger */}
      <div className="mt-5 space-y-2">
        {entries.length === 0 ? (
          <EmptyState icon="chart" title={t('tools.ledgerEmpty')} />
        ) : (
          entries.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 px-4 py-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${e.type === 'income' ? 'bg-clay-soft/60 text-clay-strong' : 'bg-danger/15 text-danger'}`}>
                <Icon name={e.type === 'income' ? 'chevronRight' : 'chevronLeft'} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-sm truncate">{e.note || (e.type === 'income' ? t('tools.income') : t('tools.expense'))}</p>
                <p className="text-xs text-ink-faint">{e.date}</p>
              </div>
              <span className={`font-extrabold ${e.type === 'income' ? 'text-clay-strong' : 'text-danger'}`}>
                {e.type === 'income' ? '+' : '−'}{money(e.amount)}
              </span>
              <button onClick={() => remove(e.id)} className="tap text-ink-faint px-1" aria-label={t('common.delete')}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <Sheet open={adding !== null} onClose={() => setAdding(null)} title={adding === 'income' ? t('tools.addIncome') : t('tools.addExpense')}>
        <Field label={t('tools.amountLabel')}>
          <input type="number" inputMode="decimal" min="0" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label={t('tools.noteLabel')}>
          <input className={inputCls} value={note} placeholder={t('tools.notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button full onClick={submit} className="mt-1">{t('tools.saveEntry')}</Button>
      </Sheet>
    </div>
  );
}
