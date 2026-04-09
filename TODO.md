# Certification Upload Implementation

## [ ] 1. Create pages/api/technicians/certifications.ts
POST: file upload to Supabase + Prisma Certification create.

## [ ] 2. Edit pages/dashboard.tsx
- Add CertificationUploadModal component.
- Button onClick → open modal w/ tech.id.
- List existing certs per tech.

## [ ] 3. Create Supabase bucket 'certifications-bucket' (public policies).

## [ ] 4. Deploy & test
npm run build
vercel --prod
Upload cert → shows in dashboard/reports.

## [ ] 5. Update TODO
