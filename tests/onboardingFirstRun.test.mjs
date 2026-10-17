import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { detectDeviceLanguage } from '../src/lib/deviceLanguage.js'
import { LANGUAGES } from '../src/lib/languages.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('a phone set to one of our languages starts Remlo in that language', () => {
  assert.equal(detectDeviceLanguage(['bn-BD', 'en']), 'bn')
  assert.equal(detectDeviceLanguage(['ta-SG']), 'ta')
  assert.equal(detectDeviceLanguage(['hi_IN']), 'hi')
  assert.equal(detectDeviceLanguage(['zh-Hans-CN']), 'zh')
  assert.equal(detectDeviceLanguage(['my-MM']), 'my')
  assert.equal(detectDeviceLanguage(['ur-PK']), 'ur')
})

test('browser codes that differ from ours are mapped', () => {
  assert.equal(detectDeviceLanguage(['tl-PH']), 'fil')
  assert.equal(detectDeviceLanguage(['in-ID']), 'id')
})

test('English, unsupported or missing languages leave the default (English) alone', () => {
  assert.equal(detectDeviceLanguage(['en-SG', 'bn']), null, 'English first means English')
  assert.equal(detectDeviceLanguage(['en-US']), null)
  assert.equal(detectDeviceLanguage(['ne-NP']), null, 'Nepali is not supported')
  assert.equal(detectDeviceLanguage(['ne-NP', 'hi-IN']), 'hi', 'first supported language on the list wins')
  assert.equal(detectDeviceLanguage([]), null)
  assert.equal(detectDeviceLanguage([undefined, null, ''], ['en']), null)
})

test('only a code Remlo has is ever returned', () => {
  const codes = new Set(LANGUAGES.map(l => l.code))
  for (const tag of ['vi-VN', 'th-TH', 'si-LK', 'id-ID', 'fr-FR', 'de']) {
    const found = detectDeviceLanguage([tag])
    assert.ok(found === null || codes.has(found), tag)
  }
})

test('a saved choice always wins over the phone language, and a set language is not replaced by the country tap', () => {
  assert.match(read('src/i18n.js'), /safeStorage\.getItem\('remlo_lang'\) \|\| detectDeviceLanguage\(\) \|\| 'en'/)
  const onboarding = read('src/pages/Onboarding.jsx')
  assert.match(onboarding, /languageIsSet = \(\) => !!safeStorage\.getItem\('remlo_lang'\) \|\| !!detectDeviceLanguage\(\)/)
  assert.match(onboarding, /if \(!explicitLanguage\.current\)/)
})

test('setup screen strings exist in every language', () => {
  for (const { code } of LANGUAGES) {
    const workshop = JSON.parse(read(`src/locales/${code}.json`)).workshop
    for (const key of ['pickCountry', 'otherCountry']) assert.ok(workshop[key]?.trim(), `${code}.workshop.${key}`)
  }
  assert.doesNotMatch(read('src/pages/Onboarding.jsx'), /c\.code === 'OTHER' \? c\.name/, '"Other" must be translated')
})
