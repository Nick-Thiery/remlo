-- ─────────────────────────────────────────────────────────────────────────────
-- Clean up row-level security on the user data tables, index user_id, and make
-- budgets one row per user.
--
-- Fixes the Supabase advisor findings of 2026-10-09:
--   * multiple_permissive_policies: budgets, loans, salary_logs and
--     savings_goals each still had a "Users can manage their own …" FOR ALL
--     policy from the dashboard on top of the per-action *_own policies from
--     20260629000001. Both allowed exactly the same rows, so Postgres checked
--     two policies on every row for nothing. The dashboard ones are dropped.
--   * auth_rls_initplan: policies called auth.uid() once per row. They now use
--     (select auth.uid()), which Postgres evaluates once per query.
--   * unindexed_foreign_keys: every table is read by user_id, which had no index.
--   * function_search_path_mutable: chat_usage_record now runs with an empty
--     search_path (it already names public.chat_usage in full).
--
-- Access does not change: a signed-in user can still read, add, change and
-- delete only their own rows, and a profile only for their own id. Policies are
-- now scoped TO authenticated; anon already matched nothing, because
-- auth.uid() is null without a signed-in user. The Edge Functions use the
-- service role, which bypasses RLS.
--
-- budgets: the app keeps one budget per user (Budget.jsx reads it with
-- maybeSingle, and migrateGuestData.js upserts with onConflict 'user_id'), but
-- nothing enforced it. The upsert needs a unique constraint on user_id and
-- failed without one, so a guest's budget never moved to their account on
-- sign-in. One account had two identical rows from a double save. Exact
-- duplicates are removed first, keeping the most recently updated copy; if a
-- user has two budgets that differ, the migration stops before changing
-- anything so they can be merged by hand.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── budgets: one row per user ────────────────────────────────────────────────

DELETE FROM public.budgets AS older
USING public.budgets AS newer
WHERE newer.user_id = older.user_id
  AND newer.id <> older.id
  AND newer.income IS NOT DISTINCT FROM older.income
  AND newer.expenses IS NOT DISTINCT FROM older.expenses
  AND (COALESCE(newer.updated_at, '-infinity'), newer.id)
    > (COALESCE(older.updated_at, '-infinity'), older.id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.budgets
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'A user has more than one budgets row with different contents. Merge them by hand, then apply this migration again.';
  END IF;
END $$;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_user_id_key UNIQUE (user_id);

-- ── Indexes on user_id, matching how each page reads and sorts ───────────────

CREATE INDEX IF NOT EXISTS savings_goals_user_id_created_at_idx
  ON public.savings_goals (user_id, created_at);
CREATE INDEX IF NOT EXISTS savings_entries_user_id_date_idx
  ON public.savings_entries (user_id, date);
CREATE INDEX IF NOT EXISTS budget_entries_user_id_date_idx
  ON public.budget_entries (user_id, date);
CREATE INDEX IF NOT EXISTS salary_logs_user_id_date_idx
  ON public.salary_logs (user_id, date);
CREATE INDEX IF NOT EXISTS loans_user_id_start_date_idx
  ON public.loans (user_id, start_date);

-- ── Policies ─────────────────────────────────────────────────────────────────

-- savings_goals
DROP POLICY IF EXISTS "Users can manage their own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_select_own" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_insert_own" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_update_own" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_delete_own" ON public.savings_goals;

CREATE POLICY "savings_goals_select_own" ON public.savings_goals
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "savings_goals_insert_own" ON public.savings_goals
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "savings_goals_update_own" ON public.savings_goals
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "savings_goals_delete_own" ON public.savings_goals
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- savings_entries
DROP POLICY IF EXISTS "savings_entries_select_own" ON public.savings_entries;
DROP POLICY IF EXISTS "savings_entries_insert_own" ON public.savings_entries;
DROP POLICY IF EXISTS "savings_entries_update_own" ON public.savings_entries;
DROP POLICY IF EXISTS "savings_entries_delete_own" ON public.savings_entries;

CREATE POLICY "savings_entries_select_own" ON public.savings_entries
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "savings_entries_insert_own" ON public.savings_entries
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "savings_entries_update_own" ON public.savings_entries
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "savings_entries_delete_own" ON public.savings_entries
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- budgets
DROP POLICY IF EXISTS "Users can manage their own budget" ON public.budgets;
DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;

CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- budget_entries
DROP POLICY IF EXISTS "budget_entries_select_own" ON public.budget_entries;
DROP POLICY IF EXISTS "budget_entries_insert_own" ON public.budget_entries;
DROP POLICY IF EXISTS "budget_entries_update_own" ON public.budget_entries;
DROP POLICY IF EXISTS "budget_entries_delete_own" ON public.budget_entries;

CREATE POLICY "budget_entries_select_own" ON public.budget_entries
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "budget_entries_insert_own" ON public.budget_entries
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "budget_entries_update_own" ON public.budget_entries
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "budget_entries_delete_own" ON public.budget_entries
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- salary_logs
DROP POLICY IF EXISTS "Users can manage their own salary logs" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_select_own" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_insert_own" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_update_own" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_delete_own" ON public.salary_logs;

CREATE POLICY "salary_logs_select_own" ON public.salary_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "salary_logs_insert_own" ON public.salary_logs
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "salary_logs_update_own" ON public.salary_logs
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "salary_logs_delete_own" ON public.salary_logs
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- loans
DROP POLICY IF EXISTS "Users can manage their own loans" ON public.loans;
DROP POLICY IF EXISTS "loans_select_own" ON public.loans;
DROP POLICY IF EXISTS "loans_insert_own" ON public.loans;
DROP POLICY IF EXISTS "loans_update_own" ON public.loans;
DROP POLICY IF EXISTS "loans_delete_own" ON public.loans;

CREATE POLICY "loans_select_own" ON public.loans
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "loans_insert_own" ON public.loans
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "loans_update_own" ON public.loans
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "loans_delete_own" ON public.loans
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- profiles (keyed by id, the user's own auth id; no delete policy, as before:
-- a profile goes when its auth user is deleted, through ON DELETE CASCADE)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- ── chat_usage_record: fixed search_path ─────────────────────────────────────

ALTER FUNCTION public.chat_usage_record(JSONB) SET search_path = '';

NOTIFY pgrst, 'reload schema';
