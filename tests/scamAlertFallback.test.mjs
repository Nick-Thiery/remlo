import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ENGLISH_FALLBACK_LANGUAGES, servesEnglishAlerts } from '../supabase/functions/fetch-scam-alerts/alertLanguage.ts'
import { LANGUAGES } from '../src/lib/languages.js'

const source = readFileSync(new URL('../supabase/functions/fetch-scam-alerts/index.ts', import.meta.url), 'utf8')
const LANG_NAMES = Object.fromEntries([...source.match(/const LANG_NAMES[^{]*\{([^}]*)\}/)[1].matchAll(/(\w+): '([^']+)'/g)].map((m) => [m[1], m[2]]))

// Mirrors the function: Step 3 returns English early; otherwise Step 6 overlays cached translations.
function alertsFor(language, englishAlerts, cache) {
  if (servesEnglishAlerts(language, LANG_NAMES)) return englishAlerts
  return englishAlerts.map((a) => {
    const tx = cache[language]?.[a.id]
    return tx ? { ...a, title: tx.title, description: tx.description, what_to_do: tx.what_to_do } : a
  })
}
const ENGLISH = [{
  id: 'alert_loanscam_001', type: 'loanScam', severity: 'high', source: 'SPF',
  source_url: 'https://www.police.gov.sg/Media-Hub/News', published_at: '2025-07-12T00:00:00Z',
  title: 'Illegal Moneylenders Offering Instant Loans via SMS', description: 'Unlicensed lenders send SMS…',
  what_to_do: ['All licensed lenders are listed at rom.mlaw.gov.sg.', 'Call the X-Ah Long hotline: 1800-924-5664.'],
}]
const CACHE = Object.fromEntries(Object.keys(LANG_NAMES).map((lang) => [lang, {
  alert_loanscam_001: { title: `[${lang}] title`, description: `[${lang}] description`, what_to_do: [`[${lang}] rom.mlaw.gov.sg`, `[${lang}] 1800-924-5664`] },
}]))

test('Tamil, Sinhala and Burmese scam alerts get the verified English text, not cached translations', () => {
  assert.deepEqual(ENGLISH_FALLBACK_LANGUAGES, ['ta', 'si', 'my'])
  for (const lang of ['ta', 'si', 'my']) {
    assert.equal(servesEnglishAlerts(lang, LANG_NAMES), true, lang)
    assert.deepEqual(alertsFor(lang, ENGLISH, CACHE), ENGLISH, `${lang}: numbers, links and metadata unchanged`)
  }
})

test('every other Remlo language keeps its localized scam alerts', () => {
  const others = LANGUAGES.map(({ code }) => code).filter((code) => !['en', 'ta', 'si', 'my'].includes(code))
  assert.deepEqual(others, ['hi', 'bn', 'fil', 'id', 'zh', 'th', 'ur', 'ne'])
  for (const lang of others) {
    assert.equal(servesEnglishAlerts(lang, LANG_NAMES), false, lang)
    const [alert] = alertsFor(lang, ENGLISH, CACHE)
    assert.equal(alert.title, `[${lang}] title`)
    assert.equal(alert.source_url, ENGLISH[0].source_url)
    assert.equal(alert.severity, 'high')
  }
  assert.equal(servesEnglishAlerts('en', LANG_NAMES), true)
  assert.equal(servesEnglishAlerts('xx', LANG_NAMES), true, 'unsupported languages still get English')
})

test('fallback languages never reach the translation cache or a new machine translation', () => {
  const fallbackReturn = source.search(/if \(servesEnglishAlerts\(language, LANG_NAMES\)\) \{\s*return new Response\(\s*JSON\.stringify\(\{ alerts: englishAlerts/)
  assert.ok(fallbackReturn > 0, 'Step 3 returns the English alerts for fallback languages')
  assert.ok(fallbackReturn < source.indexOf(".from('scam_alert_translations')"), 'before the cache is read')
  assert.ok(fallbackReturn < source.indexOf('callAnthropic(uncached'), 'before any translation request')
})

test('removing a language from the fallback list restores its translations', () => {
  for (const lang of ENGLISH_FALLBACK_LANGUAGES) assert.ok(LANG_NAMES[lang], `${lang} is still a translatable language`)
})
