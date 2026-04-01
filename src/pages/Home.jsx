import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutGrid,
  SendHorizonal,
  Sparkles,
  ChevronDown,
  Flame,
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


export default function Home() {
  const { t, i18n } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [totalSaved, setTotalSaved] = useState(0)
  const [budgetLeft, setBudgetLeft] = useState(0)
  const [userInitial, setUserInitial] = useState('')
  const [streak, setStreak] = useState(1)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = localStorage.getItem('remlo_streak_date')
    const lastCount = parseInt(localStorage.getItem('remlo_streak_count') || '0', 10)

    let newCount
    if (!lastDate) {
      newCount = 1
    } else if (lastDate === today) {
      newCount = lastCount || 1
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      newCount = lastDate === yesterdayStr ? lastCount + 1 : 1
    }

    localStorage.setItem('remlo_streak_date', today)
    localStorage.setItem('remlo_streak_count', String(newCount))
    setStreak(newCount)
  }, [])

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
      grad: 'linear-gradient(135deg, #F59E0B, #D97706)',
      iconColor: '#92400E',
      bgLight: '#FFFBEB',
    },
    {
      to: '/budget',
      icon: LayoutGrid,
      title: t('features.budget.title'),
      description: t('features.budget.description'),
      grad: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
      iconColor: '#4C1D95',
      bgLight: '#F5F3FF',
    },
    {
      to: '/remittance',
      icon: SendHorizonal,
      title: t('features.remittance.title'),
      description: t('features.remittance.description'),
      grad: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
      iconColor: '#0C4A6E',
      bgLight: '#F0F9FF',
    },
    {
      to: '/chat',
      icon: Sparkles,
      title: t('features.ai.title'),
      description: t('features.ai.description'),
      grad: 'linear-gradient(135deg, #F97316, #EA580C)',
      iconColor: '#7C2D12',
      bgLight: '#FFF7ED',
    },
  ]

  const QUICK_STATS = [
    {
      label: t('stats.totalSaved'),
      value: statsLoading ? '—' : formatSGD(totalSaved),
      icon: Coins,
      grad: 'linear-gradient(135deg, #F59E0B, #D97706)',
      numColor: '#92400E',
    },
    {
      label: t('stats.budgetLeft'),
      value: statsLoading ? '—' : formatSGD(budgetLeft),
      icon: Wallet,
      grad: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
      numColor: '#4C1D95',
    },
    {
      label: t('stats.dayStreak'),
      value: statsLoading ? '—' : String(streak),
      icon: Flame,
      grad: 'linear-gradient(135deg, #F97316, #EA580C)',
      numColor: '#7C2D12',
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>

      {/* ── Header bar ────────────────────────────────────────────────── */}
      <div className="bg-white" style={{ borderBottom: '1px solid #F0EDE8' }}>
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <div className="flex items-center justify-between relative z-50">

            {/* App name */}
            <h1
              className="tracking-tight"
              style={{ fontSize: 22, fontWeight: 800, color: '#111016' }}
            >
              {t('appName')}
            </h1>

            <div className="flex items-center gap-2">
              {/* Language pill */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors"
                  style={{ background: '#F5F2EC', border: '1px solid #EDE8E0' }}
                >
                  <span className="text-xs font-bold text-gray-600">{currentLang.label.slice(0, 2).toUpperCase()}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 bg-white rounded-2xl py-1.5 z-50 max-h-72 overflow-y-auto"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #F0EDE8' }}
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => switchLang(l.code)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 ${
                          l.code === i18n.language ? 'font-bold text-orange-600' : 'text-gray-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #F97316, #EA580C)',
                  boxShadow: '0 3px 10px rgba(249,115,22,0.35)',
                }}
              >
                <span className="text-white text-sm font-extrabold select-none">
                  {userInitial || '·'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-12">

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <div
          className="relative rounded-3xl overflow-hidden mb-6 fade-in-up"
          style={{
            background: 'linear-gradient(140deg, #92400E 0%, #C2410C 40%, #F97316 75%, #F59E0B 100%)',
            boxShadow: '0 12px 40px rgba(194,65,12,0.35)',
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          />
          <div
            className="absolute top-5 right-20 w-16 h-16 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
          <div
            className="absolute -bottom-14 -left-10 w-40 h-40 rounded-full"
            style={{ background: 'rgba(0,0,0,0.07)' }}
          />
          <div
            className="absolute bottom-6 right-8 w-5 h-5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          />
          {/* Grid texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.03) 28px,rgba(255,255,255,0.03) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,0.03) 28px,rgba(255,255,255,0.03) 29px)',
            }}
          />

          <div className="relative px-6 pt-7 pb-8">
            {/* Eyebrow badge */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-[0.14em]">
                {t('hero.eyebrow')}
              </span>
            </div>

            <h2
              className="text-white font-extrabold leading-tight mb-2.5 whitespace-pre-line"
              style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}
            >
              {t('hero.headline')}
            </h2>
            <p className="text-white/65 text-xs leading-relaxed max-w-[200px] mb-6">
              {t('hero.tagline')}
            </p>

            <Link
              to="/savings"
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all active:scale-95"
              style={{
                background: 'white',
                color: '#C2410C',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              {t('hero.cta')}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Quick stats ───────────────────────────────────────────────── */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          {t('stats.heading')}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-7">
          {QUICK_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl px-3.5 pt-4 pb-4 overflow-hidden fade-in-up"
              style={{
                background: 'white',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                border: '1px solid #F0EDE8',
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{ background: stat.grad }}
              >
                <stat.icon className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <p
                className="text-base font-extrabold leading-none tabular-nums"
                style={{
                  color: statsLoading ? '#D1CFC9' : stat.numColor,
                  animation: statsLoading ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                {stat.value}
              </p>
              <p className="text-[10px] text-gray-400 mt-1.5 font-semibold leading-tight">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Feature cards ─────────────────────────────────────────────── */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          {t('features.heading')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <Link key={f.to} to={f.to} className="block fade-in-up" style={{ animationDelay: `${i * 60}ms`, opacity: 0 }}>
              <div
                className="rounded-2xl overflow-hidden h-full transition-all active:scale-[0.97]"
                style={{
                  background: 'white',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #F0EDE8',
                }}
              >
                {/* Gradient top strip */}
                <div
                  className="h-[3px] w-full"
                  style={{ background: f.grad }}
                />

                <div className="p-5">
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: f.grad, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  >
                    <f.icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>

                  {/* Text */}
                  <p className="text-sm font-bold text-gray-900 leading-tight mb-1.5">{f.title}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed mb-4">{f.description}</p>

                  {/* Arrow */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#F5F2EC' }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
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
