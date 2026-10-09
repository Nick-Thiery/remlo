import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseRequest, pickOption, shapeQuote, QuoteCache, Throttle, DESTINATIONS } from '../supabase/functions/wise-quote/quote.ts'

// Real Wise responses for S$500 (9–10 Oct 2026), trimmed to the fields used.
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const inr = fixture('wise-quote-sgd-inr.json')
const mmk = fixture('wise-quote-sgd-mmk.json')
const now = new Date('2026-10-10T03:00:00Z')

test('accepts Remlo destination currencies and sensible amounts only', () => {
  assert.deepEqual(parseRequest({ targetCurrency: 'INR', sourceAmount: 500 }), { ok: true, value: { targetCurrency: 'INR', sourceAmount: 500 } })
  assert.deepEqual(parseRequest({ targetCurrency: 'PHP', sourceAmount: '250.555' }).value, { targetCurrency: 'PHP', sourceAmount: 250.56 })
  for (const bad of [null, {}, { targetCurrency: 'USD', sourceAmount: 500 }, { targetCurrency: 'INR', sourceAmount: 0 },
    { targetCurrency: 'INR', sourceAmount: 20001 }, { targetCurrency: 'INR', sourceAmount: 'abc' }, { targetCurrency: 'INR', sourceAmount: Infinity }]) {
    assert.equal(parseRequest(bad).ok, false, JSON.stringify(bad))
  }
  assert.equal(DESTINATIONS.length, 10)
})

test('uses the PayNow quote into a bank account, not a card pay-in', () => {
  const o = pickOption(inr.paymentOptions)
  assert.equal(o.payIn, 'PAYNOW')
  assert.equal(o.payOut, 'BANK_TRANSFER')
  assert.equal(pickOption(inr.paymentOptions.filter((x) => x.payIn !== 'PAYNOW')).payIn, 'BANK_TRANSFER')
  assert.equal(pickOption(inr.paymentOptions.filter((x) => !['PAYNOW', 'BANK_TRANSFER'].includes(x.payIn))), null)
  assert.equal(pickOption(inr.paymentOptions.map((x) => ({ ...x, disabled: true }))), null)
})

test('shapes a live quote: what the family gets, the fee, the rate and when it was retrieved', () => {
  const q = shapeQuote(200, inr, { targetCurrency: 'INR', sourceAmount: 500 }, now)
  const paynow = inr.paymentOptions.find((x) => x.payIn === 'PAYNOW')
  assert.equal(q.supported, true)
  assert.equal(q.received, paynow.targetAmount)
  assert.equal(q.fee, paynow.fee.total)
  assert.equal(q.rate, inr.rate)
  assert.equal(q.payIn, 'PAYNOW')
  assert.equal(q.retrievedAt, new Date(inr.createdTime).toISOString())
  assert.equal(q.estimatedDelivery, paynow.estimatedDelivery)
})

test('Myanmar is "not available from Wise", not an error', () => {
  assert.deepEqual(shapeQuote(422, mmk, { targetCurrency: 'MMK', sourceAmount: 500 }, now), { supported: false, provider: 'wise', targetCurrency: 'MMK' })
})

test('anything unexpected gives no quote, so the app keeps its estimate', () => {
  const req = { targetCurrency: 'INR', sourceAmount: 500 }
  assert.equal(shapeQuote(500, inr, req, now), null)
  assert.equal(shapeQuote(200, null, req, now), null)
  assert.equal(shapeQuote(200, { ...inr, rate: undefined }, req, now), null)
  assert.equal(shapeQuote(200, inr, { targetCurrency: 'PHP', sourceAmount: 500 }, now), null)
  assert.equal(shapeQuote(200, { ...inr, paymentOptions: [] }, req, now), null)
})

test('a quote is reused for 60 seconds, then fetched again', () => {
  const cache = new QuoteCache(60_000, 2)
  const req = { targetCurrency: 'INR', sourceAmount: 500 }
  const q = shapeQuote(200, inr, req, now)
  cache.set(req, q, 0)
  assert.equal(cache.get(req, 59_999), q)
  assert.equal(cache.get(req, 60_000), null)
  cache.set({ targetCurrency: 'INR', sourceAmount: 1 }, q, 0)
  cache.set({ targetCurrency: 'INR', sourceAmount: 2 }, q, 0)
  cache.set({ targetCurrency: 'INR', sourceAmount: 3 }, q, 0)
  assert.equal(cache.get({ targetCurrency: 'INR', sourceAmount: 1 }, 1), null, 'oldest entry dropped when full')
})

test('one caller is limited to 30 quotes a minute', () => {
  const t = new Throttle(30, 60_000)
  for (let i = 0; i < 30; i++) assert.equal(t.allow('a', i), true)
  assert.equal(t.allow('a', 30), false)
  assert.equal(t.allow('b', 30), true, 'other callers unaffected')
  assert.equal(t.allow('a', 60_001), true, 'allowed again after a minute')
})

// ── The Remittance page ───────────────────────────────────────────────────────
import { speedLabelFor, singaporeTime, WISE_UNSUPPORTED } from '../src/lib/wiseQuote.js'

test('Wise delivery estimates map to the app\'s translated speed labels', () => {
  const now = new Date('2026-10-10T03:00:00Z')
  const at = (h) => new Date(now.getTime() + h * 3_600_000).toISOString()
  assert.deepEqual(speedLabelFor(at(0.01), now), ['remittance.speedInstant'])
  assert.deepEqual(speedLabelFor(at(1.5), now), ['remittance.speedInstant2hrs'])
  assert.deepEqual(speedLabelFor(at(3.2), now), ['remittance.speedWithinHours', { count: 4 }])
  assert.deepEqual(speedLabelFor(at(30), now), ['remittance.speed1to2days'])
  assert.deepEqual(speedLabelFor(at(60), now), ['remittance.speed1to3days'])
  assert.deepEqual(speedLabelFor(at(100), now), ['remittance.speed2to5days'])
  assert.equal(speedLabelFor(null, now), null)
  assert.equal(speedLabelFor('not a date', now), null)
})

test('the retrieval time is shown in Singapore time', () => {
  assert.match(singaporeTime('2026-10-09T18:55:43Z', 'en-GB'), /^\u206602:55\u2069$/)
})

test('Myanmar never gets a Wise row, matching the function', () => {
  assert.deepEqual(WISE_UNSUPPORTED, ['MMK'])
  assert.equal(shapeQuote(422, mmk, { targetCurrency: 'MMK', sourceAmount: 500 }, now).supported, false)
})

test('Remittance sorts by what the family receives and labels live quotes and estimates', () => {
  const page = readFileSync(new URL('../src/pages/Remittance.jsx', import.meta.url), 'utf8')
  assert.match(page, /rows\.sort\(\(a, b\) => b\.received - a\.received\)/)
  assert.match(page, /t\('remittance\.liveQuote'\)/)
  assert.match(page, /t\('remittance\.estimateBadge'\)/)
  assert.match(page, /t\('remittance\.wiseQuoteSource'/)
  assert.match(page, /t\('remittance\.wiseQuoteNote'\)/)
  // No referral or tracking links: plain provider homepages only.
  for (const [, url] of page.matchAll(/url: '([^']+)'/g)) assert.doesNotMatch(url, /[?&](ref|aff|utm|clickref|partner)/i, url)
})

test('the live quote sends no amount to analytics', () => {
  const page = readFileSync(new URL('../src/pages/Remittance.jsx', import.meta.url), 'utf8')
  for (const [call] of page.matchAll(/track\([^)]*\)/g)) assert.doesNotMatch(call, /amount|received|fee|rate/i, call)
})
