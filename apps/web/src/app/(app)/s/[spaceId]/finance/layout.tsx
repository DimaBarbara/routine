import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FinanceTabs } from '@/features/finance/finance-tabs';
import { requireUser } from '@/lib/session';

export default async function FinanceLayout({
  children,
  params,
}: LayoutProps<'/s/[spaceId]/finance'>) {
  const { spaceId } = await params;
  const [user, t] = await Promise.all([requireUser(), getTranslations('finance')]);
  if (!user.spaces.some((space) => space.id === spaceId)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <FinanceTabs basePath={`/s/${spaceId}/finance`} />
      </div>
      {children}
    </div>
  );
}
