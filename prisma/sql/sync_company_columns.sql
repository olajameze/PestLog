-- Safe additive sync for Company when the DB is behind schema.prisma (no table rebuild).
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "requireSignature" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "requirePhotos" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "defaultReportRangeDays" INTEGER DEFAULT 30;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMPTZ(6);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "paymentFailedAt" TIMESTAMPTZ(6);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "paymentGraceEndsAt" TIMESTAMPTZ(6);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "nonPaymentCanceledAt" TIMESTAMPTZ(6);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "retrialGrantedAt" TIMESTAMPTZ(6);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "plan" TEXT DEFAULT 'trial';

-- Stable defaults when INSERT omits columns (fixes NOT NULL drift vs schema.prisma + Prisma/pg-adapter).
ALTER TABLE "Company" ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE "Company" ALTER COLUMN "updatedAt" SET DEFAULT now();

-- id is NOT NULL in many Supabase DDLs without DEFAULT; Prisma may omit pk on INSERT (dbgenerated).
-- If this fails ("column ... is of type uuid"), use:
-- ALTER TABLE "Company" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Company" ALTER COLUMN "id" SET DEFAULT (gen_random_uuid()::text);
