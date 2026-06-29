-- Chat rate limiting table.
-- Each row = one message sent by a user.
-- The Edge Function counts rows in the last hour and blocks if >= 20.

CREATE TABLE public.chat_rate_limits (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the service-role key (Edge Function) writes here.
-- No direct user access at all.
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for fast per-user windowed queries
CREATE INDEX chat_rate_limits_user_window_idx
  ON public.chat_rate_limits (user_id, created_at DESC);

-- Auto-purge rows older than 2 hours to keep the table small.
-- Requires pg_cron extension (enable in Supabase dashboard → Database → Extensions).
-- If pg_cron is not available, rows will accumulate but queries remain fast via the index.
-- SELECT cron.schedule('purge-chat-rate-limits', '0 * * * *',
--   $$DELETE FROM public.chat_rate_limits WHERE created_at < NOW() - INTERVAL '2 hours'$$);

NOTIFY pgrst, 'reload schema';
