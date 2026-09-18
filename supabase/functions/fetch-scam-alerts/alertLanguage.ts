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
