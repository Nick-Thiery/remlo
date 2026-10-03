import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const budgetPage = read('src/pages/Budget.jsx')
const salaryPage = read('src/pages/Salary.jsx')
const LOCALES = ['en', 'ta', 'hi', 'bn', 'my', 'si', 'fil', 'id', 'zh', 'th', 'ur', 'ne']
const NEW_KEYS = ['receivedThisMonthLabel', 'receivedMore', 'receivedLess', 'addIncomeBtn', 'addIncomeTitle',
  'addIncomeDesc', 'seeSalaryHistory', 'errorFutureIncomeDate', 'errorIncomeFrom']

test('income received uses the Salary Tracker store, so pay logged on either page shows on both', () => {
  // Guest: the same localStorage key the Salary page reads and writes.
  assert.match(salaryPage, /'remlo_guest_salary'/)
  assert.match(budgetPage, /setPayments\(JSON\.parse\(safeStorage\.getItem\('remlo_guest_salary'\) \|\| '\[\]'\)\)/)
  // Signed in: the existing salary_logs table, so no migration is needed.
  assert.match(budgetPage, /supabase\.from\('salary_logs'\)\.select\('id, date, amount, employer'\)\.eq\('user_id', user\.id\)/)
  assert.match(budgetPage, /\.from\('salary_logs'\)\s*\.insert\(\{ user_id: user\.id, date: incDate, amount, employer, notes: note \|\| null \}\)/)
})

test('a guest income entry has the Salary page\'s shape and keeps existing entries', () => {
  // Salary's own guest entries: { id: Date.now(), date, amount, employer, note }, newest first.
  assert.match(salaryPage, /\{ id: Date\.now\(\), date: fDate, amount: amt, employer: fEmployer\.trim\(\), note: fNote\.trim\(\) \}/)
  assert.match(budgetPage, /const stored = JSON\.parse\(safeStorage\.getItem\('remlo_guest_salary'\) \|\| '\[\]'\)\s*const updated = \[\{ id: Date\.now\(\), date: incDate, amount, employer, note \}, \.\.\.stored\]/)
})

test('income received sits beside the plan: Left Over and the guide still use planned income', () => {
  assert.match(budgetPage, /const remaining = Math\.max\(monthlyIncome - totalExpenses, 0\)/)
  assert.match(budgetPage, /needs: monthlyIncome \* 0\.5/)
  assert.doesNotMatch(budgetPage, /remaining = [^\n]*receivedThisMonth/)
})

test('received this month counts only this calendar month, by local date string', () => {
  assert.match(budgetPage, /const receivedThisMonth = payments\s*\.filter\(p => isCurrentMonth\(p\.date\)\)/)
})

test('a future payment date and a missing payer are rejected', () => {
  assert.match(budgetPage, /if \(incDate > toYYYYMMDD\(new Date\(\)\)\) return setIncError\(t\('budget\.errorFutureIncomeDate'\)\)/)
  assert.match(budgetPage, /if \(!employer\) return setIncError\(t\('budget\.errorIncomeFrom'\)\)/)
})

test('every income-received string exists and is translated in all 12 languages', () => {
  const english = JSON.parse(read('src/locales/en.json')).budget
  for (const code of LOCALES) {
    const budget = JSON.parse(read(`src/locales/${code}.json`)).budget
    for (const key of [...NEW_KEYS, 'incomeHint']) {
      assert.ok(typeof budget[key] === 'string' && budget[key].trim(), `${code}.${key}`)
      if (code !== 'en') assert.notEqual(budget[key], english[key], `${code}.${key} is untranslated`)
    }
    for (const key of ['receivedMore', 'receivedLess']) assert.match(budget[key], /\{\{amount\}\}/, `${code}.${key}`)
  }
})
