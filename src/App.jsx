import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding.jsx'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase.js'
import {
  Home as HomeIcon,
  Coins,
  Wallet,
  ArrowLeftRight,
  MessageCircle,
  Menu,
  Brain,
  Calculator,
  BookOpen,
  Banknote,
  CreditCard,
  ShieldAlert,
  Scale,
  Phone,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

import Home from './pages/Home.jsx'
import Savings from './pages/Savings.jsx'
import Budget from './pages/Budget.jsx'
import Remittance from './pages/Remittance.jsx'
import Salary from './pages/Salary.jsx'
import Loans from './pages/Loans.jsx'
import Scams from './pages/Scams.jsx'
import LoanShark from './pages/LoanShark.jsx'
import Emergency from './pages/Emergency.jsx'
import Chat from './pages/Chat.jsx'
import Login from './pages/Login.jsx'
import ScamQuiz from './pages/ScamQuiz.jsx'
import EmergencyFund from './pages/EmergencyFund.jsx'
import BankingGuide from './pages/BankingGuide.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'

// ─── Config ──────────────────────────────────────────────────────────────────

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

const TABS = [
  { path: '/',           key: 'home',    Icon: HomeIcon,       hasFill: true  },
  { path: '/savings',    key: 'savings', Icon: Coins,          hasFill: true  },
  { path: '/budget',     key: 'budget',  Icon: Wallet,         hasFill: true  },
  { path: '/remittance', key: 'send',    Icon: ArrowLeftRight, hasFill: false },
  { path: '/chat',       key: 'chat',    Icon: MessageCircle,  hasFill: true  },
  { path: '/more',       key: 'more',    Icon: Menu,           hasFill: false },
]

const MORE_ITEMS = [
  { path: '/salary',         key: 'salary',        Icon: Banknote,    grad: 'from-blue-500 to-blue-400',       glow: 'shadow-blue-100'    },
  { path: '/loans',          key: 'loans',         Icon: CreditCard,  grad: 'from-violet-500 to-violet-400',   glow: 'shadow-violet-100'  },
  { path: '/scams',          key: 'scams',         Icon: ShieldAlert, grad: 'from-red-500 to-rose-400',        glow: 'shadow-red-100'     },
  { path: '/scam-quiz',      key: 'scamQuiz',      Icon: Brain,       grad: 'from-purple-500 to-purple-400',   glow: 'shadow-purple-100'  },
  { path: '/emergency-fund', key: 'emergencyFund', Icon: Calculator,  grad: 'from-teal-500 to-emerald-400',    glow: 'shadow-teal-100'    },
  { path: '/banking-guide',  key: 'bankingGuide',  Icon: BookOpen,    grad: 'from-sky-500 to-sky-400',         glow: 'shadow-sky-100'     },
  { path: '/loanshark',      key: 'loanshark',     Icon: Scale,       grad: 'from-amber-500 to-amber-400',     glow: 'shadow-amber-100'   },
  { path: '/emergency',      key: 'emergency',     Icon: Phone,       grad: 'from-rose-500 to-pink-400',       glow: 'shadow-rose-100'    },
]

const EMERGENCY_CONTACTS = [
  { label: 'Police (Emergency)',     number: '999'           },
  { label: 'X-Ah Long Hotline',     number: '1800-924-5664' },
  { label: 'MOM Helpline',          number: '1800-333-1313' },
  { label: 'Credit Counselling SG', number: '6225-5227'     },
]

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

function BottomTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const MORE_SUB_PATHS = MORE_ITEMS.map((m) => m.path)
  const onMoreSection = location.pathname === '/more' || MORE_SUB_PATHS.includes(location.pathname)

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40">
      <div
        className="bg-white/98 backdrop-blur-xl"
        style={{
          borderTop: '1px solid rgba(240, 237, 232, 0.8)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center px-1 pt-2">
          {TABS.map(({ path, key, Icon, hasFill }) => {
            const active = key === 'more' ? onMoreSection : location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center gap-1.5 pb-1 transition-all"
              >
                <Icon
                  style={{
                    width: 22,
                    height: 22,
                    color: active ? '#E8640C' : '#9CA3AF',
                    transition: 'color 0.2s',
                  }}
                  fill={active && hasFill ? 'currentColor' : 'none'}
                  strokeWidth={active ? (hasFill ? 0 : 2.5) : 1.8}
                />
                <span
                  className="text-[10px] leading-none font-semibold transition-colors duration-200"
                  style={{ color: active ? '#E8640C' : '#9CA3AF' }}
                >
                  {t(`nav.${key}`)}
                </span>
              </button>
            )
          })}
        </div>
        {/* Safe area */}
        <div className="h-[max(env(safe-area-inset-bottom,0px),6px)]" />
      </div>
    </div>
  )
}

// ─── More Page ────────────────────────────────────────────────────────────────

function MorePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const isGuest = localStorage.getItem('remlo_guest') === 'true'

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  function switchLang(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('remlo_lang', code)
    setLangOpen(false)
  }

  async function handleSignOut() {
    if (isGuest) {
      localStorage.removeItem('remlo_guest')
      navigate('/login', { replace: true })
    } else {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }} onClick={() => setLangOpen(false)}>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8">

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('nav.moreHeading')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('nav.moreDesc')}</p>
        </div>

        {/* Page links */}
        <div className="space-y-2.5 mb-6">
          {MORE_ITEMS.map(({ path, key, Icon, grad, glow }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-white active:scale-[0.98] transition-all"
              style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                border: '1px solid #F0EDE8',
              }}
            >
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-lg ${glow}`}
              >
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold text-gray-900">{t(`moreItems.${key}.label`)}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t(`moreItems.${key}.desc`)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Language selector */}
        <div
          className="mb-4 px-4 py-3.5 rounded-2xl bg-white"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #F0EDE8' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">{t('nav.language')}</p>
            <div className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors"
                style={{ background: '#F8F6F2', border: '1px solid #E8E4DE' }}
              >
                {currentLang.label}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-44 bg-white rounded-2xl py-1.5 z-10 max-h-60 overflow-y-auto"
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
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full mb-6 px-4 py-3.5 rounded-2xl bg-white flex items-center justify-between active:scale-[0.98] transition-all"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #F0EDE8' }}
        >
          <span className="text-sm font-bold text-red-500">
            {isGuest ? t('nav.endGuestSession') : t('nav.signOut')}
          </span>
          <svg className="w-4 h-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Emergency contacts */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: '#FFF5F5', border: '1px solid #FECACA' }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: '1px solid #FECACA' }}>
            <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-red-800">{t('nav.emergencySection')}</p>
          </div>
          <div>
            {EMERGENCY_CONTACTS.map(({ label, number }) => (
              <a
                key={number}
                href={`tel:${number.replace(/[^0-9]/g, '')}`}
                className="flex items-center justify-between px-4 py-3.5 transition-colors active:bg-red-100"
                style={{ borderBottom: '1px solid #FEE2E2' }}
              >
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm font-extrabold text-red-600 tabular-nums">{number}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-center text-gray-400 mt-8">{t('nav.drawerFooter')}</p>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={() => navigate('/privacy')}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </button>
          <span className="text-gray-300 text-xs">·</span>
          <button
            onClick={() => navigate('/terms')}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Guest Banner ─────────────────────────────────────────────────────────────

function GuestBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isGuest = localStorage.getItem('remlo_guest') === 'true'
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('remlo_guest_banner_dismissed') === 'true'
  )

  if (!isGuest || location.pathname === '/login' || dismissed) return null

  function dismiss() {
    sessionStorage.setItem('remlo_guest_banner_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div
      className="px-4 py-2.5 flex items-center gap-3"
      style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
      <p className="text-xs text-amber-800 leading-snug flex-1 font-medium">
        {t('guestBanner.message')}
      </p>
      <button
        onClick={() => navigate('/login')}
        className="text-xs font-bold text-amber-800 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
        style={{ background: '#FDE68A' }}
      >
        {t('guestBanner.signUp')}
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function AuthGuard({ children }) {
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const isGuest = localStorage.getItem('remlo_guest') === 'true'
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session && !isGuest && location.pathname !== '/login') {
          navigate('/login', { replace: true })
        }
        setReady(true)
      })
      .catch(() => setReady(true))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const stillGuest = localStorage.getItem('remlo_guest') === 'true'
      if (!session && !stillGuest) navigate('/login', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
            style={{ borderColor: '#E8640C', borderTopColor: 'transparent' }}
          />
          <p className="text-xs font-semibold text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  return children
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell() {
  return (
    <div className="min-h-screen flex justify-center" style={{ background: '#1C1917' }}>
      <div
        className="relative w-full max-w-[430px] min-h-screen overflow-x-hidden"
        style={{ background: '#FAFAF8', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}
      >
        <div className="overflow-x-hidden pb-[84px]">
          <GuestBanner />
          <AuthGuard>
            <Routes>
              <Route path="/"           element={<Home />}       />
              <Route path="/savings"    element={<Savings />}    />
              <Route path="/budget"     element={<Budget />}     />
              <Route path="/remittance" element={<Remittance />} />
              <Route path="/more"       element={<MorePage />}   />
              <Route path="/salary"     element={<Salary />}     />
              <Route path="/loans"      element={<Loans />}      />
              <Route path="/scams"      element={<Scams />}      />
              <Route path="/loanshark"  element={<LoanShark />}  />
              <Route path="/emergency"  element={<Emergency />}  />
              <Route path="/chat"       element={<Chat />}       />
              <Route path="/scam-quiz"      element={<ScamQuiz />}      />
              <Route path="/emergency-fund" element={<EmergencyFund />}  />
              <Route path="/banking-guide"  element={<BankingGuide />}  />
              <Route path="/privacy"    element={<PrivacyPolicy />}   />
              <Route path="/terms"      element={<TermsOfService />}  />
              <Route path="/login"      element={<Login />}      />
            </Routes>
          </AuthGuard>
        </div>
        <BottomTabBar />
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const RTL_LANGS = new Set(['ur'])

export default function App() {
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('remlo_onboarded'))
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.has(i18n.language) ? 'rtl' : 'ltr'
  }, [i18n.language])

  if (!onboarded) {
    return (
      <div className="min-h-screen flex justify-center" style={{ background: '#1C1917' }}>
        <div
          className="w-full max-w-[430px] min-h-screen overflow-x-hidden"
          style={{ background: '#FAFAF8', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}
        >
          <Onboarding onComplete={() => setOnboarded(true)} />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
