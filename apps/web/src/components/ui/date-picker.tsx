'use client';

import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

const POPOVER_WIDTH = 304;
const POPOVER_HEIGHT = 360;

// ── Календарна арифметика на рядках YYYY-MM-DD (UTC, без сюрпризів часових поясів) ──

const pad = (value: number) => String(value).padStart(2, '0');
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const fromIso = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso: string, days: number) => {
  const date = fromIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
};
const addMonths = (iso: string, months: number) => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(Math.min(d, last))}`;
};
/** Понеділок = 0. */
const weekdayIndex = (iso: string) => (fromIso(iso).getUTCDay() + 6) % 7;
const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

type MonthKey = `m${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;
type GenitiveKey = `g${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

interface Props {
  label: string;
  name: string;
  defaultValue?: string | null;
  min?: string;
  max?: string;
  /** Показати «Очистити» — для необовʼязкових дат. */
  optional?: boolean;
  error?: string;
  hint?: string;
}

/**
 * Власний вибір дати замість нативного: однаковий вигляд у всіх браузерах і темах.
 * Значення їде у формі через прихований input (YYYY-MM-DD). Календар — у popover (top layer),
 * тож його не обрізає модальне вікно. Клавіатура: стрілки — день/тиждень, PageUp/PageDown — місяць,
 * Home/End — початок/кінець тижня, Enter — вибрати, Esc — закрити.
 */
export function DatePicker({
  label,
  name,
  defaultValue = null,
  min,
  max,
  optional,
  error,
  hint,
}: Props) {
  const t = useTranslations('calendar');
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState<string | null>(defaultValue);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState<string>(defaultValue ?? '');
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const monthName = (month: number) => t(`m${month}` as MonthKey);
  const format = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number);
    return t('date', { day: day ?? 1, month: t(`g${month}` as GenitiveKey), year: year ?? 0 });
  };
  const isDisabled = (iso: string) =>
    (min !== undefined && iso < min) || (max !== undefined && iso > max);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const top =
      below >= POPOVER_HEIGHT + 12 || rect.top < POPOVER_HEIGHT
        ? rect.bottom + 6
        : rect.top - POPOVER_HEIGHT - 6;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_WIDTH - 8);
    setPosition({ top, left });
  }, []);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    const onToggle = (event: Event) => setOpen((event as ToggleEvent).newState === 'open');
    popover.addEventListener('toggle', onToggle);
    return () => popover.removeEventListener('toggle', onToggle);
  }, []);

  // Відкрито: стежимо за скролом/ресайзом і ставимо фокус на обраний день.
  useLayoutEffect(() => {
    if (!open) return;
    const close = () => popoverRef.current?.hidePopover();
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, focused]);

  function toggle() {
    const popover = popoverRef.current;
    if (!popover) return;
    if (open) return popover.hidePopover();
    setFocused(value ?? (min && localToday() < min ? min : localToday()));
    place();
    popover.showPopover();
  }

  function choose(iso: string | null) {
    if (iso && isDisabled(iso)) return;
    setValue(iso);
    popoverRef.current?.hidePopover();
    triggerRef.current?.focus();
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -weekdayIndex(focused)),
      End: () => addDays(focused, 6 - weekdayIndex(focused)),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setFocused(move());
    }
  }

  // Сітка: 6 тижнів від понеділка перед першим числом місяця.
  const viewMonth = (focused || localToday()).slice(0, 7);
  const firstOfMonth = `${viewMonth}-01`;
  const gridStart = addDays(firstOfMonth, -weekdayIndex(firstOfMonth));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = open ? localToday() : '';
  const [viewYear, viewMonthNumber] = viewMonth.split('-').map(Number);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          className={cn(
            'flex h-11 w-full items-center gap-2.5 rounded-xl border bg-card px-3.5 text-left text-sm transition outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15',
            error ? 'border-destructive' : 'border-input',
            open && 'border-ring ring-4 ring-ring/15',
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn('flex-1 truncate', !value && 'text-muted-foreground/70')}>
            {value ? format(value) : t('choose')}
          </span>
        </button>
        {optional && value && (
          <button
            type="button"
            onClick={() => choose(null)}
            aria-label={t('clear')}
            title={t('clear')}
            className="absolute inset-y-0 right-1 my-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <input type="hidden" name={name} value={value ?? ''} />
      {(error ?? hint) && (
        <p
          id={`${id}-desc`}
          className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
        >
          {error ?? hint}
        </p>
      )}

      <div
        ref={popoverRef}
        popover="auto"
        role="dialog"
        aria-label={label}
        style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
        className="fixed inset-auto m-0 rounded-2xl border border-border bg-card p-3 text-foreground shadow-2xl"
      >
        {open && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFocused(addMonths(focused, -1))}
                aria-label={t('prev')}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <p className="text-sm font-semibold" aria-live="polite">
                {monthName(viewMonthNumber ?? 1)} {viewYear}
              </p>
              <button
                type="button"
                onClick={() => setFocused(addMonths(focused, 1))}
                aria-label={t('next')}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
              {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
                <span key={day} className="py-1.5">
                  {t(`w${day}`)}
                </span>
              ))}
            </div>

            <div
              ref={gridRef}
              role="grid"
              onKeyDown={onGridKeyDown}
              className="grid grid-cols-7 gap-0.5"
            >
              {days.map((day) => {
                const inMonth = day.startsWith(viewMonth);
                const selected = day === value;
                const disabled = isDisabled(day);
                return (
                  <button
                    key={day}
                    type="button"
                    role="gridcell"
                    tabIndex={day === focused ? 0 : -1}
                    disabled={disabled}
                    aria-selected={selected}
                    aria-current={day === today ? 'date' : undefined}
                    aria-label={format(day)}
                    onClick={() => choose(day)}
                    onFocus={() => setFocused(day)}
                    className={cn(
                      'relative flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition outline-none',
                      'focus-visible:ring-2 focus-visible:ring-ring',
                      inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                      !selected && !disabled && 'hover:bg-muted',
                      selected && 'bg-primary font-semibold text-primary-foreground',
                      disabled && 'cursor-not-allowed opacity-30',
                      day === today && !selected && 'font-semibold text-primary',
                    )}
                  >
                    {Number(day.slice(8))}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between border-t border-border pt-2">
              <button
                type="button"
                disabled={isDisabled(localToday())}
                onClick={() => choose(localToday())}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-accent disabled:opacity-40"
              >
                {t('today')}
              </button>
              {optional && (
                <button
                  type="button"
                  onClick={() => choose(null)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {t('clear')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
