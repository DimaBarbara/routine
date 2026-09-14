import type { WishlistDetail } from '@routine/contracts';
import { ArrowLeft, EyeOff } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Alert } from '@/components/ui/alert';
import { AddItemButton } from '@/features/wishlists/add-item-button';
import { SharePanel } from '@/features/wishlists/share-panel';
import { SpaceItemCard } from '@/features/wishlists/space-item-card';
import { WishlistActions } from '@/features/wishlists/wishlist-actions';
import { ApiError } from '@/lib/api/error';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

type Props = PageProps<'/s/[spaceId]/wishlists/[wishlistId]'>;

async function loadWishlist(spaceId: string, wishlistId: string) {
  try {
    return await serverApi<WishlistDetail>(`/spaces/${spaceId}/wishlists/${wishlistId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { spaceId, wishlistId } = await params;
  return { title: (await loadWishlist(spaceId, wishlistId)).title };
}

export default async function WishlistPage({ params }: Props) {
  const { spaceId, wishlistId } = await params;
  const [user, wishlist, t] = await Promise.all([
    requireUser(),
    loadWishlist(spaceId, wishlistId),
    getTranslations('wishlists'),
  ]);

  const listPath = `/s/${spaceId}/wishlists`;
  const basePath = `/spaces/${spaceId}/wishlists/${wishlistId}`;
  const isOwner = wishlist.owner.id === user.id;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={listPath}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t('allLists')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{wishlist.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isOwner ? t('yours') : t('forOwner', { name: wishlist.owner.name })} ·{' '}
            {t('items', { count: wishlist.itemCount })}
          </p>
          {wishlist.description && (
            <p className="mt-3 max-w-2xl text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-400">
              {wishlist.description}
            </p>
          )}
        </div>
        <WishlistActions wishlist={wishlist} basePath={basePath} listPath={listPath} />
      </div>

      {isOwner && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <EyeOff className="size-4 shrink-0" aria-hidden /> {t('ownerNote')}
          </span>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <section className="flex flex-col gap-4 lg:order-1">
          <div className="flex justify-end">
            <AddItemButton basePath={basePath} />
          </div>
          {wishlist.items.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">{t('emptyItems')}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {wishlist.items.map((item) => (
                <li key={item.id}>
                  <SpaceItemCard item={item} basePath={basePath} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="lg:order-2">
          <SharePanel basePath={basePath} shareUrl={wishlist.shareUrl} />
        </aside>
      </div>
    </div>
  );
}
