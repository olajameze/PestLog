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

function extractRegion(locale: string): string | null {
  const normalized = locale.replace('_', '-');
  const parts = normalized.split('-');
  if (parts.length < 2) return null;
  return parts[1].toUpperCase();
}

export function resolveCountryFromPreferences(preferredLocales: string[], timeZone?: string): CountryCode {
  for (const locale of preferredLocales) {
    const region = extractRegion(locale);
    if (!region) continue;
    const direct = DIRECT_REGION_MAP[region];
    if (direct) return direct;
    if (EU_REGION_CODES.has(region)) return 'EU';
  }

  const firstLocale = preferredLocales[0]?.toLowerCase() ?? '';
  if (firstLocale.startsWith('fr')) return 'FR';
  if (firstLocale.startsWith('de')) return 'DE';
  if (firstLocale.startsWith('es')) return 'ES';
  if (firstLocale.startsWith('it')) return 'IT';
  if (firstLocale.startsWith('hi')) return 'IN';

  if (timeZone === 'Asia/Kolkata') return 'IN';
  if (timeZone?.startsWith('Europe/')) return 'EU';

  return 'GB';
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

