-- Drop and cleanly recreate scam_alerts so PostgREST cache is guaranteed fresh.
-- Run this in the Supabase SQL Editor, then redeploy the fetch-scam-alerts function.

DROP TABLE IF EXISTS public.scam_alerts;

CREATE TABLE public.scam_alerts (
  id           TEXT          PRIMARY KEY,
  title        TEXT          NOT NULL,
  type         TEXT          NOT NULL,
  severity     TEXT          NOT NULL DEFAULT 'medium',
  description  TEXT          NOT NULL,
  what_to_do   JSONB         NOT NULL DEFAULT '[]',
  source       TEXT          NOT NULL,
  source_url   TEXT,
  published_at TIMESTAMPTZ   NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE
);

ALTER TABLE public.scam_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active alerts"
  ON public.scam_alerts FOR SELECT
  USING (is_active = TRUE);

CREATE INDEX scam_alerts_published_at_idx
  ON public.scam_alerts (published_at DESC);

-- Tell PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
