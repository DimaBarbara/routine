'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/cn';

export function FinanceTabs({ basePath }: { basePath: string }) {
  const t = useTranslations('finance.tabs');
  const pathname = usePathname();
  const tabs = [
    { href: basePath, label: t('overview'), active: pathname === basePath },
    {
      href: `${basePath}/transactions`,
      label: t('transactions'),
      active: pathname.endsWith('/transactions'),
    },
    { href: `${basePath}/savings`, label: t('savings'), active: pathname.endsWith('/savings') },
  ];

  return (
    <nav className="inline-flex rounded-xl bg-muted p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={cn(
            'rounded-lg px-4 py-1.5 text-sm font-medium transition',
            tab.active
              ? 'bg-card text-foreground shadow-card'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
