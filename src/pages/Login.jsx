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
      // Auto-confirmed (email verification disabled)
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Remlo</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full border border-gray-200 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Create Account
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full border border-dashed border-gray-200 text-gray-500 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-60"
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
  )
}

export default Login
