'use client';

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  WISH_CATEGORIES,
  WISH_STATUSES,
  type WishBoard,
  type WishCategory,
  type WishDoneKind,
  type WishItemDto,
  type WishStatus,
} from '@routine/contracts';
import { GripVertical, Link2, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/hooks/use-error-text';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/cn';

import { DoneKindDialog } from './done-kind-dialog';
import { ItemDialog } from './item-dialog';
import { CATEGORY_META, STATUS_META } from './meta';
import { ShareDialog } from './share-dialog';
import { WishCard } from './wish-card';

type Columns = Record<WishStatus, string[]>;
type OwnerFilter = { kind: 'all' } | { kind: 'shared' } | { kind: 'person'; id: string };
const ALL: OwnerFilter = { kind: 'all' };

const COLUMN_PREFIX = 'column:';

function groupByStatus(items: WishItemDto[]): Columns {
  const columns = Object.fromEntries(
    WISH_STATUSES.map((status) => [status, []]),
  ) as unknown as Columns;
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    columns[item.status].push(item.id);
  }
  return columns;
}

const indexById = (items: WishItemDto[]) =>
  Object.fromEntries(items.map((item) => [item.id, item]));

interface Props {
  spaceId: string;
  board: WishBoard;
  currentUserId: string;
}

export function Board({ spaceId, board, currentUserId }: Props) {
  const t = useTranslations('wishlist');
  const errorText = useErrorText();
  const basePath = `/spaces/${spaceId}/wishlist`;

  const [source, setSource] = useState(board);
  const [items, setItems] = useState<Record<string, WishItemDto>>(() => indexById(board.items));
  const [columns, setColumns] = useState<Columns>(() => groupByStatus(board.items));

  // Нові дані з сервера (router.refresh) — перебудовуємо дошку, фільтри лишаються.
  if (board !== source) {
    setSource(board);
    setItems(indexById(board.items));
    setColumns(groupByStatus(board.items));
  }

  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<WishCategory | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingIn, setCreatingIn] = useState<WishStatus | null>(null);
  const [pendingDone, setPendingDone] = useState<{
    id: string;
    afterId: string | null;
    snapshot: Columns;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragSnapshot = useRef<Columns | null>(null);
  const lastDragEnd = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Довге натискання: звичайний свайп на телефоні гортає дошку, а не хапає картку.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isVisible = (id: string) => {
    const item = items[id];
    if (!item) return false;
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (ownerFilter.kind === 'shared') return item.owner === null;
    if (ownerFilter.kind === 'person') return item.owner?.id === ownerFilter.id;
    return true;
  };

  const findColumn = (id: UniqueIdentifier): WishStatus | null => {
    const key = String(id);
    if (key.startsWith(COLUMN_PREFIX)) return key.slice(COLUMN_PREFIX.length) as WishStatus;
    return WISH_STATUSES.find((status) => columns[status].includes(key)) ?? null;
  };

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    dragSnapshot.current = columns;
    setError(null);
  }

  /** Перетягування між колонками: переносимо картку одразу, щоб колонка «розсунулась». */
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findColumn(active.id);
    const to = findColumn(over.id);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const target = [...prev[to]];
      const overIndex = target.indexOf(String(over.id));
      target.splice(overIndex >= 0 ? overIndex : target.length, 0, String(active.id));
      return { ...prev, [from]: prev[from].filter((id) => id !== active.id), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    lastDragEnd.current = Date.now();
    const snapshot = dragSnapshot.current;
    dragSnapshot.current = null;
    if (!snapshot) return;

    const id = String(active.id);
    const to = over ? findColumn(over.id) : null;
    if (!to) return setColumns(snapshot);

    let next = columns;
    const activeIndex = columns[to].indexOf(id);
    const overIndex = columns[to].indexOf(String(over!.id));
    if (overIndex >= 0 && overIndex !== activeIndex) {
      next = { ...columns, [to]: arrayMove(columns[to], activeIndex, overIndex) };
      setColumns(next);
    }

    const from = items[id]!.status;
    const index = next[to].indexOf(id);
    if (to === from && index === snapshot[from].indexOf(id)) return;

    const afterId = index > 0 ? next[to][index - 1]! : null;
    if (to === 'DONE' && from !== 'DONE') return setPendingDone({ id, afterId, snapshot });
    void commitMove(id, to, afterId, snapshot);
  }

  async function commitMove(
    id: string,
    status: WishStatus,
    afterId: string | null,
    snapshot: Columns,
    doneKind?: WishDoneKind,
  ) {
    const previous = items[id]!;
    setItems((prev) => ({
      ...prev,
      [id]: { ...previous, status, doneKind: status === 'DONE' ? (doneKind ?? 'BOUGHT') : null },
    }));
    try {
      const updated = await api<WishItemDto>(`${basePath}/items/${id}/move`, 'POST', {
        status,
        afterId,
        doneKind,
      });
      setItems((prev) => ({ ...prev, [id]: updated }));
    } catch (err) {
      // Сервер відмовив — повертаємо картку туди, звідки взяли.
      setColumns(snapshot);
      setItems((prev) => ({ ...prev, [id]: previous }));
      setError(errorText(err));
    }
  }

  const openItem = (id: string) => {
    // Клік одразу після перетягування — не відкриваємо діалог.
    if (Date.now() - lastDragEnd.current > 250) setEditingId(id);
  };

  const others = board.members.filter((member) => member.id !== currentUserId);
  const hasFilters = ownerFilter.kind !== 'all' || categoryFilter !== null;
  const activeItem = activeId ? items[activeId] : null;
  const editingItem = editingId ? items[editingId] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            <Link2 className="size-4" aria-hidden /> {t('share.button')}
          </Button>
          <Button onClick={() => setCreatingIn('WANT')}>
            <Plus className="size-4" aria-hidden /> {t('add')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label={t('filters.owner')}
          className="flex flex-wrap items-center gap-2"
        >
          <FilterChip active={ownerFilter.kind === 'all'} onClick={() => setOwnerFilter(ALL)}>
            {t('filters.all')}
          </FilterChip>
          <FilterChip
            active={ownerFilter.kind === 'person' && ownerFilter.id === currentUserId}
            onClick={() => setOwnerFilter({ kind: 'person', id: currentUserId })}
          >
            {t('filters.mine')}
          </FilterChip>
          {others.map((member) => (
            <FilterChip
              key={member.id}
              active={ownerFilter.kind === 'person' && ownerFilter.id === member.id}
              onClick={() => setOwnerFilter({ kind: 'person', id: member.id })}
            >
              <Avatar id={member.id} name={member.name} size="xs" className="-ml-1" />
              {member.name}
            </FilterChip>
          ))}
          <FilterChip
            active={ownerFilter.kind === 'shared'}
            onClick={() => setOwnerFilter({ kind: 'shared' })}
          >
            {t('filters.shared')}
          </FilterChip>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setOwnerFilter(ALL);
                setCategoryFilter(null);
              }}
              className="inline-flex items-center gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden /> {t('filters.clear')}
            </button>
          )}
        </div>
        <div
          role="group"
          aria-label={t('filters.category')}
          className="-mx-4 flex scrollbar-thin gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {WISH_CATEGORIES.map((category) => {
            const Icon = CATEGORY_META[category].icon;
            const active = categoryFilter === category;
            return (
              <FilterChip
                key={category}
                active={active}
                onClick={() => setCategoryFilter(active ? null : category)}
              >
                <Icon className="size-3.5" aria-hidden />
                {t(`categories.${category}`)}
              </FilterChip>
            );
          })}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          if (dragSnapshot.current) setColumns(dragSnapshot.current);
          dragSnapshot.current = null;
        }}
      >
        <div className="-mx-4 flex snap-x snap-mandatory scrollbar-thin gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-4 xl:overflow-visible">
          {WISH_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              ids={columns[status].filter(isVisible)}
              items={items}
              onAdd={() => setCreatingIn(status)}
              onOpen={openItem}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {activeItem ? <WishCard item={activeItem} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <ItemDialog
        open={creatingIn !== null || editingItem !== undefined}
        onClose={() => {
          setCreatingIn(null);
          setEditingId(null);
        }}
        basePath={basePath}
        members={board.members}
        currentUserId={currentUserId}
        item={editingItem}
        initialStatus={creatingIn ?? 'WANT'}
        onSaved={() => setError(null)}
      />

      <DoneKindDialog
        title={pendingDone ? (items[pendingDone.id]?.title ?? null) : null}
        onCancel={() => {
          if (pendingDone) setColumns(pendingDone.snapshot);
          setPendingDone(null);
        }}
        onChoose={(kind) => {
          if (!pendingDone) return;
          void commitMove(pendingDone.id, 'DONE', pendingDone.afterId, pendingDone.snapshot, kind);
          setPendingDone(null);
        }}
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        basePath={basePath}
        shareUrl={board.shareUrl}
      />
    </div>
  );
}

function Column({
  status,
  ids,
  items,
  onAdd,
  onOpen,
}: {
  status: WishStatus;
  ids: string[];
  items: Record<string, WishItemDto>;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations('wishlist');
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${status}` });
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const title = t(`columns.${status}`);

  return (
    <section
      aria-label={title}
      className="flex w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-3xl bg-muted/60 p-3 sm:w-80 xl:w-auto xl:max-w-none"
    >
      <header className="flex items-center gap-2.5 px-1.5 pt-1 pb-3">
        <span className={cn('flex size-8 items-center justify-center rounded-xl', meta.chip)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {title}
            <span className="rounded-full bg-card px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
              {ids.length}
            </span>
          </h2>
          <p className="truncate text-xs text-muted-foreground">{t(`columnHints.${status}`)}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label={t('addToColumn', { column: title })}
          title={t('addToColumn', { column: title })}
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </header>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-32 flex-1 flex-col gap-2.5 rounded-2xl p-0.5 transition-colors',
            isOver && 'bg-accent/60',
          )}
        >
          {ids.map((id) => (
            <SortableCard key={id} item={items[id]!} onOpen={() => onOpen(id)} />
          ))}
          {ids.length === 0 && (
            <p className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
              {t('emptyColumn')}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ item, onOpen }: { item: WishItemDto; onOpen: () => void }) {
  const t = useTranslations('wishlist.item');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  // Мишею/пальцем тягнемо всю картку, з клавіатури — через ручку (Enter по картці відкриває).
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  const onHandleKeyDown = onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined;

  return (
    <WishCard
      ref={setNodeRef}
      item={item}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'cursor-grab pr-9 hover:border-input active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      {...pointerListeners}
      onClick={onOpen}
      footer={
        <>
          <button
            type="button"
            {...attributes}
            onKeyDown={onHandleKeyDown}
            onClick={(event) => event.stopPropagation()}
            className="absolute top-3 right-2 flex size-6 items-center justify-center rounded-lg text-muted-foreground/60 opacity-100 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="sr-only focus:not-sr-only focus:absolute focus:inset-x-3 focus:bottom-3 focus:rounded-lg focus:bg-accent focus:px-2 focus:py-1 focus:text-xs focus:text-accent-foreground"
          >
            {t('more')}
          </button>
        </>
      }
    />
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition',
        active
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-input hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
