import { useState, useRef } from 'react'
import i18n from '../i18n.js'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../lib/languages.js'
import LanguageSelect from '../components/LanguageSelect.jsx'
import { track } from '../lib/analytics.js'
import safeStorage from '../lib/safeStorage.js'
import { useDarkMode } from '../hooks/useDarkMode.js'

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: 'India',        lang: 'hi'  },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh',   lang: 'bn'  },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines',  lang: 'fil' },
  { code: 'MM', flag: '🇲🇲', name: 'Myanmar',      lang: 'my'  },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia',    lang: 'id'  },
  { code: 'LK', flag: '🇱🇰', name: 'Sri Lanka',    lang: 'si'  },
  { code: 'CN', flag: '🇨🇳', name: 'China',        lang: 'zh'  },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand',     lang: 'th'  },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan',     lang: 'ur'  },
  { code: 'NP', flag: '🇳🇵', name: 'Nepal',        lang: 'ne'  },
  { code: 'OTHER', flag: '🌍', name: 'Other',      lang: 'en'  },
]

// ── Screen 0: Welcome ─────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }) {
  const { t } = useTranslation()
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-between px-6 py-8 gap-6 select-none"
      style={{
        background: 'linear-gradient(160deg, #C2410C 0%, #E8640C 45%, #F59E0B 100%)',
      }}
    >
      <div className="w-full rounded-2xl bg-white p-3"><LanguageSelect /></div>

      {/* Center illustration + text */}
      <div className="text-center">
        {/* App icon */}
        <div className="mx-auto mb-10 float-anim" style={{ width: 120, height: 120 }}>
          <img
            src="/pwa-192x192.png"
            alt="Remlo"
            className="w-full h-full rounded-3xl"
            style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.20)' }}
          />
        </div>

        <h1
          className="text-white mb-3 tracking-tight"
          style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}
        >
          {t('workshop.welcome')}
        </h1>
        <p className="text-white/75 text-base leading-relaxed max-w-[260px] mx-auto">
          {t('workshop.purpose')}
        </p>

      </div>

      {/* CTA */}
      <div className="w-full">
        <button
          onClick={onNext}
          className="w-full rounded-2xl py-4 text-base font-extrabold transition-all active:scale-95"
          style={{
            background: 'white',
            color: '#C2410C',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          {t('workshop.begin')}
        </button>
        <p className="text-white/90 text-sm text-center mt-4 font-medium">{t('workshop.trust')}</p>
      </div>
    </div>
  )
}

// ── Screen 1: Country + Language ──────────────────────────────────────────────

function SetupScreen({ country, lang, onSelectCountry, onSelectLang, onFinish, onBack }) {
  const { t } = useTranslation()
  const isDark = useDarkMode()
  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#EDE8E0'
  const textPrimary = isDark ? '#F5F2EE' : '#374151'
  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: bg }}>
      {/* Scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-4">

        <button onClick={onBack} className="min-h-11 mb-3 text-sm font-bold" style={{ color: textPrimary }} aria-label={t("workshop.back")}>← {t("workshop.back")}</button>
        {/* Header with brand accent */}
        <div className="mb-7">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
            style={{ background: '#FEF3C7' }}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-800">2 / 2</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">{t('workshop.setup')}</h2>
          <p className="text-sm text-gray-500">
            {t('workshop.choose')}
          </p>
        </div>

        {/* Language picker */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">🌐 {t('nav.language')}</p>
        <div className="flex gap-2 flex-wrap pb-4">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              aria-pressed={lang === l.code}
              onClick={() => onSelectLang(l.code)}
              className="min-h-11 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95"
              style={{
                borderColor: lang === l.code ? (isDark ? '#F5F2EE' : '#1A1A1A') : border,
                background:  lang === l.code ? (isDark ? '#F5F2EE' : '#1A1A1A') : card,
                color:       lang === l.code ? (isDark ? '#121110'  : 'white')   : textPrimary,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Country grid */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t('workshop.country')}</p>
        <div className="grid grid-cols-2 gap-2.5 mb-8">
          {COUNTRIES.map((c) => {
            const selected = country === c.code
            return (
              <button
                key={c.code}
                aria-pressed={selected}
                onClick={() => onSelectCountry(c)}
                className={`flex items-center gap-3 px-3.5 py-3.5 rounded-2xl border-2 transition-all active:scale-95 text-left ${
                  c.code === 'OTHER' ? 'col-span-2' : ''
                }`}
                style={{
                  borderColor: selected ? '#E8640C' : border,
                  background: selected ? '#FFF7ED' : card,
                  boxShadow: selected ? '0 0 0 3px rgba(232,100,12,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <span className="text-xl flex-shrink-0">{c.flag}</span>
                <span
                  className="text-sm font-semibold break-words"
                  style={{ color: selected ? '#C2410C' : textPrimary }}
                >
                  {c.code === 'OTHER' ? c.name : t(`remittance.country${c.name.replaceAll(' ', '')}`)}
                </span>
                {selected && (
                  <div
                    className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#E8640C' }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

      </div>

      {/* Sticky footer button */}
      <div
        className="flex-shrink-0 px-5 py-3 pb-[max(env(safe-area-inset-bottom),12px)]"
        style={{ background: card, borderTop: `1px solid ${border}` }}
      >
        <p role="status" className="text-sm mb-2 text-gray-600">{!country ? t("workshop.choose") : t("workshop.nextScam")}</p>
        <button
          onClick={() => onFinish(true)}
          disabled={!country}
          className="w-full rounded-2xl py-4 text-base font-extrabold transition-all disabled:opacity-40 active:scale-95"
          style={{
            background: country ? 'linear-gradient(135deg, #E8640C, #CC5708)' : '#D1CFC9',
            color: 'white',
            boxShadow: country ? '0 8px 24px rgba(232,100,12,0.3)' : 'none',
          }}
        >
          {t('login.continueGuest')}
        </button>
        <button onClick={() => onFinish(false)} disabled={!country} className="w-full min-h-11 mt-1 text-sm font-semibold text-gray-600 disabled:opacity-40">{t("login.signIn")}</button>
      </div>
    </div>
  )
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [country, setCountry] = useState(null)
  const [lang, setLang] = useState(i18n.language)
  const explicitLanguage = useRef(!!safeStorage.getItem('remlo_lang'))

  function selectCountry(c) {
    setCountry(c.code)
    track('country_selected', { country: c.code })
    if (!explicitLanguage.current) {
      setLang(c.lang)
      i18n.changeLanguage(c.lang)
    }
  }

  function finish(asGuest) {
    if (!country) return
    i18n.changeLanguage(lang)
    safeStorage.setItem('remlo_lang', lang)
    safeStorage.setItem('remlo_country', (country === 'OTHER' || !country) ? '' : country)
    safeStorage.setItem('remlo_onboarded', 'true')
    track('language_selected', { language: lang })
    track('onboarding_completed', { country, language: lang })
    if (asGuest) {
      safeStorage.setItem('remlo_guest', 'true')
      track('guest_mode_selected')
    }
    onComplete(asGuest ? (window.location.pathname === '/' || window.location.pathname === '/login' ? '/scam-quiz' : window.location.pathname) : '/login')
  }

  if (step === 0) return <WelcomeScreen onNext={() => {
    setLang(i18n.language)
    explicitLanguage.current = !!safeStorage.getItem('remlo_lang')
    track('onboarding_started')
    setStep(1)
    window.scrollTo(0, 0)
  }} />
  return (
    <SetupScreen
      country={country}
      lang={lang}
      onSelectCountry={selectCountry}
      onSelectLang={(code) => {
        explicitLanguage.current = true
        setLang(code)
        i18n.changeLanguage(code)
        safeStorage.setItem('remlo_lang', code)
        track('language_selected', { language: code })
      }}
      onBack={() => { setStep(0); window.scrollTo(0, 0) }}
      onFinish={finish}
    />
  )
}
