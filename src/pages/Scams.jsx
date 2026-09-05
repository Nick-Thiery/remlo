import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, RefreshCw, ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSelect from '../components/LanguageSelect.jsx'
import { fetchJson } from '../lib/fetchJson.js'
import { useDarkMode } from '../hooks/useDarkMode.js'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-scam-alerts`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const BADGE_STYLES = {
  jobScam:       { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500'  },
  loanScam:      { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'     },
  phishing:      { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500'  },
  impersonation: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'   },
  paymentScam:   { bg: 'bg-rose-100',   text: 'text-rose-700',   dot: 'bg-rose-500'    },
  investmentScam:{ bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
}

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-600',    text: 'text-white'      },
  high:     { bg: 'bg-orange-500', text: 'text-white'      },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  low:      { bg: 'bg-gray-100',   text: 'text-gray-500'   },
}

const ALL_TYPE_IDS = ['all', 'jobScam', 'loanScam', 'phishing', 'impersonation', 'paymentScam', 'investmentScam']

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}


export default function Scams() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isDark = useDarkMode()
  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#F0EDE8'
  const border2 = isDark ? '#2C2926' : '#EDE8E0'

  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const loadAlerts = useCallback(async (lang, signal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchJson(FUNCTIONS_URL, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ language: lang }),
      })
      if (!Array.isArray(data?.alerts)) throw new Error('Invalid alerts')
      if (!signal?.aborted) setAlerts(data.alerts.filter(alert =>
        // This legacy item wrongly claims all employment agency fees are illegal.
        // Suppress it until both source and cached translations are corrected.
        alert.id !== 'alert_jobscam_001' && typeof alert.title === 'string' &&
        typeof alert.description === 'string' && Array.isArray(alert.what_to_do)
      ))
    } catch {
      if (!signal?.aborted) setError(true)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    loadAlerts(i18n.language, controller.signal)
    return () => controller.abort()
  }, [i18n.language, loadAlerts, attempt])

  const visible = filter === 'all' ? alerts : alerts.filter((a) => a.type === filter)

  return (
    <div className="min-h-screen" style={{ background: bg }}>

      {/* Emergency banner */}
      <div className="sticky top-0 z-30 bg-red-600 px-4 py-3">
        <p className="text-white text-xs font-semibold text-center leading-relaxed">
          {t('scams.emergencyBanner')}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <button
            aria-label={t('workshop.back')}
            onClick={() => navigate('/more')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0 mt-0.5"
            style={{ background: card, border: `1px solid ${border2}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: isDark ? '#F5F2EC' : '#4B5563' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{t('scams.pageTitle')}</h1>

          </div>

        </div>

        <div className="mb-5 space-y-3">
          <LanguageSelect />
          <Link to="/scam-quiz" className="block rounded-2xl bg-orange-600 text-white p-4 font-bold">{t('scamQuiz.pageTitle')} →</Link>
          <p className="text-sm text-gray-600">{t('workshop.reportNote')}</p>
          <div className="flex flex-wrap gap-3">
            <a className="min-h-11 inline-flex items-center underline font-semibold text-blue-600" href="https://www.scamshield.gov.sg/" target="_blank" rel="noopener noreferrer">ScamShield ↗</a>
            <a className="min-h-11 inline-flex items-center underline font-semibold text-blue-600" href="tel:1799">{t('common.call')} 1799</a>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {ALL_TYPE_IDS.map((typeId) => (
            <button
              key={typeId}
              onClick={() => setFilter(typeId)}
              className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
              style={
                filter === typeId
                  ? { background: isDark ? '#F5F2EE' : '#111827', color: isDark ? '#111827' : 'white' }
                  : { background: card, border: `1px solid ${border2}`, color: isDark ? '#9CA3AF' : '#4B5563' }
              }
            >
              {typeId === 'all' ? t('scams.filterAll') : t(`scams.types.${typeId}`)}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div role="status" aria-label={t("common.loading")} className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl overflow-hidden" style={{ background: card, border: `1px solid ${border}` }}>
                <div className="h-1 w-full skeleton" />
                <div className="px-5 py-4 space-y-2">
                  <div className="h-3 w-24 rounded-full skeleton" />
                  <div className="h-4 w-3/4 rounded-full skeleton" />
                  <div className="h-3 w-full rounded-full skeleton" />
                  <div className="h-3 w-2/3 rounded-full skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-2xl px-5 py-4 mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p className="text-sm text-red-700 font-semibold mb-2">{t('scams.loadError')}</p>
            <button
              onClick={() => setAttempt(value => value + 1)}
              className="min-h-11 flex items-center gap-1.5 text-sm font-bold text-red-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t('scams.tryAgain')}
            </button>
          </div>
        )}

        {/* Alert cards */}
        {!loading && !error && (
          <div className="space-y-4">
            {visible.map((alert) => {
              const badge = BADGE_STYLES[alert.type] ?? BADGE_STYLES.jobScam
              const severity = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.medium
              const isExpanded = expandedId === alert.id

              return (
                <div
                  key={alert.id}
                  className="rounded-3xl overflow-hidden"
                  style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
                >
                  {/* Coloured top accent bar */}
                  <div className={`h-1 w-full ${badge.dot}`} />

                  {/* Tappable header */}
                  <button
                    className="w-full text-left px-4 pt-4 pb-4"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  >
                    {/* Row 1: badges + chevron */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />
                        {t(`scams.types.${alert.type}`)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${severity.bg} ${severity.text}`}>
                        {t(`scams.severity.${alert.severity}`)}
                      </span>
                      <span className="ml-auto text-xs flex-shrink-0 text-gray-300">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>

                    {/* Row 2: title */}
                    <p className="text-sm font-semibold text-gray-900 leading-snug mb-1.5">{alert.title}</p>

                    {/* Row 3: date */}
                    <p className="text-[11px] text-gray-400 mb-2">{formatDate(alert.published_at)}</p>

                    {/* Row 4: description */}
                    <p className={`text-sm text-gray-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {alert.description}
                    </p>
                  </button>

                  {/* Expanded: what to do + source */}
                  {isExpanded && (
                    <div className="px-4 py-4" style={{ borderTop: `1px solid ${border}` }}>
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">
                        {t('scams.whatToDoHeading')}
                      </p>
                      <ul className="space-y-2.5 mb-4">
                        {(alert.what_to_do ?? []).map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full ${badge.bg} ${badge.text} text-xs font-bold flex items-center justify-center mt-0.5`}>
                              {i + 1}
                            </span>
                            <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                          </li>
                        ))}
                      </ul>

                      {/* Source attribution */}
                      <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${border}` }}>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('scams.sourceLabel')}</span>
                        {typeof alert.source_url === 'string' && alert.source_url.startsWith('https://') ? (
                          <a
                            href={alert.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-blue-500 underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {alert.source}
                          </a>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-500">{alert.source}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {visible.length === 0 && (
              <div className="rounded-2xl px-8 py-10 text-center" style={{ background: card, border: `1px solid ${border}` }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: isDark ? '#0F2A1A' : '#F0FDF4' }}>
                  <ShieldCheck className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-gray-900 mb-1">{t('scams.noAlerts')}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          {t('disclaimer.educational')}
        </p>
      </div>

    </div>
  )
}
