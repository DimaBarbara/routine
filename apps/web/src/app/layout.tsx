import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ variable: '--font-inter', subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: { default: 'routine', template: '%s · routine' },
  description: 'Вішліст, фінанси та інші корисні штуки для своїх',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
