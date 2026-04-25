/**
 * fetch-scam-alerts — Supabase Edge Function
 *
 * What this does:
 *  1. Upserts a curated set of Singapore scam advisories into the scam_alerts table
 *     (sourced from SPF, MOM, and MAS public press releases — no real-time API
 *      exists; ScamShield is a closed government system, scamshield.gov.sg has no
 *      public developer API)
 *  2. Fetches annual scam case statistics from the Singapore government's open data
 *      portal (data.gov.sg) — this IS a live government API call
 *  3. Returns the combined { alerts, stats } payload to the caller
 *
 * Deploy:  supabase functions deploy fetch-scam-alerts
 * Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Curated alert dataset ─────────────────────────────────────────────────────
// Based on real SPF / MOM / MAS advisories. Updated manually when new major
// scam campaigns are reported. Severity reflects SPF risk classification.

const ALERTS = [
  {
    id: 'fake_mom_levy',
    title: 'Fake MOM Officers Demanding Levy Payments',
    type: 'impersonation',
    severity: 'high',
    description: 'Scammers call workers and employers claiming to be Ministry of Manpower officers. They say there are unpaid foreign worker levies and demand immediate bank transfer or PayNow payment to avoid arrest. Real MOM officers never ask for payments over the phone.',
    what_to_do: [
      'Hang up immediately — MOM will never call you to demand payment by phone.',
      'Do not transfer any money, even if they threaten arrest.',
      'Call MOM directly on 6438 5122 to verify any official matter.',
      'Report the call to the Police at 1800-255-0000.',
    ],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'fake_work_permit_renewal',
    title: 'Fake Work Permit Renewal SMS Demanding Urgent Fees',
    type: 'impersonation',
    severity: 'critical',
    description: 'SMS messages impersonating MOM tell workers their work permit is expiring and they must pay an urgent renewal fee via PayNow or bank transfer within 24 hours. The links go to convincing fake MOM websites. MOM never sends payment requests by SMS.',
    what_to_do: [
      'Do not click any link in the SMS — type mom.gov.sg directly into your browser.',
      'Never pay renewal fees via PayNow to a personal account.',
      'Check your actual work permit status at mom.gov.sg/evs.',
      'Report the SMS to SPF at police.gov.sg/iwitness or call 1800-255-0000.',
    ],
    source: 'MOM',
    source_url: 'https://www.mom.gov.sg/newsroom/advisories',
    published_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'whatsapp_dbs_phishing',
    title: 'WhatsApp Phishing: Fake DBS / POSB Login Links',
    type: 'phishing',
    severity: 'critical',
    description: 'WhatsApp messages claiming to be from DBS Bank tell workers their account is suspended. The link leads to a fake DBS login page that steals username, password, and OTP codes. Several workers have lost their entire savings after clicking the link.',
    what_to_do: [
      'Never click bank links sent by WhatsApp, SMS, or email.',
      'Always type your bank URL directly into the browser (dbs.com.sg).',
      'If you entered your details, call DBS immediately at 1800-111-1111 to freeze your account.',
      'Report to ScamShield: call 1799 or use the ScamShield app.',
    ],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-10-20T00:00:00Z',
  },
  {
    id: 'qr_code_phishing',
    title: 'QR Code Phishing at Hawker Centres and Food Courts',
    type: 'phishing',
    severity: 'medium',
    description: 'Scammers paste fake QR codes over legitimate PayNow/NETS QR codes at hawker centres, coffeeshops, and provision stores. Scanning the fake QR directs payment to the scammer\'s account. Victims only discover the problem when checking their bank statement.',
    what_to_do: [
      'Check that the QR code sticker has not been tampered with before scanning.',
      'Confirm the recipient name shown after scanning matches the merchant.',
      'Use the merchant\'s official app or type PayNow UEN directly where possible.',
      'Report tampered QR codes to the merchant and SPF immediately.',
    ],
    source: 'SPF',
    source_url: 'https://www.scamalert.sg/news',
    published_at: '2025-09-10T00:00:00Z',
  },
  {
    id: 'fake_job_placement_fee',
    title: 'Fake Job Offers Asking for Upfront Placement Fees',
    type: 'jobScam',
    severity: 'high',
    description: 'Facebook and Telegram groups advertise high-paying construction and cleaning jobs in Singapore, then ask workers to pay S$200–S$800 as a placement or work permit fee before the job starts. After payment, the "agent" disappears. Licensed employment agencies in Singapore cannot legally charge job seekers fees.',
    what_to_do: [
      'Never pay any fee to get a job — this is illegal in Singapore.',
      'Check if the agency is licensed at mom.gov.sg/employment-agencies-search.',
      'If you have already paid, report to MOM Taskforce at 1800-333-1313.',
      'Keep all receipts and messages as evidence.',
    ],
    source: 'MOM',
    source_url: 'https://www.mom.gov.sg/newsroom/advisories',
    published_at: '2025-08-05T00:00:00Z',
  },
  {
    id: 'telegram_job_commission',
    title: 'Telegram "Task" Jobs Promising Easy Commission',
    type: 'jobScam',
    severity: 'high',
    description: 'Scammers recruit via Telegram or WhatsApp offering simple online tasks (liking posts, writing reviews) that pay easy commissions. Workers are asked to deposit money to "unlock" bigger tasks and earn more commission. The deposits are never returned. This is a form of advance-fee fraud.',
    what_to_do: [
      'Any job that asks you to deposit your own money first is a scam — stop immediately.',
      'Never transfer money to strangers for investment or task purposes.',
      'Report to SPF at police.gov.sg/iwitness or call 999 if in danger.',
      'Contact your bank immediately to attempt a recall if you have transferred money.',
    ],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'illegal_lender_sms',
    title: 'Illegal Moneylenders Offering Instant Loans via SMS',
    type: 'loanScam',
    severity: 'high',
    description: 'Unlicensed moneylenders send unsolicited SMS and WhatsApp messages advertising instant cash loans with no checks required. They charge interest rates far above the legal 4% monthly cap and use threats, harassment, and property damage against borrowers. Borrowing from unlicensed lenders is a criminal offence.',
    what_to_do: [
      'Do not borrow from anyone who contacts you by SMS or WhatsApp — all licensed lenders are at moneylenders.justice.gov.sg.',
      'If threatened or harassed, call Police immediately at 999.',
      'Report to the X-Ah Long hotline: 1800-924-5664 (available 24/7).',
      'You are a victim — Singapore law protects you even if you have already borrowed.',
    ],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-07-12T00:00:00Z',
  },
  {
    id: 'fake_dorm_advance_rent',
    title: 'Fake Dormitory Agents Collecting Advance Rent',
    type: 'paymentScam',
    severity: 'medium',
    description: 'Scammers posing as dormitory agents collect 1–3 months advance rent from workers seeking accommodation. The dormitory does not exist or is not controlled by the "agent". Workers arrive to find no room and lose several hundred dollars.',
    what_to_do: [
      'Never pay advance rent before viewing the room in person.',
      'Verify the dormitory operator directly at mom.gov.sg/fwl/foreign-worker-dormitory.',
      'Pay only by PayNow or cheque to the official dormitory company — not a personal account.',
      'If scammed, file a Police report at any Neighbourhood Police Centre.',
    ],
    source: 'MOM',
    source_url: 'https://www.mom.gov.sg/newsroom/advisories',
    published_at: '2025-06-20T00:00:00Z',
  },
  {
    id: 'money_mule_recruitment',
    title: 'Money Mule Recruitment via Social Media',
    type: 'paymentScam',
    severity: 'high',
    description: 'Scammers ask workers to receive money into their bank account and transfer it to another account in exchange for a commission. This is money mule activity — a criminal offence in Singapore under the Corruption, Drug Trafficking and Other Serious Crimes Act. You can be jailed up to 3 years and fined up to S$50,000.',
    what_to_do: [
      'Never allow others to use your bank account to move money — even for a commission.',
      'Refuse any request to forward money from your personal account.',
      'If approached, report to SPF at police.gov.sg/iwitness immediately.',
      'If you have already been involved, seek legal advice and contact SPF proactively.',
    ],
    source: 'SPF',
    source_url: 'https://www.police.gov.sg/media-room/news',
    published_at: '2025-05-08T00:00:00Z',
  },
  {
    id: 'telegram_investment_guru',
    title: 'Investment Scam via Telegram "Guru" Groups',
    type: 'investmentScam',
    severity: 'critical',
    description: 'Scammers run Telegram and WhatsApp groups posing as investment gurus, promising to double money in 30 days through a special cryptocurrency or forex fund. Fake testimonials and profit screenshots are posted by paid scammers. Once you invest, the money disappears and the group goes silent.',
    what_to_do: [
      'Guaranteed high returns in a short time is the #1 sign of a scam — walk away.',
      'Never invest money based on recommendations from strangers in online groups.',
      'Report investment scams to SPF at police.gov.sg/iwitness or call 999.',
      'If money has been transferred, call your bank immediately to freeze the transaction.',
    ],
    source: 'MAS',
    source_url: 'https://www.mas.gov.sg/investor-alert-list',
    published_at: '2026-02-10T00:00:00Z',
  },
]

// ── data.gov.sg: fetch annual scam case statistics ───────────────────────────

interface GovStats {
  year: number
  cases: number
}

async function fetchGovStats(): Promise<GovStats | null> {
  const DATASET_ID = 'd_ca0b908cf06a267ca06acbd5feb4465c'
  const BASE = 'https://api-open.data.gov.sg/v1/public/api/datasets'

  try {
    // Step 1: initiate download (fires off a pre-signed S3 URL generation)
    await fetch(`${BASE}/${DATASET_ID}/initiate-download`, { method: 'GET' })

    // Step 2: poll for the download URL (usually ready immediately)
    const pollRes = await fetch(`${BASE}/${DATASET_ID}/poll-download`)
    if (!pollRes.ok) return null

    const pollData = await pollRes.json()
    const csvUrl: string | undefined = pollData?.data?.url
    if (!csvUrl || pollData?.data?.status !== 'DOWNLOAD_SUCCESS') return null

    // Step 3: download and parse the CSV
    const csvRes = await fetch(csvUrl)
    if (!csvRes.ok) return null
    const csv = await csvRes.text()

    return parseScamStats(csv)
  } catch {
    return null
  }
}

function parseScamStats(csv: string): GovStats | null {
  const [headerLine, ...dataLines] = csv.trim().split('\n')
  const headers = headerLine.split(',').map((h) => h.trim().replace(/"/g, ''))

  for (const line of dataLines) {
    const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''))
    if (!cols[0]?.toLowerCase().includes('scam')) continue

    // Walk columns left-to-right (most recent year first in the header)
    for (let i = 1; i < headers.length; i++) {
      const year = parseInt(headers[i])
      const cases = parseInt(cols[i]?.replace(/,/g, '') ?? '')
      if (!isNaN(year) && !isNaN(cases) && cases > 0) {
        return { year, cases }
      }
    }
  }
  return null
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Upsert the curated alerts (ON CONFLICT updates title/description/etc but
    // preserves any manual is_active overrides set in the dashboard)
    const { error: upsertError } = await supabase
      .from('scam_alerts')
      .upsert(
        ALERTS.map((a) => ({ ...a, updated_at: new Date().toISOString() })),
        { onConflict: 'id', ignoreDuplicates: false },
      )

    if (upsertError) {
      console.error('Upsert error:', upsertError.message)
    }

    // Read alerts back from DB (respects RLS / is_active flag)
    const { data: alerts, error: selectError } = await supabase
      .from('scam_alerts')
      .select('*')
      .eq('is_active', true)
      .order('published_at', { ascending: false })

    if (selectError) throw selectError

    // Fetch live stats from data.gov.sg (best-effort — null if API is down)
    const stats = await fetchGovStats()

    return new Response(JSON.stringify({ alerts, stats }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
