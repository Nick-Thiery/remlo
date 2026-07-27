-- ─────────────────────────────────────────────────────────────────────────────
-- Dated budget expense entry log.
--
-- Unlike savings_goals, budget categories are NOT rows in a table — they
-- live as a JSONB array (budgets.expenses, shape {name, amount}) with no
-- stable per-category id; the "id" used client-side before this migration
-- was only a React render key, regenerated from array index on every load
-- and never persisted. Because there's no table to reference, this
-- migration cannot give budget_entries.category_id a real foreign key the
-- way savings_entries.goal_id references savings_goals(id). Instead:
--   1. Every existing category in every budgets.expenses array is given a
--      permanent id (gen_random_uuid()), written back into the jsonb.
--   2. category_id is a plain indexed UUID column (no FK constraint).
--      Cascade-on-delete when a category is removed is handled by the
--      application: Budget.jsx deletes matching budget_entries rows
--      whenever a category is removed.
--
-- "Spent so far" is derived, not cached: the app computes it client-side as
-- the sum of a category's entries within the current calendar month, so it
-- naturally resets each month without a cron job or stored cycle date. The
-- pre-existing `amount` field on each category keeps its old meaning (the
-- manually-set budgeted/limit figure) and is no longer treated as a
-- running actual-spend total — so summing entries into "spent" alongside
-- it does not double count.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.budget_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL,
  date        DATE        NOT NULL,
  amount      NUMERIC     NOT NULL CHECK (amount > 0),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS budget_entries_category_id_idx ON public.budget_entries(category_id);

ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_entries_select_own" ON public.budget_entries;
DROP POLICY IF EXISTS "budget_entries_insert_own" ON public.budget_entries;
DROP POLICY IF EXISTS "budget_entries_update_own" ON public.budget_entries;
DROP POLICY IF EXISTS "budget_entries_delete_own" ON public.budget_entries;

CREATE POLICY "budget_entries_select_own" ON public.budget_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budget_entries_insert_own" ON public.budget_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_entries_update_own" ON public.budget_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_entries_delete_own" ON public.budget_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Backfill: assign a permanent id to every existing category (writing it
-- back into budgets.expenses), and seed one "Initial amount" entry per
-- category that already has a non-zero amount, dated today. This keeps
-- "spent this month" from jumping to zero the moment this ships, without
-- double counting — see note above on why `amount` and summed entries are
-- independent numbers from here on.
DO $$
DECLARE
  b         RECORD;
  elem      JSONB;
  new_elems JSONB;
  elem_id   UUID;
  elem_amt  NUMERIC;
BEGIN
  FOR b IN SELECT id, user_id, expenses FROM public.budgets WHERE jsonb_array_length(expenses) > 0 LOOP
    new_elems := '[]'::jsonb;
    FOR elem IN SELECT * FROM jsonb_array_elements(b.expenses) LOOP
      IF elem ? 'id' THEN
        elem_id := (elem->>'id')::uuid;
      ELSE
        elem_id := gen_random_uuid();
        elem := elem || jsonb_build_object('id', elem_id::text);
      END IF;
      new_elems := new_elems || jsonb_build_array(elem);

      elem_amt := COALESCE((elem->>'amount')::numeric, 0);
      IF elem_amt > 0 THEN
        INSERT INTO public.budget_entries (user_id, category_id, date, amount, note)
        VALUES (b.user_id, elem_id, CURRENT_DATE, elem_amt, 'Initial amount');
      END IF;
    END LOOP;
    UPDATE public.budgets SET expenses = new_elems WHERE id = b.id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
