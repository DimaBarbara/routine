import type { WishBoard } from '@routine/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Board } from '@/features/wishlist/board';
import { serverApi } from '@/lib/api/server';
import { requireUser } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('meta'))('wishlist') };
}

export default async function WishlistBoardPage({ params }: PageProps<'/s/[spaceId]/wishlist'>) {
  const { spaceId } = await params;
  const user = await requireUser();
  if (!user.spaces.some((space) => space.id === spaceId)) notFound();

  const board = await serverApi<WishBoard>(`/spaces/${spaceId}/wishlist`);

  return (
    <div className="mx-auto w-full max-w-[96rem]">
      <Board spaceId={spaceId} board={board} currentUserId={user.id} />
    </div>
  );
}
