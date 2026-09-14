'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { ItemDialog } from './item-dialog';

export function AddItemButton({ basePath }: { basePath: string }) {
  const t = useTranslations('wishlists');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> {t('addItem')}
      </Button>
      <ItemDialog open={open} onClose={() => setOpen(false)} basePath={basePath} />
    </>
  );
}
