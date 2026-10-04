#!/usr/bin/env node
/**
 * Checks the translation files in src/locales/ against en.json.
 *
 * For each language it reports:
 *   - missing:      keys in en.json that the language doesn't have (the app
 *                   falls back to English for these)
 *   - extra:        keys the language has that en.json doesn't (dead strings)
 *   - placeholders: strings whose {{placeholders}} differ from the English one
 *                   (a dropped or renamed {{amount}} breaks the sentence)
 *
 * Usage:
 *   node scripts/check-locales.mjs            check every language
 *   node scripts/check-locales.mjs ta hi      check only these languages
 *
 * Exits 1 if anything is reported, 0 otherwise. Also run by the Claude Code
 * hook in .claude/hooks/check_locale_edit.mjs after a locale file is edited.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out)
    else out[path] = value
  }
  return out
}

const load = (code) => flatten(JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8')))
const placeholders = (s) =>
  typeof s === 'string' ? [...s.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((m) => m[1]).sort().join(',') : ''

const en = load('en')
const all = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json').map((f) => f.slice(0, -5)).sort()
const wanted = process.argv.slice(2).filter((c) => c !== 'en')
const codes = wanted.length ? all.filter((c) => wanted.includes(c)) : all

let problems = 0
for (const code of codes) {
  let tr
  try {
    tr = load(code)
  } catch (err) {
    console.log(`${code}.json: can't be read (${err.message})`)
    problems++
    continue
  }
  const missing = Object.keys(en).filter((k) => !(k in tr))
  const extra = Object.keys(tr).filter((k) => !(k in en))
  const mismatched = Object.keys(en).filter((k) => k in tr && placeholders(en[k]) !== placeholders(tr[k]))
  if (!missing.length && !extra.length && !mismatched.length) continue
  problems += missing.length + extra.length + mismatched.length
  console.log(`${code}.json:`)
  for (const k of missing) console.log(`  missing      ${k}  (English: ${JSON.stringify(en[k])})`)
  for (const k of extra) console.log(`  extra        ${k}`)
  for (const k of mismatched)
    console.log(`  placeholders ${k}  (English has {{${placeholders(en[k]) || 'none'}}}, ${code} has {{${placeholders(tr[k]) || 'none'}}})`)
}

if (problems) {
  console.log(`\n${problems} problem(s). Missing strings show in English until translated.`)
  process.exit(1)
}
console.log(`Locales OK: ${codes.length} language(s) match en.json.`)
