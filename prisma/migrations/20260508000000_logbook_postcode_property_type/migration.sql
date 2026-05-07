-- Logbook: postcode + property type for intelligence + CLV client grouping
ALTER TABLE "LogbookEntry" ADD COLUMN IF NOT EXISTS "postcode" TEXT;
ALTER TABLE "LogbookEntry" ADD COLUMN IF NOT EXISTS "propertyType" TEXT;
