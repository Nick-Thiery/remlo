/**
 * RLS cross-user isolation test.
 *
 * Creates two throwaway test accounts, has User A insert one row into each
 * user-owned table, then attempts to read those rows as User B.
 * Every table must return 0 rows for User B.
 *
 * Cleans up all test data and both accounts when done.
 *
 * Usage:
 *   node scripts/test-rls.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * Requires SUPABASE_SERVICE_ROLE_KEY as an env var for cleanup
 *   (set it temporarily: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/test-rls.mjs)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Load env ──────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
)

const SUPABASE_URL      = env.VITE_SUPABASE_URL
const ANON_KEY          = env.VITE_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var (needed for cleanup)')
  console.error('Run as: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/test-rls.mjs')
  process.exit(1)
}

// ── Clients ───────────────────────────────────────────────────────────────────
const admin  = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const clientA = createClient(SUPABASE_URL, ANON_KEY)
const clientB = createClient(SUPABASE_URL, ANON_KEY)

// ── Helpers ───────────────────────────────────────────────────────────────────
const TS    = Date.now()
const EMAIL_A = `rls-test-a-${TS}@remlo-test.invalid`
const EMAIL_B = `rls-test-b-${TS}@remlo-test.invalid`
const PASS    = `RlsTest!${TS}`

let userAId = null
let userBId = null
const results = []
const insertedIds = {}  // table -> id, for targeted cleanup

function pass(table) {
  results.push({ table, status: '✅ PASS', detail: 'User B sees 0 rows (correctly blocked)' })
}
function fail(table, detail) {
  results.push({ table, status: '❌ FAIL', detail })
}

// ── Setup ──────────────────────────────────────────────────────────────────────
async function setup() {
  console.log('\n── Creating test accounts ───────────────────────────────────────')

  // Create User A via admin API so no email confirmation needed
  const { data: aData, error: aErr } = await admin.auth.admin.createUser({
    email: EMAIL_A, password: PASS, email_confirm: true,
  })
  if (aErr) throw new Error(`Failed to create User A: ${aErr.message}`)
  userAId = aData.user.id
  console.log(`User A created: ${EMAIL_A} (${userAId})`)

  const { data: bData, error: bErr } = await admin.auth.admin.createUser({
    email: EMAIL_B, password: PASS, email_confirm: true,
  })
  if (bErr) throw new Error(`Failed to create User B: ${bErr.message}`)
  userBId = bData.user.id
  console.log(`User B created: ${EMAIL_B} (${userBId})`)

  // Sign both clients in
  const { error: signInAErr } = await clientA.auth.signInWithPassword({ email: EMAIL_A, password: PASS })
  if (signInAErr) throw new Error(`User A sign-in failed: ${signInAErr.message}`)

  const { error: signInBErr } = await clientB.auth.signInWithPassword({ email: EMAIL_B, password: PASS })
  if (signInBErr) throw new Error(`User B sign-in failed: ${signInBErr.message}`)

  console.log('Both users authenticated.\n')
}

// ── Test runner ────────────────────────────────────────────────────────────────
async function testTable(table, insertPayload, selectColumns = 'id') {
  console.log(`── Testing ${table} ─────────────────────────────────────────────`)

  // Step 1: User A inserts a row
  const { data: inserted, error: insertErr } = await clientA
    .from(table)
    .insert({ ...insertPayload, user_id: userAId })
    .select(selectColumns)
    .single()

  if (insertErr) {
    fail(table, `User A INSERT failed: ${insertErr.message}`)
    console.log(`  INSERT by A: ❌ ${insertErr.message}`)
    return
  }
  insertedIds[table] = inserted.id
  console.log(`  INSERT by A: ✅ row created (id: ${inserted.id})`)

  // Step 2: User B attempts to read that specific row by ID
  const { data: bRows, error: selectErr } = await clientB
    .from(table)
    .select(selectColumns)
    .eq('id', inserted.id)

  if (selectErr) {
    // An error here means RLS blocked at the policy level — also a pass
    pass(table)
    console.log(`  SELECT by B: ✅ blocked with error (${selectErr.message})`)
    return
  }

  if (!bRows || bRows.length === 0) {
    pass(table)
    console.log(`  SELECT by B: ✅ returns 0 rows (RLS working)`)
  } else {
    fail(table, `User B can see ${bRows.length} row(s) belonging to User A — RLS NOT enforced`)
    console.log(`  SELECT by B: ❌ returned ${bRows.length} row(s) — CROSS-USER DATA LEAK`)
  }

  // Step 3: Also try a full table scan as B (no id filter) to catch any miss
  const { data: bAll } = await clientB
    .from(table)
    .select(selectColumns)
    .eq('user_id', userAId)  // explicit filter for A's rows

  const leaked = (bAll ?? []).length
  if (leaked > 0) {
    fail(table, `Explicit user_id filter: B sees ${leaked} of A's rows — RLS NOT enforced`)
    console.log(`  SCAN by B with user_id filter: ❌ ${leaked} row(s) leaked`)
  } else {
    console.log(`  SCAN by B (user_id=${userAId.slice(0,8)}…): ✅ 0 rows`)
  }
}

// ── Cleanup ────────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('\n── Cleanup ──────────────────────────────────────────────────────')

  // Delete test rows (in case RLS didn't cascade automatically on user delete)
  for (const [table, id] of Object.entries(insertedIds)) {
    await admin.from(table).delete().eq('id', id)
  }

  // Delete both test users (cascades all their rows via FK ON DELETE CASCADE)
  if (userAId) {
    const { error } = await admin.auth.admin.deleteUser(userAId)
    console.log(`Deleted User A: ${error ? '❌ ' + error.message : '✅'}`)
  }
  if (userBId) {
    const { error } = await admin.auth.admin.deleteUser(userBId)
    console.log(`Deleted User B: ${error ? '❌ ' + error.message : '✅'}`)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Remlo RLS Cross-User Isolation Test')
  console.log('═══════════════════════════════════════════════════════════════')

  try {
    await setup()

    await testTable('savings_goals', {
      name: 'RLS Test Goal',
      target: 100,
      saved: 0,
    })

    await testTable('budgets', {
      monthly_income: 1000,
      categories: [],
    })

    await testTable('salary_logs', {
      date: '2026-01-01',
      amount: 500,
      employer: 'RLS Test Employer',
    })

    await testTable('loans', {
      lender: 'RLS Test Lender',
      principal: 1000,
      interest_rate: 0,
      monthly_payment: 100,
    })

  } catch (err) {
    console.error('\nFatal error during test setup:', err.message)
  } finally {
    await cleanup()
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  Results')
  console.log('═══════════════════════════════════════════════════════════════')
  for (const r of results) {
    console.log(`  ${r.status}  ${r.table.padEnd(16)} ${r.detail}`)
  }

  const allPassed = results.length === 4 && results.every(r => r.status.startsWith('✅'))
  console.log(`\n  ${allPassed ? '✅ All 4 tables: RLS isolation confirmed.' : '❌ One or more tables failed — review above.'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')

  process.exit(allPassed ? 0 : 1)
}

main()
