/**
 * fetch-scam-alerts — minimal diagnostic version
 *
 * Upserts 5 hardcoded alerts via the Supabase client, then reads them back.
 * Returns detailed error info at each step so we can see exactly what fails.
 *
 * Deploy: supabase functions deploy fetch-scam-alerts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Step 1: upsert ───────────────────────────────────────────────────────────
  const { error: upsertError } = await supabase
    .from('scam_alerts')
    .upsert(ALERTS, { onConflict: 'id' })

  if (upsertError) {
    return new Response(
      JSON.stringify({
        step: 'upsert',
        error: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint,
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  // ── Step 2: read back ────────────────────────────────────────────────────────
  const { data: alerts, error: selectError } = await supabase
    .from('scam_alerts')
    .select('*')
    .eq('is_active', true)

  if (selectError) {
    return new Response(
      JSON.stringify({
        step: 'select',
        error: selectError.message,
        code: selectError.code,
        details: selectError.details,
        hint: selectError.hint,
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ alerts: alerts ?? [], count: alerts?.length ?? 0 }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
