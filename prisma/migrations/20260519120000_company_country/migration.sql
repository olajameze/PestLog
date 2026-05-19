-- Add country code to Company for reliable locale/form detection.
-- Stores the ISO 3166-1 alpha-2 code set by the company owner (e.g. "IN", "GB").
-- Used as the authoritative source on the technician logbook form, replacing
-- unreliable browser locale/timezone detection.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "country" TEXT;
