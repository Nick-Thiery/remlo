import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Lightbulb, Clock, TrendingUp, Landmark, Smartphone, Wallet, ChevronLeft } from 'lucide-react'

function formatSGD(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency', currency: 'SGD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

function formatTime(n, t) {
  if (!isFinite(n) || n <= 0) return null
  const m = Math.ceil(n)
  if (m === 1)    return t('emergencyFund.time.oneMonth')
  if (m < 12)    return t('emergencyFund.time.months',  { count: m })
  const years = Math.floor(m / 12)
  const rem   = m % 12
  if (rem === 0) return years === 1
    ? t('emergencyFund.time.oneYear')
    : t('emergencyFund.time.years', { count: years })
  return t('emergencyFund.time.yearsMonths', { years, months: rem })
}

// Icon order matches the tips array in locale files
const TIP_ICONS = [Landmark, Smartphone, Wallet, ShieldCheck]

export default function EmergencyFund() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [expenses,    setExpenses]    = useState('')
  const [monthlySave, setMonthlySave] = useState('')

  const exp  = parseFloat(expenses)    || 0
  const save = parseFloat(monthlySave) || 0

  const target3 = exp * 3
  const target6 = exp * 6
  const months3 = save > 0 ? target3 / save : null
  const months6 = save > 0 ? target6 / save : null

  const hasExpenses = exp > 0
  const hasSave     = save > 0

  const tips = t('emergencyFund.tips', { returnObjects: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('emergencyFund.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('emergencyFund.pageSubtitle')}</p>
          </div>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            {t('emergencyFund.sectionNumbers')}
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                {t('emergencyFund.expensesLabel')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                <input
                  type="number" inputMode="decimal" min="0" placeholder="0"
                  value={expenses} onChange={(e) => setExpenses(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                {t('emergencyFund.savingsLabel')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                <input
                  type="number" inputMode="decimal" min="0" placeholder="0"
                  value={monthlySave} onChange={(e) => setMonthlySave(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {hasExpenses ? (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {t('emergencyFund.sectionTargets')}
            </p>

            {/* 3-month target */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 mb-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">
                    {t('emergencyFund.minTarget')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{formatSGD(target3)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('emergencyFund.threeMonths')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: hasSave ? `${Math.min((save / target3) * 100, 100)}%` : '0%' }}
                />
              </div>
              {hasSave ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  {months3 <= 1
                    ? <span className="text-emerald-600 font-semibold">{t('emergencyFund.reachInOneMonth')}</span>
                    : <span dangerouslySetInnerHTML={{ __html:
                        t('emergencyFund.savingToReach', {
                          amount: `<strong class="text-gray-700">${formatSGD(save)}</strong>`,
                          time:   `<strong class="text-blue-600">${formatTime(months3, t)}</strong>`,
                        })
                      }} />
                  }
                </div>
              ) : (
                <p className="text-xs text-gray-400">{t('emergencyFund.enterSavingsHint')}</p>
              )}
            </div>

            {/* 6-month target */}
            <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5 mb-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-0.5">
                    {t('emergencyFund.recTarget')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{formatSGD(target6)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('emergencyFund.sixMonths')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-violet-500" />
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                <div
                  className="bg-violet-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: hasSave ? `${Math.min((save / target6) * 100, 100)}%` : '0%' }}
                />
              </div>
              {hasSave ? (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span dangerouslySetInnerHTML={{ __html:
                    t('emergencyFund.savingToReach', {
                      amount: `<strong class="text-gray-700">${formatSGD(save)}</strong>`,
                      time:   `<strong class="text-violet-600">${formatTime(months6, t)}</strong>`,
                    })
                  }} />
                </div>
              ) : (
                <p className="text-xs text-gray-400">{t('emergencyFund.enterSavingsHint')}</p>
              )}
            </div>

            {/* Why callout */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-6">
              <div className="flex gap-3">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1">{t('emergencyFund.whyTitle')}</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{t('emergencyFund.whyDesc')}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center mb-6">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="font-semibold text-gray-900 mb-1">{t('emergencyFund.emptyTitle')}</p>
            <p className="text-sm text-gray-500">{t('emergencyFund.emptyDesc')}</p>
          </div>
        )}

        {/* Tips */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          {t('emergencyFund.tipsHeading')}
        </p>
        <div className="space-y-3">
          {Array.isArray(tips) && tips.map((tip, i) => {
            const Icon = TIP_ICONS[i]
            return (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">{tip.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{tip.body}</p>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          {t('emergencyFund.disclaimer')}
        </p>
      </div>
    </div>
  )
}
