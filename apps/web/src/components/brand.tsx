import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/cn';

export function Brand({ href = '/dashboard', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2.5 font-semibold tracking-tight', className)}
    >
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-400 text-white shadow-card">
        <Sparkles className="size-4" aria-hidden />
      </span>
      <span className="text-lg">routine</span>
    </Link>
  );
}
