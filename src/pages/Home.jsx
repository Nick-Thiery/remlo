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
  const [userName, setUserName] = useState('')
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
        setUserName('Guest')
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
        const initial = session.user.email[0].toUpperCase()
        setUserInitial(initial)
        // Prefer display name from metadata, fall back to email username
        const metaName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name
        if (metaName) {
          setUserName(metaName.split(' ')[0])
        } else {
          const emailUser = session.user.email.split('@')[0]
          setUserName(emailUser.charAt(0).toUpperCase() + emailUser.slice(1))
        }
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

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greetingMorning')
    if (hour < 17) return t('home.greetingAfternoon')
    return t('home.greetingEvening')
  }

  const FEATURES = [
    {
      to: '/savings',
      icon: Coins,
      title: t('features.savings.title'),
      description: t('features.savings.description'),
      bg: '#FFFBEB',
      iconBg: '#FDE68A',
      iconColor: '#92400E',
    },
    {
      to: '/budget',
      icon: LayoutGrid,
      title: t('features.budget.title'),
      description: t('features.budget.description'),
      bg: '#F5F3FF',
      iconBg: '#DDD6FE',
      iconColor: '#5B21B6',
    },
    {
      to: '/remittance',
      icon: SendHorizonal,
      title: t('features.remittance.title'),
      description: t('features.remittance.description'),
      bg: '#F0F9FF',
      iconBg: '#BAE6FD',
      iconColor: '#0369A1',
    },
    {
      to: '/chat',
      icon: Sparkles,
      title: t('features.ai.title'),
      description: t('features.ai.description'),
      bg: '#FFF7ED',
      iconBg: '#FED7AA',
      iconColor: '#C2410C',
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>

      {/* ── Header ── */}
      <div className="bg-white" style={{ borderBottom: '1px solid #ECEEF1' }}>
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <div className="flex items-center justify-between relative z-50">
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
              {t('appName')}
            </h1>

            <div className="flex items-center gap-2">
              {/* Language pill */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors"
                  style={{ background: '#FAFAF8', border: '1px solid #E8EAED' }}
                >
                  <span className="text-xs font-bold text-gray-500">{currentLang.label.slice(0, 2).toUpperCase()}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 bg-white rounded-2xl py-1.5 z-50 max-h-72 overflow-y-auto"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #ECEEF1' }}
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
                  background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                  boxShadow: '0 3px 10px rgba(232,100,12,0.35)',
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

      <div className="max-w-lg mx-auto px-4 pt-5 pb-14">

        {/* ── Hero card ── */}
        <div
          className="relative rounded-3xl overflow-hidden mb-5"
          style={{
            background: 'linear-gradient(140deg, #92400E 0%, #C2410C 40%, #E8640C 78%, #F59E0B 100%)',
            boxShadow: '0 12px 40px rgba(194,65,12,0.32)',
          }}
        >
          {/* Decorative orbs */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <div className="absolute top-4 right-24 w-12 h-12 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full" style={{ background: 'rgba(0,0,0,0.07)' }} />
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.03) 28px,rgba(255,255,255,0.03) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,0.03) 28px,rgba(255,255,255,0.03) 29px)',
            }}
          />

          <div className="relative px-6 pt-6 pb-7">
            {/* Streak badge */}
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <Flame className="w-3 h-3 text-white/90" strokeWidth={2.5} />
              <span className="text-white/90 text-[11px] font-bold tracking-wide">
                {t('home.streakLabel', { count: streak })}
              </span>
            </div>

            {/* Greeting */}
            <p className="text-white/65 text-sm font-medium mb-0.5">{getGreeting()}</p>
            <h2 className="text-white font-extrabold text-2xl tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
              {userName ? `${userName} 👋` : t('home.welcomeBack')}
            </h2>
            <p className="text-white/55 text-xs mb-7">{t('home.financeGlance')}</p>

            {/* Stats row */}
            <div className="flex items-end gap-8">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Coins className="w-3.5 h-3.5 text-white/50" strokeWidth={2} />
                  <p className="text-white/55 text-xs font-medium">{t('stats.totalSaved')}</p>
                </div>
                <p
                  className="text-white font-extrabold tabular-nums tracking-tight"
                  style={{ fontSize: '1.75rem', lineHeight: 1, opacity: statsLoading ? 0.4 : 1 }}
                >
                  {statsLoading ? 'SGD —' : formatSGD(totalSaved)}
                </p>
              </div>
              <div className="pb-0.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Wallet className="w-3.5 h-3.5 text-white/50" strokeWidth={2} />
                  <p className="text-white/55 text-xs font-medium">{t('stats.budgetLeft')}</p>
                </div>
                <p
                  className="text-white/90 font-extrabold text-xl tabular-nums tracking-tight"
                  style={{ lineHeight: 1, opacity: statsLoading ? 0.4 : 1 }}
                >
                  {statsLoading ? '—' : formatSGD(budgetLeft)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature grid — uniform 2×2 ── */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          {t('features.heading')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} className="block">
              <div
                className="rounded-2xl p-4 transition-all active:scale-[0.97]"
                style={{
                  background: f.bg,
                  border: `1px solid ${f.iconBg}`,
                  minHeight: 138,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: f.iconBg }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.iconColor }} strokeWidth={2} />
                </div>
                <p className="font-extrabold text-sm mb-1" style={{ color: '#1A1A1A', letterSpacing: '-0.01em' }}>
                  {f.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                  {f.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tap outside to close language dropdown */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </div>
  )
}
