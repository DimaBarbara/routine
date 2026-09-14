export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = 'routine:theme';

/**
 * Виконується до гідратації (next/script beforeInteractive): ставить клас .dark на <html>,
 * щоб сторінка не блимала світлою темою. Мінімальний і самодостатній — без імпортів.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'}catch(e){}})();`;
