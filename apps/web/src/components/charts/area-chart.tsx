'use client';

import { useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

import { niceTicks } from './scale';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface Props {
  labels: string[];
  /** Складені знизу вгору: перша серія — біля осі. */
  series: AreaSeries[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  totalLabel: string;
  /** Індекс точки «сьогодні» — вертикальна мітка, що відділяє факт від прогнозу. */
  markerIndex?: number;
  markerLabel?: string;
  height?: number;
}

const WIDTH = 1000;

/**
 * Складена площа (внесено + відсотки). Фігури — SVG із viewBox, що тягнеться по ширині;
 * лінії не товщають завдяки non-scaling-stroke. Осі й тултип — HTML поверх, тож текст не спотворюється.
 * Перехрестя прилипає до найближчої точки й показує всі серії.
 */
export function AreaChart({
  labels,
  series,
  formatValue,
  formatTick,
  totalLabel,
  markerIndex,
  markerLabel,
  height = 220,
}: Props) {
  const tooltipId = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const count = labels.length;
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks.at(-1) || 1;
  const x = (i: number) => (count <= 1 ? 0 : (i / (count - 1)) * WIDTH);
  const y = (value: number) => height - (value / top) * height;

  const layers = series.map((s, seriesIndex) => {
    const lower = labels.map((_, i) =>
      series.slice(0, seriesIndex).reduce((sum, prev) => sum + (prev.values[i] ?? 0), 0),
    );
    const upper = lower.map((value, i) => value + (s.values[i] ?? 0));
    const topLine = upper.map((value, i) => `${x(i)},${y(value)}`).join(' L');
    const bottomLine = lower
      .map((value, i) => `${x(i)},${y(value)}`)
      .reverse()
      .join(' L');
    return { ...s, area: `M${topLine} L${bottomLine} Z`, line: `M${topLine}` };
  });

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || count === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (count - 1)));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    setActive((current) => {
      const start = current ?? (event.key === 'ArrowRight' ? -1 : count);
      return Math.min(count - 1, Math.max(0, start + (event.key === 'ArrowRight' ? 1 : -1)));
    });
  }

  const activeLeft = active === null ? 0 : (x(active) / WIDTH) * 100;
  const step = Math.max(1, Math.ceil(count / 6));

  return (
    <div className="flex gap-3 pt-3">
      <div
        className="relative w-14 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums"
        style={{ height }}
      >
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: y(tick) }}>
            {formatTick(tick)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          ref={plotRef}
          tabIndex={0}
          role="img"
          aria-describedby={active !== null ? tooltipId : undefined}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="relative cursor-crosshair rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ height }}
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ top: y(tick) }}
            />
          ))}

          <svg
            viewBox={`0 0 ${WIDTH} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            {layers.map((layer) => (
              <g key={layer.key}>
                <path d={layer.area} fill={layer.color} fillOpacity={0.14} />
                <path
                  d={layer.line}
                  fill="none"
                  stroke={layer.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>

          {markerIndex !== undefined && markerIndex > 0 && markerIndex < count - 1 && (
            <div
              aria-hidden
              className="absolute inset-y-0 border-l border-foreground/25"
              style={{ left: `${(x(markerIndex) / WIDTH) * 100}%` }}
            >
              {markerLabel && (
                <span className="absolute top-0 left-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {markerLabel}
                </span>
              )}
            </div>
          )}

          {active !== null && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 border-l border-foreground/40"
                style={{ left: `${activeLeft}%` }}
              />
              {layers.map((layer, seriesIndex) => {
                const value = series
                  .slice(0, seriesIndex + 1)
                  .reduce((sum, s) => sum + (s.values[active] ?? 0), 0);
                return (
                  <span
                    key={layer.key}
                    aria-hidden
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                    style={{ left: `${activeLeft}%`, top: y(value), background: layer.color }}
                  />
                );
              })}
              <div
                id={tooltipId}
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute top-2 z-10 min-w-44 rounded-xl border border-border bg-card p-3 text-xs shadow-lg',
                  activeLeft > 50 ? '-translate-x-[calc(100%+12px)]' : 'translate-x-3',
                )}
                style={{ left: `${activeLeft}%` }}
              >
                <p className="mb-2 font-medium text-muted-foreground">{labels[active]}</p>
                <ul className="flex flex-col gap-1.5">
                  {[...series].reverse().map((s) => (
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
                        {formatValue(s.values[active] ?? 0)}
                      </span>
                    </li>
                  ))}
                  <li className="mt-1 flex justify-between gap-4 border-t border-border pt-1.5">
                    <span className="text-muted-foreground">{totalLabel}</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatValue(totals[active] ?? 0)}
                    </span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground">
          {labels.map((label, i) =>
            // Остання мітка завжди; крокова — лише якщо не налазить на останню.
            (i % step === 0 && count - 1 - i >= step / 2) || i === count - 1 ? (
              <span
                key={`${label}-${i}`}
                className={cn(
                  'absolute whitespace-nowrap',
                  i === 0 ? '' : i === count - 1 ? '-translate-x-full' : '-translate-x-1/2',
                )}
                style={{ left: `${(x(i) / WIDTH) * 100}%` }}
              >
                {label}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
