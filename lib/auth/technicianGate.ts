import type { Prisma } from '@prisma/client';

/** Shown when an email is not on a company's technician roster (Prisma `Technician` row). */
export const TECHNICIAN_EMAIL_NOT_ON_ROSTER =
  'This email is not registered as a technician. Ask your business admin to add you first.';

/**
 * Matches Technician.email case-insensitively. Pass a normalized (lowercased) email;
 * use with {@link normalizeAuthEmail} from `./userSession`.
 */
export function technicianEmailWhere(normalizedEmail: string): Prisma.TechnicianWhereInput {
  return {
    email: { equals: normalizedEmail, mode: 'insensitive' },
  };
}
