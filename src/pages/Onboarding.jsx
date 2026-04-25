import { useState } from 'react'
import i18n from '../i18n.js'
import { track } from '../lib/analytics.js'

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
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-14 select-none"
      style={{
        background: 'linear-gradient(160deg, #C2410C 0%, #E8640C 45%, #F59E0B 100%)',
      }}
    >
      {/* Top decorative elements */}
      <div className="w-full flex justify-end">
        <div className="flex gap-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30" />
          ))}
        </div>
      </div>

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
          Welcome to Remlo
        </h1>
        <p className="text-white/75 text-base leading-relaxed max-w-[260px] mx-auto">
          Smart finance for everyone, everywhere
        </p>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
          {['Save smarter', 'Send home', 'Stay safe'].map((item) => (
            <span
              key={item}
              className="text-xs font-semibold text-white/90 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              {item}
            </span>
          ))}
        </div>
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
          Get Started
        </button>
        <p className="text-white/40 text-xs text-center mt-4 font-medium">Free · No credit card required</p>
      </div>
    </div>
  )
}

// ── Screen 1: Country + Language ──────────────────────────────────────────────

function SetupScreen({ country, lang, onSelectCountry, onSelectLang, onFinish }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8' }}>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-4">

        {/* Header with brand accent */}
        <div className="mb-7">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
            style={{ background: '#FEF3C7' }}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-amber-800">Step 2 of 2</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Set up your account</h2>
          <p className="text-sm text-gray-500">
            Choose your home country and preferred language.
          </p>
        </div>

        {/* Country grid */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Home country</p>
        <div className="grid grid-cols-2 gap-2.5 mb-8">
          {COUNTRIES.map((c) => {
            const selected = country === c.code
            return (
              <button
                key={c.code}
                onClick={() => onSelectCountry(c)}
                className={`flex items-center gap-3 px-3.5 py-3.5 rounded-2xl border-2 transition-all active:scale-95 text-left ${
                  c.code === 'OTHER' ? 'col-span-2' : ''
                }`}
                style={{
                  borderColor: selected ? '#E8640C' : '#EDE8E0',
                  background: selected ? '#FFF7ED' : 'white',
                  boxShadow: selected ? '0 0 0 3px rgba(232,100,12,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <span className="text-xl flex-shrink-0">{c.flag}</span>
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: selected ? '#C2410C' : '#374151' }}
                >
                  {c.name}
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

        {/* Language picker */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Language</p>
        <div className="flex gap-2 flex-wrap pb-4">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => onSelectLang(l.code)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95"
              style={{
                borderColor: lang === l.code ? '#1A1A1A' : '#EDE8E0',
                background: lang === l.code ? '#1A1A1A' : 'white',
                color: lang === l.code ? 'white' : '#374151',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky footer button */}
      <div
        className="flex-shrink-0 px-5 py-5"
        style={{ background: 'white', borderTop: '1px solid #F0EDE8' }}
      >
        <button
          onClick={onFinish}
          disabled={!country}
          className="w-full rounded-2xl py-4 text-base font-extrabold transition-all disabled:opacity-40 active:scale-95"
          style={{
            background: country ? 'linear-gradient(135deg, #E8640C, #CC5708)' : '#D1CFC9',
            color: 'white',
            boxShadow: country ? '0 8px 24px rgba(232,100,12,0.3)' : 'none',
          }}
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
    localStorage.setItem('remlo_country', (country === 'OTHER' || !country) ? '' : country)
    localStorage.setItem('remlo_onboarded', 'true')
    track('onboarding_completed', { country, language: lang })
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
