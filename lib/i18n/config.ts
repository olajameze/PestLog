import enUS from '../../messages/en-US.json' with { type: 'json' };
import enCA from '../../messages/en-CA.json' with { type: 'json' };
import frFR from '../../messages/fr-FR.json' with { type: 'json' };
import deDE from '../../messages/de-DE.json' with { type: 'json' };
import esES from '../../messages/es-ES.json' with { type: 'json' };
import itIT from '../../messages/it-IT.json' with { type: 'json' };
import enIN from '../../messages/en-IN.json' with { type: 'json' };
import enGB from '../../messages/en-GB.json' with { type: 'json' };

export type SupportedLocale =
  | 'en-US'
  | 'en-CA'
  | 'fr-FR'
  | 'de-DE'
  | 'es-ES'
  | 'it-IT'
  | 'en-IN'
  | 'en-GB';

export type CountryCode = 'US' | 'CA' | 'FR' | 'DE' | 'ES' | 'IT' | 'IN' | 'EU' | 'GB';
export type DatePattern = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type MessageDictionary = Record<string, string>;

export type LocaleConfig = {
  locale: SupportedLocale;
  currency: 'USD' | 'CAD' | 'EUR' | 'INR' | 'GBP';
  datePattern: DatePattern;
  hour12: boolean;
  language: string;
  country: CountryCode;
  complianceNotice: string;
};

const COUNTRY_CONFIG: Record<CountryCode, LocaleConfig> = {
  US: {
    locale: 'en-US',
    currency: 'USD',
    datePattern: 'MM/DD/YYYY',
    hour12: true,
    language: 'English',
    country: 'US',
    complianceNotice: 'FIFRA requires 2-year record retention',
  },
  CA: {
    locale: 'en-CA',
    currency: 'CAD',
    datePattern: 'YYYY-MM-DD',
    hour12: true,
    language: 'English',
    country: 'CA',
    complianceNotice: 'Keep records for permit audits',
  },
  FR: {
    locale: 'fr-FR',
    currency: 'EUR',
    datePattern: 'DD/MM/YYYY',
    hour12: false,
    language: 'French',
    country: 'FR',
    complianceNotice: 'GDPR-compliant audit trail',
  },
  DE: {
    locale: 'de-DE',
    currency: 'EUR',
    datePattern: 'DD/MM/YYYY',
    hour12: false,
    language: 'German',
    country: 'DE',
    complianceNotice: 'GDPR-compliant audit trail',
  },
  ES: {
    locale: 'es-ES',
    currency: 'EUR',
    datePattern: 'DD/MM/YYYY',
    hour12: false,
    language: 'Spanish',
    country: 'ES',
    complianceNotice: 'GDPR-compliant audit trail',
  },
  IT: {
    locale: 'it-IT',
    currency: 'EUR',
    datePattern: 'DD/MM/YYYY',
    hour12: false,
    language: 'Italian',
    country: 'IT',
    complianceNotice: 'GDPR-compliant audit trail',
  },
  IN: {
    locale: 'en-IN',
    currency: 'INR',
    datePattern: 'DD/MM/YYYY',
    hour12: true,
    language: 'English',
    country: 'IN',
    complianceNotice: 'Maintain records as per local pest control regulations',
  },
  EU: {
    locale: 'en-GB',
    currency: 'EUR',
    datePattern: 'DD/MM/YYYY',
    hour12: false,
    language: 'English',
    country: 'EU',
    complianceNotice: 'GDPR-compliant audit trail',
  },
  GB: {
    locale: 'en-GB',
    currency: 'GBP',
    datePattern: 'DD/MM/YYYY',
    hour12: false,
    language: 'English',
    country: 'GB',
    complianceNotice: 'GDPR-compliant audit trail',
  },
};

const LOCALE_MESSAGES: Record<SupportedLocale, MessageDictionary> = {
  'en-US': enUS,
  'en-CA': enCA,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
  'it-IT': itIT,
  'en-IN': enIN,
  'en-GB': enGB,
};

const EU_REGION_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'GR', 'HU', 'IE', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'LT', 'LV',
]);

const DIRECT_REGION_MAP: Record<string, CountryCode> = {
  US: 'US',
  CA: 'CA',
  FR: 'FR',
  DE: 'DE',
  ES: 'ES',
  IT: 'IT',
  IN: 'IN',
  GB: 'GB',
};

/**
 * Both IANA timezone names used for India.
 * Asia/Calcutta is the deprecated alias still reported by many older Android
 * devices and browsers, so we must check both.
 */
const INDIA_TIMEZONES = new Set(['Asia/Kolkata', 'Asia/Calcutta']);

/**
 * Language prefix codes for major Indian languages.
 * Covers Hindi, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam,
 * Gujarati, and Punjabi — not just Hindi (hi) as before.
 */
const INDIAN_LANGUAGE_PREFIXES = ['hi', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'gu', 'pa'];

function extractRegion(locale: string): string | null {
  const normalized = locale.replace('_', '-');
  const parts = normalized.split('-');
  if (parts.length < 2) return null;
  return parts[1].toUpperCase();
}

/**
 * Resolves a country code from browser locale preferences and timezone.
 *
 * Kept for backward compatibility — use resolveCountryWithConfidence when
 * you need to know whether the result was explicitly matched or fell back.
 */
export function resolveCountryFromPreferences(preferredLocales: string[], timeZone?: string): CountryCode {
  return resolveCountryWithConfidence(preferredLocales, timeZone).country;
}

/**
 * Resolves a country code and signals whether the match was explicit.
 *
 * - confident: true  → a locale region tag, language prefix, or timezone
 *                       unambiguously matched a supported country.
 * - confident: false → nothing matched; the country is a generic fallback.
 *                      Callers must NOT apply country-specific mandatory
 *                      rules (e.g. required UK postcode) in this case.
 */
export function resolveCountryWithConfidence(
  preferredLocales: string[],
  timeZone?: string,
): { country: CountryCode; confident: boolean } {
  // 1. Check the region subtag of every locale in the list (e.g. "en-IN" → "IN").
  for (const locale of preferredLocales) {
    const region = extractRegion(locale);
    if (!region) continue;
    const direct = DIRECT_REGION_MAP[region];
    if (direct) return { country: direct, confident: true };
    if (EU_REGION_CODES.has(region)) return { country: 'EU', confident: true };
  }

  // 2. Check the language prefix of every locale (covers language-only tags like "ta"
  //    and language-region tags where the region wasn't in DIRECT_REGION_MAP).
  for (const locale of preferredLocales) {
    const lower = locale.toLowerCase();
    if (lower.startsWith('fr')) return { country: 'FR', confident: true };
    if (lower.startsWith('de')) return { country: 'DE', confident: true };
    if (lower.startsWith('es')) return { country: 'ES', confident: true };
    if (lower.startsWith('it')) return { country: 'IT', confident: true };
    if (INDIAN_LANGUAGE_PREFIXES.some((p) => lower.startsWith(p))) {
      return { country: 'IN', confident: true };
    }
  }

  // 3. Fall back to timezone (catches users whose locale isn't region-tagged
  //    but whose device timezone is correctly set).
  if (timeZone && INDIA_TIMEZONES.has(timeZone)) return { country: 'IN', confident: true };
  if (timeZone?.startsWith('Europe/')) return { country: 'EU', confident: true };
  if (timeZone?.startsWith('America/')) return { country: 'US', confident: true };

  // 4. Nothing matched — return GB as the UI default, but mark it unconfident
  //    so callers can avoid applying GB-specific mandatory rules.
  return { country: 'GB', confident: false };
}

export function getLocaleConfig(country: CountryCode): LocaleConfig {
  return COUNTRY_CONFIG[country];
}

export function getMessages(locale: SupportedLocale): MessageDictionary {
  return LOCALE_MESSAGES[locale] ?? LOCALE_MESSAGES['en-GB'];
}

export function resolveLocaleConfig(preferredLocales: string[], timeZone?: string): LocaleConfig {
  const country = resolveCountryFromPreferences(preferredLocales, timeZone);
  return getLocaleConfig(country);
}

