# Remlo

A free money app for migrant workers in Singapore, in 12 languages: savings, budget, remittance comparison, salary, loans and loan-shark warnings, scam alerts and a scam quiz, emergency contacts and an emergency fund, a banking guide, and an AI chat. Live at remloapp.com and on Google Play. People can use it as a guest (data stays on the device) or sign in (data in Supabase).

## Stack

- React 19, Vite 8, JavaScript with JSX (no TypeScript), React Router 7, Tailwind CSS 4. Pages are in `src/pages/`, shared code in `src/lib/`, routes in `src/App.jsx`.
- PWA through `vite-plugin-pwa`; registration in `src/lib/serviceWorker.js`.
- Supabase: Postgres with row-level security, Auth, and Edge Functions (Deno) in `supabase/functions/`: `chat` (calls the Anthropic API server-side, with rate limiting in `rateLimit.ts`), `delete-account`, `fetch-scam-alerts`. Schema changes are migrations in `supabase/migrations/`.
- Hosted on Vercel. `vercel.json` sets the security headers, including a Content-Security-Policy whose `connect-src` lists every host the app may call. A new host has to be added there or the browser blocks it.
- Guest mode keeps data in localStorage through `src/lib/safeStorage.js` (falls back to memory when storage is blocked) and moves it to Supabase on sign-in (`src/lib/migrateGuestData.js`).
- Analytics: PostHog, limited by `src/lib/analyticsPolicy.js`. Only the events and fields listed in `EVENT_FIELDS` leave the device. Never send amounts, names, phone numbers or message text.

## Commands

- `npm run dev`, `npm run build`, `npm run preview`
- `npm run lint`: ESLint
- `npm test`: `node --test tests/*.test.mjs`
- `npm run check:locales`: every language file against `en.json` (missing or extra keys, different `{{placeholders}}`)
- `node scripts/test-rls.mjs`: signs up two throwaway users and checks neither can read the other's rows. Needs `.env`, plus `SUPABASE_SERVICE_ROLE_KEY` set for that one command only.

## Rules

- Secrets: only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_POSTHOG_*` belong in client code, because every `VITE_` variable ships to the browser. `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CHAT_RATE_LIMIT_SALT` live only in Edge Function secrets. Never commit `.env`.
- Every table that holds a user's data has RLS enabled with policies in the same migration that creates it. Add a new user-owned table to `scripts/test-rls.mjs` too.
- Add a new migration for every schema change; never edit one that has been applied.
- Languages: `src/locales/*.json`, listed in `src/lib/languages.js` and loaded in `src/i18n.js`. English (`en.json`) is the source. A new string goes into `en.json` and all 11 other files, with the same `{{placeholders}}`. Missing strings fall back to English. Urdu (`ur`) is right to left (`RTL_LANGS` in `src/App.jsx`), so check layouts in it.

## Claude Code setup

- `.mcp.json` connects two servers. Each asks you to sign in the first time.
  - **supabase**: scoped to this project and read-only, with the database, debugging, docs and functions tools. It can read tables, logs and advisors but can't change data, apply migrations or deploy functions; do those with the Supabase CLI. After a migration is applied, run its `get_advisors` security check to catch missing RLS policies.
  - **vercel**: deployments and build logs. Confirm anything that deploys or changes project settings.
- `.claude/skills/` has Supabase's own skills, `supabase` and `supabase-postgres-best-practices` (copied from supabase-community/supabase-plugin 0.1.16, MIT). Use the Postgres one for every migration and RLS policy.
- `.claude/hooks/check_locale_edit.mjs` runs `npm run check:locales` after Claude edits a language file and shows Claude anything missing.
