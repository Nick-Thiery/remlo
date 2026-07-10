import { useState, useEffect, useRef } from 'react'
import { useDarkMode } from './hooks/useDarkMode.js'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding.jsx'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase.js'
import safeStorage, { safeSession } from './lib/safeStorage.js'
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
  Trash2,
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
import DeleteAccount from './pages/DeleteAccount.jsx'

// ─── Splash Screen ───────────────────────────────────────────────────────────

function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1500)
    const doneTimer = setTimeout(() => onDone(), 1800)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #C2410C 0%, #E8640C 55%, #F59E0B 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <img
        src="/pwa-192x192.png"
        alt="Remlo"
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      />
    </div>
  )
}

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
  { path: '/',           key: 'home',    Icon: HomeIcon       },
  { path: '/savings',    key: 'savings', Icon: Coins          },
  { path: '/budget',     key: 'budget',  Icon: Wallet         },
  { path: '/remittance', key: 'send',    Icon: ArrowLeftRight },
  { path: '/chat',       key: 'chat',    Icon: MessageCircle  },
  { path: '/more',       key: 'more',    Icon: Menu           },
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
  const isDark = useDarkMode()

  const MORE_SUB_PATHS = MORE_ITEMS.map((m) => m.path)
  const onMoreSection = location.pathname === '/more' || MORE_SUB_PATHS.includes(location.pathname)

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40">
      <div
        style={{
          background: isDark ? '#1E1C1A' : 'white',
          borderTop: isDark ? '1px solid rgba(44,41,38,0.8)' : '1px solid rgba(240, 237, 232, 0.8)',
          boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.3)' : '0 -4px 24px rgba(0,0,0,0.07)',
        }}
      >
        <div className="flex items-stretch px-1">
          {TABS.map(({ path, key, Icon }) => {
            const active = key === 'more' ? onMoreSection : location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
                style={{ minHeight: 60, paddingTop: 10, paddingBottom: 8 }}
              >
                <Icon
                  style={{
                    width: 26,
                    height: 26,
                    color: active ? '#E8640C' : isDark ? '#6B7280' : '#9CA3AF',
                    transition: 'color 0.15s',
                  }}
                  fill="none"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span
                  className="text-[10px] leading-none font-semibold transition-colors"
                  style={{ color: active ? '#E8640C' : isDark ? '#6B7280' : '#9CA3AF' }}
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
  const isGuest = safeStorage.getItem('remlo_guest') === 'true'
  const isDark = useDarkMode()

  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#F0EDE8'
  const textPrimary   = isDark ? '#F5F2EE' : '#111827'
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280'

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  function switchLang(code) {
    i18n.changeLanguage(code)
    safeStorage.setItem('remlo_lang', code)
    setLangOpen(false)
  }

  async function handleSignOut() {
    if (isGuest) {
      safeStorage.removeItem('remlo_guest')
      navigate('/login', { replace: true })
    } else {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="min-h-screen" style={{ background: bg }} onClick={() => setLangOpen(false)}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: textPrimary }}>{t('nav.moreHeading')}</h1>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>{t('nav.moreDesc')}</p>
        </div>

        {/* Page links */}
        <div className="space-y-2.5 mb-6">
          {MORE_ITEMS.map(({ path, key, Icon, grad, glow }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl active:scale-[0.98] transition-all"
              style={{
                background: card,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                border: `1px solid ${border}`,
              }}
            >
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 ${isDark ? '' : `shadow-lg ${glow}`}`}
              >
                <Icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold" style={{ color: textPrimary }}>{t(`moreItems.${key}.label`)}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: textSecondary }}>{t(`moreItems.${key}.desc`)}</p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? '#4B5563' : '#D1D5DB' }} />
            </button>
          ))}
        </div>

        {/* Language selector */}
        <div
          className="mb-4 px-4 py-3.5 rounded-2xl"
          style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: textPrimary }}>{t('nav.language')}</p>
            <div className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
                style={{
                  background: isDark ? '#2A2724' : '#F8F6F2',
                  border: `1px solid ${border}`,
                  color: textSecondary,
                }}
              >
                {currentLang.label}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} style={{ color: textSecondary }} />
              </button>
              {langOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-44 rounded-2xl py-1.5 z-10 max-h-60 overflow-y-auto"
                  style={{ background: card, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: `1px solid ${border}` }}
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => switchLang(l.code)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        l.code === i18n.language ? 'font-bold text-orange-500' : ''
                      }`}
                      style={{ color: l.code === i18n.language ? '#E8640C' : textSecondary }}
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
          className="w-full mb-3 px-4 py-3.5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all"
          style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
        >
          <span className="text-sm font-bold text-red-500">
            {isGuest ? t('nav.endGuestSession') : t('nav.signOut')}
          </span>
          <svg className="w-4 h-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Delete account — only for authenticated users */}
        {!isGuest && (
          <button
            onClick={() => navigate('/delete-account')}
            className="w-full mb-6 px-4 py-3.5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all"
            style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Delete Account</span>
            </div>
            <svg className="w-4 h-4 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Emergency contacts */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{ background: isDark ? '#2A1A1A' : '#FFF5F5', border: isDark ? '1px solid #4B2020' : '1px solid #FECACA' }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: isDark ? '1px solid #4B2020' : '1px solid #FECACA' }}>
            <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold" style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}>{t('nav.emergencySection')}</p>
          </div>
          <div>
            {EMERGENCY_CONTACTS.map(({ label, number }) => (
              <a
                key={number}
                href={`tel:${number.replace(/[^0-9]/g, '')}`}
                className="flex items-center justify-between px-4 py-3.5 transition-colors"
                style={{ borderBottom: isDark ? '1px solid #3B1F1F' : '1px solid #FEE2E2' }}
              >
                <span className="text-sm" style={{ color: textSecondary }}>{label}</span>
                <span className="text-sm font-extrabold tabular-nums text-red-500">{number}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: textSecondary }}>{t('nav.drawerFooter')}</p>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={() => navigate('/privacy')}
            className="text-xs underline underline-offset-2 transition-colors"
            style={{ color: textSecondary }}
          >
            Privacy Policy
          </button>
          <span className="text-xs" style={{ color: isDark ? '#4B5563' : '#D1D5DB' }}>·</span>
          <button
            onClick={() => navigate('/terms')}
            className="text-xs underline underline-offset-2 transition-colors"
            style={{ color: textSecondary }}
          >
            Terms of Service
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Educational Disclaimer Banner ────────────────────────────────────────────

function EduDisclaimerBanner() {
  const { t } = useTranslation()
  const location = useLocation()
  const [dismissed, setDismissed] = useState(
    () => safeStorage.getItem('remlo_edu_disclaimer_seen') === 'true'
  )

  if (dismissed || location.pathname === '/login') return null

  function dismiss() {
    safeStorage.setItem('remlo_edu_disclaimer_seen', 'true')
    setDismissed(true)
  }

  return (
    <div
      className="px-4 py-3 flex items-start gap-3"
      style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}
    >
      <span className="text-base leading-none mt-0.5 flex-shrink-0">ℹ️</span>
      <p className="text-xs text-blue-800 leading-relaxed flex-1">
        {t('disclaimer.educational')}
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0 text-lg leading-none mt-0.5"
      >
        ×
      </button>
    </div>
  )
}

// ─── Guest Banner ─────────────────────────────────────────────────────────────

function GuestBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isGuest = safeStorage.getItem('remlo_guest') === 'true'
  const [dismissed, setDismissed] = useState(
    () => safeSession.getItem('remlo_guest_banner_dismissed') === 'true'
  )

  if (!isGuest || location.pathname === '/login' || dismissed) return null

  function dismiss() {
    safeSession.setItem('remlo_guest_banner_dismissed', 'true')
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
  const locationRef = useRef(location.pathname)

  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    const isGuest = safeStorage.getItem('remlo_guest') === 'true'
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!session && !isGuest && locationRef.current !== '/login') {
          navigate('/login', { replace: true })
        }
        setReady(true)
      })
      .catch(() => setReady(true))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const stillGuest = safeStorage.getItem('remlo_guest') === 'true'
      if (!session && !stillGuest) navigate('/login', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const isDarkGuard = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDarkGuard ? '#121110' : '#FAFAF8' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-[3px] border-t-transparent animate-spin"
            style={{ borderColor: '#E8640C', borderTopColor: 'transparent' }}
          />
          <p className="text-xs font-semibold" style={{ color: isDarkGuard ? '#9CA3AF' : '#9CA3AF' }}>Loading…</p>
        </div>
      </div>
    )
  }

  return children
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const isDark = useDarkMode()
  return (
    <div className="min-h-screen flex justify-center" style={{ background: isDark ? '#0A0908' : '#1C1917' }}>
      <div
        className="relative w-full max-w-[430px] min-h-screen overflow-x-hidden"
        style={{ background: isDark ? '#121110' : '#FAFAF8', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}
      >
        <div className="overflow-x-hidden pb-[84px]">
          <EduDisclaimerBanner />
          <GuestBanner />
          <Routes>
            <Route path="/privacy"        element={<PrivacyPolicy />}  />
            <Route path="/terms"          element={<TermsOfService />} />
            <Route path="/delete-account" element={<DeleteAccount />}  />
            <Route path="/login"          element={<Login />}          />
            <Route path="*" element={
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
                </Routes>
              </AuthGuard>
            } />
          </Routes>
        </div>
        <BottomTabBar />
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const RTL_LANGS = new Set(['ur'])

export default function App() {
  const [onboarded, setOnboarded] = useState(() => !!safeStorage.getItem('remlo_onboarded'))
  const [splashDone, setSplashDone] = useState(() => !!safeSession.getItem('remlo_splashed'))
  const { i18n } = useTranslation()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches)
      const meta = document.querySelector('meta[name="theme-color"][media*="light"], meta[name="theme-color"]:not([media])')
      if (meta) meta.setAttribute('content', e.matches ? '#121110' : '#ffffff')
    }
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.has(i18n.language) ? 'rtl' : 'ltr'
  }, [i18n.language])

  function handleSplashDone() {
    safeSession.setItem('remlo_splashed', 'true')
    setSplashDone(true)
  }

  if (!splashDone) {
    return <SplashScreen onDone={handleSplashDone} />
  }

  const isDarkInit = window.matchMedia('(prefers-color-scheme: dark)').matches
  const ONBOARDING_BYPASS = ['/privacy', '/terms', '/delete-account']
  if (!onboarded && !ONBOARDING_BYPASS.includes(window.location.pathname)) {
    return (
      <div className="min-h-screen flex justify-center" style={{ background: isDarkInit ? '#0A0908' : '#1C1917' }}>
        <div
          className="w-full max-w-[430px] min-h-screen overflow-x-hidden"
          style={{ background: isDarkInit ? '#121110' : '#FAFAF8', boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}
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
