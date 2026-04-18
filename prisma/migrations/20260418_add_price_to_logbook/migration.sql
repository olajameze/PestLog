-- Add price column to LogbookEntry for CLV calculations
ALTER TABLE "LogbookEntry" ADD COLUMN "price" NUMERIC(10, 2);
