import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { guestLandingPath } from '../src/lib/entryRoute.js'
import { CORRECT_SOURCE_INDEX, DISPLAY_ORDER, QUIZ_VERSION, buildQuizQuestions, scoreAnswers } from '../src/lib/scamQuiz.js'
import { ACTIVATION_STORAGE_KEY, EVENT_FIELDS, eventsToCapture, safeEventProperties, sanitizeCapture } from '../src/lib/analyticsPolicy.js'
import { createSafeStorage } from '../src/lib/safeStorage.js'
import { LANGUAGES } from '../src/lib/languages.js'

const locales = Object.fromEntries(LANGUAGES.map(({ code }) =>
  [code, JSON.parse(readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url)))]))
const english = locales.en.scamQuiz.questions
const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const freshDevice = () => createSafeStorage(() => { throw new Error('no storage') })
const correctPositions = (questions) => questions.map(q => q.options.findIndex(o => o.correct))

// Mirrors ScamQuiz: one scam_question_answered per answer, then scam_quiz_completed.
function playQuiz(storage, questions, pickDisplayIdx) {
  const events = []
  const answers = []
  questions.forEach((q, i) => {
    const correct = q.options[pickDisplayIdx(q, i)].correct
    events.push(...eventsToCapture('scam_question_answered', { question: i + 1, correct, quiz_version: QUIZ_VERSION }, storage))
    answers.push(correct)
  })
  events.push(...eventsToCapture('scam_quiz_completed', { score: scoreAnswers(answers), total: questions.length, quiz_version: QUIZ_VERSION }, storage))
  return events
}
const pickCorrect = q => q.options.findIndex(o => o.correct)

// ── Entry routing ────────────────────────────────────────────────────────────

test('guest setup from root or /login lands on Home, not the quiz', () => {
  assert.equal(guestLandingPath('/'), '/')
  assert.equal(guestLandingPath('/login'), '/')
  assert.equal(guestLandingPath(''), '/')
  const onboarding = source('pages/Onboarding.jsx')
  assert.match(onboarding, /guestLandingPath\(window\.location\.pathname\)/)
  assert.doesNotMatch(onboarding, /workshop\.nextScam/, 'setup must not promise the quiz as the next step')
  assert.doesNotMatch(source('pages/Login.jsx'), /navigate\(['"]\/scam-quiz/)
})

test('intentional deep links survive guest setup', () => {
  for (const path of ['/scam-quiz', '/remittance', '/budget', '/savings', '/chat', '/scams', '/more', '/banking-guide']) {
    assert.equal(guestLandingPath(path), path)
  }
})

// ── Scam quiz answer order ───────────────────────────────────────────────────

test('correct scam answers are spread across A, B and C, not all B', () => {
  const positions = correctPositions(buildQuizQuestions(english))
  assert.equal(positions.length, 8)
  assert.equal(new Set(positions).size, 3, 'every letter is used')
  for (const letter of [0, 1, 2]) {
    const count = positions.filter(p => p === letter).length
    assert.ok(count >= 2 && count <= 3, `letter ${'ABC'[letter]} is correct ${count} times`)
  }
  assert.ok(positions.every((p, i) => i === 0 || p !== positions[i - 1]), 'no letter repeats on consecutive questions')
})

test('answer order is a fixed permutation, identical across languages, renders and restarts', () => {
  assert.equal(DISPLAY_ORDER.length, 8)
  for (const order of DISPLAY_ORDER) assert.deepEqual([...order].sort(), [0, 1, 2])
  assert.deepEqual(buildQuizQuestions(english), buildQuizQuestions(english))
  const englishPositions = correctPositions(buildQuizQuestions(english))
  for (const [code, locale] of Object.entries(locales)) {
    assert.deepEqual(correctPositions(buildQuizQuestions(locale.scamQuiz.questions)), englishPositions, code)
  }
})

test('the English safe answer is the one scored correct for every question', () => {
  const safeAnswers = [
    'This is a scam — MOM never asks for SingPass passwords',
    'This is a job scam — legitimate employers never charge workers upfront fees',
    'Ignore it — this is an unlicensed loan shark (Ah Long)',
    'Call MOM: 6438-5122',
    'Refuse — using your account this way is money mule fraud, which is a criminal offence',
    'Delete the SMS — this is a phishing scam. Call DBS directly at 1800-111-1111',
    'Report the group — this is a classic investment scam with fake testimonials',
    'Refuse — never pay before viewing. This is likely a rental scam',
  ]
  const questions = buildQuizQuestions(english)
  questions.forEach((q, i) => {
    assert.deepEqual(q.options.filter(o => o.correct).map(o => o.text), [safeAnswers[i]])
    assert.equal(q.explanation, english[i].explanation)
  })
})

test('every locale scores its own translated safe answer, with the matching explanation', () => {
  for (const [code, locale] of Object.entries(locales)) {
    const texts = locale.scamQuiz.questions
    const questions = buildQuizQuestions(texts)
    assert.equal(questions.length, 8, code)
    questions.forEach((q, i) => {
      assert.equal(q.options.length, 3, `${code} Q${i + 1}`)
      assert.ok(q.options.every(o => o.text), `${code} Q${i + 1} has no blank option`)
      assert.deepEqual(q.options.map(o => o.text).sort(), [...texts[i].options].sort(), `${code} Q${i + 1} keeps every option`)
      assert.deepEqual(q.options.filter(o => o.correct).map(o => o.text), [texts[i].options[CORRECT_SOURCE_INDEX[i]]], `${code} Q${i + 1}`)
      assert.equal(q.scenario, texts[i].scenario)
      assert.equal(q.explanation, texts[i].explanation)
    })
    // Language-independent anchors: only the safe answer contains the official number.
    assert.match(questions[3].options.find(o => o.correct).text, /6438-5122/, `${code} Q4`)
    assert.match(questions[5].options.find(o => o.correct).text, /1800-111-1111/, `${code} Q6`)
  }
})

test('scoring follows the semantic answer, so always picking B no longer scores 8/8', () => {
  const questions = buildQuizQuestions(english)
  const score = pick => scoreAnswers(questions.map((q, i) => q.options[pick(q, i)].correct))
  assert.equal(score(pickCorrect), 8)
  assert.equal(score(q => (pickCorrect(q) + 1) % 3), 0)
  assert.equal(score(() => 1), correctPositions(questions).filter(p => p === 1).length)
  assert.ok(score(() => 1) < 4)
})

test('a quiz that is missing locale text degrades to empty strings instead of crashing', () => {
  const questions = buildQuizQuestions('scamQuiz.questions')
  assert.equal(questions.length, 8)
  assert.equal(questions[0].scenario, '')
})

// ── Analytics ────────────────────────────────────────────────────────────────

test('quiz completion analytics fire once, with the semantic score', () => {
  const questions = buildQuizQuestions(english)
  const events = playQuiz(freshDevice(), questions, (q, i) => (i < 5 ? pickCorrect(q) : (pickCorrect(q) + 1) % 3))
  const answered = events.filter(([name]) => name === 'scam_question_answered').map(([, p]) => p)
  assert.deepEqual(answered.map(p => p.question), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(answered.map(p => p.correct), [true, true, true, true, true, false, false, false])
  assert.ok(answered.every(p => p.quiz_version === 2))
  assert.deepEqual(events.filter(([name]) => name === 'scam_quiz_completed'), [['scam_quiz_completed', { score: 5, total: 8, quiz_version: 2 }]])
})

test('answering the first scam question is not recorded as activation or completion', () => {
  const storage = freshDevice()
  const [q1] = buildQuizQuestions(english)
  const events = eventsToCapture('scam_question_answered', { question: 1, correct: q1.options[pickCorrect(q1)].correct, quiz_version: QUIZ_VERSION }, storage)
  assert.deepEqual(events, [['scam_question_answered', { question: 1, correct: true, quiz_version: 2 }]])
  assert.equal(storage.getItem(ACTIVATION_STORAGE_KEY), null)
  assert.doesNotMatch(source('pages/ScamQuiz.jsx'), /trackActivation/)
  assert.doesNotMatch(source('lib/analytics.js'), /answer_and_view_explanation/)
})

test('finishing the quiz is activation v2 with an explicit version, sent once per device', () => {
  const storage = freshDevice()
  const questions = buildQuizQuestions(english)
  const first = playQuiz(storage, questions, pickCorrect)
  assert.deepEqual(first.slice(-2), [
    ['scam_quiz_completed', { score: 8, total: 8, quiz_version: 2 }],
    ['first_useful_action_completed', { feature: 'scam-quiz', action: 'quiz_completed', activation_version: 2 }],
  ])
  const retry = playQuiz(storage, questions, pickCorrect)
  assert.equal(retry.filter(([name]) => name === 'first_useful_action_completed').length, 0)
  assert.equal(retry.filter(([name]) => name === 'scam_quiz_completed').length, 1)
})

test('activation v2 credits whichever core feature a device completes first', () => {
  const activation = (storage, event, properties = {}) =>
    eventsToCapture(event, properties, storage).find(([name]) => name === 'first_useful_action_completed')?.[1]
  assert.deepEqual(activation(freshDevice(), 'chat_response_received'), { feature: 'chat', action: 'response_received', activation_version: 2 })
  assert.deepEqual(activation(freshDevice(), 'savings_goal_created', { target_amount: 900 }), { feature: 'savings', action: 'goal_created', activation_version: 2 })
  assert.deepEqual(activation(freshDevice(), 'remittance_compared', { destination_country: 'IN' }), { feature: 'remittance', action: 'rates_compared', activation_version: 2 })

  const budget = freshDevice()
  assert.equal(activation(budget, 'budget_updated', { income: 0, expense_count: 6 }), undefined, 'empty income blur is not a completed budget')
  assert.deepEqual(activation(budget, 'budget_updated', { income: 1800, expense_count: 6 }), { feature: 'budget', action: 'budget_saved', activation_version: 2 })

  const chatFirst = freshDevice()
  activation(chatFirst, 'chat_response_received')
  assert.equal(activation(chatFirst, 'scam_quiz_completed', { score: 8, total: 8 }), undefined)

  assert.equal(activation(freshDevice(), 'chat_message_sent'), undefined, 'sending alone is not a completion')
  assert.equal(activation(freshDevice(), 'feature_opened', { feature: '/budget' }), undefined, 'opening a page is not a completion')
})

test('devices activated under v1 can still record their first v2 activation', () => {
  const storage = freshDevice()
  storage.setItem('remlo_activated', 'true')
  const events = eventsToCapture('chat_response_received', {}, storage)
  assert.deepEqual(events.at(-1), ['first_useful_action_completed', { feature: 'chat', action: 'response_received', activation_version: 2 }])
})

// ── Privacy allowlist ────────────────────────────────────────────────────────

test('event allowlist only gains the activation_version and quiz_version fields', () => {
  assert.deepEqual(EVENT_FIELDS, {
    app_opened: ['return_session'], onboarding_started: [],
    onboarding_completed: ['country', 'language'], country_selected: ['country'],
    language_selected: ['language'], feature_opened: ['feature'],
    first_useful_action_completed: ['feature', 'action', 'activation_version'],
    scam_question_answered: ['question', 'correct', 'quiz_version'],
    scam_quiz_completed: ['score', 'total', 'quiz_version'],
    guest_mode_selected: [], login: ['method'], signup: ['method', 'awaiting_confirmation'],
    chat_message_sent: [], chat_response_received: [], chat_failed: [],
    budget_updated: ['expense_count'], savings_goal_created: [],
    remittance_compared: ['destination_country'],
  })
})

test('activation events carry only fixed values, never amounts, messages, contacts or URLs', () => {
  assert.deepEqual(safeEventProperties('first_useful_action_completed', {
    feature: 'budget', action: 'budget_saved', activation_version: 2,
    income: 1800, message: 'my salary', email: 'worker@example.test', url: 'https://example.test/?token=x',
  }), { feature: 'budget', action: 'budget_saved', activation_version: 2 })
  assert.deepEqual(safeEventProperties('first_useful_action_completed', { feature: 'worker@example.test', action: 'typed free text', activation_version: '2' }), {})

  const budget = eventsToCapture('budget_updated', { income: 1800, expense_count: 6 }, freshDevice())
  assert.ok(budget.every(([, properties]) => !JSON.stringify(properties).includes('1800')))
  assert.deepEqual(eventsToCapture('savings_goal_created', { target_amount: 5000 }, freshDevice())[0], ['savings_goal_created', {}])
  assert.deepEqual(eventsToCapture('remittance_compared', { amount: 500, destination_country: 'BD' }, freshDevice())[0], ['remittance_compared', { destination_country: 'BD' }])

  const unknown = freshDevice()
  assert.deepEqual(eventsToCapture('$identify', { email: 'x' }, unknown), [])
  assert.equal(unknown.getItem(ACTIVATION_STORAGE_KEY), null)

  const captured = sanitizeCapture({ event: 'first_useful_action_completed', properties: { feature: 'chat', action: 'response_received', activation_version: 2, $current_url: 'https://example.test/chat', token: 'public-project-key' } })
  assert.equal(captured.properties.activation_version, 2)
  assert.equal(captured.properties.$current_url, undefined)
})

test('quiz events send quiz_version 2 so post-change data is separable from the all-B quiz', () => {
  assert.equal(QUIZ_VERSION, 2)
  const quiz = source('pages/ScamQuiz.jsx')
  assert.match(quiz, /track\('scam_question_answered', \{[^}]*quiz_version: QUIZ_VERSION[^}]*\}\)/)
  assert.match(quiz, /track\('scam_quiz_completed', \{[^}]*quiz_version: QUIZ_VERSION[^}]*\}\)/)

  const events = playQuiz(freshDevice(), buildQuizQuestions(english), pickCorrect)
  for (const [name, properties] of events) {
    if (name === 'scam_question_answered') assert.deepEqual(Object.keys(properties).sort(), ['correct', 'question', 'quiz_version'])
    if (name === 'scam_quiz_completed') assert.deepEqual(Object.keys(properties).sort(), ['quiz_version', 'score', 'total'])
    if (name.startsWith('scam_')) assert.equal(properties.quiz_version, 2)
  }

  // Legacy-shaped events (historical, or a stale cached app) are not given a version.
  assert.deepEqual(safeEventProperties('scam_question_answered', { question: 1, correct: true }), { question: 1, correct: true })
  assert.deepEqual(safeEventProperties('scam_quiz_completed', { score: 8, total: 8 }), { score: 8, total: 8 })
})

test('quiz_version accepts only the fixed value and adds no user data', () => {
  for (const bad of ['2', 1, 3, 'worker@example.test', true]) {
    assert.deepEqual(safeEventProperties('scam_question_answered', { question: 1, correct: false, quiz_version: bad }), { question: 1, correct: false })
  }
  assert.deepEqual(safeEventProperties('scam_question_answered', {
    question: 2, correct: true, quiz_version: 2,
    answer_text: 'Refuse — using your account this way', display_position: 'C', language: 'ta',
    email: 'worker@example.test', phone: '+6591234567', url: 'https://example.test/?token=x',
  }), { question: 2, correct: true, quiz_version: 2 })
  assert.deepEqual(safeEventProperties('scam_quiz_completed', { score: 6, total: 8, quiz_version: 2, answers: [true, false], name: 'Ravi' }), { score: 6, total: 8, quiz_version: 2 })

  const captured = sanitizeCapture({ event: 'scam_quiz_completed', properties: { score: 6, total: 8, quiz_version: 2, $current_url: 'https://example.test/scam-quiz', token: 'public-project-key', distinct_id: 'device-id' } })
  assert.equal(captured.properties.quiz_version, 2)
  assert.equal(captured.properties.$current_url, undefined)
})
