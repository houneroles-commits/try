import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { CROPS, cropStatus, isPlantingMonth } from '../lib/season';
import type { CropId } from '../lib/types';
import { Icon } from '../components/Icon';
import { EmptyState, Field, Sheet, inputCls, Button } from '../components/ui';

function MonthDots({ crop }: { crop: CropId }) {
  const { t } = useTranslation();
  const months = t('calendar.monthsShort', { returnObjects: true }) as string[];
  const now = new Date().getMonth() + 1;
  return (
    <div className="grid grid-cols-12 gap-1 mt-3">
      {months.map((m, i) => {
        const inWindow = isPlantingMonth(crop, i + 1);
        const isNow = i + 1 === now;
        return (
          <div key={m} className="flex flex-col items-center gap-1">
            <div
              className={`w-full h-2 rounded-full ${
                inWindow ? 'bg-clay' : 'bg-surface-2'
              } ${isNow ? 'ring-2 ring-sun ring-offset-1 ring-offset-surface' : ''}`}
            />
            <span
              className={`text-[9px] font-bold ${
                isNow ? 'text-ink' : 'text-ink-faint'
              }`}
            >
              {m}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile, saveProfile, weather } = useApp();
  const [dateFor, setDateFor] = useState<CropId | null>(null);
  const [dateVal, setDateVal] = useState('');

  const crops = profile?.crops ?? [];
  const month = new Date().getMonth() + 1;
  const rain7 = weather
    ? Math.round(weather.daily.reduce((s, d) => s + d.rainMm, 0))
    : null;

  const savePlanting = () => {
    if (!profile || !dateFor || !dateVal) return;
    saveProfile({
      ...profile,
      plantingDates: { ...profile.plantingDates, [dateFor]: dateVal },
    });
    setDateFor(null);
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
        <h1 className="text-2xl font-extrabold text-ink">{t('calendar.title')}</h1>
      </div>

      {crops.length === 0 ? (
        <EmptyState
          icon="sprout"
          title={t('calendar.noCrops')}
          action={
            <Button onClick={() => navigate('/onboarding')} icon="chevronRight">
              {t('home.setupFarm')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3 pb-8">
          {crops.map((c) => {
            const planted = profile?.plantingDates[c];
            const status = planted ? cropStatus(c, planted) : null;
            const plantNow = isPlantingMonth(c, month);
            return (
              <div key={c} className="card p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>{CROPS[c].emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-ink">{t(`crops.${c}`)}</h3>
                    <p
                      className={`text-xs font-bold ${
                        plantNow ? 'text-clay-strong' : 'text-ink-faint'
                      }`}
                    >
                      {plantNow ? t('calendar.goodToPlant') : t('calendar.notSeason')}
                    </p>
                  </div>
                  {status ? (
                    <span className="rounded-full bg-clay-soft/50 px-3 py-1 text-xs font-bold text-clay-strong">
                      {t(`stages.${status.stage.key}`)}
                    </span>
                  ) : (
                    <button
                      className="tap text-xs font-bold text-clay-strong flex items-center gap-1"
                      onClick={() => {
                        setDateFor(c);
                        setDateVal(new Date().toISOString().slice(0, 10));
                      }}
                    >
                      <Icon name="plus" size={14} />
                      {t('calendar.setPlantingDate')}
                    </button>
                  )}
                </div>

                <MonthDots crop={c} />

                {status && (
                  <div className="mt-4">
                    {/* growth stage track */}
                    <div className="flex gap-1">
                      {CROPS[c].stages.map((s, i) => (
                        <div
                          key={s.key}
                          className="flex-1"
                          title={t(`stages.${s.key}`)}
                        >
                          <div
                            className={`h-2 rounded-full ${
                              i < status.stageIndex
                                ? 'bg-umber'
                                : i === status.stageIndex
                                  ? 'bg-clay'
                                  : 'bg-surface-2'
                            }`}
                          />
                          <span
                            className={`block mt-1 text-[9px] font-bold text-center ${
                              i === status.stageIndex ? 'text-ink' : 'text-ink-faint'
                            }`}
                          >
                            {t(`stages.${s.key}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs font-semibold text-ink-soft">
                      <span>
                        {t('calendar.plantedOn', {
                          date: new Date(planted!).toLocaleDateString(i18n.language, {
                            day: 'numeric',
                            month: 'short',
                          }),
                        })}
                      </span>
                      <span className="text-clay-strong">
                        {t('calendar.harvestAround', {
                          date: new Date(status.harvestDate).toLocaleDateString(
                            i18n.language,
                            { day: 'numeric', month: 'short' },
                          ),
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* forecast tie-in: rain over the next week */}
                {plantNow && rain7 !== null && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-sky">
                    <Icon name="rain" size={14} />
                    {t('data.forecastRain')}: {rain7} mm / 7d
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Sheet
        open={dateFor !== null}
        onClose={() => setDateFor(null)}
        title={t('calendar.setPlantingDate')}
      >
        <Field label={t('irrigation.plantingDate')}>
          <input
            type="date"
            className={inputCls}
            value={dateVal}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateVal(e.target.value)}
          />
        </Field>
        <Button full onClick={savePlanting} icon="check">
          {t('common.save')}
        </Button>
      </Sheet>
    </div>
  );
}
