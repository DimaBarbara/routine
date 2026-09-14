import type messages from '../messages/uk.json';
import type { Locale } from './i18n/config';

declare global {
  type IntlMessages = typeof messages;
}

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
