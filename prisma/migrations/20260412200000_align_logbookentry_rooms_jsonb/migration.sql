-- Align "LogbookEntry"."rooms" with Prisma Json (PostgreSQL JSONB) without dropping the column.

DO $$
DECLARE
  udt text;
BEGIN
  SELECT c.udt_name INTO udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'LogbookEntry'
    AND c.column_name = 'rooms';

  IF udt IS NULL THEN
    ALTER TABLE "LogbookEntry" ADD COLUMN "rooms" JSONB;
  ELSIF udt = 'jsonb' THEN
    RETURN;
  ELSE
    -- Default values are typed; drop before changing column type.
    ALTER TABLE "LogbookEntry" ALTER COLUMN "rooms" DROP DEFAULT;
    IF udt = 'json' THEN
      ALTER TABLE "LogbookEntry"
        ALTER COLUMN "rooms" TYPE JSONB USING "rooms"::jsonb;
    ELSIF udt = '_text' THEN
      ALTER TABLE "LogbookEntry"
        ALTER COLUMN "rooms" TYPE JSONB USING array_to_json("rooms")::jsonb;
    ELSE
      ALTER TABLE "LogbookEntry"
        ALTER COLUMN "rooms" TYPE JSONB USING "rooms"::jsonb;
    END IF;
  END IF;
END $$;
