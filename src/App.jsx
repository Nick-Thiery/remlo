import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding.jsx'
import { useTranslation } from 'react-i18next'
import {
  Home as HomeIcon,
  PiggyBank,
  Wallet,
  ArrowLeftRight,
  MessageCircle,
  Menu,
  X,
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
  { path: '/savings',    key: 'savings', Icon: PiggyBank      },
  { path: '/budget',     key: 'budget',  Icon: Wallet         },
  { path: '/remittance', key: 'send',    Icon: ArrowLeftRight },
  { path: '/chat',       key: 'chat',    Icon: MessageCircle  },
]

const MORE_ITEMS = [
  { path: '/salary',    key: 'salary',    Icon: Banknote,    accent: 'bg-blue-100 text-blue-600'    },
  { path: '/loans',     key: 'loans',     Icon: CreditCard,  accent: 'bg-violet-100 text-violet-600' },
  { path: '/scams',     key: 'scams',     Icon: ShieldAlert, accent: 'bg-red-100 text-red-600'       },
  { path: '/loanshark', key: 'loanshark', Icon: Scale,       accent: 'bg-amber-100 text-amber-700'  },
  { path: '/emergency', key: 'emergency', Icon: Phone,       accent: 'bg-red-100 text-red-600'       },
]

const EMERGENCY_CONTACTS = [
  { label: 'Police (Emergency)',    number: '999'           },
  { label: 'X-Ah Long Hotline',    number: '1800-924-5664' },
  { label: 'MOM Helpline',         number: '1800-333-1313' },
  { label: 'Credit Counselling SG',number: '6225-5227'     },
]

const MORE_PATHS = MORE_ITEMS.map((m) => m.path)

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

function BottomTabBar({ moreOpen, setMoreOpen }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate  = useNavigate()
  const onMorePage = MORE_PATHS.includes(location.pathname)

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-white border-t border-gray-200">
      <div className="flex items-stretch">
        {TABS.map(({ path, key, Icon }) => {
          const active = !moreOpen && location.pathname === path
          return (
            <button
              key={path}
              onClick={() => { setMoreOpen(false); navigate(path) }}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{t(`nav.${key}`)}</span>
            </button>
          )
        })}

        {/* More */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
            moreOpen || onMorePage ? 'text-blue-600' : 'text-gray-400 hover:text-gray-500'
          }`}
        >
          {moreOpen
            ? <X className="w-[22px] h-[22px]" strokeWidth={2.5} />
            : <Menu className="w-[22px] h-[22px]" strokeWidth={1.8} />}
          <span className={`text-[10px] font-medium ${moreOpen || onMorePage ? 'font-semibold' : ''}`}>{t('nav.more')}</span>
        </button>
      </div>

      {/* iPhone home indicator clearance */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </div>
  )
}

// ─── More Drawer ─────────────────────────────────────────────────────────────

function MoreDrawer({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  function go(path) {
    navigate(path)
    onClose()
  }

  function switchLang(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('remlo_lang', code)
    setLangOpen(false)
  }

  return (
    <>
      {/* Backdrop — only rendered when open */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] top-0 bottom-[65px] bg-white z-[55] overflow-y-auto transition-transform duration-300 ease-in-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Clicking anywhere in the sheet closes the language dropdown */}
        <div className="px-4 pt-10 pb-8" onClick={() => setLangOpen(false)}>
          {/* Drawer heading */}
          <h2 className="text-2xl font-bold text-gray-900 mb-0.5">{t('nav.moreHeading')}</h2>
          <p className="text-sm text-gray-500 mb-7">{t('nav.moreDesc')}</p>

          {/* Page links */}
          <div className="space-y-2 mb-6">
            {MORE_ITEMS.map(({ path, key, Icon, accent }) => (
              <button
                key={path}
                onClick={() => go(path)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t(`moreItems.${key}.label`)}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{t(`moreItems.${key}.desc`)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Language selector */}
          <div className="mb-6 px-4 py-3.5 rounded-2xl bg-gray-50" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{t('nav.language')}</p>
              <div className="relative">
                <button
                  onClick={() => setLangOpen((o) => !o)}
                  className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  {currentLang.label}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-80 overflow-y-auto">
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
            </div>
          </div>

          {/* Emergency contacts */}
          <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-red-100">
              <Phone className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-bold text-red-800">{t('nav.emergencySection')}</p>
            </div>
            <div className="divide-y divide-red-100">
              {EMERGENCY_CONTACTS.map(({ label, number }) => (
                <a
                  key={number}
                  href={`tel:${number.replace(/[^0-9]/g, '')}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-red-100/40 transition-colors active:bg-red-100"
                >
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-red-600">{number}</span>
                </a>
              ))}
            </div>
          </div>

          <p className="text-xs text-center text-gray-400 mt-8">{t('nav.drawerFooter')}</p>
        </div>
      </div>

    </>
  )
}

// ─── App shell ───────────────────────────────────────────────────────────────

function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  // Close drawer whenever the route changes (e.g. after navigating from drawer)
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  return (
    <div className="bg-zinc-300 min-h-screen flex justify-center">
      {/* Page content — overflow-x-hidden clips horizontal overflow in pages */}
      <div className="w-full max-w-[430px] min-h-screen bg-gray-50 relative shadow-[0_0_60px_rgba(0,0,0,0.25)] overflow-x-hidden">
        <div className="pb-[65px]">
          <Routes>
            <Route path="/"           element={<Home />}       />
            <Route path="/savings"    element={<Savings />}    />
            <Route path="/budget"     element={<Budget />}     />
            <Route path="/remittance" element={<Remittance />} />
            <Route path="/salary"     element={<Salary />}     />
            <Route path="/loans"      element={<Loans />}      />
            <Route path="/scams"      element={<Scams />}      />
            <Route path="/loanshark"  element={<LoanShark />}  />
            <Route path="/emergency"  element={<Emergency />}  />
            <Route path="/chat"       element={<Chat />}       />
            <Route path="/login"      element={<Login />}      />
          </Routes>
        </div>
      </div>

      {/* Fixed UI — siblings of the overflow-x-hidden div so position:fixed
          is always relative to the viewport, not the content container */}
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
      <BottomTabBar moreOpen={moreOpen} setMoreOpen={setMoreOpen} />
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
      <div className="bg-zinc-300 min-h-screen flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen bg-gray-50 relative shadow-[0_0_60px_rgba(0,0,0,0.25)] overflow-x-hidden">
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
