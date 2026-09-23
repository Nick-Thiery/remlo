-- Chat usage counters for server-side rate limiting (guests included).
--
-- One row per (bucket, time window). The Edge Function increments and checks
-- every bucket that applies to a request in a single atomic call, so two
-- requests arriving together cannot both slip past the limit.
--
-- Buckets: 'device' (guest device id), 'user' (signed-in user), 'legacy'
-- (guest on a build too old to send a device id, counted per hashed IP),
-- 'ip' (hashed IP backstop for shared dormitory wifi), 'global' (all guests)
-- and 'project' (every caller, the cost ceiling). IP addresses are stored
-- only as a salted hash, never in the clear.

CREATE TABLE IF NOT EXISTS public.chat_usage (
  scope         TEXT        NOT NULL,
  subject       TEXT        NOT NULL,
  window_kind   TEXT        NOT NULL CHECK (window_kind IN ('hour', 'day')),
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, subject, window_kind, window_start)
);

-- Only the service-role key (Edge Function) touches this table.
-- RLS on with no policies = no anon or authenticated access at all.
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_usage FROM anon, authenticated;

-- Supports the purge below; the primary key already serves the counter lookups.
CREATE INDEX IF NOT EXISTS chat_usage_window_start_idx
  ON public.chat_usage (window_start);

-- Atomically count one request against every bucket passed in, and report the
-- first bucket that is now over its limit.
--
-- p_checks: [{"scope":"device","subject":"…","window_kind":"hour","max":30}, …]
-- returns:  NULL when allowed, otherwise
--           {"scope":…,"window_kind":…,"max":…,"count":…,"reset_at":…}
CREATE OR REPLACE FUNCTION public.chat_usage_record(p_checks JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  chk          JSONB;
  v_window     TEXT;
  v_start      TIMESTAMPTZ;
  v_count      INTEGER;
  v_blocked    JSONB := NULL;
BEGIN
  IF jsonb_typeof(p_checks) <> 'array' THEN
    RAISE EXCEPTION 'p_checks must be a JSON array';
  END IF;

  FOR chk IN SELECT * FROM jsonb_array_elements(p_checks) LOOP
    v_window := chk->>'window_kind';
    IF v_window NOT IN ('hour', 'day') THEN
      RAISE EXCEPTION 'window_kind must be hour or day';
    END IF;

    v_start := date_trunc(v_window, NOW());

    INSERT INTO public.chat_usage AS u (scope, subject, window_kind, window_start, request_count, updated_at)
    VALUES (left(chk->>'scope', 32), left(chk->>'subject', 128), v_window, v_start, 1, NOW())
    ON CONFLICT (scope, subject, window_kind, window_start)
    DO UPDATE SET request_count = u.request_count + 1, updated_at = NOW()
    RETURNING u.request_count INTO v_count;

    IF v_blocked IS NULL AND v_count > (chk->>'max')::INTEGER THEN
      v_blocked := jsonb_build_object(
        'scope', chk->>'scope',
        'window_kind', v_window,
        'max', (chk->>'max')::INTEGER,
        'count', v_count,
        'reset_at', v_start + (CASE v_window WHEN 'hour' THEN INTERVAL '1 hour' ELSE INTERVAL '1 day' END)
      );
    END IF;
  END LOOP;

  -- Keep the table small without depending on pg_cron. Yesterday's windows are
  -- never read again, and this fires on roughly one request in a hundred.
  IF random() < 0.01 THEN
    DELETE FROM public.chat_usage WHERE window_start < NOW() - INTERVAL '2 days';
  END IF;

  RETURN v_blocked;
END;
$$;

-- The Edge Function calls this with the service-role key. Nobody else may.
-- The grant is explicit because revoking PUBLIC would otherwise take the
-- service role's own access with it wherever it inherited it from PUBLIC.
REVOKE ALL ON FUNCTION public.chat_usage_record(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_usage_record(JSONB) TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_usage TO service_role;

NOTIFY pgrst, 'reload schema';
