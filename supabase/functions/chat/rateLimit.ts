// Chat quotas, kept as pure logic so they can be unit-tested outside Deno.
//
// Counting is per device first, because many workers share one dormitory wifi
// connection: an IP quota strict enough to stop abuse would lock out a whole
// block. The IP and global buckets are deliberately generous backstops for the
// case where someone clears storage in a loop to mint fresh device ids.

export type WindowKind = 'hour' | 'day'

export type LimitCheck = {
  scope: string
  subject: string
  window: WindowKind
  max: number
}

export const CHAT_LIMITS = {
  // Guests: enough for a long conversation, far below anything costly.
  guestDeviceHour: 30,
  guestDeviceDay: 100,
  // Signed-in users are known and recoverable, so they get more room.
  userHour: 60,
  userDay: 300,
  // Clients too old to send a device id (a cached build that has not updated
  // yet). Per IP, so one shared network keeps working, but not unlimited.
  legacyIpHour: 120,
  // Shared-network ceiling. Dormitory wifi can carry hundreds of workers.
  ipHour: 300,
  // Ceiling across all guests, so a distributed burst still has a roof.
  globalGuestDay: 4000,
  // Whole-project ceiling, guests and signed-in users together. Purely a cost
  // and abuse backstop: raise this one number to give the project more room.
  projectDay: 1500,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function isDeviceId(value: unknown): boolean {
  return typeof value === 'string' && UUID.test(value)
}

function cleanAddress(value: string | null | undefined): string | null {
  const address = String(value ?? '').trim()
  return address.length > 0 && address.length <= 64 ? address : null
}

// Only headers the edge sets itself. x-forwarded-for is a list the caller can
// prepend to, so trusting it would let one client mint a fresh address bucket
// per request — worse than having no address at all. With neither trusted
// header the per-address bucket is skipped; the device, user and project
// ceilings still apply.
export function clientAddress(getHeader: (name: string) => string | null | undefined): string | null {
  return cleanAddress(getHeader('cf-connecting-ip')) ?? cleanAddress(getHeader('x-real-ip'))
}

export function buildLimitChecks(
  { userId, deviceId, ipHash }: { userId?: string | null; deviceId?: string | null; ipHash?: string | null },
): LimitCheck[] {
  const checks: LimitCheck[] = []

  if (userId) {
    checks.push({ scope: 'user', subject: userId, window: 'hour', max: CHAT_LIMITS.userHour })
    checks.push({ scope: 'user', subject: userId, window: 'day', max: CHAT_LIMITS.userDay })
  } else if (isDeviceId(deviceId)) {
    checks.push({ scope: 'device', subject: String(deviceId), window: 'hour', max: CHAT_LIMITS.guestDeviceHour })
    checks.push({ scope: 'device', subject: String(deviceId), window: 'day', max: CHAT_LIMITS.guestDeviceDay })
  } else if (ipHash) {
    checks.push({ scope: 'legacy', subject: ipHash, window: 'hour', max: CHAT_LIMITS.legacyIpHour })
  }

  if (ipHash) {
    checks.push({ scope: 'ip', subject: ipHash, window: 'hour', max: CHAT_LIMITS.ipHour })
  }

  if (!userId) {
    checks.push({ scope: 'global', subject: 'guests', window: 'day', max: CHAT_LIMITS.globalGuestDay })
  }

  // Everyone, signed in or not, counts against the project ceiling.
  checks.push({ scope: 'project', subject: 'all', window: 'day', max: CHAT_LIMITS.projectDay })

  return checks
}

// The app shows its own translation; this copy is for any other caller and for
// the rare client whose bundle predates the new locale key.
const LIMIT_MESSAGES: Record<string, string> = {
  en: "You've reached today's chat limit. Please try again later.",
  ta: 'இன்றைய அரட்டை வரம்பை எட்டிவிட்டீர்கள். பிறகு மீண்டும் முயலுங்கள்.',
  hi: 'आपने आज की चैट सीमा पूरी कर ली है। कृपया बाद में फिर कोशिश करें।',
  bn: 'আপনি আজকের চ্যাটের সীমা শেষ করেছেন। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
  my: 'ယနေ့အတွက် စကားပြောခွင့် ကန့်သတ်ချက် ပြည့်သွားပါပြီ။ နောက်မှ ထပ်ကြိုးစားပါ။',
  si: 'ඔබ අද දින කතාබස් සීමාවට ළඟා වී ඇත. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  fil: 'Naabot mo na ang limitasyon ng chat para ngayong araw. Subukan ulit mamaya.',
  id: 'Anda sudah mencapai batas obrolan hari ini. Silakan coba lagi nanti.',
  zh: '您已达到今天的聊天次数上限，请稍后再试。',
  th: 'คุณใช้การแชทครบจำนวนของวันนี้แล้ว กรุณาลองใหม่ภายหลัง',
  ur: 'آپ آج کی چیٹ کی حد تک پہنچ چکے ہیں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔',
  ne: 'तपाईंले आजको च्याट सीमा पुर्‍याउनुभयो। कृपया पछि फेरि प्रयास गर्नुहोस्।',
}

export function normalizeLanguage(value: unknown): string {
  const code = String(value ?? '').toLowerCase().split('-')[0]
  return Object.prototype.hasOwnProperty.call(LIMIT_MESSAGES, code) ? code : 'en'
}

export function rateLimitMessage(language: unknown): string {
  return LIMIT_MESSAGES[normalizeLanguage(language)]
}

export function retryAfterSeconds(resetAt: unknown, nowMs: number): number {
  const reset = Date.parse(String(resetAt ?? ''))
  if (Number.isNaN(reset)) return 60
  return Math.min(86400, Math.max(1, Math.ceil((reset - nowMs) / 1000)))
}
