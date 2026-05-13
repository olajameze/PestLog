/** Stored on account deletion (user settings flow). */
export const ACCOUNT_DELETION_REASONS = [
  'Missing compliance feature I need',
  'Too expensive',
  'Difficult to use',
  'No longer in pest control business',
  'Technical issues',
  'Other (please specify)',
] as const;

export type AccountDeletionReason = (typeof ACCOUNT_DELETION_REASONS)[number];

export function isAccountDeletionReason(value: string): value is AccountDeletionReason {
  return (ACCOUNT_DELETION_REASONS as readonly string[]).includes(value);
}
