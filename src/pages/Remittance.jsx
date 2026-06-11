import { useState, useEffect, useMemo } from 'react'
import { ArrowLeftRight, RefreshCw, WifiOff, Zap } from 'lucide-react'
import { track } from '../lib/analytics.js'
import { useTranslation } from 'react-i18next'
import safeStorage from '../lib/safeStorage.js'
import { useDarkMode } from '../hooks/useDarkMode.js'

const COUNTRIES = {
  IN: { currency: 'INR', flag: '🇮🇳', symbol: '₹',   nameKey: 'countryIndia'       },
  BD: { currency: 'BDT', flag: '🇧🇩', symbol: '৳',   nameKey: 'countryBangladesh'  },
  PH: { currency: 'PHP', flag: '🇵🇭', symbol: '₱',   nameKey: 'countryPhilippines' },
  MM: { currency: 'MMK', flag: '🇲🇲', symbol: 'K',   nameKey: 'countryMyanmar'     },
  ID: { currency: 'IDR', flag: '🇮🇩', symbol: 'Rp',  nameKey: 'countryIndonesia'   },
  LK: { currency: 'LKR', flag: '🇱🇰', symbol: 'Rs',  nameKey: 'countrySriLanka'    },
  CN: { currency: 'CNY', flag: '🇨🇳', symbol: '¥',   nameKey: 'countryChina'       },
  TH: { currency: 'THB', flag: '🇹🇭', symbol: '฿',   nameKey: 'countryThailand'    },
  PK: { currency: 'PKR', flag: '🇵🇰', symbol: '₨',   nameKey: 'countryPakistan'    },
  NP: { currency: 'NPR', flag: '🇳🇵', symbol: 'Rs',  nameKey: 'countryNepal'       },
}

const FALLBACK_MID_RATES = {
  INR: 62.15, BDT: 87.20, PHP: 43.55, MMK: 572.80, IDR: 11830,
  LKR: 240.50, CNY: 5.31, THB: 27.05, PKR: 217.80, NPR: 99.90,
}

const PROVIDER_CONFIG = [
  {
    id: 'wise', name: 'Wise',
    grad: 'linear-gradient(135deg, #10B981, #059669)',
    spread: 0.005,
    fees:  { IN: 1.40,  BD: 1.65,  PH: 1.50,  MM: 2.10,  ID: 1.80,  LK: 1.55,  CN: 1.20, TH: 1.40, PK: 1.80,  NP: 1.60  },
    speed: { IN: 'remittance.speedInstant2hrs', BD: 'remittance.speed1to2days', PH: 'remittance.speedInstant', MM: 'remittance.speed2to5days', ID: 'remittance.speedInstant', LK: 'remittance.speed1to2days', CN: 'remittance.speed1to2days', TH: 'remittance.speedInstant', PK: 'remittance.speed1to2days', NP: 'remittance.speed1to2days' },
  },
  {
    id: 'remitly', name: 'Remitly',
    grad: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    spread: 0.010,
    fees:  { IN: 0.00, BD: 0.00, PH: 0.00, MM: 0.00, ID: 0.00, LK: 0.00, CN: 0.00, TH: 0.00, PK: 0.00, NP: 0.00 },
    speed: { IN: 'remittance.speedInstant', BD: 'remittance.speed3to5days', PH: 'remittance.speedInstant', MM: 'remittance.speed3to7days', ID: 'remittance.speedInstant', LK: 'remittance.speed3to5days', CN: 'remittance.speed2to4days', TH: 'remittance.speedInstant', PK: 'remittance.speed3to5days', NP: 'remittance.speed3to5days' },
  },
  {
    id: 'wu', name: 'Western Union',
    grad: 'linear-gradient(135deg, #F59E0B, #D97706)',
    spread: 0.020,
    fees:  { IN: 3.90, BD: 4.50, PH: 3.50, MM: 5.00, ID: 4.00, LK: 4.20, CN: 3.80, TH: 3.50, PK: 4.50, NP: 4.00 },
    speed: { IN: 'remittance.speedMinutes', BD: 'remittance.speedMinutes', PH: 'remittance.speedMinutes', MM: 'remittance.speedMinutes', ID: 'remittance.speedMinutes', LK: 'remittance.speedMinutes', CN: 'remittance.speedMinutes', TH: 'remittance.speedMinutes', PK: 'remittance.speedMinutes', NP: 'remittance.speedMinutes' },
  },
  {
    id: 'bank', name: 'Bank Transfer',
    grad: 'linear-gradient(135deg, #6B7280, #4B5563)',
    spread: 0.030,
    fees:  { IN: 15.00, BD: 15.00, PH: 15.00, MM: 15.00, ID: 15.00, LK: 15.00, CN: 15.00, TH: 15.00, PK: 15.00, NP: 15.00 },
    speed: { IN: 'remittance.speed1to3days', BD: 'remittance.speed2to5days', PH: 'remittance.speed1to3days', MM: 'remittance.speed3to7days', ID: 'remittance.speed2to4days', LK: 'remittance.speed2to5days', CN: 'remittance.speed2to4days', TH: 'remittance.speed1to3days', PK: 'remittance.speed2to5days', NP: 'remittance.speed2to5days' },
  },
]

function formatForeignAmount(amount, symbol) {
  const rounded = Math.round(amount)
  const formatted = rounded >= 10000
    ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(rounded)
    : new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rounded)
  return `${symbol}${formatted}`
}

function formatSGD(amount) {
  return `S$${amount.toFixed(2)}`
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Remittance() {
  const { t } = useTranslation()
  const isDark = useDarkMode()
  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#F0EDE8'
  const border2 = isDark ? '#2C2926' : '#EDE8E0'
  const [sendAmount, setSendAmount] = useState('500')
  const defaultCountry = (() => {
    const saved = safeStorage.getItem('remlo_country') || 'IN'
    return Object.keys(COUNTRIES).includes(saved) ? saved : 'IN'
  })()
  const [country, setCountry] = useState(defaultCountry)

  const [midRates, setMidRates]       = useState(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [ratesStale, setRatesStale]   = useState(false)
  const [fetchedAt, setFetchedAt]     = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchRates() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/SGD')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        if (data?.result === 'success' && data?.rates) {
          setMidRates(data.rates)
          setRatesStale(false)
          setFetchedAt(new Date())
        } else {
          throw new Error('Unexpected response shape')
        }
      } catch {
        if (cancelled) return
        setMidRates(FALLBACK_MID_RATES)
        setRatesStale(true)
      } finally {
        if (!cancelled) setRatesLoading(false)
      }
    }
    fetchRates()
    return () => { cancelled = true }
  }, [])

  const amount = parseFloat(sendAmount) || 0
  const dest = COUNTRIES[country]

  const results = useMemo(() => {
    if (!midRates) return []
    const mid = midRates[dest.currency]
    if (!mid) return []
    return PROVIDER_CONFIG.map((p) => {
      const rate    = mid * (1 - p.spread)
      const fee     = p.fees[country]
      const netSend = Math.max(amount - fee, 0)
      const received = netSend * rate
      return { ...p, rate, fee, received }
    }).sort((a, b) => b.received - a.received)
  }, [amount, country, midRates])

  const bestId = results[0]?.id

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('remittance.pageTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('remittance.pageSubtitle')}</p>
        </div>

        {/* Live rates status */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-5 text-xs font-bold"
          style={{
            background: ratesLoading ? '#F5F2EC' : ratesStale ? '#FFFBEB' : '#F0FDF4',
            border: `1px solid ${ratesLoading ? '#EDE8E0' : ratesStale ? '#FDE68A' : '#BBF7D0'}`,
            color: ratesLoading ? '#6B7280' : ratesStale ? '#92400E' : '#065F46',
          }}
        >
          {ratesLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>{t('remittance.ratesFetching')}</span>
            </>
          ) : ratesStale ? (
            <>
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t('remittance.ratesStale')}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              <span>{t('remittance.ratesLive', { time: fetchedAt ? formatTime(fetchedAt) : '' })}</span>
            </>
          )}
        </div>

        {/* Input card */}
        <div
          className="rounded-3xl p-6 mb-6"
          style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
        >
          <div className="space-y-4">
            {/* SGD amount */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('remittance.sendLabel')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none font-bold">S$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  onBlur={() => { if (parseFloat(sendAmount) > 0) track('remittance_compared', { amount: parseFloat(sendAmount), destination_country: country }) }}
                  className="w-full rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold"
                  style={{ border: `2px solid ${border2}`, background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Country selector */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('remittance.countryLabel')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">{dest.flag}</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold appearance-none"
                  style={{ border: `2px solid ${border2}`, background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
                >
                  {Object.entries(COUNTRIES).map(([code, c]) => (
                    <option key={code} value={code}>
                      {t(`remittance.${c.nameKey}`)} ({c.currency})
                    </option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {ratesLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-3xl p-6 animate-pulse"
                style={{ background: card, border: `1px solid ${border}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl skeleton" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-20 rounded-lg skeleton" />
                      <div className="h-3 w-28 rounded-lg skeleton" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-5 w-24 rounded-lg skeleton ml-auto" />
                    <div className="h-3 w-16 rounded-lg skeleton ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!ratesLoading && (
          <>
            {amount > 0 && (
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {t('remittance.providersLabel', {
                  count: results.length,
                  amount: formatSGD(amount),
                  country: t(`remittance.${dest.nameKey}`),
                })}
              </p>
            )}

            <div className="space-y-3">
              {amount <= 0 ? (
                <div
                  className="rounded-3xl px-8 py-14 text-center"
                  style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
                >
                  <div
                    className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)' }}
                  >
                    <ArrowLeftRight className="w-12 h-12" style={{ color: '#0369A1' }} strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-extrabold text-gray-900 mb-2">{t('remittance.emptyTitle')}</p>
                  <p className="text-sm text-gray-500 max-w-[200px] mx-auto leading-relaxed">{t('remittance.emptyDesc')}</p>
                </div>
              ) : (
                results.map((p, i) => {
                  const isBest = p.id === bestId

                  return (
                    <div
                      key={p.id}
                      className="rounded-3xl overflow-hidden transition-all"
                      style={{
                        background: card,
                        border: isBest ? '2px solid #E8640C' : `1px solid ${border}`,
                        boxShadow: isBest ? '0 4px 20px rgba(232,100,12,0.15)' : '0 2px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-5 pt-5 pb-4">
                        <div className="flex items-center gap-3">
                          {/* Provider icon */}
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: p.grad, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                          >
                            <span className="text-white text-xs font-extrabold">
                              {p.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 text-sm">{p.name}</p>
                            <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                              <Zap className="w-3 h-3" />
                              <span className="text-xs font-medium">{t(p.speed[country])}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {isBest && (
                            <span
                              className="inline-block text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full mb-1.5 uppercase tracking-wide"
                              style={{ background: 'linear-gradient(135deg, #E8640C, #CC5708)' }}
                            >
                              {t('remittance.bestValue')}
                            </span>
                          )}
                          {!isBest && i > 0 && (
                            <span
                              className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-1.5"
                              style={{ background: '#F5F2EC', color: '#6B7280' }}
                            >
                              #{i + 1}
                            </span>
                          )}
                          <p className="text-2xl font-extrabold text-gray-900 tabular-nums leading-tight">
                            {formatForeignAmount(p.received, dest.symbol)}
                          </p>
                          <p className="text-xs text-gray-400 font-medium">{t('remittance.receivedLabel', { currency: dest.currency })}</p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="mx-5" style={{ height: 1, background: '#F5F2ED' }} />

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-4 px-5 py-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5 font-semibold">{t('remittance.rateLabel')}</p>
                          <p className="text-sm font-extrabold text-gray-900 tabular-nums">
                            {t('remittance.rateValue', { rate: p.rate.toFixed(2), currency: dest.currency })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5 font-semibold">{t('remittance.feeLabel')}</p>
                          <p
                            className="text-sm font-extrabold tabular-nums"
                            style={{ color: p.fee === 0 ? '#059669' : '#1A1A1A' }}
                          >
                            {p.fee === 0 ? t('common.noFee') : formatSGD(p.fee)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {amount > 0 && (
              <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
                {t('remittance.disclaimer')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
