import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { telHref } from '../src/lib/phone.js'
import { totalInterest, totalPayoffMonths } from '../src/lib/loanMath.js'
import { PRESET_CATEGORIES, presetExpenses } from '../src/lib/budgetPresets.js'
import { LANGUAGES } from '../src/lib/languages.js'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const locales = Object.fromEntries(LANGUAGES.map(({ code }) => [code, JSON.parse(read(`src/locales/${code}.json`))]))
const en = locales.en
const asciiDigits = (s) => s.replace(/\p{Nd}/gu, (d) => telHref(d).slice(4))
const strings = (o) => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [])
const sourceFiles = (dir) => readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap((name) => {
  const path = `${dir}/${name}`
  return statSync(new URL(`../${path}`, import.meta.url)).isDirectory() ? sourceFiles(path) : /\.(jsx?|ts)$/.test(name) ? [path] : []
})
const code = [...sourceFiles('src'), ...sourceFiles('supabase/functions')].map((path) => [path, read(path)])

// ── Contact numbers and official links ────────────────────────────────────────

const RETIRED = [
  ['1800-333-1313', /1800[-\s]?333[-\s]?1313/], ['TWC2 6790-4430', /6790[-\s]?4430/], ['TWC2 6509-0026', /6509[-\s]?0026/],
  ['FAST 6258-5025', /6258[-\s]?5025/], ['IRR 9151-4756', /9151[-\s]?4756/], ['ComCare (Singapore Citizens/PRs only)', /1800[-\s]?(222|777)[-\s]?0000/],
  ['MoneySense 1800-227-1177', /1800[-\s]?227[-\s]?1177/], ['moneylenders.justice.gov.sg', /moneylenders\.justice\.gov\.sg/],
  ['employment-agencies-search', /employment-agencies-search/], ['police media-room link', /police\.gov\.sg\/media-room\/news/], ['MOM advisories link', /mom\.gov\.sg\/newsroom\/advisories/],
  ['MOM Taskforce', /MOM (Taskforce|专案组|ٹاسک فورس|टास्कफोर्स)/],
]

test('wrong, unverifiable or non-worker numbers and dead links appear nowhere in any language or code', () => {
  for (const [code_, locale] of Object.entries(locales)) {
    const text = strings(locale).map(asciiDigits).join('\n')
    for (const [name, pattern] of RETIRED) assert.doesNotMatch(text, pattern, `${code_}: ${name}`)
  }
  for (const [path, text] of code) {
    for (const [name, pattern] of RETIRED) assert.doesNotMatch(text, pattern, `${path}: ${name}`)
  }
})

test('MOM is given as its official line, 6438 5122, Mon–Fri 8.30am–5.30pm', () => {
  for (const [code_, locale] of Object.entries(locales)) {
    for (const value of [locale.scams.emergencyBanner, locale.emergency.footer, locale.bankingGuide.steps[2].body, locale.scamQuiz.questions[1].explanation]) {
      assert.match(asciiDigits(value), /6438-5122/, code_)
    }
    const mom = locale.loanshark.helpContacts[3]
    assert.equal(mom.org, 'Ministry of Manpower (MOM)')
    assert.equal(asciiDigits(mom.number), '6438-5122')
    assert.match(asciiDigits(mom.hours), /8:30 am – 5:30 pm/)
  }
  assert.match(read('src/App.jsx'), /label: 'MOM Helpline',\s+number: '6438-5122'/)
  assert.match(read('src/pages/Emergency.jsx'), /number: '6438-5122',\s+hours: 'Mon – Fri 8:30 am – 5:30 pm'/)
  assert.match(read('src/pages/BankingGuide.jsx'), /HELPLINE_NUMBERS = \['6438-5122', '999', '1800-888-1515'\]/)
})

test('6438 5122 is not described as a free call in any language', () => {
  const freeCall = ['free call', 'இலவச அழைப்பு', 'मुफ्त कॉल', 'বিনামূল্যে কল', 'အခမဲ့', 'නොමිලේ', 'libreng tawag', 'panggilan gratis', '免费电话', 'โทรฟรี', 'مفت کال', 'निःशुल्क कल']
  for (const [code_, locale] of Object.entries(locales)) {
    for (const phrase of freeCall) assert.ok(!locale.bankingGuide.steps[2].body.includes(phrase), `${code_}: ${phrase}`)
  }
})

test('dead official links are replaced by the working official addresses', () => {
  for (const [code_, locale] of Object.entries(locales)) {
    assert.match(locale.scamQuiz.questions[1].explanation, /mom\.gov\.sg\/eadirectory/, code_)
    for (const value of [locale.loanshark.verifyNote, locale.loanshark.flags[1].detail, locale.loanshark.risks.green.summary]) {
      assert.match(value, /rom\.mlaw\.gov\.sg/, code_)
    }
  }
  assert.match(read('supabase/functions/fetch-scam-alerts/index.ts'), /police\.gov\.sg\/Media-Hub\/News/)
})

test('Emergency page lists only verified numbers and no unsupported helpline claims', () => {
  const page = read('src/pages/Emergency.jsx')
  assert.match(page, /roleKey: 'twc2'.*number: '1800-888-1515', hours: 'Mon – Fri 9:00 am – 9:00 pm'/)
  assert.match(page, /roleKey: 'fast'.*number: '1800-3394-357' \}/, 'FAST publishes no hours, so none are shown')
  // ComCare is only for Singapore Citizens / PRs with a citizen in the household, so it is not a worker resource.
  for (const removed of ['comcare', 'irr', 'moneysense', 'antiscam', 'momtaskforce']) assert.doesNotMatch(page, new RegExp(`roleKey: '${removed}'`))
})

test('the AI assistant is only given verified contacts', () => {
  const prompt = read('src/pages/Chat.jsx').match(/const SYSTEM_PROMPT =\s*'([^']*)'/)[1]
  for (const number of ['1800-924-5664', '1799', '6438 5122', '999']) assert.ok(prompt.includes(number), number)
  assert.match(prompt, /Do not give any other phone numbers/)
  assert.ok(prompt.length <= 1000, 'the chat function keeps only the first 1000 characters')
})

// ── Bengali numerals in tel: links ────────────────────────────────────────────

test('tel links accept numbers written in any locale digit script', () => {
  assert.equal(telHref('6438-5122'), 'tel:64385122')
  assert.equal(telHref('১৮০০-৯২৪-৫৬৬৪'), 'tel:18009245664')
  assert.equal(telHref('৯৯৯'), 'tel:999')
  assert.equal(telHref('१८००-२२५५-५२९'), 'tel:18002255529')
  assert.equal(telHref('၉၉၉'), 'tel:999')
  assert.equal(telHref('۹۹۹'), 'tel:999')
  assert.equal(telHref('๙๙๙'), 'tel:999')
  assert.equal(telHref('９９９'), 'tel:999')
})

test('every Loan Shark help number dials the same number as English in all 12 languages', () => {
  const expected = en.loanshark.helpContacts.map((c) => telHref(c.number))
  assert.ok(expected.every((href) => /^tel:\d{3,}$/.test(href)))
  for (const [code_, locale] of Object.entries(locales)) {
    assert.deepEqual(locale.loanshark.helpContacts.map((c) => telHref(c.number)), expected, code_)
  }
  for (const path of ['src/pages/LoanShark.jsx', 'src/pages/Emergency.jsx', 'src/pages/BankingGuide.jsx', 'src/App.jsx']) {
    assert.doesNotMatch(read(path), /tel:\$\{[^}]*replace\(\/\[\^0-9\]/, `${path} builds tel links through telHref`)
  }
})

// ── Tamil / Sinhala safety text ───────────────────────────────────────────────

test('confirmed Tamil and Sinhala safety-text corrections', () => {
  const ta = locales.ta, si = locales.si
  assert.match(ta.scamQuiz.questions[1].options[1], /சட்டபூர்வமான முதலாளிகள்/, 'legitimate employers, as in en')
  assert.doesNotMatch(ta.scamQuiz.questions[1].options[1], /சட்டவிரோத/)
  assert.match(ta.scamQuiz.questions[5].options[1], /^SMS ஐ /)
  assert.match(si.loanshark.risks.red.summary, /බහු බරපතළ රතු ධජ/)
  for (const value of [si.loanshark.helpContacts[0].note, si.emergency.roles.xahlong]) assert.match(value, /නිර්නාමිකව/, 'anonymous, not "by name"')
})

test('no locale contains replacement characters or Korean text', () => {
  for (const [code_, locale] of Object.entries(locales)) {
    const text = strings(locale).join('\n')
    assert.ok(!text.includes('\uFFFD'), `${code_}: U+FFFD`)
    assert.doesNotMatch(text, /[\uAC00-\uD7AF]/, `${code_}: Hangul`)
  }
})

// ── SDIC ──────────────────────────────────────────────────────────────────────

test('SDIC deposit insurance is stated as S$100,000 in every language', () => {
  for (const [code_, locale] of Object.entries(locales)) {
    for (const value of [locale.emergencyFund.disclaimer, locale.emergencyFund.tips[0].body]) {
      assert.match(value, code_ === 'id' ? /S\$100\.000/ : /S\$100,000/, code_)
      assert.doesNotMatch(value, /75[,.]000/, code_)
    }
  }
})

// ── Budget presets ────────────────────────────────────────────────────────────

test('budget preset categories keep the same ids across loads and languages', () => {
  const english = presetExpenses((k) => `en:${k}`)
  const tamil = presetExpenses((k) => `ta:${k}`)
  assert.deepEqual(english.map((c) => c.id), presetExpenses((k) => `en:${k}`).map((c) => c.id))
  assert.deepEqual(english.map((c) => c.id), tamil.map((c) => c.id))
  assert.equal(new Set(english.map((c) => c.id)).size, english.length)
  for (const { id } of english) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'budget_entries.category_id is a UUID')
  assert.deepEqual(english.map((c) => [c.name, c.amount]), [['en:budget.presetRent', 400], ['en:budget.presetGroceries', 200], ['en:budget.presetTransport', 80], ['en:budget.presetPhone', 20]])
  assert.equal(PRESET_CATEGORIES.length, 4)
})

test('spending logged on a preset before the budget is saved is still there on the next load', () => {
  const firstLoad = presetExpenses((k) => k)
  const entry = { id: 'e1', categoryId: firstLoad[0].id, date: '2026-09-18', amount: 25, note: '' }
  const nextLoad = presetExpenses((k) => k)
  assert.deepEqual([entry].filter((e) => e.categoryId === nextLoad[0].id), [entry])
})

// ── Loan interest ─────────────────────────────────────────────────────────────

// Independent month-by-month reference: interest accrues on the balance, then a
// payment of up to monthlyPayment is made.
function simulatedInterest(principal, ratePct, payment) {
  let balance = principal, interest = 0
  for (let month = 0; balance > 1e-9; month++) {
    if (month > 1200) return null
    const charge = balance * ratePct / 100
    interest += charge
    balance = balance + charge - Math.min(payment, balance + charge)
  }
  return interest
}

test('total interest matches a month-by-month repayment schedule', () => {
  for (const [principal, rate, payment] of [[1000, 0, 300], [5000, 2, 500], [2000, 1, 300], [3000, 4, 200], [10000, 0.5, 250], [800, 1.5, 800], [1200, 1, 100]]) {
    const expected = simulatedInterest(principal, rate, payment)
    assert.ok(Math.abs(totalInterest(principal, rate, payment) - expected) < 0.01, `${principal} @ ${rate}% paying ${payment}: expected ${expected.toFixed(2)}, got ${totalInterest(principal, rate, payment)}`)
  }
})

test('a 0% loan shows no interest (was S$200 for S$1,000 paid at S$300/month)', () => {
  assert.equal(totalInterest(1000, 0, 300), 0)
  assert.equal(totalPayoffMonths(1000, 0, 300), 4)
})

test('a loan whose payment never covers the interest has no total interest', () => {
  assert.equal(totalInterest(1000, 5, 50), null)
  assert.equal(totalInterest(1000, 1, 0), null)
})
