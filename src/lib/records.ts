import type { FarmRecord } from './types';

export function recordsToCSV(records: FarmRecord[]): string {
  const header = 'date,type,amount,unit,crop,note';
  const rows = records
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) =>
      [
        r.date,
        r.kind,
        r.amount,
        r.kind === 'harvest' ? 'kg' : 'mm',
        r.crop ?? '',
        r.note ? '"' + r.note.replace(/"/g, '""') + '"' : '',
      ].join(','),
    );
  return [header, ...rows].join('\n');
}

export function downloadCSV(records: FarmRecord[], filename = 'lima-records.csv'): void {
  const blob = new Blob([recordsToCSV(records)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Sum of a record kind over the trailing N days, bucketed per ISO date. */
export function dailyTotals(
  records: FarmRecord[],
  kind: FarmRecord['kind'],
  days: number,
): Map<string, number> {
  const out = new Map<string, number>();
  const cutoff = Date.now() - days * 86400000;
  for (const r of records) {
    if (r.kind !== kind) continue;
    if (Date.parse(r.date) < cutoff) continue;
    out.set(r.date, (out.get(r.date) ?? 0) + r.amount);
  }
  return out;
}
