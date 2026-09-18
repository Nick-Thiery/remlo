import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { UPDATE_CHECK_INTERVAL_MS, registerServiceWorker } from '../src/lib/serviceWorker.js'

function target() {
  const listeners = {}
  return {
    addEventListener: (type, fn) => { (listeners[type] ??= []).push(fn) },
    dispatch: (type) => { for (const fn of listeners[type] ?? []) fn() },
  }
}

// Minimal browser: a controlled (or fresh) page with a registrable worker.
function fakeBrowser({ controlled = true, registerFails = false, updateFails = false } = {}) {
  const window = target()
  const document = target()
  const serviceWorker = target()
  const state = { reloads: 0, updates: 0, intervals: [] }
  document.visibilityState = 'visible'
  serviceWorker.controller = controlled ? {} : null
  serviceWorker.register = async () => {
    if (registerFails) throw new Error('SecurityError')
    return { update: async () => { state.updates++; if (updateFails) throw new TypeError('Failed to fetch') } }
  }
  window.location = { reload: () => { state.reloads++ } }
  window.setInterval = (fn, ms) => { state.intervals.push({ fn, ms }) }
  const browser = { navigator: { serviceWorker }, document, window, state }
  browser.setVisibility = (value) => { document.visibilityState = value; document.dispatch('visibilitychange') }
  browser.load = async () => { window.dispatch('load'); await new Promise(r => setImmediate(r)) }
  return browser
}

test('does nothing where service workers are unsupported', () => {
  assert.doesNotThrow(() => registerServiceWorker({ navigator: {}, document: target(), window: target() }))
})

test('registers on load and checks for a new deploy straight away', async () => {
  const b = fakeBrowser()
  registerServiceWorker(b)
  assert.equal(b.state.updates, 0)
  await b.load()
  assert.equal(b.state.updates, 1)
})

test('first install on a device takes control without reloading', () => {
  const b = fakeBrowser({ controlled: false })
  registerServiceWorker(b)
  b.navigator.serviceWorker.dispatch('controllerchange')
  assert.equal(b.state.reloads, 0)
  // A later deploy in the same session is a real update.
  b.navigator.serviceWorker.dispatch('controllerchange')
  assert.equal(b.state.reloads, 1)
})

test('a new deploy loads immediately if the user has not interacted yet', () => {
  const b = fakeBrowser()
  registerServiceWorker(b)
  b.navigator.serviceWorker.dispatch('controllerchange')
  b.navigator.serviceWorker.dispatch('controllerchange')
  assert.equal(b.state.reloads, 1, 'reloads once, never loops')
})

test('a new deploy never interrupts a user mid-task; it loads when they leave the app', () => {
  const b = fakeBrowser()
  registerServiceWorker(b)
  b.window.dispatch('pointerdown')
  b.navigator.serviceWorker.dispatch('controllerchange')
  assert.equal(b.state.reloads, 0)
  b.setVisibility('visible')
  assert.equal(b.state.reloads, 0)
  b.setVisibility('hidden')
  assert.equal(b.state.reloads, 1)
})

test('typing counts as interaction too', () => {
  const b = fakeBrowser()
  registerServiceWorker(b)
  b.window.dispatch('keydown')
  b.navigator.serviceWorker.dispatch('controllerchange')
  assert.equal(b.state.reloads, 0)
})

test('an update that lands while the app is in the background loads right away', () => {
  const b = fakeBrowser()
  registerServiceWorker(b)
  b.window.dispatch('pointerdown')
  b.setVisibility('hidden')
  b.navigator.serviceWorker.dispatch('controllerchange')
  assert.equal(b.state.reloads, 1)
})

test('returning to the app and the hourly timer check for updates, only while visible', async () => {
  const b = fakeBrowser()
  registerServiceWorker(b)
  await b.load()
  b.setVisibility('hidden')
  b.setVisibility('visible')
  assert.equal(b.state.updates, 2)
  assert.equal(b.state.intervals.length, 1)
  assert.equal(b.state.intervals[0].ms, UPDATE_CHECK_INTERVAL_MS)
  b.state.intervals[0].fn()
  assert.equal(b.state.updates, 3)
  b.setVisibility('hidden')
  b.state.intervals[0].fn()
  assert.equal(b.state.updates, 3)
})

test('offline update checks and blocked registration fail quietly', async () => {
  const offline = fakeBrowser({ updateFails: true })
  registerServiceWorker(offline)
  await offline.load()
  offline.setVisibility('visible')
  await new Promise(r => setImmediate(r))
  assert.equal(offline.state.reloads, 0)

  const blocked = fakeBrowser({ registerFails: true })
  registerServiceWorker(blocked)
  await blocked.load()
  blocked.setVisibility('visible')
  assert.equal(blocked.state.updates, 0)
})

test('update handling never touches stored data or caches', () => {
  const source = readFileSync(new URL('../src/lib/serviceWorker.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|caches\.|unregister|\.clear\(/)
})

test('build keeps the production worker lifecycle and registers through the app, not an injected script', () => {
  const config = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
  assert.match(config, /registerType: 'autoUpdate'/)
  assert.match(config, /injectRegister: false/)
  assert.match(config, /skipWaiting: true/)
  assert.match(config, /clientsClaim: true/)
  assert.match(config, /cacheId: 'remlo-v3'/, 'changing cacheId would discard every device\'s offline cache')
  assert.match(readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8'), /if \(import\.meta\.env\.PROD\) registerServiceWorker\(\)/)
})
