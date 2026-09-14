import type { ExpenseCategory, IncomeKind } from '@routine/contracts';
import {
  Bus,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  type LucideIcon,
  Plane,
  PlugZap,
  Popcorn,
  Repeat,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Tag,
  TrendingUp,
  Tv,
} from 'lucide-react';

interface Tone {
  icon: LucideIcon;
  chip: string;
}

export const EXPENSE_META: Record<ExpenseCategory, Tone> = {
  FOOD: {
    icon: ShoppingBasket,
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  CAFE: { icon: Coffee, chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  ENTERTAINMENT: {
    icon: Popcorn,
    chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  TRANSPORT: { icon: Bus, chip: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  HOME: { icon: House, chip: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
  UTILITIES: {
    icon: PlugZap,
    chip: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
  HEALTH: { icon: HeartPulse, chip: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  BEAUTY: { icon: Sparkles, chip: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  CLOTHES: {
    icon: Shirt,
    chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  SUBSCRIPTIONS: {
    icon: Tv,
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  EDUCATION: {
    icon: GraduationCap,
    chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  TRAVEL: { icon: Plane, chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  GIFTS: { icon: Gift, chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  OTHER: { icon: Tag, chip: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300' },
};

export const INCOME_META: Record<IncomeKind, Tone> = {
  FIXED: { icon: Repeat, chip: 'bg-success-soft text-success' },
  UNPLANNED: { icon: TrendingUp, chip: 'bg-success-soft text-success' },
};
