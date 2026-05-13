-- Business admin signup emails for marketing / outreach (captured after OTP verification).
CREATE TABLE IF NOT EXISTS "signup_marketing_lead" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "full_name" TEXT,
  "business_name" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "signup_marketing_lead_email_key" ON "signup_marketing_lead" ("email");
CREATE INDEX IF NOT EXISTS "signup_marketing_lead_created_at_idx" ON "signup_marketing_lead" ("created_at");
