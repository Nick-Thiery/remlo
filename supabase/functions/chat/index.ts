import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildLimitChecks,
  clientAddress,
  rateLimitMessage,
  retryAfterSeconds,
} from './rateLimit.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_MESSAGE_LENGTH = 2000

function errResp(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Addresses are only ever stored as a salted digest, so the table holds no
// readable IP. The salt is a secret the caller cannot see, which is what stops
// someone confirming a guess at an address from the stored hash.
async function hashIp(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const supabaseAnon   = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anthropicKey   = Deno.env.get('ANTHROPIC_API_KEY')

  if (!anthropicKey) return errResp('Service misconfigured', 503)

  // ── 1. Resolve caller identity (optional — guests have no session) ───────────
  const authHeader = req.headers.get('Authorization') ?? ''
  let userId: string | null = null

  if (authHeader.startsWith('Bearer ')) {
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth:   { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user } } = await userClient.auth.getUser()
    userId = user?.id ?? null
  }

  // ── 2. Parse and validate request body ───────────────────────────────────────
  let body: { messages?: unknown; system?: unknown; device_id?: unknown; language?: unknown }
  try {
    body = await req.json()
  } catch {
    return errResp('Invalid JSON')
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return errResp('messages must be a non-empty array')
  }

  const messages: Array<{ role: string; content: string }> = []
  for (const m of body.messages) {
    if (typeof m !== 'object' || m === null) return errResp('Invalid message format')
    const role    = String((m as Record<string, unknown>).role ?? '')
    const content = String((m as Record<string, unknown>).content ?? '').slice(0, MAX_MESSAGE_LENGTH)
    if (!['user', 'assistant'].includes(role)) return errResp('Invalid message role')
    messages.push({ role, content })
  }

  // Cap history to last 20 turns to limit token spend
  const trimmedMessages = messages.slice(-20)

  const system = typeof body.system === 'string'
    ? body.system.slice(0, 1000)
    : undefined

  // ── 3. Rate limit every caller, guests included ──────────────────────────────
  // Guests are counted per device id, not per IP: a whole dormitory shares one
  // connection, so an IP quota tight enough to stop abuse would lock out the
  // people this app is for. IP and global buckets are loose backstops only.
  const clientIp = clientAddress((name) => req.headers.get(name))
  const ipSalt = Deno.env.get('CHAT_RATE_LIMIT_SALT')
  if (clientIp && !ipSalt) console.error('CHAT_RATE_LIMIT_SALT is not set; the per-address bucket is inactive')
  const ipHash = clientIp && ipSalt ? await hashIp(clientIp, ipSalt) : null

  const checks = buildLimitChecks({
    userId,
    deviceId: typeof body.device_id === 'string' ? body.device_id : null,
    ipHash,
  })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: blocked, error: limitError } = await admin.rpc('chat_usage_record', {
    p_checks: checks.map((check) => ({
      scope: check.scope,
      subject: check.subject,
      window_kind: check.window,
      max: check.max,
    })),
  })

  if (limitError) {
    // Counting is unavailable, so spending is unbounded: refuse rather than
    // call Anthropic uncounted. Only the database's own error code is logged —
    // never a message, address, device id or key.
    console.error(`Chat rate limit check unavailable (code ${limitError.code ?? 'unknown'})`)
    return errResp('AI service temporarily unavailable', 503)
  }

  if (blocked) {
    const retryAfter = retryAfterSeconds(blocked.reset_at, Date.now())
    console.log(`Chat rate limit hit: scope=${blocked.scope} window=${blocked.window_kind} max=${blocked.max}`)
    return new Response(
      JSON.stringify({
        error: rateLimitMessage(body.language),
        error_code: 'rate_limited',
        retry_after_seconds: retryAfter,
      }),
      {
        status: 429,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
      },
    )
  }

  // ── 4. Call Anthropic ─────────────────────────────────────────────────────────
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages: trimmedMessages,
      }),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      throw new Error(data?.error?.message ?? `Anthropic error ${upstream.status}`)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Anthropic call failed:', message)
    return errResp('AI service temporarily unavailable', 502)
  }
})
