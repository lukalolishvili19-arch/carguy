import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ka'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
