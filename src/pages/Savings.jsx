import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Coins, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'
import { track } from '../lib/analytics.js'
import safeStorage from '../lib/safeStorage.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount)
}

const GOAL_COLORS = [
  { grad: 'linear-gradient(135deg, #3B82F6, #2563EB)', light: '#EFF6FF', text: '#1D4ED8', bar: '#3B82F6' },
  { grad: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', light: '#F5F3FF', text: '#6D28D9', bar: '#8B5CF6' },
  { grad: 'linear-gradient(135deg, #F59E0B, #D97706)', light: '#FFFBEB', text: '#92400E', bar: '#F59E0B' },
  { grad: 'linear-gradient(135deg, #F43F5E, #E11D48)', light: '#FFF1F2', text: '#BE123C', bar: '#F43F5E' },
  { grad: 'linear-gradient(135deg, #06B6D4, #0891B2)', light: '#ECFEFF', text: '#155E75', bar: '#06B6D4' },
  { grad: 'linear-gradient(135deg, #E8640C, #CC5708)', light: '#FFF7ED', text: '#C2410C', bar: '#E8640C' },
]

export default function Savings() {
  const { t } = useTranslation()
  const { user, authLoading, isGuest } = useRequireAuth()

  const [goals,   setGoals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

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

  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(safeStorage.getItem('remlo_guest_savings') || '[]')
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

  const totalSaved  = goals.reduce((sum, g) => sum + g.saved,  0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const overallPct  = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0

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
      safeStorage.setItem('remlo_guest_savings', JSON.stringify(updated))
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
      safeStorage.setItem('remlo_guest_savings', JSON.stringify(updated))
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

  async function deleteGoal(id) {
    if (isGuest) {
      const updated = goals.filter(g => g.id !== id)
      setGoals(updated)
      safeStorage.setItem('remlo_guest_savings', JSON.stringify(updated))
      return
    }
    const { error: err } = await supabase.from('savings_goals').delete().eq('id', id)
    if (err) return setError(err.message)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const depositGoal = goals.find(g => g.id === depositGoalId)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div
          className="w-10 h-10 rounded-full border-[3px] animate-spin"
          style={{ borderColor: '#E8640C', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Error banner */}
        {error && (
          <div
            className="text-sm rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 font-bold text-lg leading-none">×</button>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('savings.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('savings.pageSubtitle', { count: goals.length })}
            </p>
          </div>
          <button
            onClick={openNewGoal}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #E8640C, #CC5708)',
              boxShadow: '0 6px 18px rgba(232,100,12,0.3)',
            }}
          >
            <Plus className="w-4 h-4" />
            {t('savings.newGoalBtn')}
          </button>
        </div>

        {/* Overall summary */}
        {goals.length > 0 && (
          <div
            className="rounded-3xl p-6 mb-6 overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #E8640C, #C2410C)',
              boxShadow: '0 8px 32px rgba(194,65,12,0.3)',
            }}
          >
            {/* BG decoration */}
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            />
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3 relative">
              {t('savings.overallProgress')}
            </p>
            <div className="flex items-end justify-between mb-4 relative">
              <div>
                <p className="text-3xl font-extrabold text-white tabular-nums">{formatSGD(totalSaved)}</p>
                <p className="text-sm text-white/60 mt-0.5">{t('savings.savedOf', { amount: formatSGD(totalTarget) })}</p>
              </div>
              <p className="text-2xl font-extrabold text-white/80 tabular-nums">{Math.round(overallPct)}%</p>
            </div>
            {/* Progress bar */}
            <div
              className="w-full h-2 rounded-full overflow-hidden relative"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <div
                className="h-2 rounded-full"
                style={{
                  width: mounted ? `${overallPct}%` : '0%',
                  transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  background: 'white',
                }}
              />
            </div>
          </div>
        )}

        {/* Goals */}
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div
              className="rounded-3xl px-8 py-14 text-center"
              style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}
            >
              {/* Empty state illustration */}
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}
              >
                <Coins className="w-12 h-12" style={{ color: '#92400E' }} strokeWidth={1.5} />
              </div>
              <p className="text-base font-extrabold text-gray-900 mb-2">{t('savings.emptyTitle')}</p>
              <p className="text-sm text-gray-500 mb-7 max-w-[220px] mx-auto leading-relaxed">{t('savings.emptyDesc')}</p>
              <button
                onClick={openNewGoal}
                className="rounded-2xl px-6 py-3 text-sm font-extrabold text-white transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                  boxShadow: '0 6px 18px rgba(232,100,12,0.3)',
                }}
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
                <div
                  key={goal.id}
                  className="rounded-3xl p-6 overflow-hidden"
                  style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}
                >
                  {/* Gradient top strip */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl"
                    style={{ position: 'relative', height: 3, background: isComplete ? '#10B981' : color.grad, borderRadius: '12px 12px 0 0', margin: '-24px -24px 20px', width: 'calc(100% + 48px)' }}
                  />

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: color.grad }}
                        >
                          <Coins className="w-4 h-4 text-white" strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-gray-900 text-base">{goal.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{t('savings.targetLabel', { amount: formatSGD(goal.target) })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: '#D1FAE5', color: '#065F46' }}
                        >
                          {t('savings.completeBadge')}
                        </span>
                      ) : (
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: color.light, color: color.text }}
                        >
                          {Math.round(pct)}%
                        </span>
                      )}
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        aria-label="Delete goal"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 transition-all text-lg"
                        style={{ background: '#F9F7F4' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="w-full h-2.5 rounded-full overflow-hidden mb-4"
                    style={{ background: '#F0EDE8' }}
                  >
                    <div
                      className="h-2.5 rounded-full"
                      style={{
                        width: mounted ? `${pct}%` : '0%',
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        background: isComplete ? '#10B981' : color.bar,
                      }}
                    />
                  </div>

                  <div className="flex justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5 font-medium">{t('savings.savedLabel')}</p>
                      <p className="text-sm font-extrabold text-gray-900 tabular-nums">{formatSGD(goal.saved)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5 font-medium">{t('savings.remainingLabel')}</p>
                      <p
                        className="text-sm font-extrabold tabular-nums"
                        style={{ color: isComplete ? '#059669' : '#1A1A1A' }}
                      >
                        {isComplete ? t('savings.goalReached') : formatSGD(remaining)}
                      </p>
                    </div>
                  </div>

                  {!isComplete && (
                    <button
                      onClick={() => openDeposit(goal.id)}
                      className="w-full rounded-2xl py-3 text-sm font-extrabold text-white transition-all active:scale-[0.98]"
                      style={{ background: color.grad, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
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
          className="fixed bottom-[88px] right-4 w-14 h-14 text-white rounded-full flex items-center justify-center text-2xl font-light active:scale-90 transition-all z-30"
          style={{
            background: 'linear-gradient(135deg, #E8640C, #CC5708)',
            boxShadow: '0 8px 24px rgba(232,100,12,0.45)',
          }}
        >
          +
        </button>
      )}

      {/* New Goal Modal */}
      {showNewGoal && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && closeNewGoal()}
        >
          <div
            className="w-full max-w-sm p-6 scale-in"
            style={{
              background: 'white',
              borderRadius: 24,
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            }}
          >
            <h2 className="text-lg font-extrabold text-gray-900 mb-0.5 tracking-tight">{t('savings.modalNewTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('savings.modalNewDesc')}</p>

            {newGoalError && (
              <div
                className="text-sm rounded-xl p-3 mb-4 font-medium"
                style={{ background: '#FEF2F2', color: '#DC2626' }}
              >
                {newGoalError}
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('savings.goalNameLabel')}</label>
                <input
                  autoFocus
                  type="text"
                  placeholder={t('savings.goalNamePlaceholder')}
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium"
                  style={{ border: '2px solid #EDE8E0', background: '#FAFAF8', outline: 'none' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('savings.targetAmountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none font-semibold">S$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                    className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm font-medium"
                    style={{ border: '2px solid #EDE8E0', background: '#FAFAF8', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeNewGoal}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-gray-700 transition-colors"
                style={{ border: '2px solid #EDE8E0', background: 'white' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddGoal}
                className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                  boxShadow: '0 4px 14px rgba(232,100,12,0.3)',
                }}
              >
                {t('savings.createGoalBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositGoalId && depositGoal && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && closeDeposit()}
        >
          <div
            className="w-full max-w-sm p-6 scale-in"
            style={{
              background: 'white',
              borderRadius: 24,
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            }}
          >
            <h2 className="text-lg font-extrabold text-gray-900 mb-0.5 tracking-tight">{t('savings.addFundsTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">
              {t('savings.addFundsDesc', {
                name:   depositGoal.name,
                amount: formatSGD(depositGoal.target - depositGoal.saved),
              })}
            </p>

            {depositError && (
              <div
                className="text-sm rounded-xl p-3 mb-4 font-medium"
                style={{ background: '#FEF2F2', color: '#DC2626' }}
              >
                {depositError}
              </div>
            )}

            <div className="mb-5">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('savings.depositLabel')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none font-semibold">S$</span>
                <input
                  autoFocus
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDeposit()}
                  className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm font-medium"
                  style={{ border: '2px solid #EDE8E0', background: '#FAFAF8', outline: 'none' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeposit}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-gray-700 transition-colors"
                style={{ border: '2px solid #EDE8E0', background: 'white' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddDeposit}
                className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                  boxShadow: '0 4px 14px rgba(232,100,12,0.3)',
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
