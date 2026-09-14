'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/cn';

import { niceTicks } from './scale';

export interface ColumnSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  categories: string[];
  series: ColumnSeries[];
  stacked?: boolean;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  totalLabel?: string;
  height?: number;
}

/**
 * Колонки на HTML/CSS: адаптивні без вимірювань і однаково рендеряться на сервері та в браузері.
 * Специфікація: колонка ≤ 24px, заокруглений лише кінець даних, 2px повітря між сусідами,
 * волосяна сітка, одна вісь. Тултип — на групу, з усіма серіями; фокус клавіатурою показує те саме.
 */
export function ColumnChart({
  categories,
  series,
  stacked = false,
  formatValue,
  formatTick,
  totalLabel,
  height = 200,
}: Props) {
  const tooltipId = useId();
  const [active, setActive] = useState<number | null>(null);

  const groupTotals = categories.map((_, index) =>
    series.reduce((sum, s) => sum + Math.max(0, s.values[index] ?? 0), 0),
  );
  const peak = stacked
    ? Math.max(0, ...groupTotals)
    : Math.max(0, ...series.flatMap((s) => s.values));
  const ticks = niceTicks(peak);
  const top = ticks.at(-1) || 1;
  const pct = (value: number) => `${(Math.max(0, value) / top) * 100}%`;

  return (
    <div className="flex gap-3">
      {/* Вісь Y */}
      <div
        className="relative w-14 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
        style={{ height }}
      >
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-0 -translate-y-1/2"
            style={{ bottom: pct(tick) }}
          >
            {formatTick(tick)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: pct(tick) }}
            />
          ))}

          <div className="absolute inset-0 flex">
            {categories.map((category, index) => (
              <div
                key={category}
                tabIndex={0}
                role="group"
                aria-label={`${category}: ${series.map((s) => `${s.label} ${formatValue(s.values[index] ?? 0)}`).join(', ')}`}
                aria-describedby={active === index ? tooltipId : undefined}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={cn(
                  'relative flex flex-1 items-end justify-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active === index && 'bg-muted/60',
                )}
              >
                {stacked ? (
                  <div className="flex h-full w-full max-w-6 flex-col-reverse gap-0.5">
                    {series.map((s, seriesIndex) => {
                      const value = s.values[index] ?? 0;
                      if (value <= 0) return null;
                      const isTop = series
                        .slice(seriesIndex + 1)
                        .every((next) => (next.values[index] ?? 0) <= 0);
                      return (
                        <div
                          key={s.key}
                          className={cn(isTop && 'rounded-t-[4px]')}
                          style={{ height: pct(value), background: s.color }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  series.map((s) => (
                    <div
                      key={s.key}
                      className="w-full max-w-6 rounded-t-[4px]"
                      style={{ height: pct(s.values[index] ?? 0), background: s.color }}
                    />
                  ))
                )}

                {active === index && (
                  <div
                    id={tooltipId}
                    role="tooltip"
                    className={cn(
                      'pointer-events-none absolute bottom-full z-10 mb-2 min-w-40 rounded-xl border border-border bg-card p-3 text-xs shadow-lg',
                      index > categories.length / 2 ? 'right-0' : 'left-0',
                    )}
                  >
                    <p className="mb-2 font-medium text-muted-foreground">{category}</p>
                    <ul className="flex flex-col gap-1.5">
                      {series.map((s) => (
                        <li key={s.key} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span
                              aria-hidden
                              className="h-0.5 w-3 rounded-full"
                              style={{ background: s.color }}
                            />
                            {s.label}
                          </span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatValue(s.values[index] ?? 0)}
                          </span>
                        </li>
                      ))}
                      {stacked && totalLabel && (
                        <li className="mt-1 flex justify-between gap-4 border-t border-border pt-1.5">
                          <span className="text-muted-foreground">{totalLabel}</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {formatValue(groupTotals[index] ?? 0)}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Вісь X */}
        <div className="mt-2 flex text-center text-[11px] text-muted-foreground">
          {categories.map((category) => (
            <span key={category} className="flex-1 truncate px-0.5">
              {category}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
