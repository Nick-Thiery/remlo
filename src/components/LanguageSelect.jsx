import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../lib/languages.js'
import safeStorage from '../lib/safeStorage.js'
import { track } from '../lib/analytics.js'

export default function LanguageSelect() {
  const { t, i18n } = useTranslation()
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
      <span>🌐 {t('nav.language')}</span>
      <select
        value={i18n.language}
        onChange={(e) => {
          i18n.changeLanguage(e.target.value)
          safeStorage.setItem('remlo_lang', e.target.value)
          track('language_selected', { language: e.target.value })
        }}
        className="min-h-11 max-w-full rounded-xl px-3 border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        {LANGUAGES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
      </select>
    </label>
  )
}
