import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const SEGMENT_COLORS = [
  { bar: 'bg-blue-500',    dot: 'bg-blue-500',    text: 'text-blue-600',    light: 'bg-blue-50'    },
  { bar: 'bg-rose-500',    dot: 'bg-rose-500',    text: 'text-rose-600',    light: 'bg-rose-50'    },
  { bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
  { bar: 'bg-amber-500',   dot: 'bg-amber-500',   text: 'text-amber-600',   light: 'bg-amber-50'   },
  { bar: 'bg-violet-500',  dot: 'bg-violet-500',  text: 'text-violet-600',  light: 'bg-violet-50'  },
  { bar: 'bg-cyan-500',    dot: 'bg-cyan-500',    text: 'text-cyan-600',    light: 'bg-cyan-50'    },
  { bar: 'bg-orange-500',  dot: 'bg-orange-500',  text: 'text-orange-600',  light: 'bg-orange-50'  },
]

function StackedBar({ segments }) {
  return (
    <div className="flex w-full h-4 rounded-full overflow-hidden gap-px bg-gray-100">
      {segments.map((seg, i) =>
        seg.pct > 0 ? (
          <div
            key={i}
            className={`${seg.color} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${seg.pct}%` }}
            title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
          />
        ) : null
      )}
    </div>
  )
}

function DonutChart({ slices, size = 160 }) {
  const r = 54
  const cx = size / 2
  const cy = size / 2
  const gap = 1.5

  let cumulativeAngle = -90

  const paths = slices
    .filter((s) => s.pct > 0)
    .map((s) => {
      const sliceDeg = (s.pct / 100) * 360 - gap
      const startAngle = cumulativeAngle + gap / 2
      const endAngle = startAngle + sliceDeg
      cumulativeAngle += (s.pct / 100) * 360

      const toRad = (deg) => (deg * Math.PI) / 180
      const x1 = cx + r * Math.cos(toRad(startAngle))
      const y1 = cy + r * Math.sin(toRad(startAngle))
      const x2 = cx + r * Math.cos(toRad(endAngle))
      const y2 = cy + r * Math.sin(toRad(endAngle))
      const largeArc = sliceDeg > 180 ? 1 : 0

      return {
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        color: s.svgColor,
      }
    })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.62} fill="white" />
    </svg>
  )
}

export default function Budget() {
  const { t } = useTranslation()
  const { user, authLoading, isGuest } = useRequireAuth()

  const PRESET_EXPENSES = useMemo(() => [
    { name: t('budget.presetRent'),        amount: 400 },
    { name: t('budget.presetGroceries'),   amount: 200 },
    { name: t('budget.presetTransport'),   amount: 80  },
    { name: t('budget.presetPhone'),       amount: 20  },
  ], [t])

  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState(PRESET_EXPENSES)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [nameError, setNameError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(localStorage.getItem('remlo_guest_budget') || 'null')
      if (stored) {
        setIncome(stored.monthly_income > 0 ? String(stored.monthly_income) : '')
        setExpenses(Array.isArray(stored.expenses) && stored.expenses.length > 0 ? stored.expenses : PRESET_EXPENSES)
      }
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    supabase
      .from('budgets')
      .select('monthly_income, expenses')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else if (data) {
          setIncome(data.monthly_income > 0 ? String(data.monthly_income) : '')
          setExpenses(Array.isArray(data.expenses) && data.expenses.length > 0 ? data.expenses : PRESET_EXPENSES)
        }
        setLoading(false)
      })
  }, [user, isGuest, PRESET_EXPENSES])

  async function saveBudget(incomeVal, expensesVal) {
    if (isGuest) {
      localStorage.setItem('remlo_guest_budget', JSON.stringify({
        monthly_income: parseFloat(incomeVal) || 0,
        expenses: expensesVal,
      }))
      return
    }
    if (!user) return
    const { error: err } = await supabase.from('budgets').upsert(
      { user_id: user.id, monthly_income: parseFloat(incomeVal) || 0, expenses: expensesVal },
      { onConflict: 'user_id' }
    )
    if (err) setError(err.message)
  }

  const monthlyIncome = parseFloat(income) || 0

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const remaining = Math.max(monthlyIncome - totalExpenses, 0)
  const overspend = Math.max(totalExpenses - monthlyIncome, 0)
  const isOverBudget = totalExpenses > monthlyIncome && monthlyIncome > 0

  const barSegments = useMemo(() => {
    if (monthlyIncome <= 0) return []
    const expSegs = expenses.map((e, i) => ({
      label: e.name,
      pct: Math.min((e.amount / monthlyIncome) * 100, 100),
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length].bar,
    }))
    const savingsPct = Math.max(((monthlyIncome - totalExpenses) / monthlyIncome) * 100, 0)
    return [
      ...expSegs,
      { label: t('budget.remainingLabel'), pct: savingsPct, color: 'bg-gray-200' },
    ]
  }, [expenses, monthlyIncome, totalExpenses, t])

  const SVG_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316']
  const donutSlices = useMemo(() => {
    if (monthlyIncome <= 0) return []
    const expSlices = expenses.map((e, i) => ({
      label: e.name,
      pct: Math.min((e.amount / monthlyIncome) * 100, 100),
      svgColor: SVG_COLORS[i % SVG_COLORS.length],
    }))
    const savingsPct = Math.max(((monthlyIncome - totalExpenses) / monthlyIncome) * 100, 0)
    if (savingsPct > 0) {
      expSlices.push({ label: t('budget.remainingLabel'), pct: savingsPct, svgColor: '#e5e7eb' })
    }
    return expSlices
  }, [expenses, monthlyIncome, totalExpenses, t])

  const suggested = useMemo(() => {
    if (monthlyIncome <= 0) return null
    return {
      needs: monthlyIncome * 0.5,
      remittance: monthlyIncome * 0.3,
      savings: monthlyIncome * 0.2,
    }
  }, [monthlyIncome])

  function handleAddExpense() {
    let valid = true
    if (!newName.trim()) { setNameError(t('budget.errorName')); valid = false } else setNameError('')
    const amt = parseFloat(newAmount)
    if (!amt || amt <= 0) { setAmountError(t('budget.errorAmount')); valid = false } else setAmountError('')
    if (!valid) return

    const newExpenses = [...expenses, { name: newName.trim(), amount: amt }]
    setExpenses(newExpenses)
    setNewName('')
    setNewAmount('')
    saveBudget(income, newExpenses)
  }

  function removeExpense(index) {
    const newExpenses = expenses.filter((_, i) => i !== index)
    setExpenses(newExpenses)
    saveBudget(income, newExpenses)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('budget.pageTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('budget.pageSubtitle')}</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
          </div>
        )}

        {/* Income input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('budget.incomeLabel')}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
            <input
              type="number"
              min="0"
              step="50"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              onBlur={() => saveBudget(income, expenses)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        </div>

        {/* Summary cards */}
        {monthlyIncome > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{t('budget.summaryIncome')}</p>
              <p className="text-base font-bold text-gray-900">{formatSGD(monthlyIncome)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{t('budget.summaryExpenses')}</p>
              <p className={`text-base font-bold ${isOverBudget ? 'text-rose-600' : 'text-gray-900'}`}>
                {formatSGD(totalExpenses)}
              </p>
            </div>
            <div className={`rounded-2xl shadow-sm border p-4 ${isOverBudget ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className="text-xs text-gray-400 mb-1">{isOverBudget ? t('budget.summaryOverBy') : t('budget.summaryLeftOver')}</p>
              <p className={`text-base font-bold ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatSGD(isOverBudget ? overspend : remaining)}
              </p>
            </div>
          </div>
        )}

        {/* Visual breakdown */}
        {monthlyIncome > 0 && expenses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">{t('budget.breakdownTitle')}</p>

            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <DonutChart slices={donutSlices} size={140} />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {expenses.map((e, i) => {
                  const pct = monthlyIncome > 0 ? (e.amount / monthlyIncome) * 100 : 0
                  const c = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                        <span className="text-xs text-gray-600 truncate">{e.name}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 flex-shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
                {remaining > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-200" />
                      <span className="text-xs text-gray-400">{t('budget.remainingLabel')}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {((remaining / monthlyIncome) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <StackedBar segments={barSegments} />
            </div>
          </div>
        )}

        {/* Expenses list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">{t('budget.expensesTitle')}</p>

          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('budget.expensesEmpty')}</p>
          ) : (
            <div className="space-y-1 mb-4">
              {expenses.map((e, i) => {
                const c = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
                const pct = monthlyIncome > 0 ? (e.amount / monthlyIncome) * 100 : 0
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className="text-sm text-gray-800 truncate">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-900">{formatSGD(e.amount)}</span>
                      {monthlyIncome > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.light} ${c.text}`}>
                          {pct.toFixed(0)}%
                        </span>
                      )}
                      <button
                        onClick={() => removeExpense(i)}
                        aria-label="Remove"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-rose-400 hover:bg-rose-50 transition-all text-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add expense form */}
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 mb-2">{t('budget.addExpenseTitle')}</p>
            <div className="flex gap-2 mb-1.5">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('budget.namePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? 'border-rose-300' : 'border-gray-200'}`}
                />
              </div>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">S$</span>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="1"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                  className={`w-full border rounded-lg pl-7 pr-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${amountError ? 'border-rose-300' : 'border-gray-200'}`}
                />
              </div>
              <button
                onClick={handleAddExpense}
                className="bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                {t('budget.addBtn')}
              </button>
            </div>
            {(nameError || amountError) && (
              <p className="text-xs text-rose-500">{nameError || amountError}</p>
            )}
          </div>
        </div>

        {/* 50/30/20 guide */}
        {suggested && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('budget.guideTitle')}</p>
              <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">{t('budget.guideBadge')}</span>
            </div>
            <p className="text-xs text-gray-500 mb-4 mt-0.5">{t('budget.guideDesc')}</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-gray-800">{t('budget.needsLabel')}</span>
                    <span className="text-xs text-gray-400">{t('budget.needsPct')}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatSGD(suggested.needs)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${totalExpenses <= suggested.needs ? 'bg-blue-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min((totalExpenses / suggested.needs) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t('budget.needsDesc', { amount: formatSGD(totalExpenses) })}
                  {totalExpenses > suggested.needs
                    ? <span className="text-rose-500">{t('budget.needsOver', { over: formatSGD(totalExpenses - suggested.needs) })}</span>
                    : <span className="text-emerald-600">{t('budget.needsOk')}</span>}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm font-medium text-gray-800">{t('budget.sendHomeLabel')}</span>
                    <span className="text-xs text-gray-400">{t('budget.sendHomePct')}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatSGD(suggested.remittance)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: '30%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('budget.sendHomeDesc')}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-gray-800">{t('budget.savingsLabel')}</span>
                    <span className="text-xs text-gray-400">{t('budget.savingsPct')}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatSGD(suggested.savings)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${remaining >= suggested.savings ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((remaining / suggested.savings) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t('budget.savingsDesc', { amount: formatSGD(remaining) })}
                  {remaining >= suggested.savings
                    ? <span className="text-emerald-600">{t('budget.savingsOk')}</span>
                    : <span className="text-amber-600">{t('budget.savingsShort', { target: formatSGD(suggested.savings) })}</span>}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
