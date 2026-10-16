#!/usr/bin/env node
/**
 * Layout check: opens every main screen of the built app in every language on
 * small Android-sized screens and reports layout problems.
 *
 * What it checks (errors fail the run, warnings are only reported):
 *   error   doc-hscroll        the page can be scrolled sideways
 *   error   viewport-cut       text or a control sticks out past the screen edge
 *                              (the app shell hides it, so the page does not scroll)
 *   error   text-clipped       text is cut off by an overflow:hidden parent
 *   error   text-spill         text sticks out of its own box
 *   error   overlap            two pieces of text, or two controls, sit on top of each other
 *   error   word-broken        a word is split in the middle because its box is too narrow
 *   error   rtl-dir            <html dir> / lang do not match the language
 *   error   rtl-align          Urdu text is left-aligned, or sits in a left-to-right box
 *   error   rtl-mirror         the bottom tab bar is not mirrored in Urdu
 *   error   i18n-raw-key       a raw translation key such as "remittance.xyz" is on screen
 *   error   i18n-placeholder   an unfilled {{placeholder}} is on screen
 *   error   bad-value          "undefined", "NaN" or "[object Object]" is on screen
 *   error   broken-image       an image failed to load
 *   error   console-error      uncaught exception or console.error
 *   warning tap-target         a control is smaller than 44x44 CSS px
 *   warning text-truncated     text is shortened on purpose (ellipsis or line-clamp)
 *   warning english-text       English sentence on a screen in a non-Latin-script language
 *   warning rtl-physical-class (static scan of src/) left/right Tailwind classes that do not mirror
 *
 * Usage:
 *   npm run check:layout                      build, serve, check everything
 *   npm run check:layout -- --lang ur,ta --route remittance,more --viewport 320x640
 *   npm run check:layout -- --no-build        reuse the previous build
 *   npm run check:layout -- --url http://127.0.0.1:4173   check an already running server
 *   npm run check:layout -- --out some/dir    where the report goes (default: ./layout-report)
 *
 * Needs a Chromium. Set CHROMIUM_PATH if it is not at /opt/pw-browsers/chromium.
 * It never downloads a browser. Details: docs/layout-check.md
 */
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ─── Options ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const o = { lang: null, route: null, viewport: null, build: true, url: null, out: null, concurrency: 4, screenshots: true, keepBuild: false, allow: join(ROOT, 'scripts', 'layout-check.allow.json') }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--lang') o.lang = next().split(',')
    else if (a === '--route') o.route = next().split(',')
    else if (a === '--viewport') o.viewport = next().split(',')
    else if (a === '--no-build') o.build = false
    else if (a === '--url') o.url = next()
    else if (a === '--out') o.out = next()
    else if (a === '--concurrency') o.concurrency = Number(next())
    else if (a === '--no-screenshots') o.screenshots = false
    else if (a === '--keep-build') o.keepBuild = true
    else if (a === '--allow') o.allow = resolve(next())
    else if (a === '--help' || a === '-h') { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '')); process.exit(0) }
    else { console.error(`Unknown option ${a}`); process.exit(2) }
  }
  return o
}

const opts = parseArgs(process.argv.slice(2))
const OUT = resolve(opts.out || join(ROOT, 'layout-report'))
const SHOTS = join(OUT, 'screenshots')
const BUILD_DIR = join(ROOT, 'node_modules', '.cache', 'remlo-layout-check', 'dist')

// ─── What to check ───────────────────────────────────────────────────────────

const LANGS = ['en', 'bn', 'fil', 'hi', 'id', 'my', 'si', 'ta', 'th', 'ur', 'vi', 'zh']
const RTL_LANGS = new Set(['ur'])
const NON_LATIN = new Set(['bn', 'hi', 'my', 'si', 'ta', 'th', 'ur', 'zh'])
const VIEWPORTS = [{ w: 360, h: 740 }, { w: 320, h: 640 }]

// Every screen in src/App.jsx, plus the first-run screens. `variants` open a second
// state of the same screen (inputs filled, a menu open, an answer given).
const ROUTES = [
  { id: 'home', path: '/', variants: ['filled'] },
  { id: 'savings', path: '/savings', variants: ['filled'] },
  { id: 'budget', path: '/budget', variants: ['filled'] },
  { id: 'remittance', path: '/remittance', variants: ['filled'] },
  { id: 'more', path: '/more', variants: ['lang-open'] },
  { id: 'salary', path: '/salary', variants: ['filled'] },
  { id: 'loans', path: '/loans', variants: ['filled'] },
  { id: 'scams', path: '/scams', variants: [] },
  { id: 'loanshark', path: '/loanshark', variants: ['checked'] },
  { id: 'emergency', path: '/emergency', variants: [] },
  { id: 'chat', path: '/chat', variants: ['typed'] },
  { id: 'scam-quiz', path: '/scam-quiz', variants: ['answered'] },
  { id: 'emergency-fund', path: '/emergency-fund', variants: ['filled'] },
  { id: 'banking-guide', path: '/banking-guide', variants: ['expanded'] },
  { id: 'login', path: '/login', variants: ['signup'] },
  { id: 'privacy', path: '/privacy', variants: [] },
  { id: 'terms', path: '/terms', variants: [] },
  { id: 'delete-account', path: '/delete-account', variants: [] },
  // First run on a fresh device: nothing stored except the language.
  { id: 'onboarding', path: '/', fresh: true, variants: ['setup'] },
]

const FIXED_NOW = '2026-10-17T10:00:00+08:00'
const MOCK_RATES = { SGD: 1, INR: 64.5, BDT: 94.2, PHP: 43.9, IDR: 12380, MMK: 1620, LKR: 232, NPR: 103, PKR: 217, VND: 19300, THB: 26.4, CNY: 5.62, MYR: 3.3, USD: 0.78 }

// ─── Static scan: physical left/right classes that do not mirror in Urdu ─────

const PHYSICAL = /(?<![\w-])(?:[a-z0-9[\]-]+:)*-?(?:ml|mr|pl|pr|left|right|scroll-ml|scroll-mr)-(?:\[[^\]\s]+\]|[\w./]+)|\btext-(?:left|right)\b|\brounded-(?:l|r|tl|tr|bl|br)(?:-[\w[\].]+)?(?=[\s"'`])|\bborder-(?:l|r)(?:-[\w[\].]+)?(?=[\s"'`])|\bfloat-(?:left|right)\b|\b(?:marginLeft|marginRight|paddingLeft|paddingRight)\s*:|\btextAlign\s*:\s*['"](?:left|right)['"]/g

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(jsx|js)$/.test(name)) yield p
  }
}

function staticRtlScan() {
  const hits = []
  for (const file of walk(join(ROOT, 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      for (const m of line.matchAll(PHYSICAL)) hits.push({ file: relative(ROOT, file), line: i + 1, match: m[0].trim() })
    })
  }
  return hits
}

// ─── The check that runs inside the page ─────────────────────────────────────
// Self-contained: Playwright serialises this function, so it cannot use anything outside it.

function pageChecks({ lang, expectRtl, topKeys, nonLatin }) {
  const VW = window.innerWidth
  window.scrollTo(0, 0)
  const issues = []
  const styleCache = new WeakMap()
  const rectCache = new WeakMap()
  const chainCache = new WeakMap()
  const selfChainCache = new WeakMap()
  const cs = (el) => { let s = styleCache.get(el); if (!s) { s = getComputedStyle(el); styleCache.set(el, s) } return s }
  const rc = (el) => { let r = rectCache.get(el); if (!r) { r = el.getBoundingClientRect(); rectCache.set(el, r) } return r }
  const r1 = (n) => Math.round(n * 10) / 10
  const snippet = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60)

  function describe(el) {
    const parts = []
    let e = el
    for (let i = 0; i < 3 && e && e.nodeType === 1 && e !== document.body; i++) {
      let s = e.tagName.toLowerCase()
      if (e.id) s += '#' + e.id
      const cls = [...e.classList].filter((c) => !/^(delay-|fade-|scale-in|float-anim|animate-)/.test(c)).slice(0, 3)
      if (cls.length) s += '.' + cls.join('.')
      parts.unshift(s)
      e = e.parentElement
    }
    return parts.join(' > ')
  }

  const docRect = (r) => ({ x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height) })
  const add = (type, severity, el, detail, rect, extra) => {
    issues.push({ type, severity, selector: el ? describe(el) : '', text: el ? snippet(el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('alt')) : '', detail, rect: rect ? docRect(rect) : null, ...extra })
  }

  // Ancestors that clip their content (overflow other than visible), nearest first.
  function clipChain(el, self = false) {
    const cache = self ? selfChainCache : chainCache
    let c = cache.get(el)
    if (c) return c
    c = []
    for (let a = self ? el : el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const s = cs(a)
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') c.push({ a, s, r: rc(a) })
    }
    cache.set(el, c)
    return c
  }
  const fixedRoot = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const p = cs(a).position
      if (p === 'fixed' || p === 'sticky') return a
    }
    return null
  }
  // The part of a box that is actually on screen: clipped by every overflow:hidden/auto ancestor.
  function visibleRect(r, el, self = false) {
    let l = r.left, t = r.top, rt = r.right, b = r.bottom
    for (const { s, r: ar } of clipChain(el, self)) {
      if (s.overflowX !== 'visible') { l = Math.max(l, ar.left); rt = Math.min(rt, ar.right) }
      if (s.overflowY !== 'visible') { t = Math.max(t, ar.top); b = Math.min(b, ar.bottom) }
    }
    return { left: l, top: t, right: rt, bottom: b, width: rt - l, height: b - t }
  }
  // A popup (menu, dropdown) is meant to sit on top of the page, so it is not an "overlap".
  const popupRoot = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = cs(a)
      if ((s.position === 'absolute' || s.position === 'fixed') && s.zIndex !== 'auto' && parseInt(s.zIndex, 10) > 0) return a
    }
    return null
  }
  const samePopup = (a, b) => { const pa = popupRoot(a), pb = popupRoot(b); return pa === pb || (pa && pa.contains(b)) || (pb && pb.contains(a)) }
  function hiddenByStyle(el) {
    let op = 1
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const s = cs(a)
      if (s.visibility === 'hidden' || s.display === 'none') return true
      op *= parseFloat(s.opacity)
    }
    return op < 0.15
  }
  // True when the box lies completely outside a clipping ancestor (collapsed accordion, off-screen slide).
  function clippedAway(r, el, self = false) {
    for (const { s, r: ar } of clipChain(el, self)) {
      if (s.overflowX !== 'visible' && (r.right <= ar.left + 0.5 || r.left >= ar.right - 0.5)) return true
      if (s.overflowY !== 'visible' && (r.bottom <= ar.top + 0.5 || r.top >= ar.bottom - 0.5)) return true
    }
    return false
  }
  // A narrower box that clips or scrolls its content "owns" any overflow inside it.
  const protectedByBox = (el, self = false) => clipChain(el, self).some(({ s, r }) => s.overflowX !== 'visible' && r.width < VW * 0.98)

  // 1. The page itself scrolls sideways.
  const de = document.documentElement
  if (de.scrollWidth > VW || document.body.scrollWidth > VW) {
    add('doc-hscroll', 'error', null, `document is ${Math.max(de.scrollWidth, document.body.scrollWidth)}px wide on a ${VW}px screen`)
  }

  // Collect every visible line of text.
  const lines = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA|TITLE)$/.test(el.tagName)) continue
    if (hiddenByStyle(el)) continue
    const range = document.createRange()
    range.selectNodeContents(n)
    for (const q of range.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue
      if (clippedAway(q, el, true)) continue
      lines.push({ n, el, r: q, v: visibleRect(q, el, true) })
    }
  }

  // 2. Text sticks out past the screen edge (the shell hides it, so the page does not scroll).
  const cutSeen = new Map()
  for (const L of lines) {
    const left = -L.r.left, right = L.r.right - VW
    if ((left > 1 || right > 1) && !protectedByBox(L.el, true)) {
      const k = L.el
      const amount = Math.max(left, right)
      if (!cutSeen.has(k) || cutSeen.get(k).amount < amount) cutSeen.set(k, { amount, r: L.r })
    }
  }
  for (const [el, { amount, r }] of cutSeen) add('viewport-cut', 'error', el, `text runs ${r1(amount)}px past the ${left0(r) ? 'left' : 'right'} edge of the screen`, r)
  function left0(r) { return r.left < 0 }

  // Controls and images past the screen edge.
  const CONTROLS = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=link],[role=checkbox],[role=switch]'
  const controls = []
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (hiddenByStyle(el)) continue
    const r = rc(el)
    if (r.width < 1 || r.height < 1 || clippedAway(r, el)) continue
    controls.push({ el, r })
  }
  for (const { el, r } of [...controls, ...[...document.images].filter((i) => !hiddenByStyle(i)).map((el) => ({ el, r: rc(el) }))]) {
    if (r.width < 1 || r.height < 1) continue
    const left = -r.left, right = r.right - VW
    if ((left > 1 || right > 1) && !protectedByBox(el)) add('viewport-cut', 'error', el, `${el.tagName.toLowerCase()} runs ${r1(Math.max(left, right))}px past the screen edge`, r)
  }

  // 3. Text cut off by an overflow:hidden parent, or shortened on purpose.
  const clipHits = new Map()
  for (const L of lines) {
    for (const { a, s, r: ar } of clipChain(L.el, true)) {
      const clipX = (s.overflowX === 'hidden' || s.overflowX === 'clip') && ar.width < VW * 0.98
      const clipY = s.overflowY === 'hidden' || s.overflowY === 'clip'
      let cut = 0
      if (clipX && L.r.right > ar.left && L.r.left < ar.right) cut = Math.max(cut, L.r.right - ar.right, ar.left - L.r.left)
      if (cut <= 1.5) cut = 0
      let cutY = 0
      if (clipY && L.r.bottom > ar.top && L.r.top < ar.bottom) {
        const over = Math.max(L.r.bottom - ar.bottom, ar.top - L.r.top)
        if (over > Math.max(2, L.r.height * 0.25)) cutY = over
      }
      if (cut || cutY) {
        const prev = clipHits.get(a)
        if (!prev) clipHits.set(a, { cut, cutY, r: L.r, el: L.el })
        else { prev.cut = Math.max(prev.cut, cut); prev.cutY = Math.max(prev.cutY, cutY) }
      }
    }
  }
  const truncatedSeen = new Set()
  for (const [a, h] of clipHits) {
    const s = cs(a)
    const ellipsis = s.textOverflow === 'ellipsis'
    const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none'
    if (ellipsis || clamp) continue // reported as truncated below
    const where = h.cut ? `${r1(h.cut)}px sideways` : `${r1(h.cutY)}px vertically`
    add('text-clipped', 'error', a, `text is cut off ${where} by this box (overflow hidden, ${r1(rc(a).width)}x${r1(rc(a).height)})`, rc(a))
  }
  // Intentional truncation: ellipsis and line-clamp. Reported so long translations can be reviewed.
  for (const L of lines) {
    for (const { a, s } of clipChain(L.el, true)) {
      if (truncatedSeen.has(a)) continue
      const ellipsis = s.textOverflow === 'ellipsis' && a.scrollWidth > a.clientWidth + 1
      const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none' && a.scrollHeight > a.clientHeight + 1
      if (ellipsis || clamp) {
        truncatedSeen.add(a)
        add('text-truncated', 'warning', a, ellipsis ? `ellipsis hides ${a.scrollWidth - a.clientWidth}px of text` : `line-clamp ${s.webkitLineClamp} hides ${a.scrollHeight - a.clientHeight}px of text`, rc(a))
      }
    }
  }

  // 4. Text sticks out of its own box (long word, nowrap, flex item that cannot shrink).
  const spill = new Map()
  for (const L of lines) {
    let box = L.el
    while (box && box !== document.body && /^(inline|contents)$/.test(cs(box).display)) box = box.parentElement
    if (!box || box === document.body) continue
    const br = rc(box)
    const s = cs(box)
    if (s.overflowX !== 'visible') continue
    if (clipChain(L.el, true).some(({ a }) => a === box)) continue
    const over = Math.max(L.r.right - br.right, br.left - L.r.left)
    if (over > 1.5 && br.width > 0) {
      const prev = spill.get(box)
      if (!prev || prev.over < over) spill.set(box, { over, r: L.r })
    }
  }
  for (const [box, { over, r }] of spill) {
    if (cutSeen.has(box)) continue
    add('text-spill', 'error', box, `text sticks out ${r1(over)}px beyond its box (${r1(rc(box).width)}px wide)`, r)
  }

  // 5. Overlaps: text on text, control on control.
  const topAt = (x, y, fixed) => {
    window.scrollTo(0, fixed ? 0 : Math.max(0, y - window.innerHeight / 2))
    return document.elementFromPoint(Math.min(Math.max(x, 0), VW - 1), y - window.scrollY)
  }
  const items = lines.map((L) => ({ ...L, fixed: fixedRoot(L.el) }))
  const overlapSeen = new Set()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]
      if (a.n === b.n || a.fixed !== b.fixed || !samePopup(a.el, b.el)) continue
      if (a.v.width < 1 || a.v.height < 1 || b.v.width < 1 || b.v.height < 1) continue
      const ix = Math.min(a.v.right, b.v.right) - Math.max(a.v.left, b.v.left)
      if (ix <= 3) continue
      const iy = Math.min(a.v.bottom, b.v.bottom) - Math.max(a.v.top, b.v.top)
      if (iy <= 0.4 * Math.min(a.v.height, b.v.height)) continue
      const key = a.el === b.el ? null : [describe(a.el), describe(b.el)].sort().join('|')
      if (a.el === b.el || (key && overlapSeen.has(key))) continue
      const cx = Math.max(a.v.left, b.v.left) + ix / 2
      const cy = Math.max(a.v.top, b.v.top) + iy / 2
      const hit = topAt(cx, cy, !!a.fixed)
      if (!hit || !(a.el.contains(hit) || b.el.contains(hit))) continue // a third box covers them: not a visible overlap
      overlapSeen.add(key)
      issues.push({ type: 'overlap', severity: 'error', selector: describe(a.el) + '  <>  ' + describe(b.el), text: `"${snippet(a.n.nodeValue)}"  <>  "${snippet(b.n.nodeValue)}"`, detail: `text boxes overlap by ${r1(ix)}x${r1(iy)}px`, rect: docRect({ left: Math.max(a.v.left, b.v.left), top: Math.max(a.v.top, b.v.top), width: ix, height: iy }) })
    }
  }
  const ctl = controls.map((c) => ({ ...c, r: visibleRect(c.r, c.el), fixed: fixedRoot(c.el) })).filter((c) => c.r.width > 8 && c.r.height > 8)
  for (let i = 0; i < ctl.length; i++) {
    for (let j = i + 1; j < ctl.length; j++) {
      const a = ctl[i], b = ctl[j]
      if (a.fixed !== b.fixed || a.el.contains(b.el) || b.el.contains(a.el) || !samePopup(a.el, b.el)) continue
      if (a.el.closest('label') && a.el.closest('label') === b.el.closest('label')) continue
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
      const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
      if (ix <= 2 || iy <= 2) continue
      if (ix * iy < 0.25 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) continue
      issues.push({ type: 'overlap', severity: 'error', selector: describe(a.el) + '  <>  ' + describe(b.el), text: `"${snippet(a.el.innerText || a.el.getAttribute('aria-label'))}"  <>  "${snippet(b.el.innerText || b.el.getAttribute('aria-label'))}"`, detail: `controls overlap by ${r1(ix)}x${r1(iy)}px`, rect: docRect({ left: Math.max(a.r.left, b.r.left), top: Math.max(a.r.top, b.r.top), width: ix, height: iy }) })
    }
  }
  window.scrollTo(0, 0)

  // 6. Tap targets under 44x44 CSS px (warnings).
  for (const { el, r } of controls) {
    let target = r
    if (r.width <= 2 || r.height <= 2) { const lab = el.closest('label'); if (!lab) continue; target = rc(lab) }
    const s = cs(el)
    if (s.display === 'inline' && el.tagName === 'A' && el.closest('p,li,span,div')?.innerText.trim() !== el.innerText.trim()) continue // link inside a sentence
    if (el.getAttribute('tabindex') === '-1' && el.tagName !== 'INPUT') continue
    if (target.width < 43.5 || target.height < 43.5) {
      add('tap-target', 'warning', el, `${r1(target.width)}x${r1(target.height)}px`, target, { small: target.width < 24 || target.height < 24 })
    }
  }

  // 7. Text direction.
  const wantDir = expectRtl ? 'rtl' : 'ltr'
  if (de.dir !== wantDir) add('rtl-dir', 'error', null, `<html dir="${de.dir}"> but ${lang} needs "${wantDir}"`)
  if (de.lang !== lang) add('rtl-dir', 'error', null, `<html lang="${de.lang}"> but the language is ${lang}`)
  const ARABIC = /[\u0600-\u06FF]/
  if (expectRtl) {
    const alignSeen = new Set(), ltrSeen = new Set()
    for (const L of lines) {
      const text = L.n.nodeValue
      if (!ARABIC.test(text)) continue
      const s = cs(L.el)
      if (s.direction === 'ltr' && !ltrSeen.has(L.el)) { ltrSeen.add(L.el); add('rtl-align', 'error', L.el, 'Urdu text sits in a left-to-right box (direction: ltr)', L.r) }
      let box = L.el
      while (box && box !== document.body && /^(inline|contents)$/.test(cs(box).display)) box = box.parentElement
      if (!box || alignSeen.has(box)) continue
      const bs = cs(box)
      const br = rc(box)
      const words = text.trim().split(/\s+/).length
      if (bs.textAlign === 'left' && words >= 2 && br.width > 100 && L.r.width < br.width * 0.9 && bs.display !== 'flex') {
        alignSeen.add(box)
        add('rtl-align', 'error', box, 'Urdu text is aligned left (text-align: left); it should start on the right', L.r)
      }
    }
    // The bottom tab bar must run right to left: Home on the right.
    const bar = [...document.querySelectorAll('button[aria-current], button')].map((b) => b.parentElement).find((p) => p && cs(p).display === 'flex' && p.children.length >= 5 && !!fixedRoot(p))
    if (bar) {
      const xs = [...bar.children].map((c) => rc(c).left)
      if (!(xs[0] > xs[xs.length - 1])) add('rtl-mirror', 'error', bar, 'the bottom tab bar is not mirrored: Home should be on the right')
    }
  } else {
    for (const L of lines) {
      if (ARABIC.test(L.n.nodeValue) && cs(L.el).direction === 'rtl' && false) break
    }
  }

  // 7b. A word too long for its box is broken in the middle (overflow-wrap), e.g. a tab bar label "Tabunga / n".
  const canvas = document.createElement('canvas').getContext('2d')
  const brokenSeen = new Set()
  for (const L of lines) {
    const s = cs(L.el)
    if (!(s.overflowWrap === 'break-word' || s.overflowWrap === 'anywhere' || s.wordBreak === 'break-word')) continue
    if (/[\u0E00-\u0E7F\u1000-\u109F\u3040-\u30FF\u4E00-\u9FFF]/.test(L.n.nodeValue)) continue // no spaces: the browser wraps these by dictionary
    let box = L.el
    while (box && box !== document.body && /^(inline|contents)$/.test(cs(box).display)) box = box.parentElement
    if (!box || brokenSeen.has(L.el)) continue
    const bs = cs(box)
    const avail = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight)
    if (avail <= 0) continue
    canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
    for (const w of L.n.nodeValue.split(/\s+/)) {
      if (w.length < 4) continue
      const width = canvas.measureText(w).width
      if (width > avail + 1) { brokenSeen.add(L.el); add('word-broken', 'error', L.el, `"${w}" is ${r1(width)}px wide but the box is ${r1(avail)}px, so it breaks in the middle`, L.r); break }
    }
  }

  // 8. Translation problems that show on screen.
  const keyRe = new RegExp(`(?<![\\w@/.-])(?:${topKeys.join('|')})(?:\\.[A-Za-z][A-Za-z0-9_]*)+\\b`)
  const seenText = new Set()
  const inspect = (el, text, where) => {
    if (!text) return
    const k = where + text
    if (seenText.has(k)) return
    seenText.add(k)
    const key = keyRe.exec(text)
    if (key && !/\.(com|org|sg|gov|html?|png|jpe?g|svg)\b/.test(key[0])) add('i18n-raw-key', 'error', el, `raw translation key "${key[0]}" is shown (${where})`)
    if (/\{\{\s*\w+\s*\}\}/.test(text)) add('i18n-placeholder', 'error', el, `unfilled placeholder in ${where}: "${snippet(text)}"`)
    if (/(^|[\s(])(undefined|NaN|null)([\s).,]|$)|\[object Object\]/.test(text)) add('bad-value', 'error', el, `"${snippet(text)}" shown in ${where}`)
  }
  for (const L of lines) inspect(L.el, L.n.nodeValue, 'text')
  for (const el of document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]')) {
    if (hiddenByStyle(el)) continue
    for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) inspect(el, el.getAttribute(attr), attr)
  }
  for (const img of document.images) {
    if (img.complete && img.naturalWidth === 0 && !hiddenByStyle(img)) add('broken-image', 'error', img, `image failed to load: ${img.getAttribute('src')}`, rc(img))
  }
  if (nonLatin) {
    const englishSeen = new Set()
    for (const L of lines) {
      const t = L.n.nodeValue.trim()
      const words = t.match(/\b[A-Za-z]{2,}\b/g) || []
      const properNoun = words.every((w) => /^[A-Z]/.test(w) || /^(of|and|for|the|to|at|in)$/.test(w)) || /\d/.test(t) || /^[a-z.]+\.[a-z.]+$/.test(t)
      if (!properNoun && words.length >= 3 && /^[\u0000-\u024F\u2000-\u206F\u20A0-\u20CF\u2190-\u21FF\u2600-\u27BF\uFE0F]*$/.test(t) && !L.el.closest('[translate=no],.notranslate') && !englishSeen.has(t)) {
        englishSeen.add(t)
        add('english-text', 'warning', L.el, `English text on a ${lang} screen: "${snippet(t)}"`, L.r)
      }
    }
  }

  return { issues, stats: { textLines: lines.length, controls: controls.length, scrollWidth: de.scrollWidth, scrollHeight: de.scrollHeight } }
}

// ─── Page set-up ─────────────────────────────────────────────────────────────

const INIT_SCRIPT = `
(() => {
  const cfg = window.__LAYOUT_CHECK__;
  try {
    localStorage.setItem('remlo_lang', cfg.lang);
    if (!cfg.fresh) {
      localStorage.setItem('remlo_onboarded', 'true');
      localStorage.setItem('remlo_guest', 'true');
      localStorage.setItem('remlo_country', '');
    }
  } catch (e) {}
  // Same sequence every run: Math.random (quiz order, ids) and the clock are fixed.
  let seed = 123456789;
  Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const css = '*,*::before,*::after{animation-duration:0.001s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}';
  const add = () => { const s = document.createElement('style'); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
})();
`

async function newContext(browser, base, lang, vp, fresh, topInfo) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'en-SG',
    timezoneId: 'Asia/Singapore',
    colorScheme: 'light',
    serviceWorkers: 'block',
    userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  })
  await context.addInitScript(`window.__LAYOUT_CHECK__ = ${JSON.stringify({ lang, fresh })}`)
  await context.addInitScript(INIT_SCRIPT)
  await context.clock.setFixedTime(new Date(FIXED_NOW))
  const blocked = []
  await context.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue()
    if (url.includes('open.er-api.com')) return route.fulfill({ json: { result: 'success', rates: MOCK_RATES } })
    if (url.includes('/functions/v1/wise-quote')) {
      let body = {}
      try { body = JSON.parse(route.request().postData() || '{}') } catch { /* keep {} */ }
      const rate = MOCK_RATES[body.targetCurrency] || 1
      return route.fulfill({ json: { supported: true, targetCurrency: body.targetCurrency, sourceAmount: body.sourceAmount, rate, fee: 3.2, received: Math.round((body.sourceAmount - 3.2) * rate * 100) / 100, estimatedDelivery: '2026-10-17T12:00:00+08:00', retrievedAt: FIXED_NOW, payIn: 'bank_transfer' } })
    }
    if (url.includes('/functions/v1/')) return route.fulfill({ status: 500, json: { error: 'layout-check: offline' } })
    if (url.includes('.supabase.')) return route.fulfill({ json: [] })
    blocked.push(url)
    return route.abort()
  })
  context.__blocked = blocked
  return context
}

async function settle(page) {
  await page.waitForSelector('#root > *', { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => !document.querySelector('.animate-pulse, .animate-spin'), null, { timeout: 4000 }).catch(() => {})
  let last = ''
  for (let i = 0; i < 12; i++) {
    const sig = await page.evaluate(() => `${document.documentElement.scrollHeight}|${document.body.innerText.length}`)
    if (sig === last) break
    last = sig
    await page.waitForTimeout(120)
  }
}

async function gotoRoute(page, base, route) {
  await page.goto(base + route.path, { waitUntil: 'load' })
  await settle(page)
}

// Fills the simple inputs of the current screen so result cards render.
async function fillInputs(page, lang) {
  const handles = await page.$$('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=password]):not([type=email]):not([type=file]):not([type=date]), textarea')
  let first = true
  for (const h of handles) {
    if (!(await h.isVisible()) || !(await h.isEditable())) continue
    const type = (await h.getAttribute('type')) || 'text'
    const mode = (await h.getAttribute('inputmode')) || ''
    try {
      if (type === 'number' || mode === 'decimal' || mode === 'numeric') await h.fill(first ? '500' : '120')
      else await h.fill('Sample')
      first = false
    } catch { /* an input that rejects the value is skipped */ }
  }
  await page.waitForTimeout(900) // debounce for quotes
  await settle(page)
}

async function runVariant(page, route, variant, langLabel) {
  switch (variant) {
    case 'filled':
      await fillInputs(page)
      return true
    case 'lang-open': {
      const btn = page.locator('button', { hasText: langLabel }).first()
      if (!(await btn.count())) return false
      await btn.click()
      return true
    }
    case 'checked': {
      const boxes = await page.$$('input[type=checkbox]')
      for (const b of boxes) await b.evaluate((el) => el.click())
      await page.waitForTimeout(200)
      return boxes.length > 0
    }
    case 'typed': {
      const input = page.locator('input[type=text], input:not([type]), textarea').first()
      if (!(await input.count())) return false
      await input.fill('How can I send money home safely and cheaply every month?')
      return true
    }
    case 'answered': {
      const opts = page.locator('main button, button').filter({ hasNot: page.locator('svg[class*=lucide-arrow]') })
      const n = await opts.count()
      if (n < 2) return false
      // Start the quiz if there is a start button, then answer the first option.
      const start = page.locator('button.w-full').last()
      await start.click().catch(() => {})
      await page.waitForTimeout(200)
      const answers = page.locator('button.w-full')
      if ((await answers.count()) > 0) await answers.first().click().catch(() => {})
      await page.waitForTimeout(200)
      return true
    }
    case 'expanded': {
      const buttons = await page.$$('button[aria-expanded="false"]')
      for (const b of buttons.slice(0, 6)) await b.click().catch(() => {})
      await page.waitForTimeout(200)
      return buttons.length > 0
    }
    case 'signup': {
      const toggle = page.locator('form ~ * button, form + div button, button').filter({ hasText: /./ })
      const n = await toggle.count()
      if (!n) return false
      // The mode switch is the last text button on the page that is not the form submit.
      const switchBtn = page.locator('button[type=button]').last()
      if (!(await switchBtn.count())) return false
      await switchBtn.click().catch(() => {})
      await page.waitForTimeout(150)
      return true
    }
    case 'setup': {
      const next = page.locator('button').last()
      await next.click().catch(() => {})
      await page.waitForTimeout(250)
      const country = page.locator('button[aria-pressed]').nth(LANGS.length + 3)
      if (await country.count()) await country.click().catch(() => {})
      await page.waitForTimeout(200)
      return true
    }
    default:
      return false
  }
}

// ─── One page ────────────────────────────────────────────────────────────────

const LANG_LABELS = { en: 'English', ta: 'தமிழ்', hi: 'हिंदी', bn: 'বাংলা', my: 'မြန်မာ', si: 'සිංහල', fil: 'Filipino', id: 'Indonesia', zh: '中文', th: 'ภาษาไทย', ur: 'اردو', vi: 'Tiếng Việt' }

async function annotate(page, issues) {
  const boxes = issues.filter((i) => i.rect && (i.severity === 'error' || i.type === 'text-truncated') && i.rect.w > 0).map((i) => ({ ...i.rect, c: i.severity === 'error' ? '#e11d48' : '#f59e0b' }))
  if (!boxes.length) return
  await page.evaluate((bs) => {
    for (const b of bs) {
      const d = document.createElement('div')
      d.setAttribute('data-layout-check', '')
      d.style.cssText = `position:absolute;left:${b.x}px;top:${b.y + window.scrollY}px;width:${b.w}px;height:${b.h}px;outline:2px solid ${b.c};outline-offset:1px;background:${b.c}22;pointer-events:none;z-index:2147483647;`
      document.body.appendChild(d)
    }
  }, boxes)
}

async function checkOne(page, ctx, { lang, vp, route, variant, base, screenshotName }) {
  const label = `${lang} ${vp.w}x${vp.h} ${route.id}${variant ? ' [' + variant + ']' : ''}`
  const consoleIssues = []
  const onConsole = (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    const text = m.text()
    if (/Failed to load resource|net::ERR_|the server responded with a status of|Service Worker registration blocked/.test(text)) return // blocked or mocked network on purpose
    if (/Download the React DevTools|Unrecognized feature|Permissions-Policy/.test(text)) return
    consoleIssues.push({ type: 'console-error', severity: m.type() === 'error' ? 'error' : 'warning', selector: '', text: '', detail: `console.${m.type()}: ${text.slice(0, 240)}`, rect: null })
  }
  const onPageError = (e) => consoleIssues.push({ type: 'console-error', severity: 'error', selector: '', text: '', detail: `uncaught: ${String(e.message || e).slice(0, 240)}`, rect: null })
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  const result = { lang, viewport: `${vp.w}x${vp.h}`, route: route.id, variant: variant || 'default', issues: [], stats: null, screenshot: null, skipped: null, label }
  try {
    await gotoRoute(page, base, route)
    if (variant) {
      const ok = await runVariant(page, route, variant, LANG_LABELS[lang])
      if (!ok) { result.skipped = `variant "${variant}" not available on this screen`; return result }
      await settle(page)
    }
    const out = await page.evaluate(pageChecks, { lang, expectRtl: RTL_LANGS.has(lang), topKeys: ctx.topKeys, nonLatin: NON_LATIN.has(lang) })
    result.issues = [...out.issues, ...consoleIssues]
    result.stats = out.stats
    if (opts.screenshots) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await annotate(page, result.issues)
      // A full-page screenshot draws the fixed tab bar halfway down; pin it to the page bottom instead.
      await page.evaluate(() => { for (const el of document.querySelectorAll('*')) if (getComputedStyle(el).position === 'fixed') el.style.position = 'absolute' })
      const file = join(SHOTS, screenshotName)
      await page.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 60, animations: 'disabled' })
      result.screenshot = relative(OUT, file)
    }
  } catch (e) {
    result.issues.push({ type: 'console-error', severity: 'error', selector: '', text: '', detail: `check failed: ${String(e.message).split('\n')[0]}`, rect: null })
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }
  return result
}

// ─── Server ──────────────────────────────────────────────────────────────────

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer()
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
    s.on('error', rej)
  })
}

async function startServer() {
  const vite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  if (opts.build) {
    console.log('Building the app ...')
    rmSync(BUILD_DIR, { recursive: true, force: true })
    execFileSync(process.execPath, [vite, 'build', '--outDir', BUILD_DIR, '--emptyOutDir'], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, VITE_SUPABASE_URL: 'https://layout-check.supabase.co', VITE_SUPABASE_ANON_KEY: 'layout-check-anon-key', VITE_POSTHOG_KEY: '', VITE_POSTHOG_HOST: '' },
    })
  } else if (!existsSync(join(BUILD_DIR, 'index.html'))) {
    throw new Error('No previous build found; run without --no-build')
  }
  const port = await freePort()
  const child = spawn(process.execPath, [vite, 'preview', '--outDir', BUILD_DIR, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(base + '/'); if (r.ok) return { base, child } } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150))
  }
  child.kill()
  throw new Error('vite preview did not start')
}

// ─── Report ──────────────────────────────────────────────────────────────────

function loadAllow() {
  if (!existsSync(opts.allow)) return []
  return JSON.parse(readFileSync(opts.allow, 'utf8')).allow || []
}
const isAllowed = (allow, r, i) => allow.find((a) => a.type === i.type && (!a.route || a.route === r.route) && (!a.selector || i.selector.includes(a.selector)) && (!a.lang || a.lang === r.lang))

function buildReport(results, staticHits, allow, meta) {
  let errors = 0, warnings = 0, known = 0
  const byType = {}
  for (const r of results) {
    for (const i of r.issues) {
      const a = i.severity === 'error' ? isAllowed(allow, r, i) : null
      if (a) { i.known = a.reason || true; known++ }
      else if (i.severity === 'error') errors++
      else warnings++
      const t = (byType[i.type] ||= { errors: 0, warnings: 0, known: 0, pages: new Set() })
      if (a) t.known++
      else if (i.severity === 'error') t.errors++
      else t.warnings++
      t.pages.add(r.label)
    }
  }
  for (const t of Object.values(byType)) t.pages = t.pages.size

  // Same problem on the same element in several languages -> one line.
  const groups = new Map()
  for (const r of results) {
    for (const i of r.issues) {
      if (i.severity !== 'error' && !['text-truncated', 'english-text'].includes(i.type)) continue
      const key = `${i.severity}|${i.type}|${r.route}|${i.selector}`
      const g = groups.get(key) || { type: i.type, severity: i.severity, route: r.route, selector: i.selector, known: i.known || null, langs: new Set(), viewports: new Set(), count: 0, example: null }
      g.langs.add(r.lang)
      g.viewports.add(r.viewport)
      g.count++
      if (!g.example) g.example = { detail: i.detail, text: i.text, lang: r.lang, viewport: r.viewport, variant: r.variant, screenshot: r.screenshot }
      groups.set(key, g)
    }
  }
  const grouped = [...groups.values()].map((g) => ({ ...g, langs: [...g.langs], viewports: [...g.viewports] })).sort((a, b) => (a.severity === b.severity ? b.langs.length - a.langs.length || b.count - a.count : a.severity === 'error' ? -1 : 1))

  const tap = {}
  for (const r of results) {
    const n = r.issues.filter((i) => i.type === 'tap-target').length
    const small = r.issues.filter((i) => i.type === 'tap-target' && i.small).length
    const t = (tap[r.route] ||= { pages: 0, total: 0, small: 0 })
    t.pages++; t.total += n; t.small += small
  }

  const rtlFiles = {}
  for (const h of staticHits) rtlFiles[h.file] = (rtlFiles[h.file] || 0) + 1

  return { meta, totals: { pages: results.length, skipped: results.filter((r) => r.skipped).length, errors, warnings, known }, byType, grouped, tap, staticRtl: { total: staticHits.length, byFile: rtlFiles, hits: staticHits }, results }
}

function markdown(rep, langs, vps, routes) {
  const L = []
  const { totals: t } = rep
  L.push('# Layout check report', '')
  L.push(`Pages checked: ${t.pages} (${t.skipped} variants skipped because the screen has no such state). Errors: **${t.errors}**. Known (allow-listed) errors: ${t.known}. Warnings: ${t.warnings}.`, '')
  L.push(`Languages: ${langs.join(', ')}. Screens: ${vps.join(', ')}. Clock fixed at ${FIXED_NOW}, animations off, network mocked, guest on a fresh device.`, '')
  L.push('## By check', '', '| Check | Errors | Known | Warnings | Pages affected |', '|---|---:|---:|---:|---:|')
  for (const [k, v] of Object.entries(rep.byType).sort()) L.push(`| ${k} | ${v.errors} | ${v.known} | ${v.warnings} | ${v.pages} |`)
  L.push('')
  for (const vp of vps) {
    L.push(`## Errors by screen and language (${vp})`, '', `| Screen | ${langs.join(' | ')} |`, `|---|${langs.map(() => '---:').join('|')}|`)
    for (const route of routes) {
      const cells = langs.map((lang) => {
        const rs = rep.results.filter((r) => r.lang === lang && r.viewport === vp && r.route === route)
        if (!rs.length) return ''
        const n = rs.reduce((a, r) => a + r.issues.filter((i) => i.severity === 'error' && !i.known).length, 0)
        return n ? String(n) : '.'
      })
      L.push(`| ${route} | ${cells.join(' | ')} |`)
    }
    L.push('')
  }
  L.push('## Errors, one line per element (same problem in several languages is merged)', '')
  const errs = rep.grouped.filter((g) => g.severity === 'error')
  if (!errs.length) L.push('None.', '')
  for (const g of errs) {
    L.push(`- **${g.type}** on \`${g.route}\`${g.known ? ' (known: ' + g.known + ')' : ''}: \`${g.selector || 'page'}\` - ${g.langs.join(', ')} at ${g.viewports.join(', ')}. ${g.example.detail}${g.example.text ? ` Text: ${g.example.text}` : ''} Example: ${g.example.screenshot ? '`' + g.example.screenshot + '`' : ''}`)
  }
  L.push('')
  L.push('## Warnings', '', '### Tap targets under 44x44 CSS px (count only)', '', '| Screen | Pages | Avg per page | Under 24px (avg) |', '|---|---:|---:|---:|')
  for (const [route, v] of Object.entries(rep.tap)) L.push(`| ${route} | ${v.pages} | ${(v.total / v.pages).toFixed(1)} | ${(v.small / v.pages).toFixed(1)} |`)
  L.push('')
  const trunc = rep.grouped.filter((g) => g.type === 'text-truncated')
  L.push('### Text shortened on purpose (ellipsis / line-clamp)', '')
  if (!trunc.length) L.push('None.')
  for (const g of trunc.slice(0, 40)) L.push(`- \`${g.route}\` \`${g.selector}\` - ${g.langs.join(', ')}. ${g.example.detail}`)
  L.push('')
  const eng = rep.grouped.filter((g) => g.type === 'english-text')
  L.push('### English text on screens in other scripts', '')
  if (!eng.length) L.push('None.')
  for (const g of eng.slice(0, 40)) L.push(`- \`${g.route}\` - ${g.langs.join(', ')}. ${g.example.detail}`)
  L.push('')
  L.push('### Right-to-left: left/right Tailwind classes that do not mirror (static scan of src/, not enforced)', '', `${rep.staticRtl.total} matches. Per file:`, '')
  for (const [f, n] of Object.entries(rep.staticRtl.byFile).sort((a, b) => b[1] - a[1])) L.push(`- ${f}: ${n}`)
  L.push('', 'Full list with line numbers is in `report.json` under `staticRtl.hits`.', '')
  return L.join('\n')
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const langs = opts.lang || LANGS
  const vps = opts.viewport ? VIEWPORTS.filter((v) => opts.viewport.includes(`${v.w}x${v.h}`)) : VIEWPORTS
  const routes = opts.route ? ROUTES.filter((r) => opts.route.includes(r.id)) : ROUTES
  if (!langs.length || !vps.length || !routes.length) { console.error('Nothing to check with those filters'); process.exit(2) }

  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(SHOTS, { recursive: true })

  const en = JSON.parse(readFileSync(join(ROOT, 'src', 'locales', 'en.json'), 'utf8'))
  const topKeys = Object.keys(en)

  let server = null
  let base = opts.url
  if (!base) { server = await startServer(); base = server.base }

  const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
  const browser = await chromium.launch({ ...(existsSync(exe) ? { executablePath: exe } : {}), args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none', '--disable-lcd-text'] })

  const tasks = []
  for (const vp of vps) for (const lang of langs) tasks.push({ vp, lang })
  const results = []
  let done = 0
  async function worker() {
    while (tasks.length) {
      const { vp, lang } = tasks.shift()
      for (const fresh of [false, true]) {
        const rs = routes.filter((r) => !!r.fresh === fresh)
        if (!rs.length) continue
        const context = await newContext(browser, base, lang, vp, fresh)
        const page = await context.newPage()
        for (const route of rs) {
          for (const variant of ['', ...route.variants]) {
            const name = `${lang}-${vp.w}-${route.id}${variant ? '--' + variant : ''}.jpg`
            results.push(await checkOne(page, { topKeys }, { lang, vp, route, variant, base, screenshotName: name }))
          }
        }
        await context.close()
      }
      done++
      process.stdout.write(`\r${done} of ${vps.length * langs.length} language/screen-size runs done`)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker))
  process.stdout.write('\n')
  await browser.close()
  if (server) server.child.kill()
  if (server && !opts.keepBuild) rmSync(BUILD_DIR, { recursive: true, force: true })

  // Stable order, so two runs produce the same files.
  const order = (r) => [vps.findIndex((v) => `${v.w}x${v.h}` === r.viewport), langs.indexOf(r.lang), routes.findIndex((x) => x.id === r.route), r.variant === 'default' ? '' : r.variant]
  results.sort((a, b) => { const x = order(a), y = order(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0 })

  const staticHits = staticRtlScan()
  const rep = buildReport(results, staticHits, loadAllow(), { baseUrl: 'local preview', generatedAt: new Date().toISOString(), languages: langs, viewports: vps.map((v) => `${v.w}x${v.h}`), routes: routes.map((r) => r.id) })
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(rep, null, 2))
  writeFileSync(join(OUT, 'report.md'), markdown(rep, langs, vps.map((v) => `${v.w}x${v.h}`), routes.map((r) => r.id)))

  const t = rep.totals
  console.log(`Checked ${t.pages} pages: ${t.errors} errors, ${t.known} known errors, ${t.warnings} warnings.`)
  console.log(`Report: ${join(OUT, 'report.md')}`)
  process.exit(t.errors > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
