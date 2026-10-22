import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { wiseLink, WISE_PLAIN_URL } from '../src/lib/affiliate.js'

test('without a referral link, Go to Wise opens wise.com and no disclosure is due', () => {
  assert.deepEqual(wiseLink(''), { url: WISE_PLAIN_URL, referral: false })
  assert.deepEqual(wiseLink('   '), { url: WISE_PLAIN_URL, referral: false })
  assert.deepEqual(wiseLink(undefined), { url: WISE_PLAIN_URL, referral: false })
})

test('a valid https referral link is used and marks the row as a referral', () => {
  const r = wiseLink('https://prf.hn/click/camref:1234abcd')
  assert.equal(r.referral, true)
  assert.equal(r.url, 'https://prf.hn/click/camref:1234abcd')
})

test('a malformed or non-https link falls back to wise.com', () => {
  assert.equal(wiseLink('not a url').referral, false)
  assert.equal(wiseLink('http://prf.hn/click/camref:1').referral, false)
  assert.equal(wiseLink('javascript:alert(1)').url, WISE_PLAIN_URL)
})

test("every language has Wise's disclosure, and English uses Wise's exact wording", () => {
  const dir = new URL('../src/locales/', import.meta.url)
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const r = JSON.parse(readFileSync(new URL(f, dir), 'utf8')).remittance
    assert.ok(r.wiseAffiliateDisclosure?.includes('Remlo'), `${f} is missing the disclosure`)
    assert.ok(r.wiseAffiliateDisclosure.includes('Wise'), `${f} disclosure must name Wise`)
  }
  const en = JSON.parse(readFileSync(new URL('en.json', dir), 'utf8')).remittance
  assert.equal(en.wiseAffiliateDisclosure,
    'Remlo may earn a commission if you sign up through our Wise link and complete a qualifying transaction.')
})

test('the disclosure sits with the Go to Wise link and only appears for a referral link', () => {
  const src = readFileSync(new URL('../src/pages/Remittance.jsx', import.meta.url), 'utf8')
  const at = src.indexOf("t('remittance.wiseAffiliateDisclosure')")
  assert.ok(at > 0)
  assert.match(src.slice(at - 300, at), /p\.referral/)
  assert.ok(src.indexOf("t('remittance.visitProvider'", at) - at < 800, 'disclosure must be next to the button')
})

test('the Terms disclose the commission and no longer say Remlo is unpaid', () => {
  const terms = readFileSync(new URL('../src/pages/TermsOfService.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(terms, /does not receive payment/)
  assert.match(terms, /Remlo may earn a commission if you sign up through our Wise link and complete a qualifying transaction/)
})
