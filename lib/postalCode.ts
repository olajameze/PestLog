import { isValidUkPostcode, normalizeUkPostcode } from './ukPostcode';

type PostalCodeConfig = {
  label: string;
  required: boolean;
  validate: (value: string) => boolean;
  normalize: (value: string) => string;
};

const POSTAL_CODE_CONFIG: Record<string, PostalCodeConfig> = {
  GB: {
    label: 'Postcode',
    required: true,
    validate: isValidUkPostcode,
    normalize: normalizeUkPostcode,
  },
  US: {
    label: 'ZIP Code',
    required: false,
    validate: (v) => /^\d{5}(-\d{4})?$/.test(v),
    normalize: (v) => v.trim(),
  },
  CA: {
    label: 'Postal Code',
    required: false,
    validate: (v) => /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(v),
    normalize: (v) => v.toUpperCase().replace(/\s+/g, ' ').trim(),
  },
  IN: {
    label: 'PIN Code',
    required: false,
    validate: (v) => /^\d{6}$/.test(v),
    normalize: (v) => v.trim(),
  },
  AU: {
    label: 'Postcode',
    required: false,
    validate: (v) => /^\d{4}$/.test(v),
    normalize: (v) => v.trim(),
  },
};

const PERMISSIVE_CONFIG: PostalCodeConfig = {
  label: 'Postcode / ZIP',
  required: false,
  validate: () => true,
  normalize: (v) => v.trim(),
};

export function getPostalCodeConfig(countryCode?: string | null): PostalCodeConfig {
  const code = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  return POSTAL_CODE_CONFIG[code] ?? PERMISSIVE_CONFIG;
}

