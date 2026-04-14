# PestTrek Fixes TODO

## Step 1: [TODO] Create TODO.md ✅ COMPLETED

## Step 2: [TODO] Update pages/dashboard.tsx ✅ COMPLETED
- [x] Add signedURL fetching for certifications in modal
- [x] Replace direct public URLs with signed download links 
- [x] Convert rooms input to dynamic form matching baitStations structure (add/remove rows with room name)
- [x] Update payload/save logic for room objects/array
- [x] Ensure image parsing/loader works with storage paths

## Step 3: [TODO] Update pages/technician.tsx ✅ COMPLETED
- [x] Consistent image signedURL handling if needed

## Step 4: [TODO] Test changes
- [ ] Verify cert downloads work (no 404)
- [ ] Check images display correctly
- [ ] Test dynamic rooms add/remove/save/display
- [ ] Test PDF export with new rooms structure

## Step 5: [TODO] Update storage policy if needed (manual via Supabase dashboard)
- [ ] Ensure logbook-photos bucket allows public reads OR use signed URLs everywhere

## Step 6: [TODO] attempt_completion

