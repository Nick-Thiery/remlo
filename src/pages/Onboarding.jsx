import { useState } from 'react'
import i18n from '../i18n.js'

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: 'India',        lang: 'hi' },
  { code: 'BD', flag: '🇧🇩', name: 'Bangladesh',   lang: 'bn' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines',  lang: 'en' },
  { code: 'MM', flag: '🇲🇲', name: 'Myanmar',      lang: 'en' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia',    lang: 'en' },
  { code: 'LK', flag: '🇱🇰', name: 'Sri Lanka',    lang: 'ta' },
  { code: 'CN', flag: '🇨🇳', name: 'China',        lang: 'en' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand',     lang: 'en' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan',     lang: 'en' },
  { code: 'NP', flag: '🇳🇵', name: 'Nepal',        lang: 'en' },
]

const LANGUAGES = [
  { code: 'en',  label: 'English'   },
  { code: 'ta',  label: 'தமிழ்'     },
  { code: 'hi',  label: 'हिंदी'     },
  { code: 'bn',  label: 'বাংলা'     },
  { code: 'my',  label: 'မြန်မာ'    },
  { code: 'si',  label: 'සිංහල'     },
  { code: 'fil', label: 'Filipino'  },
  { code: 'id',  label: 'Indonesia' },
  { code: 'zh',  label: '中文'       },
  { code: 'th',  label: 'ภาษาไทย'  },
  { code: 'ur',  label: 'اردو'      },
  { code: 'ne',  label: 'नेपाली'    },
]

// ── Screen 0: Welcome ─────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 flex flex-col items-center justify-between px-6 py-14 select-none">
      <div />

      <div className="text-center">
        {/* Clean geometric illustration — no emojis */}
        <div className="mx-auto mb-10 w-36 h-36 relative flex items-center justify-center">
          {/* Concentric rings */}
          <div className="absolute inset-0 rounded-full bg-white/10" />
          <div className="absolute inset-5 rounded-full bg-white/10" />
          {/* Center card */}
          <div className="w-20 h-20 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center shadow-xl">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              {/* Stylised currency / growth icon */}
              <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
              <path d="M14 20h12M14 15.5h12M14 24.5h8" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M28 11l3-3M28 29l3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55" />
            </svg>
          </div>
          {/* Accent dots */}
          <div className="absolute top-2 right-6 w-3 h-3 rounded-full bg-white/25" />
          <div className="absolute bottom-5 left-4 w-2 h-2 rounded-full bg-white/20" />
          <div className="absolute top-9 left-3 w-1.5 h-1.5 rounded-full bg-white/15" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Welcome to Remlo</h1>
        <p className="text-white/75 text-base leading-relaxed max-w-[270px] mx-auto">
          Smart financial tools built for migrant workers in Singapore
        </p>
      </div>

      <div className="w-full">
        <button
          onClick={onNext}
          className="w-full bg-white text-blue-700 rounded-2xl py-4 text-base font-bold hover:bg-blue-50 active:scale-95 transition-all shadow-lg"
        >
          Get Started
        </button>
        <p className="text-white/35 text-xs text-center mt-4">Free · No credit card required</p>
      </div>
    </div>
  )
}

// ── Screen 1: Country + Language ──────────────────────────────────────────────

function SetupScreen({ country, lang, onSelectCountry, onSelectLang, onFinish }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4">

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Set up your account</h2>
        <p className="text-sm text-gray-500 mb-7">
          Choose your home country and preferred language.
        </p>

        {/* Country grid — 2 columns × 5 rows */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Home country</p>
        <div className="grid grid-cols-2 gap-2 mb-8">
          {COUNTRIES.map((c) => {
            const selected = country === c.code
            return (
              <button
                key={c.code}
                onClick={() => onSelectCountry(c)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all active:scale-95 text-left ${
                  selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
              >
                <span className="text-xl flex-shrink-0">{c.flag}</span>
                <span className={`text-sm font-medium truncate ${selected ? 'text-blue-700' : 'text-gray-700'}`}>
                  {c.name}
                </span>
                {selected && <span className="ml-auto text-blue-500 text-xs flex-shrink-0">✓</span>}
              </button>
            )
          })}
        </div>

        {/* Language picker */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Language</p>
        <div className="flex gap-2 flex-wrap pb-4">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => onSelectLang(l.code)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                lang === l.code
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky footer button */}
      <div className="flex-shrink-0 px-6 py-5 bg-white border-t border-gray-100">
        <button
          onClick={onFinish}
          disabled={!country}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40"
        >
          Start using Remlo
        </button>
      </div>
    </div>
  )
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [country, setCountry] = useState(null)
  const [lang, setLang] = useState('en')

  function selectCountry(c) {
    setCountry(c.code)
    if (c.lang) setLang(c.lang)
  }

  function finish() {
    i18n.changeLanguage(lang)
    localStorage.setItem('remlo_lang', lang)
    localStorage.setItem('remlo_country', country ?? 'IN')
    localStorage.setItem('remlo_onboarded', 'true')
    onComplete()
  }

  if (step === 0) return <WelcomeScreen onNext={() => setStep(1)} />
  return (
    <SetupScreen
      country={country}
      lang={lang}
      onSelectCountry={selectCountry}
      onSelectLang={setLang}
      onFinish={finish}
    />
  )
}
