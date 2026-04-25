import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { ChevronLeft } from 'lucide-react'

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
  // Supabase/PostgreSQL returns "2025-11-01 00:00:00+00" — normalize to ISO 8601
  const d = new Date(iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatNumber(n) {
  return new Intl.NumberFormat('en-SG').format(n)
}

const today = new Date().toISOString().slice(0, 10)

export default function Scams() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [showReport, setShowReport] = useState(false)

  // Report form state
  const [rWhat, setRWhat] = useState('')
  const [rWhen, setRWhen] = useState(today)
  const [rLost, setRLost] = useState('')
  const [rContact, setRContact] = useState('')
  const [rErrors, setRErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  async function loadAlerts() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('fetch-scam-alerts')
      if (fnErr) throw fnErr
      setAlerts(data.alerts ?? [])
      setStats(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAlerts() }, [])

  const visible = filter === 'all' ? alerts : alerts.filter((a) => a.type === filter)

  function openReport() {
    setRWhat(''); setRWhen(today); setRLost(''); setRContact('')
    setRErrors({}); setSubmitted(false)
    setShowReport(true)
  }

  function closeReport() {
    setShowReport(false)
    setRErrors({})
  }

  function handleReport() {
    const errs = {}
    if (!rWhat.trim()) errs.what = t('scams.report.errorWhat')
    if (!rWhen) errs.when = t('scams.report.errorWhen')
    if (!rContact.trim()) errs.contact = t('scams.report.errorContact')
    if (Object.keys(errs).length) return setRErrors(errs)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>

      {/* Emergency banner */}
      <div className="sticky top-0 z-30 bg-red-600 px-4 py-3">
        <p className="text-white text-xs font-semibold text-center leading-relaxed">
          {t('scams.emergencyBanner')}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate('/more')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0"
            style={{ background: 'white', border: '1px solid #EDE8E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('scams.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('scams.pageSubtitle')}</p>
          </div>
          <button
            onClick={openReport}
            className="flex-shrink-0 bg-red-600 text-white rounded-xl px-4 py-3 text-sm font-semibold active:scale-95 transition-all"
          >
            {t('scams.reportBtn')}
          </button>
        </div>

        {/* Live stats card from data.gov.sg */}
        {stats && (
          <div
            className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-4"
            style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#E8640C' }}
            >
              <span className="text-white text-base font-extrabold">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-gray-900">
                {formatNumber(stats.cases)} scam cases in Singapore ({stats.year})
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Live data · Singapore Police Force via data.gov.sg
              </p>
            </div>
          </div>
        )}

        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-none">
          {ALL_TYPE_IDS.map((typeId) => (
            <button
              key={typeId}
              onClick={() => setFilter(typeId)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === typeId
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {typeId === 'all' ? t('scams.filterAll') : t(`scams.types.${typeId}`)}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl overflow-hidden" style={{ background: 'white', border: '1px solid #F0EDE8' }}>
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
            <p className="text-sm text-red-700 font-semibold mb-1">{t('scams.loadError')}</p>
            <p className="text-xs text-red-500 mb-3">{error}</p>
            <button
              onClick={loadAlerts}
              className="flex items-center gap-1.5 text-xs font-bold text-red-700"
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
                  style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}
                >
                  {/* Coloured top accent bar */}
                  <div className={`h-1 w-full ${badge.dot}`} />

                  {/* Tappable header */}
                  <button
                    className="w-full text-left px-4 pt-4 pb-4"
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
                    <div className="border-t border-gray-50 px-4 py-4">
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
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('scams.sourceLabel')}</span>
                        {alert.source_url ? (
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

            {visible.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-gray-100 px-8 py-10 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-gray-900 mb-1">{t('scams.noAlerts')}</p>
              </div>
            )}
          </div>
        )}

        {/* Source note */}
        {!loading && (
          <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
            {t('scams.sourceNote')}
          </p>
        )}
      </div>

      {/* Report a Scam Modal */}
      {showReport && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeReport()}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="bg-red-600 rounded-t-2xl px-6 py-5">
              <h2 className="text-lg font-bold text-white">{t('scams.report.title')}</h2>
              <p className="text-red-100 text-xs mt-0.5">{t('scams.report.subtitle')}</p>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-3">✅</p>
                  <p className="font-semibold text-gray-900 mb-1">{t('scams.report.successTitle')}</p>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">{t('scams.report.successDesc')}</p>
                  <button
                    onClick={closeReport}
                    className="bg-gray-900 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-colors"
                  >
                    {t('common.close')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('scams.report.whatLabel')}</label>
                      <textarea
                        placeholder={t('scams.report.whatPlaceholder')}
                        value={rWhat}
                        onChange={(e) => setRWhat(e.target.value)}
                        rows={4}
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none ${rErrors.what ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {rErrors.what && <p className="text-xs text-red-500 mt-1">{rErrors.what}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('scams.report.whenLabel')}</label>
                      <input
                        type="date"
                        value={rWhen}
                        max={today}
                        onChange={(e) => setRWhen(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${rErrors.when ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {rErrors.when && <p className="text-xs text-red-500 mt-1">{rErrors.when}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        {t('scams.report.lostLabel')}
                        <span className="ml-1.5 font-normal text-gray-400">{t('scams.report.lostNote')}</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          step="1"
                          value={rLost}
                          onChange={(e) => setRLost(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('scams.report.contactLabel')}</label>
                      <input
                        type="tel"
                        placeholder={t('scams.report.contactPlaceholder')}
                        value={rContact}
                        onChange={(e) => setRContact(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${rErrors.contact ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {rErrors.contact && <p className="text-xs text-red-500 mt-1">{rErrors.contact}</p>}
                      <p className="text-xs text-gray-400 mt-1">{t('scams.report.contactNote')}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">{t('scams.report.policeTitle')}</p>
                      <p className="text-xs text-amber-600 leading-relaxed">{t('scams.report.policeDesc')}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={closeReport}
                      className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleReport}
                      className="flex-1 bg-red-600 text-white rounded-xl py-3 text-sm font-semibold"
                    >
                      {t('scams.report.submitBtn')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
