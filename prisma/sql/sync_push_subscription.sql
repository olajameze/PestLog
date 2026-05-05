-- Push subscription storage for Web Push (PWA). Safe to run if table already exists.
CREATE TABLE IF NOT EXISTS "public"."PushSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_email_idx" ON "public"."PushSubscription"("email");
