import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ListPlus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'
import { track } from '../lib/analytics.js'
import safeStorage from '../lib/safeStorage.js'
import { useDarkMode } from '../hooks/useDarkMode.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const SEGMENT_COLORS = [
  { bar: 'bg-blue-500',    dot: 'bg-blue-500',    text: 'text-blue-600',    light: 'bg-blue-50',    svgColor: '#3b82f6' },
  { bar: 'bg-rose-500',    dot: 'bg-rose-500',    text: 'text-rose-600',    light: 'bg-rose-50',    svgColor: '#f43f5e' },
  { bar: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', svgColor: '#10b981' },
  { bar: 'bg-amber-500',   dot: 'bg-amber-500',   text: 'text-amber-600',   light: 'bg-amber-50',   svgColor: '#f59e0b' },
  { bar: 'bg-violet-500',  dot: 'bg-violet-500',  text: 'text-violet-600',  light: 'bg-violet-50',  svgColor: '#8b5cf6' },
  { bar: 'bg-cyan-500',    dot: 'bg-cyan-500',    text: 'text-cyan-600',    light: 'bg-cyan-50',    svgColor: '#06b6d4' },
  { bar: 'bg-orange-500',  dot: 'bg-orange-500',  text: 'text-orange-600',  light: 'bg-orange-50',  svgColor: '#f97316' },
]

function StackedBar({ segments, trackBg = '#F0EDE8' }) {
  return (
    <div className="flex w-full h-3 rounded-full overflow-hidden gap-px" style={{ background: trackBg }}>
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

function DonutChart({ slices, size = 160, centerFill = 'white' }) {
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
      <circle cx={cx} cy={cy} r={r * 0.62} fill={centerFill} />
    </svg>
  )
}

export default function Budget() {
  const { t } = useTranslation()
  const isDark = useDarkMode()
  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#F0EDE8'
  const border2 = isDark ? '#2C2926' : '#EDE8E0'
  const trackBg = isDark ? '#2C2926' : '#EDE8E0'
  const { user, authLoading, isGuest } = useRequireAuth()

  const PRESET_EXPENSES = useMemo(() => [
    { name: t('budget.presetRent'),        amount: 400, _key: 'preset-0' },
    { name: t('budget.presetGroceries'),   amount: 200, _key: 'preset-1' },
    { name: t('budget.presetTransport'),   amount: 80,  _key: 'preset-2' },
    { name: t('budget.presetPhone'),       amount: 20,  _key: 'preset-3' },
  ], [t])

  const [income, setIncome] = useState('')
  const [expenses, setExpenses] = useState(PRESET_EXPENSES)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [nameError, setNameError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const budgetExists = useRef(false)

  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(safeStorage.getItem('remlo_guest_budget') || 'null')
      if (stored) {
        setIncome(stored.income > 0 ? String(stored.income) : '')
        setExpenses(Array.isArray(stored.expenses) && stored.expenses.length > 0
          ? stored.expenses.map((e, i) => ({ ...e, _key: e._key ?? i }))
          : PRESET_EXPENSES)
      }
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    supabase
      .from('budgets')
      .select('income, expenses')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else if (data) {
          budgetExists.current = true
          setIncome(data.income > 0 ? String(data.income) : '')
          setExpenses(Array.isArray(data.expenses) && data.expenses.length > 0
            ? data.expenses.map((e, i) => ({ ...e, _key: e._key ?? i }))
            : PRESET_EXPENSES)
        }
        setLoading(false)
      })
  }, [user, isGuest, PRESET_EXPENSES])

  async function saveBudget(incomeVal, expensesVal) {
    const cleanExpenses = expensesVal.map(({ _key, ...rest }) => rest)
    track('budget_updated', { income: parseFloat(incomeVal) || 0, expense_count: cleanExpenses.length })
    if (isGuest) {
      safeStorage.setItem('remlo_guest_budget', JSON.stringify({
        income: parseFloat(incomeVal) || 0,
        expenses: cleanExpenses,
      }))
      return
    }
    if (!user) return
    const payload = { income: parseFloat(incomeVal) || 0, expenses: cleanExpenses }
    let err
    if (budgetExists.current) {
      ({ error: err } = await supabase.from('budgets').update(payload).eq('user_id', user.id))
    } else {
      ({ error: err } = await supabase.from('budgets').insert({ user_id: user.id, ...payload }))
      if (!err) budgetExists.current = true
    }
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

    const newExpenses = [...expenses, { name: newName.trim(), amount: amt, _key: Date.now() }]
    setExpenses(newExpenses)
    setNewName('')
    setNewAmount('')
    saveBudget(income, newExpenses)
  }

  function removeExpense(key) {
    const newExpenses = expenses.filter((e) => e._key !== key)
    setExpenses(newExpenses)
    saveBudget(income, newExpenses)
  }

  function startEdit(key) {
    const e = expenses.find((exp) => exp._key === key)
    setEditingKey(key)
    setEditingValue(String(e.amount))
  }

  function commitEdit(key) {
    const amt = parseFloat(editingValue)
    setEditingKey(null)
    setEditingValue('')
    const e = expenses.find((exp) => exp._key === key)
    if (!amt || amt <= 0 || amt === e?.amount) return
    const newExpenses = expenses.map((exp) => exp._key === key ? { ...exp, amount: amt } : exp)
    setExpenses(newExpenses)
    saveBudget(income, newExpenses)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div
          className="w-10 h-10 rounded-full border-[3px] animate-spin"
          style={{ borderColor: '#E8640C', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{t('budget.pageTitle')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('budget.pageSubtitle')}</p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="rounded-2xl px-5 py-4 mb-4 flex items-center justify-between gap-3"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-lg leading-none flex-shrink-0">×</button>
          </div>
        )}

        {/* Income input */}
        <div
          className="rounded-3xl p-6 mb-4"
          style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
        >
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('budget.incomeLabel')}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none font-semibold">S$</span>
            <input
              type="number"
              min="0"
              step="50"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              onBlur={() => saveBudget(income, expenses)}
              className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-gray-900"
              style={{ border: `2px solid ${border2}`, background: bg, outline: 'none' }}
              placeholder="0"
            />
          </div>
        </div>

        {/* Summary cards */}
        {monthlyIncome > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div
              className="rounded-2xl p-4"
              style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
            >
              <p className="text-xs text-gray-400 mb-1 font-semibold">{t('budget.summaryIncome')}</p>
              <p className="text-base font-extrabold text-gray-900 tabular-nums">{formatSGD(monthlyIncome)}</p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${border}` }}
            >
              <p className="text-xs text-gray-400 mb-1 font-semibold">{t('budget.summaryExpenses')}</p>
              <p
                className="text-base font-extrabold tabular-nums"
                style={{ color: isOverBudget ? '#DC2626' : isDark ? '#F5F2EE' : '#1A1A1A' }}
              >
                {formatSGD(totalExpenses)}
              </p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{
                background: isOverBudget ? (isDark ? '#2D1515' : '#FEF2F2') : (isDark ? '#0F2A1A' : '#F0FDF4'),
                border: isOverBudget ? (isDark ? '1px solid #4B2020' : '1px solid #FECACA') : (isDark ? '1px solid #1A4A2A' : '1px solid #BBF7D0'),
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              <p className="text-xs text-gray-400 mb-1 font-semibold">{isOverBudget ? t('budget.summaryOverBy') : t('budget.summaryLeftOver')}</p>
              <p
                className="text-base font-extrabold tabular-nums"
                style={{ color: isOverBudget ? '#DC2626' : '#059669' }}
              >
                {formatSGD(isOverBudget ? overspend : remaining)}
              </p>
            </div>
          </div>
        )}

        {/* Visual breakdown */}
        {monthlyIncome > 0 && expenses.length > 0 && (
          <div
            className="rounded-3xl p-6 mb-4"
            style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">{t('budget.breakdownTitle')}</p>

            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <DonutChart slices={donutSlices} size={140} centerFill={card} />
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                {expenses.map((e, i) => {
                  const pct = monthlyIncome > 0 ? (e.amount / monthlyIncome) * 100 : 0
                  const c = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                        <span className="text-xs text-gray-600 truncate font-medium">{e.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-500 flex-shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
                {remaining > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">{t('budget.remainingLabel')}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {((remaining / monthlyIncome) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <StackedBar segments={barSegments} trackBg={trackBg} />
            </div>
          </div>
        )}

        {/* Expenses list */}
        <div
          className="rounded-3xl p-6 mb-4"
          style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">{t('budget.expensesTitle')}</p>

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: isDark ? '#1A2A40' : '#EFF6FF' }}
              >
                <ListPlus className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-0.5">{t('budget.expensesEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-1 mb-5">
              {expenses.map((e, i) => {
                const c = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
                const pct = monthlyIncome > 0 ? (e.amount / monthlyIncome) * 100 : 0
                return (
                  <div
                    key={e._key}
                    className="flex items-center justify-between py-3"
                    style={{ borderBottom: `1px solid ${isDark ? '#252220' : '#F5F2ED'}` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                      <span className="text-sm text-gray-800 truncate font-medium">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {editingKey === e._key ? (
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">S$</span>
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            step="1"
                            value={editingValue}
                            onChange={(ev) => setEditingValue(ev.target.value)}
                            onBlur={() => commitEdit(e._key)}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter') ev.target.blur()
                              if (ev.key === 'Escape') { setEditingKey(null); setEditingValue('') }
                            }}
                            className="w-24 rounded-xl pl-6 pr-2 py-1 text-sm font-bold"
                            style={{ border: '2px solid #E8640C', outline: 'none' }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(e._key)}
                          title="Click to edit"
                          className="text-sm font-bold text-gray-900 hover:text-orange-600 transition-colors group/amt flex items-center gap-1"
                        >
                          <span className="underline decoration-dashed decoration-gray-300 underline-offset-2 group-hover/amt:decoration-orange-400 transition-colors tabular-nums">
                            {formatSGD(e.amount)}
                          </span>
                          <svg className="w-3 h-3 text-gray-300 group-hover/amt:text-orange-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                      )}
                      {monthlyIncome > 0 && editingKey !== e._key && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.light} ${c.text}`}>
                          {pct.toFixed(0)}%
                        </span>
                      )}
                      <button
                        onClick={() => removeExpense(e._key)}
                        aria-label="Remove"
                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-rose-400 transition-all text-lg"
                        style={{ background: isDark ? '#2A2724' : '#F9F7F4' }}
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
          <div className="pt-1">
            <p className="text-xs font-bold text-gray-400 mb-2.5">{t('budget.addExpenseTitle')}</p>
            <div className="flex gap-2 mb-1.5">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('budget.namePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                  className="w-full rounded-xl px-3 py-2.5 text-sm font-medium"
                  style={{
                    border: `2px solid ${nameError ? '#FCA5A5' : border2}`,
                    background: bg,
                    outline: 'none',
                    color: isDark ? '#F5F2EE' : '#1A1A1A',
                  }}
                />
              </div>
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none font-semibold">S$</span>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  step="1"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                  className="w-full rounded-xl pl-7 pr-2 py-2.5 text-sm font-medium"
                  style={{
                    border: `2px solid ${amountError ? '#FCA5A5' : border2}`,
                    background: bg,
                    outline: 'none',
                    color: isDark ? '#F5F2EE' : '#1A1A1A',
                  }}
                />
              </div>
              <button
                onClick={handleAddExpense}
                className="rounded-xl px-4 py-2.5 text-sm font-extrabold text-white flex-shrink-0 transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                  boxShadow: '0 3px 10px rgba(232,100,12,0.25)',
                }}
              >
                {t('budget.addBtn')}
              </button>
            </div>
            {(nameError || amountError) && (
              <p className="text-xs text-rose-500 font-medium">{nameError || amountError}</p>
            )}
          </div>
        </div>

        {/* 50/30/20 guide */}
        {suggested && (
          <div
            className="rounded-3xl p-6"
            style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('budget.guideTitle')}</p>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: isDark ? '#1A2A40' : '#EFF6FF', color: isDark ? '#93C5FD' : '#1D4ED8' }}
              >
                {t('budget.guideBadge')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-5 mt-0.5 font-medium">{t('budget.guideDesc')}</p>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-bold text-gray-800">{t('budget.needsLabel')}</span>
                    <span className="text-xs text-gray-400 font-semibold">{t('budget.needsPct')}</span>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 tabular-nums">{formatSGD(suggested.needs)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((totalExpenses / suggested.needs) * 100, 100)}%`,
                      background: totalExpenses <= suggested.needs ? '#3B82F6' : '#EF4444',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  {t('budget.needsDesc', { amount: formatSGD(totalExpenses) })}
                  {totalExpenses > suggested.needs
                    ? <span className="text-rose-500 font-bold">{t('budget.needsOver', { over: formatSGD(totalExpenses - suggested.needs) })}</span>
                    : <span className="text-emerald-600 font-bold">{t('budget.needsOk')}</span>}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm font-bold text-gray-800">{t('budget.sendHomeLabel')}</span>
                    <span className="text-xs text-gray-400 font-semibold">{t('budget.sendHomePct')}</span>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 tabular-nums">{formatSGD(suggested.remittance)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                  <div className="h-1.5 rounded-full bg-violet-500" style={{ width: '30%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 font-medium">{t('budget.sendHomeDesc')}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-gray-800">{t('budget.savingsLabel')}</span>
                    <span className="text-xs text-gray-400 font-semibold">{t('budget.savingsPct')}</span>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900 tabular-nums">{formatSGD(suggested.savings)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: trackBg }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((remaining / suggested.savings) * 100, 100)}%`,
                      background: remaining >= suggested.savings ? '#10B981' : '#F59E0B',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  {t('budget.savingsDesc', { amount: formatSGD(remaining) })}
                  {remaining >= suggested.savings
                    ? <span className="text-emerald-600 font-bold">{t('budget.savingsOk')}</span>
                    : <span className="text-amber-600 font-bold">{t('budget.savingsShort', { target: formatSGD(suggested.savings) })}</span>}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
