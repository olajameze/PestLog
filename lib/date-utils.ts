import type { DatePattern, SupportedLocale } from './i18n/config';

type DateFormatInput = string | number | Date;

type DateFormatOptions = {
  locale: SupportedLocale;
  timeZone: string;
  datePattern: DatePattern;
};

type TimeFormatOptions = {
  locale: SupportedLocale;
  timeZone: string;
  hour12: boolean;
};

type CurrencyFormatOptions = {
  locale: SupportedLocale;
  currency: 'USD' | 'CAD' | 'EUR' | 'INR' | 'GBP';
};

function toValidDate(input: DateFormatInput): Date | null {
  const parsed = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getDateParts(date: Date, locale: SupportedLocale, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const mapped: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      mapped[part.type] = part.value;
    }
  }
  return mapped;
}

export function formatLocalizedDate(input: DateFormatInput, options: DateFormatOptions): string {
  const date = toValidDate(input);
  if (!date) return '-';

  const parts = getDateParts(date, options.locale, options.timeZone);
  const year = parts.year ?? '0000';
  const month = parts.month ?? '00';
  const day = parts.day ?? '00';

  if (options.datePattern === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  if (options.datePattern === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
}

export function formatLocalizedTimeWithZone(input: DateFormatInput, options: TimeFormatOptions): string {
  const date = toValidDate(input);
  if (!date) return '-';

  return new Intl.DateTimeFormat(options.locale, {
    timeZone: options.timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: options.hour12,
    timeZoneName: 'short',
  }).format(date);
}

export function formatLocalizedDateTimeWithZone(
  input: DateFormatInput,
  dateOptions: DateFormatOptions,
  timeOptions: TimeFormatOptions,
): string {
  return `${formatLocalizedDate(input, dateOptions)} · ${formatLocalizedTimeWithZone(input, timeOptions)}`;
}

export function formatLocalizedCurrency(value: number, options: CurrencyFormatOptions): string {
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

