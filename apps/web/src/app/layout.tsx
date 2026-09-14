import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { themeInitScript } from '@/lib/theme/theme';

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'cyrillic'] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: { default: 'routine', template: '%s · routine' },
    description: t('description'),
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();

  return (
    // suppressHydrationWarning: клас теми ставить скрипт до гідратації, сервер про нього не знає.
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
