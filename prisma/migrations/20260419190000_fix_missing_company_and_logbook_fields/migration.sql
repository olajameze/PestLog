-- Fix production DB drift: ensure Company billing fields and Logbook tables/columns exist.

-- ============ Company billing fields ============
DO $$
BEGIN
  -- Add missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Company' AND column_name='stripeCustomerId'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN "stripeCustomerId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Company' AND column_name='subscriptionStatus'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Company' AND column_name='trialEndsAt'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN "trialEndsAt" TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Company' AND column_name='plan'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN "plan" TEXT DEFAULT 'trial';
  END IF;

  -- Unique constraint for Stripe customer id (only if not already present)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."Company"'::regclass
      AND contype = 'u'
      AND conname = 'Company_stripeCustomerId_key'
  ) THEN
    ALTER TABLE "Company" ADD CONSTRAINT "Company_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
  END IF;
END $$;

-- ============ Logbook support tables ============
-- LogbookPhoto
CREATE TABLE IF NOT EXISTS "LogbookPhoto" (
  "id" TEXT PRIMARY KEY DEFAULT (substring(md5(random()::text) from 1 for 25)),
  "logbookEntryId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."LogbookPhoto"'::regclass
      AND conname = 'LogbookPhoto_logbookEntryId_fkey'
  ) THEN
    ALTER TABLE "LogbookPhoto"
      ADD CONSTRAINT "LogbookPhoto_logbookEntryId_fkey"
      FOREIGN KEY ("logbookEntryId") REFERENCES "LogbookEntry"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- BaitStation
CREATE TABLE IF NOT EXISTS "BaitStation" (
  "id" TEXT PRIMARY KEY DEFAULT (substring(md5(random()::text) from 1 for 25)),
  "logbookEntryId" UUID NOT NULL,
  "stationId" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "baitType" TEXT,
  "amount" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."BaitStation"'::regclass
      AND conname = 'BaitStation_logbookEntryId_fkey'
  ) THEN
    ALTER TABLE "BaitStation"
      ADD CONSTRAINT "BaitStation_logbookEntryId_fkey"
      FOREIGN KEY ("logbookEntryId") REFERENCES "LogbookEntry"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Join table: LogbookEntryTechnician
CREATE TABLE IF NOT EXISTS "LogbookEntryTechnician" (
  "logbookEntryId" UUID NOT NULL,
  "technicianId" UUID NOT NULL,
  PRIMARY KEY ("logbookEntryId", "technicianId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."LogbookEntryTechnician"'::regclass
      AND conname = 'LogbookEntryTechnician_logbookEntryId_fkey'
  ) THEN
    ALTER TABLE "LogbookEntryTechnician"
      ADD CONSTRAINT "LogbookEntryTechnician_logbookEntryId_fkey"
      FOREIGN KEY ("logbookEntryId") REFERENCES "LogbookEntry"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."LogbookEntryTechnician"'::regclass
      AND conname = 'LogbookEntryTechnician_technicianId_fkey'
  ) THEN
    ALTER TABLE "LogbookEntryTechnician"
      ADD CONSTRAINT "LogbookEntryTechnician_technicianId_fkey"
      FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure LogbookEntry optional columns exist (for older DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='LogbookEntry' AND column_name='followUpDate'
  ) THEN
    ALTER TABLE "LogbookEntry" ADD COLUMN "followUpDate" TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='LogbookEntry' AND column_name='internalNotes'
  ) THEN
    ALTER TABLE "LogbookEntry" ADD COLUMN "internalNotes" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='LogbookEntry' AND column_name='productAmount'
  ) THEN
    ALTER TABLE "LogbookEntry" ADD COLUMN "productAmount" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='LogbookEntry' AND column_name='recommendation'
  ) THEN
    ALTER TABLE "LogbookEntry" ADD COLUMN "recommendation" TEXT;
  END IF;
END $$;

