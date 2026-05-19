/**
 * fetch-scam-alerts
 *
 * Upserts hardcoded alerts, reads them back, and returns them translated into
 * the requested language. Translations are cached in scam_alert_translations —
 * the Anthropic API is only called once per (alert_id, language) combination.
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
  {
    id: 'alert_payment_001',
    title: 'Fake PayNow QR Codes at Hawker Stalls and Markets',
    type: 'paymentScam',
    severity: 'medium',
    description: 'Scammers paste fraudulent PayNow QR codes over legitimate ones at hawker centres and markets. Payments go directly to the scammer instead of the vendor. Victims only discover the fraud when the stallholder says they received nothing.',
    what_to_do: ['Always verify the payee name shown after scanning before confirming.', 'If the name does not match the stall or shop, do not proceed.', 'Report suspicious QR codes to SPF at 1800-255-0000.'],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2026-03-15T00:00:00Z',
  },
]

type Alert = typeof ALERTS[number]

type CachedTranslation = {
  alert_id: string
  translated_title: string
  translated_description: string
  translated_what_to_do: string[]
}

// ── Translation helpers ────────────────────────────────────────────────────────

async function callAnthropic(alerts: Alert[], langName: string, apiKey: string): Promise<Map<string, { title: string; description: string; what_to_do: string[] }>> {
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
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  const raw = data?.content?.[0]?.text ?? ''
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed: Array<{ id: string; title: string; description: string; what_to_do: string[] }> = JSON.parse(cleaned)
  return new Map(parsed.map(t => [t.id, { title: t.title, description: t.description, what_to_do: t.what_to_do }]))
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Parse language from request body
    let language = 'en'
    try {
      const body = await req.json()
      language = body?.language ?? 'en'
    } catch (_) { /* keep 'en' */ }

    console.log(`[fetch-scam-alerts] language: "${language}"`)

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // ── Step 1: upsert hardcoded alerts ────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from('scam_alerts')
      .upsert(ALERTS, { onConflict: 'id' })

    if (upsertError) {
      return new Response(
        JSON.stringify({ step: 'upsert', error: upsertError.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 2: read back active alerts ────────────────────────────────────────
    const { data: alerts, error: selectError } = await supabase
      .from('scam_alerts')
      .select('*')
      .eq('is_active', true)

    if (selectError) {
      return new Response(
        JSON.stringify({ step: 'select', error: selectError.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const englishAlerts: Alert[] = alerts ?? []

    // ── Step 3: return English immediately ─────────────────────────────────────
    if (language === 'en' || !LANG_NAMES[language]) {
      return new Response(
        JSON.stringify({ alerts: englishAlerts, count: englishAlerts.length }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    // ── Step 4: load cached translations for this language ─────────────────────
    const alertIds = englishAlerts.map(a => a.id)

    const { data: cached } = await supabase
      .from('scam_alert_translations')
      .select('alert_id, translated_title, translated_description, translated_what_to_do')
      .eq('language', language)
      .in('alert_id', alertIds)

    const cacheMap = new Map<string, CachedTranslation>(
      (cached ?? []).map((row: CachedTranslation) => [row.alert_id, row])
    )

    console.log(`[fetch-scam-alerts] Cache hits: ${cacheMap.size}/${englishAlerts.length} for "${language}"`)

    // ── Step 5: identify alerts that need fresh translation ────────────────────
    const uncached = englishAlerts.filter(a => !cacheMap.has(a.id))

    if (uncached.length > 0 && anthropicKey) {
      console.log(`[fetch-scam-alerts] Calling Anthropic for ${uncached.length} uncached alerts`)
      const langName = LANG_NAMES[language]

      try {
        const txMap = await callAnthropic(uncached, langName, anthropicKey)

        // Persist new translations to the cache table
        const rows = uncached
          .map(a => {
            const tx = txMap.get(a.id)
            if (!tx) return null
            return {
              alert_id: a.id,
              language,
              translated_title: tx.title,
              translated_description: tx.description,
              translated_what_to_do: tx.what_to_do,
            }
          })
          .filter(Boolean)

        if (rows.length > 0) {
          const { error: insertError } = await supabase
            .from('scam_alert_translations')
            .upsert(rows, { onConflict: 'alert_id,language' })

          if (insertError) {
            console.error('[fetch-scam-alerts] Failed to cache translations:', insertError.message)
          } else {
            console.log(`[fetch-scam-alerts] Cached ${rows.length} new translations for "${language}"`)
          }
        }

        // Merge fresh translations into the cache map for this response
        for (const a of uncached) {
          const tx = txMap.get(a.id)
          if (tx) {
            cacheMap.set(a.id, {
              alert_id: a.id,
              translated_title: tx.title,
              translated_description: tx.description,
              translated_what_to_do: tx.what_to_do,
            })
          }
        }
      } catch (err) {
        console.error('[fetch-scam-alerts] Anthropic translation failed:', err)
        // Fall through — alerts without a cache entry will use English below
      }
    } else if (uncached.length > 0 && !anthropicKey) {
      console.warn('[fetch-scam-alerts] ANTHROPIC_API_KEY not set — returning English for uncached alerts')
    }

    // ── Step 6: merge translations onto alerts ─────────────────────────────────
    const finalAlerts = englishAlerts.map(a => {
      const tx = cacheMap.get(a.id)
      if (!tx) return a // no translation available, serve English
      return {
        ...a,
        title: tx.translated_title,
        description: tx.translated_description,
        what_to_do: tx.translated_what_to_do,
      }
    })

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
