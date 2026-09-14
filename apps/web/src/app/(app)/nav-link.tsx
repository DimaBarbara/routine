'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

interface Props {
  href: string;
  /** Сегмент шляху, за яким пункт активний: /s/<space>/wishlists теж підсвічує «Вішлісти». */
  segment: string;
  children: React.ReactNode;
}

export function NavLink({ href, segment, children }: Props) {
  const isActive = usePathname().split('/').includes(segment);
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
      )}
    >
      {children}
    </Link>
  );
}
