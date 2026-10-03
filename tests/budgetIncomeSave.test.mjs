import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { onPageExit } from '../src/lib/pageExit.js'

const budgetPage = readFileSync(new URL('../src/pages/Budget.jsx', import.meta.url), 'utf8')

function target() {
  const listeners = {}
  return {
    addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn) },
    removeEventListener: (type, fn) => { listeners[type] = (listeners[type] ?? []).filter(f => f !== fn) },
    dispatch: (type) => { for (const fn of listeners[type] ?? []) fn() },
  }
}

function fakePage() {
  const page = { document: target(), window: target() }
  page.document.visibilityState = 'visible'
  page.setVisibility = (value) => { page.document.visibilityState = value; page.document.dispatch('visibilitychange') }
  return page
}

test('leaving the app (page hidden) runs the exit handler', () => {
  const page = fakePage()
  let runs = 0
  onPageExit(() => { runs++ }, page)
  page.setVisibility('hidden')
  assert.equal(runs, 1)
})

test('returning to the app does not run the exit handler', () => {
  const page = fakePage()
  let runs = 0
  onPageExit(() => { runs++ }, page)
  page.setVisibility('visible')
  assert.equal(runs, 0)
})

test('a reload or close without hiding first (pagehide) runs the exit handler', () => {
  const page = fakePage()
  let runs = 0
  onPageExit(() => { runs++ }, page)
  page.window.dispatch('pagehide')
  assert.equal(runs, 1)
})

test('after stopping, page exits no longer run the handler', () => {
  const page = fakePage()
  let runs = 0
  const stop = onPageExit(() => { runs++ }, page)
  stop()
  page.setVisibility('hidden')
  page.window.dispatch('pagehide')
  assert.equal(runs, 0)
})

test('Budget income is saved on Done/Enter, not only on blur', () => {
  assert.match(budgetPage, /onBlur=\{\(\) => saveBudget\(income, expenses\)\}\s*onKeyDown=\{\(e\) => \{ if \(e\.key === 'Enter'\) e\.target\.blur\(\) \}\}/)
})

test('an unsaved Budget income is saved when the page goes away or Budget unmounts', () => {
  assert.match(budgetPage, /onChange=\{\(e\) => \{ setIncome\(e\.target\.value\); incomeDirty\.current = true \}\}/)
  assert.match(budgetPage, /const stop = onPageExit\(flushUnsaved\)\s*return \(\) => \{ stop\(\); flushUnsaved\(\) \}/)
  assert.match(budgetPage, /if \(incomeDirty\.current\) saveBudget\(income, expenses\)/)
  // Any save writes the current income, so it clears the pending flag; a later
  // exit then cannot overwrite a newer expense list with an older one.
  assert.match(budgetPage, /async function saveBudget\(incomeVal, expensesVal\) \{\s*incomeDirty\.current = false/)
})

test('an open expense-amount edit is committed when the page goes away, before the income save', () => {
  assert.match(budgetPage, /if \(editingKey\) commitEdit\(editingKey\)\s*if \(incomeDirty\.current\)/)
})
