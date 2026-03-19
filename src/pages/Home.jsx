import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutGrid,
  SendHorizonal,
  Sparkles,
  ChevronDown,
  TrendingUp,
  Coins,
  Wallet,
  ArrowUpRight,
} from 'lucide-react'

const LANGUAGES = [
  { code: 'en',  label: 'English'    },
  { code: 'ta',  label: 'தமிழ்'      },
  { code: 'hi',  label: 'हिंदी'      },
  { code: 'bn',  label: 'বাংলা'      },
  { code: 'my',  label: 'မြန်မာ'     },
  { code: 'si',  label: 'සිංහල'      },
  { code: 'fil', label: 'Filipino'   },
  { code: 'id',  label: 'Indonesia'  },
  { code: 'zh',  label: '中文'        },
  { code: 'th',  label: 'ภาษาไทย'   },
  { code: 'ur',  label: 'اردو'       },
  { code: 'ne',  label: 'नेपाली'     },
]

const COUNTRY_META = {
  IN: { flag: '🇮🇳', name: 'India',        currency: 'INR' },
  BD: { flag: '🇧🇩', name: 'Bangladesh',   currency: 'BDT' },
  PH: { flag: '🇵🇭', name: 'Philippines',  currency: 'PHP' },
  MM: { flag: '🇲🇲', name: 'Myanmar',      currency: 'MMK' },
  ID: { flag: '🇮🇩', name: 'Indonesia',    currency: 'IDR' },
  LK: { flag: '🇱🇰', name: 'Sri Lanka',    currency: 'LKR' },
  CN: { flag: '🇨🇳', name: 'China',        currency: 'CNY' },
  TH: { flag: '🇹🇭', name: 'Thailand',     currency: 'THB' },
  PK: { flag: '🇵🇰', name: 'Pakistan',     currency: 'PKR' },
  NP: { flag: '🇳🇵', name: 'Nepal',        currency: 'NPR' },
}

function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'greetingMorning'
  if (h < 17) return 'greetingAfternoon'
  return 'greetingEvening'
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)

  function switchLang(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('remlo_lang', code)
    setLangOpen(false)
  }

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  // Personalization from onboarding
  const savedCountry = localStorage.getItem('remlo_country') || 'IN'
  const homeMeta = COUNTRY_META[savedCountry] ?? COUNTRY_META.IN

  const FEATURES = [
    {
      to: '/savings',
      icon: Coins,
      title: t('features.savings.title'),
      description: t('features.savings.description'),
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      badge: null,
      disabled: false,
    },
    {
      to: '/budget',
      icon: LayoutGrid,
      title: t('features.budget.title'),
      description: t('features.budget.description'),
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-100',
      badge: null,
      disabled: false,
    },
    {
      to: '/remittance',
      icon: SendHorizonal,
      title: t('features.remittance.title'),
      description: t('features.remittance.description'),
      bg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-100',
      badge: null,
      disabled: false,
    },
    {
      to: '/chat',
      icon: Sparkles,
      title: t('features.ai.title'),
      description: t('features.ai.description'),
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      badge: null,
      disabled: false,
    },
  ]

  const QUICK_STATS = [
    {
      label: t('stats.totalSaved'),
      value: 'S$0',
      sub: t('stats.totalSavedSub'),
      icon: Coins,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: t('stats.budgetLeft'),
      value: 'S$0',
      sub: t('stats.budgetLeftSub'),
      icon: Wallet,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: t('stats.lastSent'),
      value: 'S$0',
      sub: t('stats.lastSentSub'),
      icon: TrendingUp,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Gradient header region ────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-blue-50/70 via-blue-50/30 to-transparent">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-4">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-7 fade-in-up delay-50 relative z-50">
            <div>
              <p className="text-xs text-gray-400 font-medium">{t(getGreetingKey())}</p>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">{t('appName')}</h1>
            </div>

            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                {currentLang.label}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-80 overflow-y-auto">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => switchLang(l.code)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                        l.code === i18n.language ? 'font-semibold text-amber-600' : 'text-gray-700'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hero banner */}
          <div className="relative rounded-2xl overflow-hidden mb-2 bg-gradient-to-br from-amber-500 to-orange-500 p-6 shadow-md fade-in-up delay-100">
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-white/10" />

            <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-2">
              {t('hero.eyebrow')}
            </p>
            <h2 className="text-white text-2xl font-bold leading-snug mb-1 whitespace-pre-line">
              {t('hero.headline')}
            </h2>
            <p className="text-white/80 text-sm leading-relaxed max-w-xs">
              {t('hero.tagline')}
            </p>

            <Link
              to="/savings"
              className="inline-flex items-center gap-1.5 mt-4 bg-white text-amber-600 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-amber-50 active:scale-95 transition-all"
            >
              {t('hero.cta')} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pb-12">

        {/* Quick stats */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 fade-in-up delay-150">
          {t('stats.heading')}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {QUICK_STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 fade-in-up delay-${(i + 2) * 50}`}
            >
              <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-lg font-bold text-gray-900 leading-none">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 fade-in-up delay-200">
          {t('features.heading')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => {
            const card = (
              <div
                className={`relative rounded-2xl border border-gray-100 p-5 shadow-sm transition-all ${
                  f.disabled
                    ? 'bg-white opacity-60 cursor-default'
                    : `${f.bg} hover:shadow-md active:scale-95`
                } fade-in-up delay-${(i + 3) * 50}`}
              >
                {f.badge && (
                  <span className="absolute top-3 right-3 text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                    {f.badge}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-3`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{f.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            )

            return f.disabled ? (
              <div key={f.title}>{card}</div>
            ) : (
              <Link key={f.title} to={f.to} className="block">
                {card}
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 space-y-1">
          <p className="text-xs text-gray-300">{t('footer')}</p>
        </div>
      </div>

      {/* Tap outside to close language dropdown */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </div>
  )
}
