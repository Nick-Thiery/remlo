import { LANGUAGES } from './languages.js'

// Browser language tags that name one of our languages under a different code.
const ALIASES = { tl: 'fil', in: 'id' }

// The first language on the phone's own list that Remlo has, as a Remlo code.
// Returns null when that language is English or nothing on the list is supported,
// so a phone set to English keeps today's behaviour exactly. Used only as the
// starting language for a device that has not chosen one yet; the worker can
// always change it, and a saved choice (remlo_lang) always wins.
export function detectDeviceLanguage(
  preferred = typeof navigator === 'undefined' ? [] : (navigator.languages?.length ? navigator.languages : [navigator.language]),
  supported = LANGUAGES.map(l => l.code),
) {
  for (const tag of preferred ?? []) {
    const base = String(tag ?? '').toLowerCase().split(/[-_]/)[0]
    const code = ALIASES[base] ?? base
    if (supported.includes(code)) return code === 'en' ? null : code
  }
  return null
}
