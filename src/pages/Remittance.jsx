import { useState, useMemo } from 'react'
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

// Mock data: base exchange rates and fees per provider per country
// rate: SGD 1 = X foreign currency (mid-market minus provider margin)
// fee: flat SGD fee charged on top of the send amount
// speed: transfer time string
const PROVIDERS = [
  {
    id: 'wise',
    name: 'Wise',
    color: 'bg-emerald-500',
    rates: { IN: 61.82, BD: 86.54, PH: 43.20, MM: 568.40, ID: 11750, LK: 238.90, CN: 5.28, TH: 26.85, PK: 216.40, NP: 99.20 },
    fees:  { IN: 1.40,  BD: 1.65,  PH: 1.50,  MM: 2.10,   ID: 1.80,  LK: 1.55,   CN: 1.20, TH: 1.40,  PK: 1.80,   NP: 1.60  },
    speed: { IN: 'Instant – 2 hrs', BD: '1 – 2 days', PH: 'Instant', MM: '2 – 5 days', ID: 'Instant', LK: '1 – 2 days', CN: '1 – 2 days', TH: 'Instant', PK: '1 – 2 days', NP: '1 – 2 days' },
  },
  {
    id: 'remitly',
    name: 'Remitly',
    color: 'bg-blue-500',
    rates: { IN: 61.50, BD: 86.10, PH: 42.90, MM: 564.80, ID: 11680, LK: 237.60, CN: 5.24, TH: 26.60, PK: 214.80, NP: 98.60 },
    fees:  { IN: 0.00,  BD: 0.00,  PH: 0.00,  MM: 0.00,   ID: 0.00,  LK: 0.00,   CN: 0.00, TH: 0.00,  PK: 0.00,   NP: 0.00  },
    speed: { IN: 'Instant', BD: '3 – 5 days', PH: 'Instant', MM: '3 – 7 days', ID: 'Instant', LK: '3 – 5 days', CN: '2 – 4 days', TH: 'Instant', PK: '3 – 5 days', NP: '3 – 5 days' },
  },
  {
    id: 'wu',
    name: 'Western Union',
    color: 'bg-yellow-500',
    rates: { IN: 60.40, BD: 84.90, PH: 42.10, MM: 558.30, ID: 11520, LK: 235.20, CN: 5.16, TH: 26.10, PK: 211.60, NP: 97.00 },
    fees:  { IN: 3.90,  BD: 4.50,  PH: 3.50,  MM: 5.00,   ID: 4.00,  LK: 4.20,   CN: 3.80, TH: 3.50,  PK: 4.50,   NP: 4.00  },
    speed: { IN: 'Minutes', BD: 'Minutes', PH: 'Minutes', MM: 'Minutes', ID: 'Minutes', LK: 'Minutes', CN: 'Minutes', TH: 'Minutes', PK: 'Minutes', NP: 'Minutes' },
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    color: 'bg-gray-400',
    rates: { IN: 59.80, BD: 84.20, PH: 41.60, MM: 552.00, ID: 11380, LK: 233.80, CN: 5.10, TH: 25.80, PK: 209.40, NP: 96.20 },
    fees:  { IN: 15.00, BD: 15.00, PH: 15.00, MM: 15.00,  ID: 15.00, LK: 15.00,  CN: 15.00, TH: 15.00, PK: 15.00,  NP: 15.00 },
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

  const amount = parseFloat(sendAmount) || 0
  const dest = COUNTRIES[country]

  const results = useMemo(() => {
    return PROVIDERS.map((p) => {
      const rate = p.rates[country]
      const fee = p.fees[country]
      const netSend = Math.max(amount - fee, 0)
      const received = netSend * rate
      return { ...p, rate, fee, received }
    }).sort((a, b) => b.received - a.received)
  }, [amount, country])

  const bestId = results[0]?.id

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('remittance.pageTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('remittance.pageSubtitle')}</p>
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
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                >
                  {Object.entries(COUNTRIES).map(([code, c]) => (
                    <option key={code} value={code}>
                      {t(`remittance.${c.nameKey}`)} ({c.currency})
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
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

        {/* Results label */}
        {amount > 0 && (
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            {t('remittance.providersLabel', {
              count: results.length,
              amount: formatSGD(amount),
              country: t(`remittance.${dest.nameKey}`),
            })}
          </p>
        )}

        {/* Provider cards */}
        <div className="space-y-3">
          {amount <= 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <p className="text-3xl mb-3">💸</p>
              <p className="font-semibold text-gray-900 mb-1">{t('remittance.emptyTitle')}</p>
              <p className="text-sm text-gray-500">{t('remittance.emptyDesc')}</p>
            </div>
          ) : (
            results.map((p, i) => {
              const isBest = p.id === bestId

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all ${
                    isBest
                      ? 'border-blue-200 ring-1 ring-blue-200'
                      : 'border-gray-100'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      {/* Provider logo placeholder */}
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
                        <span className="inline-block bg-blue-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full mb-1">
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
      </div>
    </div>
  )
}
