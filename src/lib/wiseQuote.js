import { fetchJson } from './fetchJson.js'

// Live Wise quotes come from our wise-quote Edge Function, which calls Wise's
// public quotes endpoint (Wise confirmed in writing that Remlo may show them).
const QUOTE_URL = `${import.meta.env?.VITE_SUPABASE_URL}/functions/v1/wise-quote`
const ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY

// Wise doesn't send SGD to these currencies (its API: error.route.not.supported).
// Known here too, so Myanmar never shows a made-up Wise estimate even if the
// function is unreachable.
export const WISE_UNSUPPORTED = ['MMK']
export const QUOTE_MIN_SGD = 1
export const QUOTE_MAX_SGD = 20000

export async function fetchWiseQuote(targetCurrency, sourceAmount, { signal } = {}) {
  return fetchJson(QUOTE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ targetCurrency, sourceAmount }),
    signal,
    timeoutMs: 10000,
  })
}

export const roundCents = (n) => Math.round(n * 100) / 100

// Wise's estimated arrival, as one of the app's translated speed labels.
// Returns [key, params] for t(), or null when there is no usable estimate.
export function speedLabelFor(estimatedDelivery, now = new Date()) {
  if (!estimatedDelivery) return null
  const hours = (new Date(estimatedDelivery).getTime() - now.getTime()) / 3_600_000
  if (!Number.isFinite(hours)) return null
  if (hours <= 0.25) return ['remittance.speedInstant']
  if (hours <= 2) return ['remittance.speedInstant2hrs']
  if (hours <= 24) return ['remittance.speedWithinHours', { count: Math.ceil(hours) }]
  if (hours <= 48) return ['remittance.speed1to2days']
  if (hours <= 72) return ['remittance.speed1to3days']
  return ['remittance.speed2to5days']
}

// "02:55" in Singapore time, for "retrieved at … SGT".
export function singaporeTime(iso, locale) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Isolated left-to-right (U+2066…U+2069) so "03:11 AM" stays in order in Urdu.
  return `\u2066${d.toLocaleTimeString(locale || [], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore' })}\u2069`
}
