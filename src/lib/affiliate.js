// Remlo's referral link for Wise (Partnerize). Paste the tracking link from
// https://console.partnerize.com/v2/creative/tracking between the quotes.
//
// While this is empty, "Go to Wise" opens wise.com and no disclosure is shown.
// Once it is set, the button uses the referral link and the comparison screen
// shows Wise's required disclosure next to it (remittance.wiseAffiliateDisclosure).
export const WISE_REFERRAL_URL = ''

export const WISE_PLAIN_URL = 'https://wise.com/'

export function wiseLink(referralUrl = WISE_REFERRAL_URL) {
  const url = String(referralUrl ?? '').trim()
  if (!url) return { url: WISE_PLAIN_URL, referral: false }
  let parsed
  try { parsed = new URL(url) } catch { return { url: WISE_PLAIN_URL, referral: false } }
  if (parsed.protocol !== 'https:') return { url: WISE_PLAIN_URL, referral: false }
  return { url: parsed.href, referral: true }
}
