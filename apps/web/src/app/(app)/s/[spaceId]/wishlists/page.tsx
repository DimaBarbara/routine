import type { WishlistSummary } from '@routine/contracts';
import { Gift } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { Card } from '@/components/ui/card';
import { CreateWishlistForm } from '@/features/wishlists/create-wishlist-form';
import { SpaceSwitcher } from '@/features/wishlists/space-switcher';
import { serverApi } from '@/lib/api/server';
import { requireUser, spaceLabel } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('wishlists') };
}

export default async function WishlistsPage({ params }: PageProps<'/s/[spaceId]/wishlists'>) {
  const { spaceId } = await params;
  const user = await requireUser();
  const space = user.spaces.find((item) => item.id === spaceId);
  if (!space) notFound();

  const [wishlists, t, ts, format] = await Promise.all([
    serverApi<WishlistSummary[]>(`/spaces/${spaceId}/wishlists`),
    getTranslations('wishlists'),
    getTranslations('spaces'),
    getFormatter(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-zinc-500">{spaceLabel(space, ts)}</p>
        </div>
        <SpaceSwitcher
          currentId={space.id}
          spaces={user.spaces.map((item) => ({ id: item.id, label: spaceLabel(item, ts) }))}
        />
      </div>

      <Card>
        <CreateWishlistForm spaceId={space.id} />
      </Card>

      {wishlists.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => (
            <li key={wishlist.id}>
              <Link
                href={`/s/${space.id}/wishlists/${wishlist.id}`}
                className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              >
                <Card className="flex h-full flex-col gap-3 transition-colors group-hover:border-zinc-400 dark:group-hover:border-zinc-600">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <Gift className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{wishlist.title}</h2>
                      <p className="text-sm text-zinc-500">
                        {wishlist.owner.id === user.id
                          ? t('yours')
                          : t('forOwner', { name: wishlist.owner.name })}
                      </p>
                    </div>
                  </div>
                  {wishlist.description && (
                    <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {wishlist.description}
                    </p>
                  )}
                  <p className="mt-auto text-xs text-zinc-500">
                    {t('items', { count: wishlist.itemCount })} ·{' '}
                    {t('updated', {
                      date: format.relativeTime(new Date(wishlist.updatedAt)),
                    })}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
