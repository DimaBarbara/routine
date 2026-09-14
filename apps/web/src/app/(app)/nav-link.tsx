'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isActive = usePathname().startsWith(href);
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
