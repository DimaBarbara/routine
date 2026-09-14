import type { SharedWishlist } from '@routine/contracts';
import { Gift } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Preferences } from '@/components/preferences';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { SharedItemCard } from '@/features/wishlists/shared-item-card';
import { ApiError } from '@/lib/api/error';
import { serverApi } from '@/lib/api/server';

type Props = PageProps<'/w/[token]'>;

async function loadShared(token: string): Promise<SharedWishlist | null> {
  try {
    return await serverApi<SharedWishlist>(`/shared/wishlists/${encodeURIComponent(token)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const wishlist = await loadShared((await params).token);
  // Публічний список не має потрапляти в пошуковики.
  return { title: wishlist?.title ?? 'routine', robots: { index: false, follow: false } };
}

export default async function SharedWishlistPage({ params }: Props) {
  const { token } = await params;
  const [wishlist, t] = await Promise.all([loadShared(token), getTranslations('wishlists.shared')]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
        <span className="font-semibold tracking-tight">routine</span>
        <Preferences />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-16">
        {!wishlist ? (
          <Card className="mx-auto mt-16 max-w-md text-center">
            <h1 className="text-lg font-semibold">{t('unavailableTitle')}</h1>
            <p className="mt-2 text-sm text-zinc-500">{t('unavailableText')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Gift className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-zinc-500">
                  {t('heading', { name: wishlist.ownerName })}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight break-words">
                  {wishlist.title}
                </h1>
                {wishlist.description && (
                  <p className="mt-2 max-w-2xl whitespace-pre-line text-zinc-600 dark:text-zinc-400">
                    {wishlist.description}
                  </p>
                )}
              </div>
            </div>

            <Alert tone="info">
              {wishlist.viewer === 'OWNER'
                ? t('ownerInfo')
                : t('guestInfo', { name: wishlist.ownerName })}
            </Alert>

            {wishlist.items.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">{t('empty')}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist.items.map((item) => (
                  <li key={item.id}>
                    <SharedItemCard
                      item={item}
                      token={token}
                      viewer={wishlist.viewer}
                      ownerName={wishlist.ownerName}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
