-- ─────────────────────────────────────────────────────────────────────────────
-- Dated savings entry log.
--
-- savings_goals.current_amount previously only stored a running total with no
-- history of individual deposits. This adds a per-deposit log (date, amount,
-- optional note) so users can see their savings history build up over time,
-- following the same shape as salary_logs. current_amount remains a
-- denormalized cache updated alongside each entry (kept for the Home
-- dashboard's summed-total query), but the entries table is the source of
-- truth for history.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.savings_entries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id    UUID        NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  amount     NUMERIC     NOT NULL CHECK (amount > 0),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_entries_goal_id_idx ON public.savings_entries(goal_id);

ALTER TABLE public.savings_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_entries_select_own" ON public.savings_entries;
DROP POLICY IF EXISTS "savings_entries_insert_own" ON public.savings_entries;
DROP POLICY IF EXISTS "savings_entries_update_own" ON public.savings_entries;
DROP POLICY IF EXISTS "savings_entries_delete_own" ON public.savings_entries;

CREATE POLICY "savings_entries_select_own" ON public.savings_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_entries_insert_own" ON public.savings_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_entries_update_own" ON public.savings_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_entries_delete_own" ON public.savings_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Backfill: preserve existing balances as a single "Initial balance" entry per
-- goal so historical totals aren't lost when the log starts. Dated at the
-- goal's created_at so it sorts correctly alongside future deposits.
INSERT INTO public.savings_entries (user_id, goal_id, date, amount, note, created_at)
SELECT user_id, id, created_at::date, current_amount, 'Initial balance', created_at
FROM public.savings_goals
WHERE current_amount > 0;

NOTIFY pgrst, 'reload schema';
