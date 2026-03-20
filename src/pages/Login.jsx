import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { migrateGuestData } from '../lib/migrateGuestData.js'
import { track, identifyUser } from '../lib/analytics.js'

function Login() {
  const navigate = useNavigate()
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
      alert('Check your email to confirm your account. Your guest data will be migrated when you sign in.')
      setLoading(false)
    }
  }

  function handleGuest() {
    localStorage.setItem('remlo_guest', 'true')
    track('guest_mode_selected')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Brand header */}
      <div className="bg-gradient-to-br from-blue-600 to-violet-600 px-6 pt-16 pb-12 flex flex-col items-center text-center">
        {/* Logo mark */}
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
            <circle cx="20" cy="20" r="14" stroke="white" strokeWidth="2" strokeOpacity="0.9" />
            <path d="M14 20h12M14 15.5h12M14 24.5h8" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Remlo</h1>
        <p className="text-white/70 text-sm mt-1">Smart finance for migrant workers</p>
      </div>

      {/* Form card */}
      <div className="flex-1 flex flex-col px-5 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 w-full max-w-sm mx-auto">

          <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-5">Sign in or create a new account</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              Create Account
            </button>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              onClick={handleGuest}
              disabled={loading}
              className="w-full border border-dashed border-gray-200 text-gray-500 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 hover:text-gray-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              Continue as Guest
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-5 leading-relaxed">
            Guest data is saved on this device only.
            <br />Create an account to sync across devices.
          </p>
        </div>
      </div>

      <div className="pb-8" />
    </div>
  )
}

export default Login
