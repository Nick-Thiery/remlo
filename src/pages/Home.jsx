import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutGrid,
  SendHorizonal,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PiggyBank,
  ShieldAlert,
  Landmark,
  Banknote,
  MoreHorizontal,
  Coins,
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

const QUICK_ACTIONS = [
  { to: '/savings',    icon: PiggyBank,     label: 'Savings' },
  { to: '/budget',     icon: LayoutGrid,    label: 'Budget'  },
  { to: '/remittance', icon: SendHorizonal, label: 'Send'    },
  { to: '/chat',       icon: Sparkles,      label: 'Chat'    },
]

const FEATURE_LIST = [
  { to: '/chat',          icon: Sparkles,       title: 'AI Assistant',   subtitle: 'Smart financial guidance'  },
  { to: '/scams',         icon: ShieldAlert,    title: 'Scam Alerts',    subtitle: 'Stay protected & informed' },
  { to: '/loans',         icon: Landmark,       title: 'Loan Tracker',   subtitle: 'Manage your borrowings'    },
  { to: '/salary',        icon: Banknote,       title: 'Salary Tracker', subtitle: 'Track income & growth'     },
  { to: '/emergency-fund',icon: Coins,          title: 'Emergency Fund', subtitle: 'Build your safety net'     },
  { to: '/more',          icon: MoreHorizontal, title: 'More',           subtitle: 'Explore all features'      },
]

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

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5' }}>

      {/* ── Header ── */}
      <div className="bg-white" style={{ borderBottom: '1px solid #ECEEF1' }}>
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <div className="flex items-center justify-between relative z-50">
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
              {t('appName')}
            </h1>

            <div className="flex items-center gap-2">
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

              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#111827' }}
              >
                <span className="text-white text-sm font-extrabold select-none">
                  {userInitial || '·'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-8">

        {/* ── Hero Card ── */}
        <div
          className="relative rounded-2xl overflow-hidden mb-5"
          style={{
            background: 'linear-gradient(135deg, #E8640C 0%, #F97316 100%)',
            boxShadow: '0 8px 32px rgba(232,100,12,0.30)',
          }}
        >
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.13) 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* Diagonal line overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 20px)',
            }}
          />

          <div className="relative px-6 py-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/65 text-[11px] font-bold uppercase tracking-[0.12em] mb-2">
                  {t('stats.totalSaved')}
                </p>
                <p
                  className="text-white font-extrabold tabular-nums"
                  style={{
                    fontSize: '2.75rem',
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    opacity: statsLoading ? 0.35 : 1,
                  }}
                >
                  {statsLoading ? '—' : formatSGD(totalSaved)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-white/65 text-[11px] font-bold uppercase tracking-[0.12em] mb-2">
                  {t('stats.budgetLeft')}
                </p>
                <p
                  className="text-white/90 font-bold tabular-nums"
                  style={{
                    fontSize: '1.75rem',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    opacity: statsLoading ? 0.35 : 1,
                  }}
                >
                  {statsLoading ? '—' : formatSGD(budgetLeft)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex items-start justify-between mb-5 px-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: '#E8640C' }}
              >
                <a.icon className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: '#1A1A1A' }}>{a.label}</span>
            </Link>
          ))}
        </div>

        {/* ── Features List ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1px solid #EBEBEB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {FEATURE_LIST.map((f, i) => (
            <Link key={f.to} to={f.to} className="block active:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#FFF1E6' }}
                >
                  <f.icon style={{ width: 18, height: 18, color: '#E8640C' }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight" style={{ color: '#111827' }}>{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{f.subtitle}</p>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: '#D1D5DB', flexShrink: 0 }} />
              </div>
              {i < FEATURE_LIST.length - 1 && (
                <div style={{ height: 1, background: '#F3F4F6', marginLeft: 58 }} />
              )}
            </Link>
          ))}
        </div>
      </div>

      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </div>
  )
}
