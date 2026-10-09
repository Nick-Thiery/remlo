import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LANGUAGES } from '../src/lib/languages.js'

// MOM: a licensed employment agency may charge a foreign worker no more than
// 1 month's fixed salary for each year of service, capped at 2 months' salary,
// and the fee is shown in the worker's In-Principle Approval (IPA) letter.
// https://www.mom.gov.sg/faq/employment-agencies/how-will-foreign-workers-know-the-amount-that-they-are-expected-to-pay-the-singapore-ea
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const fakeJob = (lang) => JSON.parse(read(`src/locales/${lang}.json`)).scams.alerts.find((a) => a.id === 'fake_job')

test('no language says agencies may not charge job seekers, or that any job fee is illegal', () => {
  const en = fakeJob('en')
  assert.doesNotMatch(en.description, /not allowed to charge/i)
  assert.doesNotMatch(en.whatToDo.join(' '), /any fee|illegal/i)
  for (const { code } of LANGUAGES) {
    const a = fakeJob(code)
    assert.match(a.whatToDo[0], /MOM/, `${code}: first step names MOM's cap`)
    assert.match(a.whatToDo[0], /IPA/, `${code}: first step points to the IPA letter`)
    assert.match(a.description, /IPA/, `${code}: description gives the fee cap and the IPA letter`)
  }
})

test('the scam alert function serves the corrected job alert and retires the old one', () => {
  const fn = read('supabase/functions/fetch-scam-alerts/index.ts')
  assert.match(fn, /id: 'alert_jobscam_002'/)
  assert.doesNotMatch(fn, /id: 'alert_jobscam_001'/)
  assert.doesNotMatch(fn, /illegal for employment agencies to charge/i)
  assert.match(fn, /update\(\{ is_active: false \}\)/)
  assert.match(read('src/pages/Scams.jsx'), /alert\.id !== 'alert_jobscam_001'/)
})
