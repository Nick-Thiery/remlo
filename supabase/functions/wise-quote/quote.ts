// Logic for the wise-quote function, kept free of Deno APIs so tests can run it.
//
// Wise's public quotes endpoint (no API key) gives a live quote for SGD to the
// worker's home currency. Wise confirmed in writing (8–9 Oct 2026) that Remlo
// may show these quotes in its comparison, including to people without a Wise
// account, at up to 100 requests a second and 900 a minute.

// Remlo's destination currencies. Wise doesn't send SGD to MMK (its API answers
// error.route.not.supported), so Myanmar gets "not available", not an estimate.
export const DESTINATIONS = ['INR', 'BDT', 'PHP', 'MMK', 'IDR', 'LKR', 'CNY', 'THB', 'PKR', 'NPR']
export const MIN_SGD = 1
export const MAX_SGD = 20000

export const WISE_QUOTES_URL = 'https://api.wise.com/v3/quotes'

export type QuoteRequest = { targetCurrency: string, sourceAmount: number }

export type Quote =
  | {
      supported: true
      provider: 'wise'
      payIn: string
      sourceAmount: number
      targetCurrency: string
      rate: number
      fee: number
      received: number
      estimatedDelivery: string | null
      retrievedAt: string
    }
  | { supported: false, provider: 'wise', targetCurrency: string }

export function parseRequest(body: unknown): { ok: true, value: QuoteRequest } | { ok: false, error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be a JSON object' }
  const { targetCurrency, sourceAmount } = body as Record<string, unknown>
  if (typeof targetCurrency !== 'string' || !DESTINATIONS.includes(targetCurrency)) {
    return { ok: false, error: 'unsupported targetCurrency' }
  }
  const amount = typeof sourceAmount === 'string' ? Number(sourceAmount) : sourceAmount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_SGD || amount > MAX_SGD) {
    return { ok: false, error: `sourceAmount must be between ${MIN_SGD} and ${MAX_SGD}` }
  }
  return { ok: true, value: { targetCurrency, sourceAmount: Math.round(amount * 100) / 100 } }
}

export function wiseRequestBody({ targetCurrency, sourceAmount }: QuoteRequest) {
  return { sourceCurrency: 'SGD', targetCurrency, sourceAmount }
}

type WiseOption = {
  payIn?: string, payOut?: string, disabled?: boolean,
  fee?: { total?: number }, targetAmount?: number, sourceAmount?: number, estimatedDelivery?: string,
}

// Picks how a worker in Singapore would most likely pay: PayNow, else a bank
// transfer, into the recipient's bank account. Card pay-ins cost far more and
// would make Wise look worse than what most workers would pay.
export function pickOption(options: WiseOption[] = []): WiseOption | null {
  const usable = options.filter((o) => !o.disabled && o.payOut === 'BANK_TRANSFER'
    && typeof o.targetAmount === 'number' && typeof o.fee?.total === 'number')
  return usable.find((o) => o.payIn === 'PAYNOW')
    ?? usable.find((o) => o.payIn === 'BANK_TRANSFER')
    ?? null
}

// Turns Wise's response into what the app shows. Returns null when the
// response is unusable, so the app falls back to its estimate.
export function shapeQuote(status: number, data: any, req: QuoteRequest, now: Date): Quote | null {
  const errors = Array.isArray(data?.errors) ? data.errors : []
  if (errors.some((e: any) => e?.code === 'error.route.not.supported')) {
    return { supported: false, provider: 'wise', targetCurrency: req.targetCurrency }
  }
  if (status !== 200 || !data || typeof data.rate !== 'number') return null
  if (data.sourceCurrency !== 'SGD' || data.targetCurrency !== req.targetCurrency) return null
  const option = pickOption(data.paymentOptions)
  if (!option) return null
  return {
    supported: true,
    provider: 'wise',
    payIn: option.payIn as string,
    sourceAmount: req.sourceAmount,
    targetCurrency: req.targetCurrency,
    rate: data.rate,
    fee: option.fee!.total as number,
    received: option.targetAmount as number,
    estimatedDelivery: option.estimatedDelivery ?? null,
    retrievedAt: (typeof data.createdTime === 'string' ? new Date(data.createdTime) : now).toISOString(),
  }
}

// A small time-limited cache, so a burst of identical requests (several
// workers comparing S$500 to India at a workshop) makes one call to Wise.
export class QuoteCache {
  private entries = new Map<string, { value: Quote, expires: number }>()
  private ttlMs: number
  private maxEntries: number
  constructor(ttlMs = 60_000, maxEntries = 500) { this.ttlMs = ttlMs; this.maxEntries = maxEntries }
  key(req: QuoteRequest) { return `${req.targetCurrency}:${req.sourceAmount}` }
  get(req: QuoteRequest, nowMs: number): Quote | null {
    const hit = this.entries.get(this.key(req))
    if (!hit) return null
    if (hit.expires <= nowMs) { this.entries.delete(this.key(req)); return null }
    return hit.value
  }
  set(req: QuoteRequest, value: Quote, nowMs: number) {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    this.entries.set(this.key(req), { value, expires: nowMs + this.ttlMs })
  }
}

// The caller's address, from headers the edge sets itself (as chat/rateLimit.ts
// does). x-forwarded-for is a list the caller can prepend to, so trusting it
// would let one client claim a fresh address on every request.
export function clientAddress(getHeader: (name: string) => string | null | undefined): string | null {
  for (const name of ['cf-connecting-ip', 'x-real-ip']) {
    const value = String(getHeader(name) ?? '').trim()
    if (value.length > 0 && value.length <= 64) return value
  }
  return null
}

// Calls to Wise per key per window, per function instance. Used twice: per
// caller (30 a minute) and for the whole instance (10 a second, well inside
// Wise's 100 a second and 900 a minute). Only requests that actually reach
// Wise are counted; cached answers are free.
export class Throttle {
  private hits = new Map<string, number[]>()
  // Forget callers with no recent requests; never reset everyone's count.
  private prune(nowMs: number) {
    for (const [key, times] of this.hits) {
      if (!times.some((t) => t > nowMs - this.windowMs)) this.hits.delete(key)
    }
  }
  private limit: number
  private windowMs: number
  constructor(limit = 30, windowMs = 60_000) { this.limit = limit; this.windowMs = windowMs }
  allow(caller: string, nowMs: number): boolean {
    const recent = (this.hits.get(caller) ?? []).filter((t) => t > nowMs - this.windowMs)
    if (recent.length >= this.limit) { this.hits.set(caller, recent); return false }
    recent.push(nowMs)
    this.hits.set(caller, recent)
    if (this.hits.size > 5000) this.prune(nowMs)
    return true
  }
}
