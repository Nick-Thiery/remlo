-- Scam alerts table — populated by the fetch-scam-alerts Edge Function
CREATE TABLE IF NOT EXISTS public.scam_alerts (
  id           TEXT          PRIMARY KEY,
  title        TEXT          NOT NULL,
  type         TEXT          NOT NULL CHECK (type IN (
                               'jobScam','loanScam','phishing',
                               'impersonation','paymentScam','investmentScam'
                             )),
  severity     TEXT          NOT NULL DEFAULT 'medium' CHECK (severity IN (
                               'low','medium','high','critical'
                             )),
  description  TEXT          NOT NULL,
  what_to_do   JSONB         NOT NULL DEFAULT '[]',
  source       TEXT          NOT NULL,   -- e.g. 'SPF', 'MOM', 'MAS'
  source_url   TEXT,
  published_at TIMESTAMPTZ   NOT NULL,
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE
);

-- Public read-only; the Edge Function writes via service role
ALTER TABLE public.scam_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active alerts"
  ON public.scam_alerts FOR SELECT
  USING (is_active = TRUE);

-- Index to speed up the most common query pattern
CREATE INDEX IF NOT EXISTS scam_alerts_published_at_idx
  ON public.scam_alerts (published_at DESC);
