/**
 * RLS cross-user isolation test.
 *
 * Creates two throwaway accounts. User A adds one row to every user-owned
 * table; then User B, and a visitor who is not signed in, try to read, change,
 * delete and add rows in A's name. Every attempt must be refused or match
 * nothing, and A's rows must be unchanged afterwards. A must still be able to
 * change and delete their own rows, and keeps a single budget.
 *
 * Cleans up all test data and both accounts when done.
 *
 * Usage:
 *   node scripts/test-rls.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * Requires SUPABASE_SERVICE_ROLE_KEY as an env var for setup and cleanup
 *   (set it temporarily: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/test-rls.mjs)
 *
 * Add every new user-owned table to TABLES below.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ── Load env ──────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SUPABASE_URL     = env.VITE_SUPABASE_URL
const ANON_KEY         = env.VITE_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var (needed for setup and cleanup)')
  console.error('Run as: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/test-rls.mjs')
  process.exit(1)
}

// ── Clients ───────────────────────────────────────────────────────────────────
const noSession = { auth: { autoRefreshToken: false, persistSession: false } }
const admin   = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, noSession)
const clientA = createClient(SUPABASE_URL, ANON_KEY, noSession)
const clientB = createClient(SUPABASE_URL, ANON_KEY, noSession)
const visitor = createClient(SUPABASE_URL, ANON_KEY, noSession)

// ── Tables ────────────────────────────────────────────────────────────────────
// owner: the column holding the user's id. row(userId): a valid new row.
// change: a harmless update used to test UPDATE.
let goalAId = null
const TABLES = [
  { table: 'profiles', owner: 'id',
    row: (u) => ({ id: u, preferred_name: 'RLS Test' }),
    change: { preferred_name: 'changed' } },
  { table: 'savings_goals', owner: 'user_id',
    row: (u) => ({ user_id: u, name: 'RLS Test Goal', target_amount: 100, current_amount: 0 }),
    change: { name: 'changed' } },
  { table: 'savings_entries', owner: 'user_id',
    row: (u) => ({ user_id: u, goal_id: goalAId, date: '2026-01-01', amount: 5, note: 'RLS test' }),
    change: { note: 'changed' } },
  { table: 'budgets', owner: 'user_id',
    row: (u) => ({ user_id: u, income: 1000, expenses: [] }),
    change: { expenses: [{ id: '00000000-0000-0000-0000-000000000000', name: 'changed', amount: 1 }] } },
  { table: 'budget_entries', owner: 'user_id',
    row: (u) => ({ user_id: u, category_id: '00000000-0000-0000-0000-000000000000', date: '2026-01-01', amount: 5, note: 'RLS test' }),
    change: { note: 'changed' } },
  { table: 'salary_logs', owner: 'user_id',
    row: (u) => ({ user_id: u, date: '2026-01-01', amount: 500, employer: 'RLS Test Employer' }),
    change: { notes: 'changed' } },
  { table: 'loans', owner: 'user_id',
    row: (u) => ({ user_id: u, lender: 'RLS Test Lender', total_amount: 1000, interest_rate: 0, monthly_payment: 100 }),
    change: { lender: 'changed' } },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const TS      = Date.now()
const EMAIL_A = `rls-test-a-${TS}@remlo-test.invalid`
const EMAIL_B = `rls-test-b-${TS}@remlo-test.invalid`
const PASS    = `RlsTest!${TS}`

let userAId = null
let userBId = null
const results = []
const check = (table, name, ok, detail = '') => {
  results.push({ table, name, ok, detail })
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` (${detail})` : ''}`)
}
// Refused outright, or matched no rows: both mean the attempt did nothing.
const didNothing = ({ data, error }) => !!error || (Array.isArray(data) && data.length === 0)
const describe = ({ data, error }) => (error ? `refused: ${error.code || error.message}` : `${data?.length ?? 0} row(s)`)

// ── Setup ─────────────────────────────────────────────────────────────────────
async function setup() {
  console.log('\n── Creating test accounts ───────────────────────────────────────')
  for (const [email, set] of [[EMAIL_A, (id) => { userAId = id }], [EMAIL_B, (id) => { userBId = id }]]) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true })
    if (error) throw new Error(`Failed to create ${email}: ${error.message}`)
    set(data.user.id)
  }
  for (const [client, email] of [[clientA, EMAIL_A], [clientB, EMAIL_B]]) {
    const { error } = await client.auth.signInWithPassword({ email, password: PASS })
    if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  }
  console.log(`User A: ${userAId}\nUser B: ${userBId}\nBoth signed in.`)
}

// ── Per-table test ────────────────────────────────────────────────────────────
async function testTable({ table, owner, row, change }) {
  console.log(`\n── ${table} ─────────────────────────────────────────────`)

  const ins = await clientA.from(table).insert(row(userAId)).select().single()
  check(table, 'A adds own row', !ins.error, ins.error?.message)
  if (ins.error) return
  const rowA = ins.data
  if (table === 'savings_goals') goalAId = rowA.id
  const key = 'id'
  const snapshot = JSON.stringify(rowA)

  const readById   = await clientB.from(table).select('*').eq(key, rowA[key])
  const readByUser = await clientB.from(table).select('*').eq(owner, userAId)
  const readAnon   = await visitor.from(table).select('*').eq(owner, userAId)
  check(table, "B can't read A's row by id", didNothing(readById), describe(readById))
  check(table, "B can't read A's rows by user", didNothing(readByUser), describe(readByUser))
  check(table, "visitor can't read A's rows", didNothing(readAnon), describe(readAnon))

  const updB = await clientB.from(table).update(change).eq(key, rowA[key]).select()
  const delB = await clientB.from(table).delete().eq(key, rowA[key]).select()
  const updV = await visitor.from(table).update(change).eq(key, rowA[key]).select()
  const delV = await visitor.from(table).delete().eq(key, rowA[key]).select()
  check(table, "B can't change A's row", didNothing(updB), describe(updB))
  check(table, "B can't delete A's row", didNothing(delB), describe(delB))
  check(table, "visitor can't change A's row", didNothing(updV), describe(updV))
  check(table, "visitor can't delete A's row", didNothing(delV), describe(delV))

  const after = await admin.from(table).select('*').eq(key, rowA[key]).single()
  check(table, "A's row is unchanged", !after.error && JSON.stringify(after.data) === snapshot)

  // Adding a row in A's name. profiles and budgets already have A's row, so a
  // duplicate key is also acceptable there; what matters is that nothing is added.
  const insB = await clientB.from(table).insert(row(userAId)).select()
  const insV = await visitor.from(table).insert(row(userAId)).select()
  check(table, "B can't add a row as A", !!insB.error, describe(insB))
  check(table, "visitor can't add a row as A", !!insV.error, describe(insV))

  const updA = await clientA.from(table).update(change).eq(key, rowA[key]).select()
  check(table, 'A can change own row', !updA.error && updA.data?.length === 1, describe(updA))

  if (table === 'budgets') {
    const second = await clientA.from(table).insert(row(userAId)).select()
    check(table, 'A keeps a single budget (second insert refused)', second.error?.code === '23505', describe(second))
    const upsert = await clientA.from(table).upsert({ user_id: userAId, income: 1200, expenses: [] }, { onConflict: 'user_id' }).select()
    check(table, 'A can upsert own budget on user_id (guest data migration)', !upsert.error && upsert.data?.length === 1, describe(upsert))
  }

  // Delete last: savings_entries need A's goal, and profiles keep A signed up.
  if (table !== 'savings_goals' && table !== 'profiles') {
    const delA = await clientA.from(table).delete().eq(key, rowA[key]).select()
    check(table, 'A can delete own row', !delA.error && delA.data?.length === 1, describe(delA))
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup() {
  console.log('\n── Cleanup ──────────────────────────────────────────────────────')
  // Deleting the users removes all their rows (ON DELETE CASCADE).
  for (const [label, id] of [['A', userAId], ['B', userBId]]) {
    if (!id) continue
    const { error } = await admin.auth.admin.deleteUser(id)
    console.log(`Deleted User ${label}: ${error ? '❌ ' + error.message : '✅'}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Remlo RLS Cross-User Isolation Test')
  console.log('═══════════════════════════════════════════════════════════════')

  let fatal = null
  try {
    await setup()
    for (const t of TABLES) await testTable(t)
    if (goalAId) {
      const delGoal = await clientA.from('savings_goals').delete().eq('id', goalAId).select()
      check('savings_goals', 'A can delete own row', !delGoal.error && delGoal.data?.length === 1, describe(delGoal))
    }
  } catch (err) {
    fatal = err
    console.error('\nFatal error:', err.message)
  } finally {
    await cleanup()
  }

  const failed = results.filter(r => !r.ok)
  const tablesTested = new Set(results.map(r => r.table)).size
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log(`  ${results.length - failed.length}/${results.length} checks passed across ${tablesTested}/${TABLES.length} tables`)
  for (const r of failed) console.log(`  ❌ ${r.table}: ${r.name}${r.detail ? ` (${r.detail})` : ''}`)
  const allPassed = !fatal && failed.length === 0 && tablesTested === TABLES.length
  console.log(`  ${allPassed ? '✅ RLS isolation confirmed.' : '❌ Review the failures above.'}`)
  console.log('═══════════════════════════════════════════════════════════════\n')
  process.exit(allPassed ? 0 : 1)
}

main()
