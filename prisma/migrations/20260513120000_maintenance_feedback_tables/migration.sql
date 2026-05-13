-- Maintenance tooling: error logs, webhook failures, suggestions, deletion feedback, offline queue staging, background job heartbeat, chemical_logs stub.

CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    stack TEXT,
    context JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON public.error_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_errors (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'stripe',
    event_type TEXT,
    stripe_event_id TEXT,
    payload JSONB,
    error_message TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retried_at TIMESTAMPTZ(6),
    CONSTRAINT webhook_errors_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS webhook_errors_created_at_idx ON public.webhook_errors (created_at DESC);

CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    suggestion TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT suggestions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS suggestions_ip_created_idx ON public.suggestions (ip_hash, created_at DESC);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suggestions_allow_anon_insert ON public.suggestions;
CREATE POLICY suggestions_allow_anon_insert ON public.suggestions
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS suggestions_deny_anon_select ON public.suggestions;
CREATE POLICY suggestions_deny_anon_select ON public.suggestions
    FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS suggestions_deny_authenticated_select ON public.suggestions;
CREATE POLICY suggestions_deny_authenticated_select ON public.suggestions
    FOR SELECT TO authenticated USING (false);

CREATE TABLE IF NOT EXISTS public.deletion_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT,
    reason TEXT NOT NULL,
    comment TEXT,
    deleted_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deletion_feedback_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS deletion_feedback_deleted_at_idx ON public.deletion_feedback (deleted_at DESC);

ALTER TABLE public.deletion_feedback ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.offline_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT offline_queue_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.background_job_runs (
    job_name TEXT NOT NULL,
    last_finished_at TIMESTAMPTZ(6),
    status TEXT,
    detail JSONB,
    CONSTRAINT background_job_runs_pkey PRIMARY KEY (job_name)
);

CREATE TABLE IF NOT EXISTS public.chemical_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chemical_logs_pkey PRIMARY KEY (id)
);
