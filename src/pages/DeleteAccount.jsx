import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode.js'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import safeStorage from '../lib/safeStorage.js'

export default function DeleteAccount() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isDark = useDarkMode()
  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#EDE8E0'

  const [confirmed, setConfirmed] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState(null)

  async function handleDelete() {
    if (!confirmed || loading) return
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Guest — clear local storage only
        safeStorage.clear()
        setDone(true)
        setTimeout(() => navigate('/login', { replace: true }), 2500)
        return
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server error (${res.status})`)
      }

      await supabase.auth.signOut()
      safeStorage.clear()
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: isDark ? '#0D2B1E' : '#ECFDF5', border: `1px solid ${isDark ? '#1A4A30' : '#A7F3D0'}` }}>
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">{t('deleteAccount.doneTitle')}</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            {t('deleteAccount.doneBody')}<br />{t('deleteAccount.redirecting')}
          </p>
        </div>
      </div>
    )
  }

  // ── Main screen ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            aria-label={t('workshop.back')}
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0"
            style={{ background: card, border: `1px solid ${border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" style={{ color: isDark ? '#F5F2EC' : undefined }} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('deleteAccount.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('deleteAccount.subtitle')}</p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="rounded-2xl px-4 py-4 mb-5 flex gap-3"
          style={{ background: isDark ? '#2A1010' : '#FFF5F5', border: `1px solid ${isDark ? '#5C2020' : '#FECACA'}` }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#FCA5A5' : '#DC2626' }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}>
              {t('deleteAccount.warningTitle')}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: isDark ? '#F87171' : '#B91C1C' }}>
              {t('deleteAccount.warningBody')}
            </p>
          </div>
        </div>

        {/* What gets deleted */}
        <div className="rounded-2xl px-5 py-5 mb-5"
          style={{ background: card, border: `1px solid ${border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <p className="text-sm font-bold text-gray-900 mb-3">{t('deleteAccount.listTitle')}</p>
          <ul className="space-y-2">
            {t('deleteAccount.items', { returnObjects: true }).map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
                <span className="text-red-300 flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirmation checkbox */}
        <button
          onClick={() => setConfirmed((c) => !c)}
          className="w-full flex items-start gap-3 px-4 py-4 rounded-2xl mb-4 text-left transition-all active:scale-[0.99]"
          style={{
            background: card,
            border: `2px solid ${confirmed ? '#EF4444' : border}`,
            boxShadow: confirmed ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
          }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{
              background: confirmed ? '#EF4444' : 'transparent',
              border: confirmed ? 'none' : `2px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
            }}
          >
            {confirmed && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm leading-snug" style={{ color: isDark ? '#D1CDC8' : '#374151' }}>
            {t('deleteAccount.confirm')}
          </span>
        </button>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4"
            style={{ background: isDark ? '#2A1010' : '#FEF2F2', border: `1px solid ${isDark ? '#5C2020' : '#FECACA'}` }}>
            <p className="text-xs" style={{ color: isDark ? '#FCA5A5' : '#DC2626' }}>{error}</p>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={!confirmed || loading}
          className="w-full rounded-2xl py-4 text-base font-extrabold transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50"
          style={{
            background: confirmed && !loading ? '#DC2626' : (isDark ? '#3A1A1A' : '#FEE2E2'),
            color: confirmed && !loading ? 'white' : (isDark ? '#7A3030' : '#FCA5A5'),
            boxShadow: confirmed && !loading ? '0 4px 16px rgba(220,38,38,0.35)' : 'none',
          }}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('deleteAccount.deleting')}
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              {t('deleteAccount.button')}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          {t('deleteAccount.changedMind')}
        </p>
        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          {t('disclaimer.educational')}
        </p>
      </div>
    </div>
  )
}
