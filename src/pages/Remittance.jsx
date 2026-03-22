import { useState, useEffect, useMemo } from 'react'
import { ArrowLeftRight, RefreshCw, WifiOff } from 'lucide-react'
import { track } from '../lib/analytics.js'
import { useTranslation } from 'react-i18next'

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

// Fallback mid-market rates (SGD 1 = X) — used when API is unreachable
const FALLBACK_MID_RATES = {
  INR: 62.15,
  BDT: 87.20,
  PHP: 43.55,
  MMK: 572.80,
  IDR: 11830,
  LKR: 240.50,
  CNY: 5.31,
  THB: 27.05,
  PKR: 217.80,
  NPR: 99.90,
}

// Provider spread on top of mid-market rate, plus flat fees per destination country
const PROVIDER_CONFIG = [
  {
    id: 'wise',
    name: 'Wise',
    color: 'bg-emerald-500',
    spread: 0.005, // 0.5% — closest to mid-market
    fees:  { IN: 1.40,  BD: 1.65,  PH: 1.50,  MM: 2.10,  ID: 1.80,  LK: 1.55,  CN: 1.20, TH: 1.40, PK: 1.80,  NP: 1.60  },
    speed: { IN: 'Instant – 2 hrs', BD: '1 – 2 days', PH: 'Instant', MM: '2 – 5 days', ID: 'Instant', LK: '1 – 2 days', CN: '1 – 2 days', TH: 'Instant', PK: '1 – 2 days', NP: '1 – 2 days' },
  },
  {
    id: 'remitly',
    name: 'Remitly',
    color: 'bg-blue-500',
    spread: 0.010, // 1%
    fees:  { IN: 0.00,  BD: 0.00,  PH: 0.00,  MM: 0.00,  ID: 0.00,  LK: 0.00,  CN: 0.00, TH: 0.00, PK: 0.00,  NP: 0.00  },
    speed: { IN: 'Instant', BD: '3 – 5 days', PH: 'Instant', MM: '3 – 7 days', ID: 'Instant', LK: '3 – 5 days', CN: '2 – 4 days', TH: 'Instant', PK: '3 – 5 days', NP: '3 – 5 days' },
  },
  {
    id: 'wu',
    name: 'Western Union',
    color: 'bg-yellow-500',
    spread: 0.020, // 2%
    fees:  { IN: 3.90,  BD: 4.50,  PH: 3.50,  MM: 5.00,  ID: 4.00,  LK: 4.20,  CN: 3.80, TH: 3.50, PK: 4.50,  NP: 4.00  },
    speed: { IN: 'Minutes', BD: 'Minutes', PH: 'Minutes', MM: 'Minutes', ID: 'Minutes', LK: 'Minutes', CN: 'Minutes', TH: 'Minutes', PK: 'Minutes', NP: 'Minutes' },
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    color: 'bg-gray-400',
    spread: 0.030, // 3%
    fees:  { IN: 15.00, BD: 15.00, PH: 15.00, MM: 15.00, ID: 15.00, LK: 15.00, CN: 15.00, TH: 15.00, PK: 15.00, NP: 15.00 },
    speed: { IN: '1 – 3 days', BD: '2 – 5 days', PH: '1 – 3 days', MM: '3 – 7 days', ID: '2 – 4 days', LK: '2 – 5 days', CN: '2 – 4 days', TH: '1 – 3 days', PK: '2 – 5 days', NP: '2 – 5 days' },
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

function SpeedIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  )
}

function RateIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}

export default function Remittance() {
  const { t } = useTranslation()
  const [sendAmount, setSendAmount] = useState('500')
  const defaultCountry = (() => {
    const saved = localStorage.getItem('remlo_country') || 'IN'
    return Object.keys(COUNTRIES).includes(saved) ? saved : 'IN'
  })()
  const [country, setCountry] = useState(defaultCountry)

  const [midRates, setMidRates]       = useState(null)      // keyed by currency code
  const [ratesLoading, setRatesLoading] = useState(true)
  const [ratesStale, setRatesStale]   = useState(false)     // true = using fallback
  const [fetchedAt, setFetchedAt]     = useState(null)      // Date of last successful fetch

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('remittance.pageTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('remittance.pageSubtitle')}</p>
        </div>

        {/* Live rates status bar */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-xs font-medium ${
          ratesLoading
            ? 'bg-gray-100 text-gray-500'
            : ratesStale
            ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {ratesLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>Fetching live rates…</span>
            </>
          ) : ratesStale ? (
            <>
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Rates may be outdated · Could not reach rate service</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>Live rates · Updated {fetchedAt ? formatTime(fetchedAt) : ''}</span>
            </>
          )}
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {/* SGD amount */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('remittance.sendLabel')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                  S$
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  onBlur={() => { if (parseFloat(sendAmount) > 0) track('remittance_compared', { amount: parseFloat(sendAmount), destination_country: country }) }}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Country selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('remittance.countryLabel')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                  {dest.flag}
                </span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white appearance-none"
                >
                  {Object.entries(COUNTRIES).map(([code, c]) => (
                    <option key={code} value={code}>
                      {t(`remittance.${c.nameKey}`)} ({c.currency})
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Loading skeleton for results */}
        {ratesLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-20 bg-gray-200 rounded" />
                      <div className="h-3 w-28 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-5 w-24 bg-gray-200 rounded ml-auto" />
                    <div className="h-3 w-16 bg-gray-100 rounded ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!ratesLoading && (
          <>
            {/* Results label */}
            {amount > 0 && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {t('remittance.providersLabel', {
                  count: results.length,
                  amount: formatSGD(amount),
                  country: t(`remittance.${dest.nameKey}`),
                })}
              </p>
            )}

            <div className="space-y-3">
              {amount <= 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 text-center">
                  <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <ArrowLeftRight className="w-10 h-10 text-sky-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-2">{t('remittance.emptyTitle')}</p>
                  <p className="text-sm text-gray-500 max-w-[200px] mx-auto leading-relaxed">{t('remittance.emptyDesc')}</p>
                </div>
              ) : (
                results.map((p, i) => {
                  const isBest = p.id === bestId

                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl shadow-sm border transition-all ${
                        isBest
                          ? 'border-orange-200 ring-1 ring-orange-200'
                          : 'border-gray-100'
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-6 pt-5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${p.color} flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">
                              {p.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                            <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                              <SpeedIcon />
                              <span className="text-xs">{p.speed[country]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {isBest && (
                            <span className="inline-block bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-1">
                              {t('remittance.bestValue')}
                            </span>
                          )}
                          {!isBest && i > 0 && (
                            <span className="inline-block text-xs font-medium text-gray-400 px-2.5 py-0.5 rounded-full mb-1 bg-gray-50">
                              #{i + 1}
                            </span>
                          )}
                          <p className="text-xl font-bold text-gray-900">
                            {formatForeignAmount(p.received, dest.symbol)}
                          </p>
                          <p className="text-xs text-gray-400">{t('remittance.receivedLabel', { currency: dest.currency })}</p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-50 mx-6" />

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-4 px-6 py-4">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-gray-300">
                            <RateIcon />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">{t('remittance.rateLabel')}</p>
                            <p className="text-sm font-medium text-gray-900">
                              {t('remittance.rateValue', { rate: p.rate.toFixed(2), currency: dest.currency })}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">{t('remittance.feeLabel')}</p>
                          <p className={`text-sm font-medium ${p.fee === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {p.fee === 0 ? t('common.noFee') : formatSGD(p.fee)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Disclaimer */}
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
