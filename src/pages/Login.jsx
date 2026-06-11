import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { migrateGuestData } from '../lib/migrateGuestData.js'
import { track, identifyUser } from '../lib/analytics.js'
import safeStorage from '../lib/safeStorage.js'

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

function Login() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [langOpen, setLangOpen] = useState(false)

  const wasGuest = safeStorage.getItem('remlo_guest') === 'true'
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  function switchLang(code) {
    i18n.changeLanguage(code)
    safeStorage.setItem('remlo_lang', code)
    setLangOpen(false)
  }

  const inputStyle = {
    border: '2px solid #EDE8E0',
    background: '#FAFAF8',
    outline: 'none',
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      if (wasGuest && data.user) await migrateGuestData(data.user.id)
      identifyUser(data.user.id)
      track('login', { method: 'email' })
      navigate('/', { replace: true })
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const opts = displayName.trim()
      ? { data: { display_name: displayName.trim() } }
      : {}

    const { data, error: err } = await supabase.auth.signUp({ email, password, options: opts })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else if (data.session) {
      if (data.user && displayName.trim()) {
        await supabase.from('profiles').upsert({ id: data.user.id, preferred_name: displayName.trim() })
      }
      if (wasGuest && data.user) await migrateGuestData(data.user.id)
      identifyUser(data.user.id)
      track('signup', { method: 'email' })
      navigate('/', { replace: true })
    } else {
      track('signup', { method: 'email', awaiting_confirmation: true })
      alert(t('login.confirmEmail'))
      setLoading(false)
    }
  }

  function handleGuest() {
    safeStorage.setItem('remlo_guest', 'true')
    track('guest_mode_selected')
    navigate('/', { replace: true })
  }

  function switchMode(next) {
    setMode(next)
    setError(null)
    setDisplayName('')
  }

  const isSignup = mode === 'signup'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'white', overflowY: 'auto' }} onClick={() => setLangOpen(false)}>

      {/* Orange gradient hero */}
      <div
        className="relative px-6 pb-12 flex flex-col items-center text-center overflow-hidden flex-shrink-0"
        style={{
          background: 'linear-gradient(160deg, #C2410C 0%, #E8640C 50%, #F59E0B 100%)',
          paddingTop: 'max(env(safe-area-inset-top, 0px) + 28px, 36px)',
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.05)' }} />

        <div className="relative">
          <img
            src="/pwa-192x192.png"
            alt="Remlo"
            className="mb-4 mx-auto"
            style={{ width: 72, height: 72, borderRadius: 20, boxShadow: '0 8px 28px rgba(0,0,0,0.22)' }}
          />
          <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>{t('appName')}</h1>
          <p className="text-white/70 text-sm mt-1.5 font-medium">{t('login.tagline')}</p>
        </div>
      </div>

      {/* White form card curves up over the hero */}
      <div className="flex-1 flex flex-col rounded-t-[40px] -mt-6 relative z-10" style={{ background: 'white', boxShadow: '0 -4px 24px rgba(0,0,0,0.10)' }}>
        <div className="px-5 pt-6 pb-10">

          {/* Language selector — compact row */}
          <div className="flex justify-end mb-4" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors"
                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
              >
                <span className="text-xs font-bold text-gray-500">{currentLang.label.slice(0, 2).toUpperCase()}</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-40 bg-white rounded-2xl py-1.5 z-20 max-h-52 overflow-y-auto"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #E5E7EB' }}
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => switchLang(l.code)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-orange-50 ${l.code === i18n.language ? 'font-bold text-orange-600' : 'text-gray-700'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-extrabold mb-0.5 tracking-tight" style={{ color: '#111827' }}>
            {isSignup ? t('login.createAccountTitle') : t('login.welcomeBack')}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isSignup ? t('login.createAccountDesc') : t('login.signInDesc')}
          </p>

          {error && (
            <div className="text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {isSignup && (
              <input
                type="text"
                placeholder={t('login.namePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#E8640C'}
                onBlur={e => e.target.style.borderColor = '#EDE8E0'}
              />
            )}
            <input
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium transition-all"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#E8640C'}
              onBlur={e => e.target.style.borderColor = '#EDE8E0'}
            />
            <input
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (isSignup ? handleSignup(e) : handleLogin(e))}
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium transition-all"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#E8640C'}
              onBlur={e => e.target.style.borderColor = '#EDE8E0'}
            />

            {isSignup ? (
              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full rounded-2xl py-3.5 text-sm font-extrabold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #E8640C, #CC5708)', color: 'white', boxShadow: '0 6px 20px rgba(232,100,12,0.35)' }}
              >
                {loading ? t('login.creating') : t('login.createAccount')}
              </button>
            ) : (
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-2xl py-3.5 text-sm font-extrabold transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #E8640C, #CC5708)', color: 'white', boxShadow: '0 6px 20px rgba(232,100,12,0.35)' }}
              >
                {loading ? t('login.signingIn') : t('login.signIn')}
              </button>
            )}

            <button
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98]"
              style={{ border: '2px solid #EDE8E0', background: 'white', color: '#374151' }}
            >
              {isSignup ? t('login.switchToLogin') : t('login.switchToSignup')}
            </button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ background: '#EDE8E0' }} />
              <span className="text-xs text-gray-400 font-semibold">{t('login.or')}</span>
              <div className="flex-1 h-px" style={{ background: '#EDE8E0' }} />
            </div>

            <button
              onClick={handleGuest}
              disabled={loading}
              className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ border: '2px dashed #D4CFC8', background: '#FAFAF8', color: '#6B7280' }}
            >
              {t('login.continueGuest')}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-5 leading-relaxed">
            {t('login.guestNote')}
            <br />{t('login.guestSyncNote')}
          </p>

          <div className="flex items-center justify-center gap-4 mt-4">
            <Link to="/privacy" className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
              {t('login.privacyPolicy')}
            </Link>
            <span className="text-gray-200 text-xs">·</span>
            <Link to="/terms" className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
              {t('login.termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
