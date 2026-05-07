-- PestTrace Intelligence — anonymised analytics store (run via prisma db execute against DIRECT_URL).
CREATE TABLE IF NOT EXISTS public.intelligence_pest_event (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_fingerprint TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL,
  pest_type TEXT NOT NULL,
  infestation_severity TEXT NOT NULL,
  property_type TEXT NOT NULL,
  postcode_area TEXT,
  geo_lat_rounded DOUBLE PRECISION,
  geo_lng_rounded DOUBLE PRECISION,
  treatment_method TEXT NOT NULL,
  treatment_outcome TEXT NOT NULL,
  revisit_required BOOLEAN NOT NULL DEFAULT false,
  environmental_factors JSONB,
  activity_score INTEGER NOT NULL DEFAULT 0,
  season TEXT,
  treatment_effectiveness TEXT,
  environmental_risk_score INTEGER,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intelligence_pest_event_occurred_at_idx ON public.intelligence_pest_event (occurred_at);
CREATE INDEX IF NOT EXISTS intelligence_pest_event_pest_type_idx ON public.intelligence_pest_event (pest_type);
CREATE INDEX IF NOT EXISTS intelligence_pest_event_postcode_area_idx ON public.intelligence_pest_event (postcode_area);
CREATE INDEX IF NOT EXISTS intelligence_pest_event_treatment_outcome_idx ON public.intelligence_pest_event (treatment_outcome);
CREATE INDEX IF NOT EXISTS intelligence_pest_event_property_type_idx ON public.intelligence_pest_event (property_type);

CREATE TABLE IF NOT EXISTS public.intelligence_audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intelligence_audit_log_created_at_idx ON public.intelligence_audit_log (created_at);
