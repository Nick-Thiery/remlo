-- ─────────────────────────────────────────────────────────────────────────────
-- RLS hardening for all user-owned data tables.
--
-- These tables may have been created in the dashboard without RLS.
-- This migration is idempotent: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── savings_goals ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  target     NUMERIC     NOT NULL CHECK (target > 0),
  saved      NUMERIC     NOT NULL DEFAULT 0 CHECK (saved >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_goals_select_own" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_insert_own" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_update_own" ON public.savings_goals;
DROP POLICY IF EXISTS "savings_goals_delete_own" ON public.savings_goals;

CREATE POLICY "savings_goals_select_own" ON public.savings_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert_own" ON public.savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update_own" ON public.savings_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_delete_own" ON public.savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- ── budgets ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.budgets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income NUMERIC    NOT NULL DEFAULT 0,
  categories    JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;

CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- ── salary_logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.salary_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  amount     NUMERIC     NOT NULL CHECK (amount > 0),
  employer   TEXT        NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.salary_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salary_logs_select_own" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_insert_own" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_update_own" ON public.salary_logs;
DROP POLICY IF EXISTS "salary_logs_delete_own" ON public.salary_logs;

CREATE POLICY "salary_logs_select_own" ON public.salary_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "salary_logs_insert_own" ON public.salary_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salary_logs_update_own" ON public.salary_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "salary_logs_delete_own" ON public.salary_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ── loans ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loans (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lender       TEXT        NOT NULL,
  principal    NUMERIC     NOT NULL CHECK (principal > 0),
  interest_rate NUMERIC    NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  monthly_payment NUMERIC  NOT NULL DEFAULT 0,
  paid_off     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loans_select_own" ON public.loans;
DROP POLICY IF EXISTS "loans_insert_own" ON public.loans;
DROP POLICY IF EXISTS "loans_update_own" ON public.loans;
DROP POLICY IF EXISTS "loans_delete_own" ON public.loans;

CREATE POLICY "loans_select_own" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loans_insert_own" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans_update_own" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans_delete_own" ON public.loans
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS verification test (run in the SQL editor logged in as a specific user,
-- or via a test script using two different user JWTs).
--
-- Expected: User A's JWT can only see rows where user_id = A's UUID.
-- Attempting to read user B's rows returns 0 results, not an error.
--
-- Quick sanity check (run as a real user via the API):
--
--   const { data } = await supabase.from('savings_goals').select('*')
--   -- Returns ONLY rows owned by the authenticated user.
--   -- No filter needed — RLS enforces it automatically.
--
-- Cross-user probe (should return empty):
--
--   const OTHER_USER_ID = 'paste-user-b-uuid-here'
--   const { data } = await supabase
--     .from('savings_goals')
--     .select('*')
--     .eq('user_id', OTHER_USER_ID)
--   -- Must return [] even with an explicit filter for another user's ID.
-- ─────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
