import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { migrateGuestData } from '../lib/migrateGuestData.js'
import { track, identifyUser } from '../lib/analytics.js'

function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const wasGuest = localStorage.getItem('remlo_guest') === 'true'

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

    const { data, error: err } = await supabase.auth.signUp({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else if (data.session) {
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
    localStorage.setItem('remlo_guest', 'true')
    track('guest_mode_selected')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8' }}>

      {/* Brand hero */}
      <div
        className="relative px-6 pt-8 pb-12 flex flex-col items-center text-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #C2410C 0%, #E8640C 50%, #F59E0B 100%)',
        }}
      >
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Decorative circles */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full"
          style={{ background: 'rgba(0,0,0,0.05)' }}
        />

        <div className="relative">
          {/* Logo mark */}
          <div
            className="w-18 h-18 rounded-3xl flex items-center justify-center mb-4 mx-auto"
            style={{
              width: 72,
              height: 72,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
              <circle cx="24" cy="24" r="16" stroke="white" strokeWidth="2.5" strokeOpacity="0.95" />
              <path d="M18 24h12M18 19h12M18 29h9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{t('appName')}</h1>
          <p className="text-white/70 text-sm mt-1.5 font-medium">{t('login.tagline')}</p>
        </div>
      </div>

      {/* Form section — curves up over the hero */}
      <div
        className="flex-1 flex flex-col rounded-t-[40px] -mt-6 relative z-10"
        style={{
          background: 'white',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}
      >
        <div className="px-5 pt-8 pb-2">
          <h2 className="text-xl font-extrabold text-gray-900 mb-0.5 tracking-tight">{t('login.welcomeBack')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('login.signInDesc')}</p>

          {error && (
            <div
              className="text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium transition-all"
              style={{
                border: '2px solid #EDE8E0',
                background: '#FAFAF8',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#E8640C'}
              onBlur={e => e.target.style.borderColor = '#EDE8E0'}
            />
            <input
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium transition-all"
              style={{
                border: '2px solid #EDE8E0',
                background: '#FAFAF8',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#E8640C'}
              onBlur={e => e.target.style.borderColor = '#EDE8E0'}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-2xl py-3.5 text-sm font-extrabold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                color: 'white',
                boxShadow: '0 6px 20px rgba(232,100,12,0.35)',
              }}
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                border: '2px solid #EDE8E0',
                background: 'white',
                color: '#374151',
              }}
            >
              {t('login.createAccount')}
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
              style={{
                border: '2px dashed #D4CFC8',
                background: '#FAFAF8',
                color: '#6B7280',
              }}
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

      <div className="pb-10" style={{ background: 'white' }} />
    </div>
  )
}

export default Login
