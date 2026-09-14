import type { SharedWishBoard } from '@routine/contracts';
import { Gift } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Brand } from '@/components/brand';
import { Preferences } from '@/components/preferences';
import { Card } from '@/components/ui/card';
import { PublicWishCard } from '@/features/wishlist/public-wish-card';
import { ApiError } from '@/lib/api/error';
import { serverApi } from '@/lib/api/server';

type Props = PageProps<'/w/[token]'>;

async function loadShared(token: string): Promise<SharedWishBoard | null> {
  try {
    return await serverApi<SharedWishBoard>(`/shared/wishlist/${encodeURIComponent(token)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [shared, t] = await Promise.all([
    loadShared((await params).token),
    getTranslations('wishlist.public'),
  ]);
  // Особиста сторінка не має потрапляти в пошуковики.
  return {
    title: shared ? t('heading', { name: shared.ownerName }) : 'routine',
    robots: { index: false, follow: false },
  };
}

export default async function SharedWishesPage({ params }: Props) {
  const { token } = await params;
  const [shared, t] = await Promise.all([loadShared(token), getTranslations('wishlist.public')]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-4 sm:p-6">
        <Brand href="/login" />
        <Preferences />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        {!shared ? (
          <Card className="mx-auto mt-16 max-w-md text-center">
            <h1 className="text-lg font-semibold">{t('unavailableTitle')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('unavailableText')}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-8 text-white sm:p-10">
              <div
                aria-hidden
                className="absolute -top-20 -right-10 size-72 rounded-full bg-white/10 blur-3xl"
              />
              <span className="relative flex size-12 items-center justify-center rounded-2xl bg-white/20">
                <Gift className="size-6" aria-hidden />
              </span>
              <h1 className="relative mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('heading', { name: shared.ownerName })}
              </h1>
              <p className="relative mt-3 max-w-2xl text-white/85">
                {shared.viewer === 'OWNER'
                  ? t('ownerInfo')
                  : t('guestInfo', { name: shared.ownerName })}
              </p>
            </div>

            {shared.items.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">{t('empty')}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shared.items.map((item) => (
                  <li key={item.id}>
                    <PublicWishCard
                      item={item}
                      token={token}
                      viewer={shared.viewer}
                      ownerName={shared.ownerName}
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
