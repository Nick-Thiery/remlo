import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createSafeStorage } from '../src/lib/safeStorage.js'
import { campaignFromSearch, safeEventProperties, sanitizeCapture } from '../src/lib/analyticsPolicy.js'
import { fetchJson } from '../src/lib/fetchJson.js'
import { LANGUAGES } from '../src/lib/languages.js'

function mockStorage() {
  const data = new Map()
  return { data, get length() { return data.size }, key: i => [...data.keys()][i], getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) }
}
test('guest setup remains usable when storage is blocked', () => {
  const storage = createSafeStorage(() => { throw new Error('blocked') })
  storage.setItem('remlo_guest', true)
  storage.setItem('remlo_lang', 'bn')
  assert.equal(storage.getItem('remlo_guest'), 'true')
  assert.equal(storage.getItem('remlo_lang'), 'bn')
  storage.removeItem('remlo_guest')
  assert.equal(storage.getItem('remlo_guest'), null)
})
test('quota fallback overrides stale disk state and clears only Remlo keys', () => {
  const disk = mockStorage()
  disk.setItem('remlo_lang','en'); disk.setItem('other-app','keep')
  disk.setItem = () => { throw new Error('quota') }
  const storage = createSafeStorage(() => disk)
  storage.setItem('remlo_lang','ta')
  assert.equal(storage.getItem('remlo_lang'),'ta')
  storage.clear()
  assert.equal(storage.getItem('remlo_lang'),null)
  assert.equal(disk.getItem('other-app'),'keep')
})
test('preferences persist through fresh storage wrappers', () => {
  const disk=mockStorage();createSafeStorage(()=>disk).setItem('remlo_lang','ur')
  assert.equal(createSafeStorage(()=>disk).getItem('remlo_lang'),'ur')
})
test('campaign accepts only the known workshop pair, ignoring tokens and free text', () => {
  assert.deepEqual(campaignFromSearch('?source=the-leo&channel=workshop&access_token=secret'),{source:'the-leo',channel:'workshop'})
  assert.deepEqual(campaignFromSearch('?source=someone@email.test&channel=workshop'),{})
  assert.deepEqual(campaignFromSearch('?source=the-leo&channel=email'),{})
})
test('financial and chat data are excluded from event properties', () => {
  assert.deepEqual(safeEventProperties('budget_updated',{income:1500,expense_count:4,notes:'private'}),{expense_count:4})
  assert.deepEqual(safeEventProperties('savings_goal_created',{target_amount:5000}),{})
  assert.deepEqual(safeEventProperties('chat_message_sent',{content:'secret',email:'private'}),{})
  assert.deepEqual(safeEventProperties('remittance_compared',{amount:500,destination_country:'BD'}),{destination_country:'BD'})
})
test('fetch handles successful JSON', async t => {
  t.mock.method(globalThis,'fetch',async()=>new Response('{"ok":true}'))
  assert.deepEqual(await fetchJson('https://fixture.invalid'),{ok:true})
})
test('fetch rejects HTTP errors without leaking response content', async t => {
  t.mock.method(globalThis,'fetch',async()=>new Response('sensitive diagnostics',{status:503}))
  await assert.rejects(fetchJson('https://fixture.invalid'),{message:'HTTP 503'})
})
test('malformed JSON does not become a successful empty result', async t => {
  t.mock.method(globalThis,'fetch',async()=>new Response('invalid'))
  await assert.rejects(fetchJson('https://fixture.invalid'))
})
test('stalled fetch aborts at deadline', async t => {
  t.mock.method(globalThis,'fetch',(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))))
  await assert.rejects(fetchJson('https://fixture.invalid',{timeoutMs:15}),{message:'aborted'})
})
test('navigation cancellation aborts an in-flight request', async t => {
  t.mock.method(globalThis,'fetch',(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))))
  const controller=new AbortController();const pending=fetchJson('https://fixture.invalid',{signal:controller.signal});controller.abort()
  await assert.rejects(pending,{message:'aborted'})
})
const english=JSON.parse(readFileSync(new URL('../src/locales/en.json',import.meta.url)))
for(const {code} of LANGUAGES) test(`workshop copy and quiz structure: ${code}`,()=>{
  const locale=JSON.parse(readFileSync(new URL(`../src/locales/${code}.json`,import.meta.url)))
  assert.deepEqual(Object.keys(locale.workshop),Object.keys(english.workshop))
  for(const [key,value] of Object.entries(locale.workshop)) {
    assert.ok(value.length>0)
    assert.deepEqual(value.match(/{{.*?}}/g),english.workshop[key].match(/{{.*?}}/g))
  }
  assert.equal(locale.scamQuiz.questions.length,8)
  for(const q of locale.scamQuiz.questions) { assert.equal(q.options.length,3);assert.ok(q.explanation);assert.ok(q.scenario) }
})

test('capture filtering preserves ingestion metadata and drops URL and person data', () => {
  const event = sanitizeCapture({uuid:'event-id',event:'budget_updated',$set:{email:'private'},properties:{token:'public-project-key',distinct_id:'device-id',$session_id:'session-id',income:1500,expense_count:4,$current_url:'https://example.test/?access_token=secret',$referrer:'private'}})
  assert.equal(event.properties.token,'public-project-key')
  assert.equal(event.properties.distinct_id,'device-id')
  assert.equal(event.properties.expense_count,4)
  assert.equal(event.properties.income,undefined)
  assert.equal(event.properties.$current_url,undefined)
  assert.equal(event.$set,undefined)
  assert.equal(sanitizeCapture({event:'$identify'}),null)
})

test('unknown route text is not sent as feature metadata', () => {
  assert.deepEqual(safeEventProperties('feature_opened', { feature: '/someone-private@example.test' }), {})
})
test('quiz avoids guaranteed work-pass protection and fixed criminal penalties', () => {
  assert.ok(!english.scamQuiz.questions[3].options[1].includes('cannot cancel'))
  assert.ok(!english.scamQuiz.questions[3].explanation.includes('CANNOT'))
  assert.ok(!english.scamQuiz.questions[4].explanation.includes('50,000'))
})
