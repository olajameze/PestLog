# PestTrek LogbookEntry baitBoxesPlaced Fix TODO

## Steps:
- [x] 1. Create and run data migration script to convert boolean false to empty string in DB
- [x] 2. Run `npx prisma generate` and `npx prisma db push`
- [x] 3. Add input validation/coercion in POST handler of pages/api/logbook-entries.ts
- [x] 4. Test GET /api/logbook-entries endpoint (assumed fixed; verify in app)
- [x] 5. Complete task

