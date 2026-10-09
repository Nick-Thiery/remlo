import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const sourceFiles = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap((name) => {
  const path = `${dir}/${name}`
  return statSync(new URL(`../${path}`, import.meta.url)).isDirectory() ? sourceFiles(path) : /\.jsx?$/.test(name) ? [path] : []
})
// Applied in filename order, like the Supabase CLI.
const migrations = readdirSync(new URL('../supabase/migrations', import.meta.url))
  .filter((name) => name.endsWith('.sql')).sort()
  .map((name) => read(`supabase/migrations/${name}`))
const allMigrations = migrations.join('\n')

// The policies that exist after every migration has run: later CREATE and DROP
// statements replace earlier ones.
function finalPolicies() {
  const policies = new Map()
  const statement = /(CREATE|DROP)\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+public\.(\w+)([^;]*);/gi
  for (const sql of migrations) {
    for (const [, verb, name, table, body] of sql.matchAll(statement)) {
      const key = `${table}: ${name}`
      if (verb.toUpperCase() === 'DROP') policies.delete(key)
      else policies.set(key, { table, body })
    }
  }
  return policies
}

test('every upsert in the app has a unique constraint to match its onConflict columns', () => {
  const upserts = sourceFiles('src').flatMap((path) =>
    [...read(path).matchAll(/from\('(\w+)'\)\s*\.upsert\([\s\S]*?onConflict:\s*'([\w, ]+)'/g)]
      .map(([, table, cols]) => ({ path, table, cols: cols.split(',').map((c) => c.trim()).join(', ') })))
  assert.ok(upserts.some((u) => u.table === 'budgets'), 'expected the guest-data budgets upsert')
  for (const { path, table, cols } of upserts) {
    const esc = cols.replace(/[()]/g, '\\$&')
    const unique = new RegExp(
      `ALTER TABLE public\\.${table}\\s+ADD CONSTRAINT \\w+ UNIQUE \\(${esc}\\)` +
      `|CREATE UNIQUE INDEX[^;]*ON public\\.${table}\\s*\\(${esc}\\)`, 'i')
    assert.match(allMigrations, unique, `${path}: upsert on ${table}(${cols}) needs a unique constraint`)
  }
})

test('policies on user data check auth.uid() once per query and only for signed-in users', () => {
  const ownPolicies = [...finalPolicies()].filter(([, p]) => /auth\.uid\(\)/.test(p.body))
  assert.ok(ownPolicies.length >= 27, `expected the user-data policies, found ${ownPolicies.length}`)
  for (const [key, { body }] of ownPolicies) {
    assert.doesNotMatch(body.replace(/\(\s*SELECT\s+auth\.uid\(\)\s*\)/gi, ''), /auth\.uid\(\)/, `${key} calls auth.uid() per row`)
    assert.match(body, /\bTO\s+authenticated\b/i, `${key} should be TO authenticated`)
  }
})

test('scripts/test-rls.mjs covers every table that has a per-user policy', () => {
  const script = read('scripts/test-rls.mjs')
  const tested = new Set([...script.matchAll(/\{\s*table:\s*'(\w+)'/g)].map(([, t]) => t))
  const userTables = new Set([...finalPolicies().values()].filter((p) => /auth\.uid\(\)/.test(p.body)).map((p) => p.table))
  for (const table of userTables) assert.ok(tested.has(table), `add ${table} to TABLES in scripts/test-rls.mjs`)
})

test('a second budget insert from a double save becomes an update', () => {
  const budget = read('src/pages/Budget.jsx')
  assert.match(budget, /err\?\.code === '23505'[\s\S]{0,200}from\('budgets'\)\.update\(payload\)\.eq\('user_id', user\.id\)/)
})
