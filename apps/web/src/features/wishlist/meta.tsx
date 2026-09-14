import type { WishCategory, WishStatus } from '@routine/contracts';
import {
  Baby,
  BookOpen,
  CircleCheck,
  Dumbbell,
  Heart,
  HeartPulse,
  Laptop,
  Lightbulb,
  type LucideIcon,
  Palette,
  Plane,
  Shirt,
  ShoppingCart,
  Sofa,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';

interface Tone {
  icon: LucideIcon;
  /** Кольорова «пляма» під іконку. */
  chip: string;
  /** Крапка/смужка акценту колонки. */
  dot: string;
}

export const STATUS_META: Record<WishStatus, Tone> = {
  WANT: {
    icon: Heart,
    chip: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  NEED: {
    icon: ShoppingCart,
    chip: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  THINKING: {
    icon: Lightbulb,
    chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  DONE: {
    icon: CircleCheck,
    chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
};

export const CATEGORY_META: Record<WishCategory, Omit<Tone, 'dot'>> = {
  CLOTHES: {
    icon: Shirt,
    chip: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  },
  BEAUTY: { icon: Sparkles, chip: 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-300' },
  SPORT: {
    icon: Dumbbell,
    chip: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300',
  },
  TECH: { icon: Laptop, chip: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  HOME: { icon: Sofa, chip: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300' },
  BOOKS: {
    icon: BookOpen,
    chip: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
  HOBBY: {
    icon: Palette,
    chip: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  TRAVEL: { icon: Plane, chip: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300' },
  HEALTH: { icon: HeartPulse, chip: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300' },
  KIDS: { icon: Baby, chip: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300' },
  FOOD: {
    icon: UtensilsCrossed,
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  OTHER: { icon: Tag, chip: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300' },
};
