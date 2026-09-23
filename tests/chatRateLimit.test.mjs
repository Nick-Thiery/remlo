import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CHAT_LIMITS, buildLimitChecks, clientAddress, isDeviceId,
  normalizeLanguage, rateLimitMessage, retryAfterSeconds,
} from '../supabase/functions/chat/rateLimit.ts'
import { fetchJson } from '../src/lib/fetchJson.js'
import { eventsToCapture, safeEventProperties } from '../src/lib/analyticsPolicy.js'
import { LANGUAGES } from '../src/lib/languages.js'

const DEVICE = '3f2a1c4e-5b6d-4e8f-9a0b-1c2d3e4f5a6b'
const migration = readFileSync(new URL('../supabase/migrations/20260922000000_create_chat_usage.sql', import.meta.url), 'utf8')
const chatFn = readFileSync(new URL('../supabase/functions/chat/index.ts', import.meta.url), 'utf8')
const scopes = (checks) => checks.map((c) => `${c.scope}:${c.window}`)

test('a guest is counted per device, with IP and global only as backstops', () => {
  const checks = buildLimitChecks({ userId: null, deviceId: DEVICE, ipHash: 'abc123' })
  assert.deepEqual(scopes(checks), ['device:hour', 'device:day', 'ip:hour', 'global:day', 'project:day'])
  assert.deepEqual(checks.map((c) => c.max), [30, 100, 300, 4000, 1500])
  // The device buckets key on the device, never on the shared address.
  assert.deepEqual(checks.filter((c) => c.scope === 'device').map((c) => c.subject), [DEVICE, DEVICE])
})

test('a signed-in user gets a higher, identity-based quota and no guest ceiling', () => {
  const checks = buildLimitChecks({ userId: 'user-1', deviceId: DEVICE, ipHash: 'abc123' })
  assert.deepEqual(scopes(checks), ['user:hour', 'user:day', 'ip:hour', 'project:day'])
  assert.deepEqual(checks.map((c) => c.max), [60, 300, 300, 1500])
  assert.ok(CHAT_LIMITS.userHour > CHAT_LIMITS.guestDeviceHour)
  assert.ok(CHAT_LIMITS.userDay > CHAT_LIMITS.guestDeviceDay)
})

test('a client too old to send a device id is limited per address, not shut out', () => {
  for (const deviceId of [null, undefined, '', 'not-a-uuid', 12345, DEVICE.toUpperCase()]) {
    const checks = buildLimitChecks({ userId: null, deviceId, ipHash: 'abc123' })
    assert.deepEqual(scopes(checks), ['legacy:hour', 'ip:hour', 'global:day', 'project:day'], String(deviceId))
    assert.equal(checks[0].max, CHAT_LIMITS.legacyIpHour)
    assert.equal(checks[0].subject, 'abc123')
  }
  assert.ok(CHAT_LIMITS.legacyIpHour > CHAT_LIMITS.guestDeviceHour)
  assert.ok(CHAT_LIMITS.legacyIpHour < CHAT_LIMITS.ipHour)
})

test('a request with no usable address still counts against the other ceilings', () => {
  assert.deepEqual(scopes(buildLimitChecks({ userId: null, deviceId: DEVICE, ipHash: null })), ['device:hour', 'device:day', 'global:day', 'project:day'])
  assert.deepEqual(scopes(buildLimitChecks({ userId: null, deviceId: null, ipHash: null })), ['global:day', 'project:day'])
  assert.deepEqual(scopes(buildLimitChecks({ userId: 'user-1', deviceId: null, ipHash: null })), ['user:hour', 'user:day', 'project:day'])
})

test('every caller counts against the one project ceiling', () => {
  for (const caller of [{ userId: 'user-1' }, { userId: null, deviceId: DEVICE }, { userId: null }]) {
    const project = buildLimitChecks({ ipHash: 'abc123', ...caller }).filter((c) => c.scope === 'project')
    assert.deepEqual(project, [{ scope: 'project', subject: 'all', window: 'day', max: CHAT_LIMITS.projectDay }])
  }
  assert.equal(CHAT_LIMITS.projectDay, 1500)
})

test('device ids are accepted only in the exact form the app generates', () => {
  assert.equal(isDeviceId(DEVICE), true)
  for (const bad of [DEVICE.slice(0, -1), `${DEVICE} `, `${DEVICE}extra`, 'x'.repeat(36), null, {}]) {
    assert.equal(isDeviceId(bad), false, String(bad))
  }
})

test('a forged x-forwarded-for cannot create a fresh bucket', () => {
  const headers = (map) => (name) => map[name] ?? null
  const forged = { 'x-forwarded-for': '9.9.9.9, 203.0.113.7' }

  // Trusted header present: the forged list is ignored entirely.
  assert.equal(clientAddress(headers({ 'cf-connecting-ip': '203.0.113.7', ...forged })), '203.0.113.7')
  assert.equal(clientAddress(headers({ 'x-real-ip': '203.0.113.7', ...forged })), '203.0.113.7')
  // cf-connecting-ip wins over x-real-ip.
  assert.equal(clientAddress(headers({ 'cf-connecting-ip': '203.0.113.7', 'x-real-ip': '198.51.100.4' })), '203.0.113.7')
  assert.equal(clientAddress(headers({ 'cf-connecting-ip': '   ', 'x-real-ip': '198.51.100.4' })), '198.51.100.4')

  // Trusted headers absent: no address at all, rather than an attacker's choice.
  assert.equal(clientAddress(headers(forged)), null)
  assert.equal(clientAddress(headers({ 'x-forwarded-for': '203.0.113.7' })), null)
  assert.equal(clientAddress(headers({})), null)
  assert.equal(clientAddress(headers({ 'cf-connecting-ip': '', 'x-real-ip': '  ' })), null)
  assert.equal(clientAddress(headers({ 'x-real-ip': 'x'.repeat(200) })), null)
})

test('rotating a forged x-forwarded-for buys no extra messages', () => {
  // Same device, a different forged address each time: the buckets never move.
  const bucketsFor = (forgedAddress) => {
    const address = clientAddress((name) => ({ 'x-forwarded-for': forgedAddress }[name] ?? null))
    return scopes(buildLimitChecks({ userId: null, deviceId: DEVICE, ipHash: address }))
  }
  const first = bucketsFor('9.9.9.9')
  assert.deepEqual(first, ['device:hour', 'device:day', 'global:day', 'project:day'])
  assert.deepEqual(bucketsFor('10.10.10.10'), first)
  assert.ok(!first.some((bucket) => bucket.startsWith('ip:')))
})

test('a spoofed address cannot displace the real one when the edge sets it', () => {
  const real = clientAddress((name) => ({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '9.9.9.9' }[name] ?? null))
  const spoofAttempt = clientAddress((name) => ({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '8.8.8.8' }[name] ?? null))
  assert.equal(real, spoofAttempt)   // one address, one bucket, whatever the caller sends
})

// Mirrors public.chat_usage_record: increment every bucket, report the first
// one now over its limit. Fixed windows, so a counter resets on the boundary.
function makeCounter() {
  const counts = new Map()
  return function record(checks, windowIds) {
    let blocked = null
    for (const check of checks) {
      const key = `${check.scope}|${check.subject}|${check.window}|${windowIds[check.window]}`
      const count = (counts.get(key) ?? 0) + 1
      counts.set(key, count)
      if (!blocked && count > check.max) blocked = { scope: check.scope, window: check.window, count }
    }
    return blocked
  }
}
const guestChecks = (deviceId, ipHash) => buildLimitChecks({ userId: null, deviceId, ipHash })

test('a guest is allowed 30 messages an hour and blocked on the 31st', () => {
  const record = makeCounter()
  const windows = { hour: 1, day: 1 }
  for (let i = 0; i < CHAT_LIMITS.guestDeviceHour; i++) {
    assert.equal(record(guestChecks(DEVICE, 'ip-a'), windows), null, `message ${i + 1}`)
  }
  const blocked = record(guestChecks(DEVICE, 'ip-a'), windows)
  assert.deepEqual({ scope: blocked.scope, window: blocked.window }, { scope: 'device', window: 'hour' })
  // The next hour starts fresh.
  assert.equal(record(guestChecks(DEVICE, 'ip-a'), { hour: 2, day: 1 }), null)
})

test('a guest is blocked on the 101st message of a day even across hours', () => {
  const record = makeCounter()
  let blocked = null
  for (let hour = 1; hour <= 5 && !blocked; hour++) {
    for (let i = 0; i < CHAT_LIMITS.guestDeviceHour && !blocked; i++) {
      blocked = record(guestChecks(DEVICE, 'ip-a'), { hour, day: 1 })
    }
  }
  assert.equal(blocked.window, 'day')
  assert.equal(blocked.count, CHAT_LIMITS.guestDeviceDay + 1)
})

test('many devices on one address keep working until the shared ceiling', () => {
  const record = makeCounter()
  const windows = { hour: 1, day: 1 }
  let sent = 0
  for (let device = 0; device < 40; device++) {
    const id = DEVICE.replace(/.{2}$/, String(device % 100).padStart(2, '0'))
    for (let i = 0; i < 7; i++) {
      assert.equal(record(guestChecks(id, 'dorm-wifi'), windows), null, `device ${device} message ${i}`)
      sent++
    }
  }
  assert.equal(sent, 280) // under the 300/hour address ceiling: nobody is locked out
  assert.equal(record(guestChecks(DEVICE.replace(/.{2}$/, '99'), 'dorm-wifi'), windows), null)
})

test('one address cannot exceed the shared ceiling by minting new device ids', () => {
  const record = makeCounter()
  const windows = { hour: 1, day: 1 }
  let blocked = null
  for (let i = 0; i < CHAT_LIMITS.ipHour + 5 && !blocked; i++) {
    const fresh = DEVICE.replace(/.{4}$/, String(i).padStart(4, '0'))
    blocked = record(guestChecks(fresh, 'attacker'), windows)
  }
  assert.equal(blocked.scope, 'ip')
  assert.equal(blocked.count, CHAT_LIMITS.ipHour + 1)
})

test('the project ceiling stops everyone at 1500 a day, guests and members alike', () => {
  const record = makeCounter()
  let blocked = null
  for (let i = 0; i < CHAT_LIMITS.projectDay + 5 && !blocked; i++) {
    // Alternating callers, fresh device ids, spread across addresses and hours:
    // nothing about who is asking gets past the project ceiling.
    const caller = i % 2 === 0
      ? { userId: null, deviceId: DEVICE.replace(/.{4}$/, String(i).padStart(4, '0')), ipHash: `ip-${i % 50}` }
      : { userId: `user-${i}`, ipHash: `ip-${i % 50}` }
    blocked = record(buildLimitChecks(caller), { hour: i % 24, day: 1 })
  }
  assert.equal(blocked.scope, 'project')
  assert.equal(blocked.count, CHAT_LIMITS.projectDay + 1)
})

// The all-guest ceiling sits above the project one, so the project ceiling is
// what actually fires today; the guest bucket only becomes reachable if
// projectDay is ever raised past it.
test('the all-guest ceiling still counts, and would fire if the project ceiling were raised', () => {
  assert.ok(CHAT_LIMITS.globalGuestDay > CHAT_LIMITS.projectDay)
  const record = makeCounter()
  const guestChecksOnly = (i) => buildLimitChecks({ userId: null, deviceId: DEVICE.replace(/.{4}$/, String(i).padStart(4, '0')), ipHash: `ip-${i % 50}` })
    .filter((check) => check.scope !== 'project')
  let blocked = null
  for (let i = 0; i < CHAT_LIMITS.globalGuestDay + 5 && !blocked; i++) {
    blocked = record(guestChecksOnly(i), { hour: i % 24, day: 1 })
  }
  assert.equal(blocked.scope, 'global')
  assert.equal(blocked.count, CHAT_LIMITS.globalGuestDay + 1)
})

test('the 429 message is translated in every bundled language', () => {
  const seen = new Set()
  for (const { code } of LANGUAGES) {
    const bundled = JSON.parse(readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url), 'utf8'))
    const message = bundled.chat?.limitReached
    assert.equal(typeof message, 'string', code)
    assert.ok(message.trim().length > 10, code)
    assert.ok(!/TODO|translate/i.test(message), code)
    // The function's own copy must match the app's, so both say the same thing.
    assert.equal(rateLimitMessage(code), message, code)
    if (code !== 'en') assert.notEqual(message, bundled.chat.errorMsg, code)
    seen.add(message)
  }
  assert.equal(seen.size, LANGUAGES.length) // no language silently left in English
})

test('an unknown or regional language code falls back to English', () => {
  assert.equal(normalizeLanguage('en-SG'), 'en')
  assert.equal(normalizeLanguage('ZH'), 'zh')
  assert.equal(normalizeLanguage('ta-LK'), 'ta')
  assert.equal(normalizeLanguage('klingon'), 'en')
  assert.equal(normalizeLanguage(undefined), 'en')
  assert.equal(rateLimitMessage(null), rateLimitMessage('en'))
})

test('retry-after is a sane number of seconds', () => {
  const now = Date.parse('2026-09-22T10:20:00Z')
  assert.equal(retryAfterSeconds('2026-09-22T11:00:00Z', now), 2400)
  assert.equal(retryAfterSeconds('2026-09-23T00:00:00Z', now), 49200)
  assert.equal(retryAfterSeconds('2026-09-22T10:19:00Z', now), 1) // never negative
  assert.equal(retryAfterSeconds('nonsense', now), 60)
  assert.ok(retryAfterSeconds('2030-01-01T00:00:00Z', now) <= 86400)
})

test('a rate-limited reply reaches the page as a status, not a raw error', async (t) => {
  const body = JSON.stringify({ error: rateLimitMessage('ta'), error_code: 'rate_limited', retry_after_seconds: 1800 })
  t.mock.method(globalThis, 'fetch', async () => new Response(body, { status: 429 }))
  await assert.rejects(fetchJson('https://fixture.invalid'), (error) => {
    assert.equal(error.status, 429)   // Chat.jsx keys the friendly message off this
    assert.equal(error.message, 'HTTP 429')
    return true
  })
  t.mock.restoreAll()
  t.mock.method(globalThis, 'fetch', async () => new Response('nope', { status: 503 }))
  await assert.rejects(fetchJson('https://fixture.invalid'), (error) => error.status === 503)
})

test('hitting the limit is measurable without sending anything about the person', () => {
  const captured = eventsToCapture('chat_rate_limited', { device_id: DEVICE, ip: '203.0.113.7', content: 'secret' }, new Map())
  assert.deepEqual(captured, [['chat_rate_limited', {}]])
  assert.deepEqual(safeEventProperties('chat_rate_limited', { device_id: DEVICE }), {})
})

test('the counter table is reachable only with the service-role key', () => {
  assert.match(migration, /ALTER TABLE public\.chat_usage ENABLE ROW LEVEL SECURITY/)
  assert.ok(!/CREATE POLICY/i.test(migration))   // RLS with no policy = no anon or user access
  assert.match(migration, /REVOKE ALL ON public\.chat_usage FROM anon, authenticated/)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.chat_usage_record\(JSONB\) FROM PUBLIC, anon, authenticated/)
  // Revoking PUBLIC must not take the Edge Function's own access with it.
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.chat_usage_record\(JSONB\) TO service_role/)
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON public\.chat_usage TO service_role/)
})

test('counting is atomic and windows are fixed, so parallel requests cannot both pass', () => {
  // One statement per bucket: insert-or-increment, then read the new count back.
  assert.match(migration, /ON CONFLICT \(scope, subject, window_kind, window_start\)\s*\n\s*DO UPDATE SET request_count = u\.request_count \+ 1/)
  assert.match(migration, /RETURNING u\.request_count INTO v_count/)
  assert.match(migration, /date_trunc\(v_window, NOW\(\)\)/)
})

test('no address is stored in the clear and no secret is logged', () => {
  assert.match(chatFn, /crypto\.subtle\.digest\('SHA-256'/)
  assert.ok(!/console\.(log|error)\([^)]*(anthropicKey|serviceRoleKey|ipSalt|clientIp|ipHash|device_id|deviceId|messages|body\.)/.test(chatFn))
  assert.ok(!/console\.(log|error)\([^)]*(apiKey|limitError\.message|limitError\.details|limitError\.hint)/i.test(chatFn))
  // The salted digest, never the address itself, is what reaches the database,
  // and the salt is its own secret with no fall back to a key.
  assert.match(chatFn, /const ipSalt = Deno\.env\.get\('CHAT_RATE_LIMIT_SALT'\)\n/)
  assert.match(chatFn, /const ipHash = clientIp && ipSalt \? await hashIp\(clientIp, ipSalt\) : null/)
  assert.ok(!/CHAT_RATE_LIMIT_SALT'\) \?\?/.test(chatFn))
})

test('a broken rate-limit check refuses the request instead of spending', () => {
  // Fail closed: the 503 return must come before the Anthropic call.
  const failure = chatFn.indexOf('if (limitError)')
  const refusal = chatFn.indexOf("return errResp('AI service temporarily unavailable', 503)")
  const anthropic = chatFn.indexOf('https://api.anthropic.com/v1/messages')
  assert.ok(failure > 0 && refusal > failure && anthropic > refusal)
  // Only the database's own error code is logged with it.
  const branch = chatFn.slice(failure, refusal)
  assert.match(branch, /console\.error\(`Chat rate limit check unavailable \(code \$\{limitError\.code \?\? 'unknown'\}\)`\)/)
  assert.equal(branch.match(/\$\{[^}]*\}/g).length, 1)
  // The client shows its ordinary error message for a 503, not the limit copy.
  assert.equal(JSON.parse(readFileSync(new URL('../src/locales/en.json', import.meta.url), 'utf8')).chat.errorMsg.length > 0, true)
})

test('chat history trimming is untouched', () => {
  assert.match(chatFn, /const trimmedMessages = messages\.slice\(-20\)/)
})
