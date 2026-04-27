-- Translation cache for scam alerts.
-- Each (alert_id, language) pair is stored once so the Anthropic API
-- is only called the first time a language is requested.

CREATE TABLE public.scam_alert_translations (
  alert_id                TEXT        NOT NULL REFERENCES public.scam_alerts(id) ON DELETE CASCADE,
  language                TEXT        NOT NULL,
  translated_title        TEXT        NOT NULL,
  translated_description  TEXT        NOT NULL,
  translated_what_to_do   JSONB       NOT NULL DEFAULT '[]',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (alert_id, language)
);

ALTER TABLE public.scam_alert_translations ENABLE ROW LEVEL SECURITY;

-- Edge function uses the service-role key and bypasses RLS.
-- Anonymous/authenticated users have no direct access.

CREATE INDEX scam_alert_translations_language_idx
  ON public.scam_alert_translations (language);

NOTIFY pgrst, 'reload schema';
