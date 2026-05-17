import { expect, test } from '@playwright/test';
import { resolveLocaleConfig } from '../lib/i18n/config';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedTimeWithZone,
} from '../lib/date-utils';

const utcSample = '2026-05-17T10:30:00.000Z';

test.describe('Multi-country report localization', () => {
  test('USA locale uses MM/DD/YYYY, 12-hour time, and USD', () => {
    const config = resolveLocaleConfig(['en-US'], 'America/New_York');

    expect(config.country).toBe('US');
    expect(config.datePattern).toBe('MM/DD/YYYY');
    expect(config.hour12).toBe(true);
    expect(config.currency).toBe('USD');

    const date = formatLocalizedDate(utcSample, {
      locale: config.locale,
      datePattern: config.datePattern,
      timeZone: 'America/New_York',
    });
    const time = formatLocalizedTimeWithZone(utcSample, {
      locale: config.locale,
      hour12: config.hour12,
      timeZone: 'America/New_York',
    });
    const currency = formatLocalizedCurrency(1240, {
      locale: config.locale,
      currency: config.currency,
    });

    expect(date).toBe('05/17/2026');
    expect(time).toMatch(/\b(AM|PM)\b/);
    expect(currency).toContain('$');
  });

  test('France locale uses DD/MM/YYYY and 24-hour time', () => {
    const config = resolveLocaleConfig(['fr-FR'], 'Europe/Paris');

    expect(config.country).toBe('FR');
    expect(config.datePattern).toBe('DD/MM/YYYY');
    expect(config.hour12).toBe(false);
    expect(config.currency).toBe('EUR');

    const date = formatLocalizedDate(utcSample, {
      locale: config.locale,
      datePattern: config.datePattern,
      timeZone: 'Europe/Paris',
    });
    const time = formatLocalizedTimeWithZone(utcSample, {
      locale: config.locale,
      hour12: config.hour12,
      timeZone: 'Europe/Paris',
    });

    expect(date).toBe('17/05/2026');
    expect(time).not.toMatch(/\b(AM|PM)\b/i);
  });

  test('India locale uses DD/MM/YYYY, 12-hour time, and INR', () => {
    const config = resolveLocaleConfig(['en-IN'], 'Asia/Kolkata');

    expect(config.country).toBe('IN');
    expect(config.datePattern).toBe('DD/MM/YYYY');
    expect(config.hour12).toBe(true);
    expect(config.currency).toBe('INR');

    const date = formatLocalizedDate(utcSample, {
      locale: config.locale,
      datePattern: config.datePattern,
      timeZone: 'Asia/Kolkata',
    });
    const time = formatLocalizedTimeWithZone(utcSample, {
      locale: config.locale,
      hour12: config.hour12,
      timeZone: 'Asia/Kolkata',
    });
    const currency = formatLocalizedCurrency(1240, {
      locale: config.locale,
      currency: config.currency,
    });

    expect(date).toBe('17/05/2026');
    expect(time).toMatch(/\b(AM|PM)\b/i);
    expect(currency).toContain('₹');
  });

  test('Canada locale uses YYYY-MM-DD and CAD', () => {
    const config = resolveLocaleConfig(['en-CA'], 'America/Toronto');

    expect(config.country).toBe('CA');
    expect(config.datePattern).toBe('YYYY-MM-DD');
    expect(config.hour12).toBe(true);
    expect(config.currency).toBe('CAD');

    const date = formatLocalizedDate(utcSample, {
      locale: config.locale,
      datePattern: config.datePattern,
      timeZone: 'America/Toronto',
    });
    const currency = formatLocalizedCurrency(1240, {
      locale: config.locale,
      currency: config.currency,
    });

    expect(date).toBe('2026-05-17');
    expect(currency).toContain('$');
  });

  test('UTC timestamp converts to local timezone output', () => {
    const usConfig = resolveLocaleConfig(['en-US'], 'America/New_York');
    const indiaConfig = resolveLocaleConfig(['en-IN'], 'Asia/Kolkata');

    const usTime = formatLocalizedTimeWithZone(utcSample, {
      locale: usConfig.locale,
      hour12: usConfig.hour12,
      timeZone: 'America/New_York',
    });
    const indiaTime = formatLocalizedTimeWithZone(utcSample, {
      locale: indiaConfig.locale,
      hour12: indiaConfig.hour12,
      timeZone: 'Asia/Kolkata',
    });

    expect(usTime).not.toBe(indiaTime);
    expect(usTime).toMatch(/(AM|PM|EST|EDT|GMT)/i);
    expect(indiaTime).toMatch(/(AM|PM|IST|GMT)/i);
  });
});

