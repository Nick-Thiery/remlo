// TEMPORARY SAFETY FALLBACK (added 18 Sep 2026).
// Machine-translated scam alerts in these languages contained characters from
// other scripts (e.g. Bengali or Chinese inside Tamil safety guidance). Until a
// native speaker has reviewed them, these languages get the verified English
// alerts: their cached translations are not read and no new machine translation
// is requested. To end the fallback for a language, remove it from this list
// once reviewed translations are in scam_alert_translations.
export const ENGLISH_FALLBACK_LANGUAGES = ['ta', 'si', 'my']

// Whether a request is answered with the verified English alerts instead of
// cached or new translations.
export function servesEnglishAlerts(language: string, translatedLanguages: Record<string, string>): boolean {
  return language === 'en' || !translatedLanguages[language] || ENGLISH_FALLBACK_LANGUAGES.includes(language)
}

// A "translation" whose description came back unchanged from English. The
// model sometimes returns the English text (Thai had three such alerts cached
// on 10 Oct 2026, served as if translated). Such rows are treated as missing,
// so they are translated again, and are never cached. An English title alone
// is accepted: titles are short and often mostly names (WhatsApp, DBS, MOM).
export function isUntranslated(
  english: { title: string, description: string },
  tx: { title?: string, description?: string } | undefined | null,
): boolean {
  if (!tx || !tx.title || !tx.description) return true
  return tx.description.trim() === english.description.trim()
}

// After the model fails to translate an alert, wait this long before asking
// again, so a stubborn alert doesn't cost a paid call on every page view.
export const RETRY_AFTER_MS = 6 * 60 * 60 * 1000
