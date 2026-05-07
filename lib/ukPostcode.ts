/**
 * Normalise UK postcode for storage/comparison (uppercase, single spaces).
 */
export function normalizeUkPostcode(input: string): string {
  return input.toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * Validates full UK postcode (inward + outward). Accepts common formatting.
 */
export function isValidUkPostcode(input: string): boolean {
  const compact = normalizeUkPostcode(input).replace(/\s/g, '');
  if (!compact) return false;
  if (/^GIR0AA$/i.test(compact)) return true;
  return /^[A-Z]{1,2}\d[A-Z0-9]?\d[A-Z]{2}$/i.test(compact);
}
