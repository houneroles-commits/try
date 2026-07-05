import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../state/AppContext';
import { dailyTotals, downloadCSV } from '../lib/records';
import { Chip, EmptyState, SectionTitle, Skeleton, SourceBadge, Button } from '../components/ui';

type Metric = 'rain' | 'temp' | 'soil';
type ChartKind = 'line' | 'bar' | 'area';
type RangeDays = 7 | 14 | 30;

/**
 * Series colors validated with the dataviz palette checker:
 *  light surface #FFFCF5 → #B3542F / #2B6CB0
 *  dark  surface #2A1C12 → #CE6C38 / #3F87CA
 */
const SERIES = {
  light: { warm: '#B3542F', cool: '#2B6CB0', grid: '#E4D5BE', text: '#8A6E58' },
  dark: { warm: '#CE6C38', cool: '#3F87CA', grid: '#443021', text: '#9A7E66' },
};

function useIsDark(): boolean {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);
  return dark;
}

interface Row {
  label: string;
  a?: number;
  b?: number;
}

export default function Data() {
  const { t, i18n } = useTranslation();
  const { weather, records, weatherLoading } = useApp();
  const [metric, setMetric] = useState<Metric>('rain');
  const [kind, setKind] = useState<ChartKind>('bar');
  const [range, setRange] = useState<RangeDays>(14);
  const isDark = useIsDark();
  const C = isDark ? SERIES.dark : SERIES.light;

  const fmtDay = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
    });

  /* Build rows for the selected metric + range. Past days come from the
     farmer's records; future days from the forecast. */
  const { rows, seriesA, seriesB } = useMemo(() => {
    if (!weather) return { rows: [] as Row[], seriesA: '', seriesB: '' };

    if (metric === 'soil') {
      return {
        rows: weather.hourly.map((h): Row => ({
          label: new Date(h.time).toLocaleTimeString(i18n.language, {
            hour: '2-digit',
          }),
          a: Math.round(h.soilMoisture * 100),
        })),
        seriesA: t('data.soilMoisture') + ' %',
        seriesB: '',
      };
    }

    if (metric === 'temp') {
      return {
        rows: weather.daily.map((d) => ({
          label: fmtDay(d.date),
          a: d.tMax,
          b: d.tMin,
        })),
        seriesA: t('data.tempMax'),
        seriesB: t('data.tempMin'),
      };
    }

    // rainfall: trailing `range` days of logged rain + 7 days of forecast
    const logged = dailyTotals(records, 'rain', range);
    const out: Row[] = [];
    for (let i = -(range - 1); i < 0; i++) {
      const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
      out.push({ label: fmtDay(d), a: 0, b: logged.get(d) ?? 0 });
    }
    for (const d of weather.daily) {
      out.push({ label: fmtDay(d.date), a: d.rainMm, b: logged.get(d.date) ?? 0 });
    }
    return {
      rows: out,
      seriesA: t('data.forecastRain'),
      seriesB: t('data.loggedRain'),
    };
  }, [weather, metric, range, records, i18n.language, t]);

  const hasB = rows.some((r) => (r.b ?? 0) !== 0) || metric === 'temp';

  const axisProps = {
    stroke: C.text,
    tick: { fill: C.text, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const;

  const tooltipStyle = {
    contentStyle: {
      background: isDark ? '#2A1C12' : '#FFFCF5',
      border: `1px solid ${C.grid}`,
      borderRadius: 12,
      fontSize: 12,
      color: isDark ? '#F5EADA' : '#2B1D12',
    },
    cursor: { stroke: C.grid, strokeWidth: 1 },
  } as const;

  const common = (
    <>
      <CartesianGrid stroke={C.grid} strokeDasharray="0" vertical={false} />
      <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
      <YAxis {...axisProps} width={32} />
      <Tooltip {...tooltipStyle} />
      {hasB && <Legend wrapperStyle={{ fontSize: 12, color: C.text }} iconSize={10} />}
    </>
  );

  const chart =
    kind === 'bar' ? (
      <BarChart data={rows}>
        {common}
        <Bar dataKey="a" name={seriesA} fill={metric === 'temp' ? C.warm : C.cool} radius={[4, 4, 0, 0]} />
        {hasB && seriesB && (
          <Bar dataKey="b" name={seriesB} fill={metric === 'temp' ? C.cool : C.warm} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    ) : kind === 'area' ? (
      <AreaChart data={rows}>
        {common}
        <Area
          dataKey="a" name={seriesA} type="monotone"
          stroke={metric === 'temp' ? C.warm : C.cool}
          fill={metric === 'temp' ? C.warm : C.cool}
          fillOpacity={0.18} strokeWidth={2}
        />
        {hasB && seriesB && (
          <Area
            dataKey="b" name={seriesB} type="monotone"
            stroke={metric === 'temp' ? C.cool : C.warm}
            fill={metric === 'temp' ? C.cool : C.warm}
            fillOpacity={0.18} strokeWidth={2}
          />
        )}
      </AreaChart>
    ) : (
      <LineChart data={rows}>
        {common}
        <Line
          dataKey="a" name={seriesA} type="monotone"
          stroke={metric === 'temp' ? C.warm : C.cool}
          strokeWidth={2} dot={false} activeDot={{ r: 5 }}
        />
        {hasB && seriesB && (
          <Line
            dataKey="b" name={seriesB} type="monotone"
            stroke={metric === 'temp' ? C.cool : C.warm}
            strokeWidth={2} dot={false} activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    );

  return (
    <div className="mx-auto max-w-lg px-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">{t('data.title')}</h1>
        {weather && <SourceBadge source={weather.source} />}
      </div>

      {/* metric switcher */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-4 -mx-4 px-4">
        <Chip active={metric === 'rain'} onClick={() => setMetric('rain')} icon="rain">
          {t('data.rainfall')}
        </Chip>
        <Chip active={metric === 'temp'} onClick={() => setMetric('temp')} icon="sun">
          {t('data.temperature')}
        </Chip>
        <Chip active={metric === 'soil'} onClick={() => setMetric('soil')} icon="drop">
          {t('data.soilMoisture')}
        </Chip>
      </div>

      {/* chart type + range switchers */}
      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <div className="inline-flex rounded-xl bg-surface-2 p-1" role="tablist" aria-label={t('data.chartType')}>
          {(['line', 'bar', 'area'] as ChartKind[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`tap min-h-[40px] rounded-lg px-4 text-sm font-bold transition-colors ${
                kind === k ? 'bg-surface text-ink shadow-card' : 'text-ink-faint'
              }`}
            >
              {t(`data.${k}`)}
            </button>
          ))}
        </div>
        {metric === 'rain' && (
          <div className="inline-flex rounded-xl bg-surface-2 p-1" role="tablist" aria-label={t('data.range')}>
            {([7, 14, 30] as RangeDays[]).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`tap min-h-[40px] rounded-lg px-3 text-sm font-bold transition-colors ${
                  range === r ? 'bg-surface text-ink shadow-card' : 'text-ink-faint'
                }`}
              >
                {t(`data.${r}d`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* the chart */}
      <div className="card mt-3 p-3 pt-5">
        {weatherLoading && !weather ? (
          <Skeleton className="h-[260px]" />
        ) : rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            {chart}
          </ResponsiveContainer>
        ) : (
          <EmptyState icon="chart" title={t('data.noData')} hint={t('data.noDataHint')} />
        )}
      </div>

      {/* records + export */}
      <SectionTitle>{t('data.myRecords')}</SectionTitle>
      {records.length === 0 ? (
        <EmptyState icon="calendar" title={t('data.noData')} hint={t('data.noDataHint')} />
      ) : (
        <Button
          full
          variant="secondary"
          icon="download"
          onClick={() => downloadCSV(records)}
        >
          {t('data.exportCsv')}
        </Button>
      )}
      <div className="h-6" />
    </div>
  );
}
