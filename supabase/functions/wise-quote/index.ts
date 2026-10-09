/**
 * wise-quote
 *
 * Returns a live Wise quote for sending SGD home, for the Wise row on the
 * Remittance page. Calls Wise's public quotes endpoint (no API key), reuses
 * each quote for 60 seconds, and limits how often one caller can ask.
 *
 * POST { targetCurrency: 'INR', sourceAmount: 500 }
 *   200 { supported: true, rate, fee, received, payIn, estimatedDelivery, retrievedAt, … }
 *   200 { supported: false }   Wise doesn't send to this currency (Myanmar)
 *   400 bad input · 429 too many requests · 502 Wise unavailable
 *
 * Nothing about the caller or the amount is stored or logged.
 *
 * Deploy: supabase functions deploy wise-quote
 */

import { parseRequest, wiseRequestBody, shapeQuote, clientAddress, QuoteCache, Throttle, WISE_QUOTES_URL } from './quote.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } })

const cache = new QuoteCache(60_000)
const perCaller = new Throttle(30, 60_000)   // one caller: 30 calls to Wise a minute
const overall = new Throttle(10, 1_000)      // this instance: 10 calls to Wise a second

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const now = Date.now()
  let body: unknown
  try { body = await req.json() } catch { return json({ error: 'body must be JSON' }, 400) }
  const parsed = parseRequest(body)
  if (!parsed.ok) return json({ error: parsed.error }, 400)

  // A cached quote costs Wise nothing, so it is served before any limit: a
  // workshop on one Wi-Fi asking for the same quote isn't turned away.
  const cached = cache.get(parsed.value, now)
  if (cached) return json(cached)

  const caller = clientAddress((name) => req.headers.get(name))
  if ((caller && !perCaller.allow(caller, now)) || !overall.allow('all', now)) {
    return json({ error: 'too many requests' }, 429, { 'Retry-After': '60' })
  }

  try {
    const res = await fetch(WISE_QUOTES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wiseRequestBody(parsed.value)),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => null)
    const quote = shapeQuote(res.status, data, parsed.value, new Date())
    if (!quote) return json({ error: 'Wise quote unavailable' }, 502)
    cache.set(parsed.value, quote, now)
    return json(quote)
  } catch {
    return json({ error: 'Wise quote unavailable' }, 502)
  }
})
