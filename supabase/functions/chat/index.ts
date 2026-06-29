import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_MESSAGES_PER_HOUR = 20
const MAX_MESSAGE_LENGTH    = 2000

function errResp(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
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
  let body: { messages?: unknown; system?: unknown }
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

  // ── 3. Rate limit authenticated users (guests are not rate-limited by user) ──
  if (userId) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await admin
      .from('chat_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart)

    if (!countError && (count ?? 0) >= MAX_MESSAGES_PER_HOUR) {
      return errResp('Rate limit exceeded — try again in an hour', 429)
    }

    // Record this request (fire-and-forget)
    admin.from('chat_rate_limits').insert({ user_id: userId }).then(({ error }) => {
      if (error) console.error('Failed to record rate limit entry:', error.message)
    })
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
