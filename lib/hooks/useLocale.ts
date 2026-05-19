import { useEffect, useMemo, useState } from 'react';
import {
  getMessages,
  resolveCountryWithConfidence,
  resolveLocaleConfig,
  type CountryCode,
  type DatePattern,
  type MessageDictionary,
  type SupportedLocale,
} from '../i18n/config';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedDateTimeWithZone,
  formatLocalizedTimeWithZone,
} from '../date-utils';

type UseLocaleResult = {
  locale: SupportedLocale;
  country: CountryCode;
  /**
   * True when the country was explicitly matched from the browser's locale
   * region tag, language prefix, or timezone — as opposed to falling back
   * to the default. Callers must NOT enforce country-specific mandatory
   * rules (e.g. required UK postcode) when this is false.
   */
  countryConfident: boolean;
  timeZone: string;
  currency: 'USD' | 'CAD' | 'EUR' | 'INR' | 'GBP';
  hour12: boolean;
  datePattern: DatePattern;
  complianceNotice: string;
  t: (key: string, replacements?: Record<string, string>) => string;
  formatDate: (value: string | number | Date) => string;
  formatTimeWithZone: (value: string | number | Date) => string;
  formatDateTimeWithZone: (value: string | number | Date) => string;
  formatCurrency: (value: number) => string;
};

const FALLBACK_TIME_ZONE = 'Europe/London';

function resolveBrowserPreferences(): { locales: string[]; timeZone: string } {
  if (typeof window === 'undefined') {
    return { locales: ['en-GB'], timeZone: FALLBACK_TIME_ZONE };
  }

  const locales = Array.from(new Set([...(navigator.languages ?? []), navigator.language].filter(Boolean)));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  return {
    locales: locales.length > 0 ? locales : ['en-GB'],
    timeZone,
  };
}

function translate(messages: MessageDictionary, key: string, replacements?: Record<string, string>): string {
  const template = messages[key] ?? key;
  if (!replacements) return template;
  return Object.entries(replacements).reduce(
    (value, [token, replacement]) => value.replace(new RegExp(`\\{${token}\\}`, 'g'), replacement),
    template,
  );
}

export function useLocale(): UseLocaleResult {
  const [browser, setBrowser] = useState<{ locales: string[]; timeZone: string }>({
    locales: ['en-GB'],
    timeZone: FALLBACK_TIME_ZONE,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setBrowser(resolveBrowserPreferences());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { confident: countryConfident } = resolveCountryWithConfidence(
    browser.locales,
    browser.timeZone,
  );
  const config = resolveLocaleConfig(browser.locales, browser.timeZone);
  const messages = getMessages(config.locale);

  return useMemo(
    () => ({
      locale: config.locale,
      country: config.country,
      countryConfident,
      timeZone: browser.timeZone,
      currency: config.currency,
      hour12: config.hour12,
      datePattern: config.datePattern,
      complianceNotice: config.complianceNotice,
      t: (key: string, replacements?: Record<string, string>) => translate(messages, key, replacements),
      formatDate: (value: string | number | Date) =>
        formatLocalizedDate(value, {
          locale: config.locale,
          datePattern: config.datePattern,
          timeZone: browser.timeZone,
        }),
      formatTimeWithZone: (value: string | number | Date) =>
        formatLocalizedTimeWithZone(value, {
          locale: config.locale,
          hour12: config.hour12,
          timeZone: browser.timeZone,
        }),
      formatDateTimeWithZone: (value: string | number | Date) =>
        formatLocalizedDateTimeWithZone(
          value,
          {
            locale: config.locale,
            datePattern: config.datePattern,
            timeZone: browser.timeZone,
          },
          {
            locale: config.locale,
            hour12: config.hour12,
            timeZone: browser.timeZone,
          },
        ),
      formatCurrency: (value: number) =>
        formatLocalizedCurrency(value, {
          locale: config.locale,
          currency: config.currency,
        }),
    }),
    [
      browser.timeZone,
      config.country,
      config.currency,
      config.datePattern,
      config.hour12,
      config.locale,
      config.complianceNotice,
      countryConfident,
      messages,
    ],
  );
}

