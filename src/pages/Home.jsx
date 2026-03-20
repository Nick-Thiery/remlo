import { useState, useEffect } from 'react'
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
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

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

function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'greetingMorning'
  if (h < 17) return 'greetingAfternoon'
  return 'greetingEvening'
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [totalSaved, setTotalSaved] = useState(0)
  const [budgetLeft, setBudgetLeft] = useState(0)
  const [userInitial, setUserInitial] = useState('')

  useEffect(() => {
    async function loadData() {
      const isGuest = localStorage.getItem('remlo_guest') === 'true'

      if (isGuest) {
        setUserInitial('G')
        const savings = JSON.parse(localStorage.getItem('remlo_guest_savings') || '[]')
        setTotalSaved(savings.reduce((sum, g) => sum + g.saved, 0))
        const budget = JSON.parse(localStorage.getItem('remlo_guest_budget') || 'null')
        if (budget) {
          const totalExp = (budget.expenses || []).reduce((sum, e) => sum + e.amount, 0)
          setBudgetLeft(Math.max((budget.income || 0) - totalExp, 0))
        }
        setStatsLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStatsLoading(false); return }

      if (session.user.email) {
        setUserInitial(session.user.email[0].toUpperCase())
      }

      const userId = session.user.id
      const [savingsRes, budgetRes] = await Promise.all([
        supabase.from('savings_goals').select('current_amount').eq('user_id', userId),
        supabase.from('budgets').select('income, expenses').eq('user_id', userId).maybeSingle(),
      ])

      if (savingsRes.data) {
        setTotalSaved(savingsRes.data.reduce((sum, r) => sum + r.current_amount, 0))
      }
      if (budgetRes.data) {
        const totalExp = (budgetRes.data.expenses || []).reduce((sum, e) => sum + e.amount, 0)
        setBudgetLeft(Math.max((budgetRes.data.income || 0) - totalExp, 0))
      }
      setStatsLoading(false)
    }

    loadData()
  }, [])

  function switchLang(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('remlo_lang', code)
    setLangOpen(false)
  }

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  const FEATURES = [
    {
      to: '/savings',
      icon: Coins,
      title: t('features.savings.title'),
      description: t('features.savings.description'),
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      accentBar: 'bg-amber-400',
    },
    {
      to: '/budget',
      icon: LayoutGrid,
      title: t('features.budget.title'),
      description: t('features.budget.description'),
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      accentBar: 'bg-violet-400',
    },
    {
      to: '/remittance',
      icon: SendHorizonal,
      title: t('features.remittance.title'),
      description: t('features.remittance.description'),
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      accentBar: 'bg-sky-400',
    },
    {
      to: '/chat',
      icon: Sparkles,
      title: t('features.ai.title'),
      description: t('features.ai.description'),
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      accentBar: 'bg-blue-400',
    },
  ]

  const QUICK_STATS = [
    {
      label: t('stats.totalSaved'),
      value: statsLoading ? '—' : formatSGD(totalSaved),
      icon: Coins,
      iconColor: 'text-amber-400',
      numColor: 'text-amber-600',
    },
    {
      label: t('stats.budgetLeft'),
      value: statsLoading ? '—' : formatSGD(budgetLeft),
      icon: Wallet,
      iconColor: 'text-violet-400',
      numColor: 'text-violet-600',
    },
    {
      label: t('stats.lastSent'),
      value: 'S$0',
      icon: TrendingUp,
      iconColor: 'text-sky-400',
      numColor: 'text-sky-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header bar ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100/80">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <div className="flex items-center justify-between relative z-50">

            {/* Greeting + name */}
            <div>
              <p className="text-xs text-gray-400 font-medium">{t(getGreetingKey())}</p>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5 tracking-tight">{t('appName')}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Language pill */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen((o) => !o)}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-xl px-2.5 py-1.5 transition-colors"
                >
                  <span className="text-xs font-semibold text-gray-600">{currentLang.label.slice(0, 2).toUpperCase()}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 max-h-72 overflow-y-auto">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => switchLang(l.code)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                          l.code === i18n.language ? 'font-semibold text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white text-sm font-bold select-none">
                  {userInitial || '·'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-12">

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div
          className="relative rounded-3xl overflow-hidden mb-5 shadow-lg"
          style={{ background: 'linear-gradient(140deg, #b45309 0%, #ea580c 50%, #c2410c 100%)' }}
        >
          {/* Layered decorative circles */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/[0.08]" />
          <div className="absolute top-4 right-16 w-14 h-14 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-black/[0.08]" />
          <div className="absolute bottom-5 right-7 w-5 h-5 rounded-full bg-white/20" />
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 24px,white 24px,white 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,white 24px,white 25px)',
            }}
          />

          <div className="relative px-6 pt-6 pb-7">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-[0.12em]">
                {t('hero.eyebrow')}
              </span>
            </div>

            <h2
              className="text-white font-extrabold leading-tight mb-2 whitespace-pre-line"
              style={{ fontSize: '1.5rem', letterSpacing: '-0.01em' }}
            >
              {t('hero.headline')}
            </h2>
            <p className="text-white/70 text-xs leading-relaxed max-w-[190px] mb-5">
              {t('hero.tagline')}
            </p>

            <Link
              to="/savings"
              className="inline-flex items-center gap-2 bg-white text-amber-700 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:bg-amber-50 active:scale-95 transition-all"
            >
              {t('hero.cta')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Quick stats ───────────────────────────────────────────────── */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
          {t('stats.heading')}
        </p>
        <div className="grid grid-cols-3 gap-2.5 mb-7">
          {QUICK_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3.5 py-4"
            >
              <stat.icon className={`w-4 h-4 ${stat.iconColor} mb-2.5`} strokeWidth={1.8} />
              <p
                className={`text-base font-bold leading-none tabular-nums ${
                  statsLoading ? 'text-gray-200 animate-pulse' : stat.numColor
                }`}
              >
                {stat.value}
              </p>
              <p className="text-[10px] text-gray-400 mt-1.5 font-medium leading-tight">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Feature cards ─────────────────────────────────────────────── */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
          {t('features.heading')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} className="block">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all">
                {/* Accent bar */}
                <div className={`h-[3px] w-full ${f.accentBar}`} />

                <div className="p-5">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} strokeWidth={1.8} />
                  </div>

                  {/* Text */}
                  <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{f.title}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-4">{f.description}</p>

                  {/* Arrow indicator */}
                  <ChevronRight className={`w-3.5 h-3.5 ${f.iconColor} opacity-50`} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-300 text-center mt-10">{t('footer')}</p>
        <p className="text-[10px] text-gray-300 text-center mt-1">Built by FinanceForward</p>
      </div>

      {/* Tap outside to close language dropdown */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </div>
  )
}
