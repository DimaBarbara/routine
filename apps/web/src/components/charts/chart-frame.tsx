'use client';

import { Table2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@/lib/cn';

export interface LegendItem {
  label: string;
  color: string;
}

interface Props {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  /** Табличний двійник графіка: значення доступні без наведення й для читачів екрана. */
  table: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartFrame({ title, subtitle, legend, table, children, className }: Props) {
  const t = useTranslations('finance.charts');
  const [asTable, setAsTable] = useState(false);

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          aria-pressed={asTable}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Table2 className="size-3.5" aria-hidden />
          {asTable ? t('showChart') : t('showTable')}
        </button>
      </header>

      {legend && legend.length > 1 && !asTable && (
        <ul className="-mt-1 mb-1 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-[3px]"
                style={{ background: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {asTable ? <div className="overflow-x-auto">{table}</div> : children}
    </section>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          {head.map((cell, index) => (
            <th key={cell} className={cn('py-2 pr-4 font-medium', index > 0 && 'text-right')}>
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[0])} className="border-b border-border/60 last:border-0">
            {row.map((cell, index) => (
              <td key={index} className={cn('py-2 pr-4', index > 0 && 'text-right tabular-nums')}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
