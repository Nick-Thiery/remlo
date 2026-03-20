import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PiggyBank } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'
import { track } from '../lib/analytics.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const GOAL_COLORS = [
  { bar: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600'   },
  { bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-600' },
  { bar: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-600'  },
  { bar: 'bg-rose-500',   badge: 'bg-rose-50 text-rose-600'    },
  { bar: 'bg-cyan-500',   badge: 'bg-cyan-50 text-cyan-600'    },
  { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-600' },
]

export default function Savings() {
  const { t } = useTranslation()
  const { user, authLoading, isGuest } = useRequireAuth()

  const [goals,   setGoals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Progress bar animation after mount
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const [showNewGoal,    setShowNewGoal]    = useState(false)
  const [depositGoalId,  setDepositGoalId]  = useState(null)
  const [newGoalName,    setNewGoalName]    = useState('')
  const [newGoalTarget,  setNewGoalTarget]  = useState('')
  const [newGoalError,   setNewGoalError]   = useState('')
  const [depositAmount,  setDepositAmount]  = useState('')
  const [depositError,   setDepositError]   = useState('')

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(localStorage.getItem('remlo_guest_savings') || '[]')
      setGoals(stored)
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    setError(null)

    supabase
      .from('savings_goals')
      .select('id, name, target_amount, current_amount')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setGoals(data.map(row => ({
            id:     row.id,
            name:   row.name,
            target: row.target_amount,
            saved:  row.current_amount,
          })))
        }
        setLoading(false)
      })
  }, [user, isGuest])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalSaved  = goals.reduce((sum, g) => sum + g.saved,  0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const overallPct  = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0

  // ── New goal ─────────────────────────────────────────────────────────────────
  function openNewGoal()  { setNewGoalName(''); setNewGoalTarget(''); setNewGoalError(''); setShowNewGoal(true) }
  function closeNewGoal() { setShowNewGoal(false); setNewGoalError('') }

  async function handleAddGoal() {
    const target = parseFloat(newGoalTarget)
    if (!newGoalName.trim())      return setNewGoalError(t('savings.errorGoalName'))
    if (!target || target <= 0)   return setNewGoalError(t('savings.errorTarget'))

    track('savings_goal_created', { target_amount: target })

    if (isGuest) {
      const newGoal = { id: Date.now(), name: newGoalName.trim(), target, saved: 0 }
      const updated = [...goals, newGoal]
      setGoals(updated)
      localStorage.setItem('remlo_guest_savings', JSON.stringify(updated))
      closeNewGoal()
      return
    }

    const { data, error: err } = await supabase
      .from('savings_goals')
      .insert({ user_id: user.id, name: newGoalName.trim(), target_amount: target, current_amount: 0 })
      .select('id, name, target_amount, current_amount')
      .single()

    if (err) return setNewGoalError(err.message)

    setGoals(prev => [...prev, { id: data.id, name: data.name, target: data.target_amount, saved: data.current_amount }])
    closeNewGoal()
  }

  // ── Deposit ──────────────────────────────────────────────────────────────────
  function openDeposit(goalId)  { setDepositAmount(''); setDepositError(''); setDepositGoalId(goalId) }
  function closeDeposit()       { setDepositGoalId(null); setDepositError('') }

  async function handleAddDeposit() {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return setDepositError(t('savings.errorDeposit'))

    const goal     = goals.find(g => g.id === depositGoalId)
    const newSaved = Math.min(goal.saved + amount, goal.target)

    if (isGuest) {
      const updated = goals.map(g => g.id === depositGoalId ? { ...g, saved: newSaved } : g)
      setGoals(updated)
      localStorage.setItem('remlo_guest_savings', JSON.stringify(updated))
      closeDeposit()
      return
    }

    const { error: err } = await supabase
      .from('savings_goals')
      .update({ current_amount: newSaved })
      .eq('id', depositGoalId)

    if (err) return setDepositError(err.message)

    setGoals(prev => prev.map(g => g.id === depositGoalId ? { ...g, saved: newSaved } : g))
    closeDeposit()
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function deleteGoal(id) {
    if (isGuest) {
      const updated = goals.filter(g => g.id !== id)
      setGoals(updated)
      localStorage.setItem('remlo_guest_savings', JSON.stringify(updated))
      return
    }
    const { error: err } = await supabase.from('savings_goals').delete().eq('id', id)
    if (err) return setError(err.message)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const depositGoal = goals.find(g => g.id === depositGoalId)

  // ── Auth / loading guards ─────────────────────────────────────────────────
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

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 font-bold">×</button>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('savings.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('savings.pageSubtitle', { count: goals.length })}
            </p>
          </div>
          <button
            onClick={openNewGoal}
            className="bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {t('savings.newGoalBtn')}
          </button>
        </div>

        {/* Overall summary */}
        {goals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('savings.overallProgress')}</p>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatSGD(totalSaved)}</p>
                <p className="text-sm text-gray-500">{t('savings.savedOf', { amount: formatSGD(totalTarget) })}</p>
              </div>
              <p className="text-lg font-semibold text-blue-600">{Math.round(overallPct)}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: mounted ? `${overallPct}%` : '0%', transition: 'width 0.9s ease-out' }}
              />
            </div>
          </div>
        )}

        {/* Goals */}
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-12 text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <PiggyBank className="w-10 h-10 text-amber-400" strokeWidth={1.5} />
              </div>
              <p className="text-base font-bold text-gray-900 mb-2">{t('savings.emptyTitle')}</p>
              <p className="text-sm text-gray-500 mb-6 max-w-[220px] mx-auto leading-relaxed">{t('savings.emptyDesc')}</p>
              <button
                onClick={openNewGoal}
                className="bg-blue-600 text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
              >
                {t('savings.emptyBtn')}
              </button>
            </div>
          ) : (
            goals.map((goal, index) => {
              const pct        = Math.min((goal.saved / goal.target) * 100, 100)
              const remaining  = Math.max(goal.target - goal.saved, 0)
              const isComplete = goal.saved >= goal.target
              const color      = GOAL_COLORS[index % GOAL_COLORS.length]

              return (
                <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t('savings.targetLabel', { amount: formatSGD(goal.target) })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">
                          {t('savings.completeBadge')}
                        </span>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color.badge}`}>
                          {Math.round(pct)}%
                        </span>
                      )}
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        aria-label="Delete goal"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all text-lg"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full ${isComplete ? 'bg-emerald-500' : color.bar}`}
                      style={{ width: mounted ? `${pct}%` : '0%', transition: 'width 0.9s ease-out' }}
                    />
                  </div>

                  <div className="flex justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">{t('savings.savedLabel')}</p>
                      <p className="text-sm font-semibold text-gray-900">{formatSGD(goal.saved)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">{t('savings.remainingLabel')}</p>
                      <p className={`text-sm font-semibold ${isComplete ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {isComplete ? t('savings.goalReached') : formatSGD(remaining)}
                      </p>
                    </div>
                  </div>

                  {!isComplete && (
                    <button
                      onClick={() => openDeposit(goal.id)}
                      className="w-full border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      {t('savings.addFundsBtn')}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* FAB */}
      {goals.length > 0 && (
        <button
          onClick={openNewGoal}
          aria-label="Add new goal"
          className="fixed bottom-[81px] right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center text-3xl font-light hover:bg-blue-700 active:scale-90 transition-all z-30"
        >
          +
        </button>
      )}

      {/* New Goal Modal */}
      {showNewGoal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeNewGoal()}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t('savings.modalNewTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('savings.modalNewDesc')}</p>

            {newGoalError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{newGoalError}</div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('savings.goalNameLabel')}</label>
                <input
                  autoFocus
                  type="text"
                  placeholder={t('savings.goalNamePlaceholder')}
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('savings.targetAmountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={closeNewGoal} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleAddGoal} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition-colors">
                {t('savings.createGoalBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositGoalId && depositGoal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeDeposit()}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t('savings.addFundsTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">
              {t('savings.addFundsDesc', {
                name:   depositGoal.name,
                amount: formatSGD(depositGoal.target - depositGoal.saved),
              })}
            </p>

            {depositError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{depositError}</div>
            )}

            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('savings.depositLabel')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                <input
                  autoFocus
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDeposit()}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={closeDeposit} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleAddDeposit} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 transition-colors">
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
