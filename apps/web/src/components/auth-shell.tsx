import { Gift, LayoutGrid, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Brand } from '@/components/brand';
import { Preferences } from '@/components/preferences';

/** Вхід, реєстрація, запрошення: бренд-панель зліва на великих екранах, форма справа. */
export async function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  const t = await getTranslations('auth');
  const features = [
    { icon: LayoutGrid, text: t('featureBoard') },
    { icon: Gift, text: t('featureGifts') },
    { icon: ShieldCheck, text: t('featureInvites') },
  ];

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-16 size-96 rounded-full bg-rose-300/20 blur-3xl"
        />
        <Brand
          href="/login"
          className="relative [&>span:first-child]:bg-white/20 [&>span:first-child]:from-transparent [&>span:first-child]:to-transparent"
        />
        <div className="relative mt-auto max-w-md">
          <p className="text-4xl leading-tight font-semibold tracking-tight">{t('tagline')}</p>
          <ul className="mt-10 flex flex-col gap-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 lg:justify-end">
          <Brand href="/login" className="lg:hidden" />
          <Preferences />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <div className="mt-2">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
