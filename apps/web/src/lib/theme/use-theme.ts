'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { type Theme, THEME_STORAGE_KEY, THEMES } from './theme';

const listeners = new Set<() => void>();
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (THEMES as readonly string[]).includes(stored ?? '') ? (stored as Theme) : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && media().matches);
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onSystemChange = () => {
    if (readTheme() === 'system') applyTheme('system');
    listener();
  };
  // Інша вкладка змінила тему — синхронізуємося.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readTheme());
    listener();
  };
  media().addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    media().removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** `theme` — null до гідратації: на сервері вибір користувача невідомий. */
export function useTheme() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // приватний режим: тема діятиме до перезавантаження
    }
    applyTheme(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { theme, setTheme };
}
