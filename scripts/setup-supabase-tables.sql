-- Run in Supabase SQL Editor (Dashboard → SQL → New Query)
/* Creates all Prisma tables directly - bypasses PgBouncer */

-- Company table
CREATE TABLE IF NOT EXISTS "Company" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT,
  "email" TEXT UNIQUE NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "website" TEXT,
  "vatNumber" TEXT,
  "requireSignature" BOOLEAN DEFAULT false,
  "requirePhotos" BOOLEAN DEFAULT false,
  "defaultReportRangeDays" INTEGER DEFAULT 30,
  "notificationPreferences" JSONB,
  "stripeCustomerId" TEXT UNIQUE,
  "subscriptionStatus" TEXT DEFAULT 'trial',
  "trialEndsAt" TIMESTAMPTZ,
  "plan" TEXT DEFAULT 'trial',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for Company
CREATE UNIQUE INDEX IF NOT EXISTS "Company_email_key" ON "Company"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");

-- Technician table
CREATE TABLE IF NOT EXISTS "Technician" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
);

-- Certification table
CREATE TABLE IF NOT EXISTS "Certification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "technicianId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "expiryDate" TIMESTAMPTZ,
  "uploadedAt" TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE
);

-- LogbookEntry table
CREATE TABLE IF NOT EXISTS "LogbookEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "clientName" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "treatment" TEXT NOT NULL,
  "notes" TEXT,
  "photoUrl" TEXT,
  "signature" TEXT,
  "rooms" JSONB,
  "baitBoxesPlaced" TEXT,
  "poisonUsed" TEXT,
  "followUpDate" TIMESTAMPTZ,
  "internalNotes" TEXT,
  "productAmount" TEXT,
  "recommendation" TEXT,
  "startTime" TIMESTAMPTZ,
  "endTime" TIMESTAMPTZ,
  "status" TEXT DEFAULT 'open',
  "price" DECIMAL(10,2),
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
);

-- BaitStation table
CREATE TABLE IF NOT EXISTS "BaitStation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "logbookEntryId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "baitType" TEXT,
  "amount" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY ("logbookEntryId") REFERENCES "LogbookEntry"("id") ON DELETE CASCADE
);

-- LogbookEntryTechnician junction
CREATE TABLE IF NOT EXISTS "LogbookEntryTechnician" (
  "logbookEntryId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  PRIMARY KEY ("logbookEntryId", "technicianId"),
  FOREIGN KEY ("logbookEntryId") REFERENCES "LogbookEntry"("id") ON DELETE CASCADE,
  FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE
);

-- LogbookPhoto table
CREATE TABLE IF NOT EXISTS "LogbookPhoto" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "logbookEntryId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY ("logbookEntryId") REFERENCES "LogbookEntry"("id") ON DELETE CASCADE
);

-- Company updatedAt trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_updated_at BEFORE UPDATE
ON "Company" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
