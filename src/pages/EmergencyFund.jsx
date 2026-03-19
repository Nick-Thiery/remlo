import { useState, useMemo } from 'react'
import { ShieldCheck, Lightbulb, Clock, TrendingUp, Landmark, Smartphone, PiggyBank } from 'lucide-react'

function formatSGD(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function months(n) {
  if (!isFinite(n) || n <= 0) return null
  const m = Math.ceil(n)
  if (m === 1) return '1 month'
  if (m < 12) return `${m} months`
  const years = Math.floor(m / 12)
  const rem = m % 12
  const yLabel = years === 1 ? '1 year' : `${years} years`
  if (rem === 0) return yLabel
  return `${yLabel} ${rem} month${rem > 1 ? 's' : ''}`
}

const TIPS = [
  {
    Icon: Landmark,
    title: 'POSB / DBS eMySavings',
    body: 'No minimum balance, no fall-below fee. Open online with SingPass. Your money is protected by SDIC up to S$75,000.',
  },
  {
    Icon: Smartphone,
    title: 'GXS Bank or MariBank',
    body: 'Digital banks open to work-pass holders. Higher savings interest (up to ~3%), no fees, no minimum balance.',
  },
  {
    Icon: PiggyBank,
    title: 'Keep it separate',
    body: 'Put your emergency fund in a different account from your spending account so you\'re not tempted to dip into it.',
  },
  {
    Icon: ShieldCheck,
    title: 'Avoid informal savings groups (ROSCAs)',
    body: '"Chit funds" or rotating savings clubs have no legal protection. If the organiser disappears, your money is gone.',
  },
]

export default function EmergencyFund() {
  const [expenses, setExpenses]   = useState('')
  const [monthlySave, setMonthlySave] = useState('')

  const exp  = parseFloat(expenses)    || 0
  const save = parseFloat(monthlySave) || 0

  const target3  = exp * 3
  const target6  = exp * 6

  const months3 = save > 0 ? target3 / save : null
  const months6 = save > 0 ? target6 / save : null

  const hasExpenses = exp > 0
  const hasSave     = save > 0

  // Progress towards each target if save amount is set (clamp at 100%)
  // We show a conceptual progress bar starting from 0
  const pct3 = hasSave && hasExpenses ? Math.min((save / target3) * 100, 100) : 0
  const pct6 = hasSave && hasExpenses ? Math.min((save / target6) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Emergency Fund Calculator</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Know exactly how much you need — and how long to get there.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Your numbers</p>

          <div className="space-y-4">
            {/* Monthly expenses */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Monthly expenses (rent + food + transport + bills)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={expenses}
                  onChange={(e) => setExpenses(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Monthly savings */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                How much can you save each month?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={monthlySave}
                  onChange={(e) => setMonthlySave(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {hasExpenses ? (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your targets</p>

            {/* 3-month target */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 mb-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">Minimum safety net</p>
                  <p className="text-2xl font-bold text-gray-900">{formatSGD(target3)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">3 months of expenses</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              {/* Progress bar */}
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
                    ? <span className="text-emerald-600 font-semibold">You could reach this in 1 month!</span>
                    : <span>Saving <span className="font-semibold text-gray-700">{formatSGD(save)}/mo</span> → reach in <span className="font-semibold text-blue-600">{months(months3)}</span></span>
                  }
                </div>
              ) : (
                <p className="text-xs text-gray-400">Enter your monthly savings to see how long this will take.</p>
              )}
            </div>

            {/* 6-month target */}
            <div className="bg-white rounded-2xl shadow-sm border border-violet-100 p-5 mb-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-0.5">Recommended safety net</p>
                  <p className="text-2xl font-bold text-gray-900">{formatSGD(target6)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">6 months of expenses</p>
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
                  <span>Saving <span className="font-semibold text-gray-700">{formatSGD(save)}/mo</span> → reach in <span className="font-semibold text-violet-600">{months(months6)}</span></span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Enter your monthly savings to see how long this will take.</p>
              )}
            </div>

            {/* Why 6 months callout */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-6">
              <div className="flex gap-3">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1">Why migrant workers need more</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    If you lose your job in Singapore, your work pass is cancelled and you may need to leave within 30 days.
                    A 6-month emergency fund gives you time to find a new employer, pay for flights, or support your family
                    while you sort things out — without borrowing from loan sharks.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center mb-6">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="font-semibold text-gray-900 mb-1">Enter your expenses above</p>
            <p className="text-sm text-gray-500">We'll calculate how much you need and how long it will take.</p>
          </div>
        )}

        {/* Tips */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Where to keep your emergency fund</p>
        <div className="space-y-3">
          {TIPS.map(({ Icon, title, body }) => (
            <div key={title} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          Deposit insurance in Singapore protects up to S$75,000 per bank per depositor via SDIC.
        </p>
      </div>
    </div>
  )
}
