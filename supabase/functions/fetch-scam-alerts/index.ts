/**
 * fetch-scam-alerts
 *
 * Upserts hardcoded alerts, reads them back, and optionally translates them
 * via Claude Haiku when a non-English language code is supplied.
 *
 * Deploy: supabase functions deploy fetch-scam-alerts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LANG_NAMES: Record<string, string> = {
  ta: 'Tamil', hi: 'Hindi', bn: 'Bengali', my: 'Burmese (Myanmar)',
  si: 'Sinhala', fil: 'Filipino (Tagalog)', id: 'Indonesian',
  zh: 'Chinese (Simplified)', th: 'Thai', ur: 'Urdu', ne: 'Nepali',
}

const ALERTS = [
  {
    id: 'alert_phishing_001',
    title: 'WhatsApp Phishing: Fake DBS Login Links',
    type: 'phishing',
    severity: 'critical',
    description: 'WhatsApp messages claiming to be DBS Bank say your account is suspended. The link steals your login and OTP. Never click bank links from WhatsApp.',
    what_to_do: ['Never click bank links sent by WhatsApp or SMS.', 'Type dbs.com.sg directly into your browser.', 'Call DBS at 1800-111-1111 immediately if you entered your details.'],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-10-20T00:00:00Z',
  },
  {
    id: 'alert_impersonation_001',
    title: 'Fake MOM Officers Demanding Levy Payments',
    type: 'impersonation',
    severity: 'high',
    description: 'Scammers call claiming to be MOM officers and demand immediate PayNow payment to avoid arrest. Real MOM officers never ask for payments over the phone.',
    what_to_do: ['Hang up immediately.', 'Call MOM on 6438 5122 to verify.', 'Report to Police at 1800-255-0000.'],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'alert_jobscam_001',
    title: 'Fake Job Offers Asking for Upfront Placement Fees',
    type: 'jobScam',
    severity: 'high',
    description: 'Facebook and Telegram ads offer high-paying jobs in Singapore then ask workers to pay S$200–S$800 placement fees. After payment the agent disappears. It is illegal for employment agencies to charge job seekers fees.',
    what_to_do: ['Never pay any fee to get a job — it is illegal in Singapore.', 'Verify the agency at mom.gov.sg/employment-agencies-search.', 'Report to MOM at 1800-333-1313.'],
    source: 'MOM',
    source_url: 'https://www.mom.gov.sg/newsroom/advisories',
    published_at: '2025-08-05T00:00:00Z',
  },
  {
    id: 'alert_loanscam_001',
    title: 'Illegal Moneylenders Offering Instant Loans via SMS',
    type: 'loanScam',
    severity: 'high',
    description: 'Unlicensed lenders send SMS and WhatsApp messages advertising instant cash loans. They charge illegal interest rates and use threats and harassment against borrowers.',
    what_to_do: ['Never borrow from anyone who contacts you by SMS or WhatsApp.', 'All licensed lenders are listed at moneylenders.justice.gov.sg.', 'Call the X-Ah Long hotline: 1800-924-5664.'],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-07-12T00:00:00Z',
  },
  {
    id: 'alert_investment_001',
    title: 'Investment Scam via Telegram Guru Groups',
    type: 'investmentScam',
    severity: 'critical',
    description: 'Telegram and WhatsApp groups pose as investment gurus promising to double money in 30 days. Fake profit screenshots draw victims in. Once you invest, the money disappears.',
    what_to_do: ['Guaranteed high returns is always a scam — walk away.', 'Never invest based on tips from strangers online.', 'Report to SPF at police.gov.sg/iwitness.'],
    source: 'MAS',
    source_url: 'https://www.mas.gov.sg/investor-alert-list',
    published_at: '2026-02-10T00:00:00Z',
  },
]

async function translateAlerts(alerts: typeof ALERTS, language: string, apiKey: string) {
  const langName = LANG_NAMES[language]
  if (!langName) {
    console.log(`[fetch-scam-alerts] No language name for code "${language}", skipping translation`)
    return alerts
  }

  console.log(`[fetch-scam-alerts] Translating ${alerts.length} alerts to ${langName} (${language})`)

  // Extract only the fields that need translation
  const toTranslate = alerts.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    what_to_do: a.what_to_do,
  }))

  const prompt = `Translate the following JSON array of scam alert objects from English to ${langName}.
Only translate the "title", "description", and "what_to_do" fields. Keep phone numbers, URLs, dollar amounts, and proper nouns (DBS, MOM, PayNow, SPF, MAS, WhatsApp, Telegram, Facebook) unchanged.
Return ONLY valid JSON — no explanation, no markdown, no code fences.

${JSON.stringify(toTranslate)}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[fetch-scam-alerts] Anthropic error:', res.status, err)
    return alerts // fall back to English
  }

  const data = await res.json()
  const raw = data?.content?.[0]?.text ?? ''
  console.log('[fetch-scam-alerts] Anthropic raw response length:', raw.length)

  try {
    const translated: Array<{ id: string; title: string; description: string; what_to_do: string[] }> = JSON.parse(raw)
    const translatedMap = new Map(translated.map(t => [t.id, t]))

    return alerts.map(alert => {
      const tx = translatedMap.get(alert.id)
      if (!tx) return alert
      return { ...alert, title: tx.title, description: tx.description, what_to_do: tx.what_to_do }
    })
  } catch (e) {
    console.error('[fetch-scam-alerts] Failed to parse translation JSON:', e)
    return alerts // fall back to English
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    console.log('ENV CHECK — SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.slice(0, 30)}…` : 'MISSING')
    console.log('ENV CHECK — SERVICE_ROLE_KEY:', serviceRoleKey ? `${serviceRoleKey.slice(0, 10)}…` : 'MISSING')
    console.log('ENV CHECK — ANTHROPIC_API_KEY:', anthropicKey ? 'SET' : 'MISSING')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Parse language from request body (default to 'en')
    let language = 'en'
    try {
      const body = await req.json()
      language = body?.language ?? 'en'
    } catch (_) {
      // no body or invalid JSON — keep 'en'
    }
    console.log(`[fetch-scam-alerts] Requested language: "${language}"`)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // ── Step 1: upsert ─────────────────────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from('scam_alerts')
      .upsert(ALERTS, { onConflict: 'id' })

    if (upsertError) {
      return new Response(
        JSON.stringify({ step: 'upsert', error: upsertError.message, code: upsertError.code }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 2: read back ──────────────────────────────────────────────────────
    const { data: alerts, error: selectError } = await supabase
      .from('scam_alerts')
      .select('*')
      .eq('is_active', true)

    if (selectError) {
      return new Response(
        JSON.stringify({ step: 'select', error: selectError.message, code: selectError.code }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const englishAlerts = alerts ?? []

    // ── Step 3: translate if needed ────────────────────────────────────────────
    let finalAlerts = englishAlerts
    if (language !== 'en' && anthropicKey) {
      finalAlerts = await translateAlerts(englishAlerts, language, anthropicKey)
    } else if (language !== 'en' && !anthropicKey) {
      console.warn('[fetch-scam-alerts] ANTHROPIC_API_KEY not set — returning English alerts')
    }

    return new Response(
      JSON.stringify({ alerts: finalAlerts, count: finalAlerts.length }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('fetch-scam-alerts fatal:', message)
    return new Response(
      JSON.stringify({ step: 'init', error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
