import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, ChevronLeft, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'
import safeStorage from '../lib/safeStorage.js'
import { useDarkMode } from '../hooks/useDarkMode.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toYYYYMMDD(date) {
  return date.toISOString().slice(0, 10)
}

function ordinalStr(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function expectedPayday(year, month, paydayOfMonth) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(paydayOfMonth, lastDay)
  return new Date(year, month, day)
}

function isLate(paymentIso, paydayOfMonth) {
  const paid = new Date(paymentIso)
  const expected = expectedPayday(paid.getFullYear(), paid.getMonth(), paydayOfMonth)
  const diffDays = (paid - expected) / (1000 * 60 * 60 * 24)
  return diffDays > 3
}

function daysLate(paymentIso, paydayOfMonth) {
  const paid = new Date(paymentIso)
  const expected = expectedPayday(paid.getFullYear(), paid.getMonth(), paydayOfMonth)
  return Math.round((paid - expected) / (1000 * 60 * 60 * 24))
}

const today = toYYYYMMDD(new Date())

export default function Salary() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isDark = useDarkMode()
  const bg     = isDark ? '#121110' : '#FAFAF8'
  const card   = isDark ? '#1E1C1A' : 'white'
  const border = isDark ? '#2C2926' : '#F0EDE8'
  const border2 = isDark ? '#2C2926' : '#EDE8E0'
  const { user, authLoading, isGuest } = useRequireAuth()

  const [payments, setPayments] = useState([])
  const [payday, setPayday] = useState(() => {
    const saved = safeStorage.getItem('remlo_payday')
    return saved ? parseInt(saved, 10) : 1
  })
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [fDate, setFDate] = useState(today)
  const [fAmount, setFAmount] = useState('')
  const [fEmployer, setFEmployer] = useState('')
  const [fNote, setFNote] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(safeStorage.getItem('remlo_guest_salary') || '[]')
      setPayments(stored)
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    supabase
      .from('salary_logs')
      .select('id, date, amount, employer, notes')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setPayments(
            (data || []).map((row) => ({
              id: row.id, date: row.date, amount: row.amount,
              employer: row.employer, note: row.notes || '',
            }))
          )
        }
        setLoading(false)
      })
  }, [user, isGuest])

  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [payments]
  )

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const earnedThisMonth = useMemo(
    () => payments.filter((p) => {
      const d = new Date(p.date)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    }).reduce((s, p) => s + p.amount, 0),
    [payments, thisMonth, thisYear]
  )

  const earnedThisYear = useMemo(
    () => payments.filter((p) => new Date(p.date).getFullYear() === thisYear).reduce((s, p) => s + p.amount, 0),
    [payments, thisYear]
  )

  const lateCount = useMemo(
    () => payments.filter((p) => isLate(p.date, payday)).length,
    [payments, payday]
  )

  function handlePaydayChange(val) {
    setPayday(val)
    safeStorage.setItem('remlo_payday', String(val))
  }

  function openForm() {
    setFDate(today); setFAmount(''); setFEmployer(''); setFNote(''); setErrors({})
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setErrors({}) }

  async function handleAdd() {
    const errs = {}
    if (!fDate) errs.date = t('salary.errorDate')
    const amt = parseFloat(fAmount)
    if (!amt || amt <= 0) errs.amount = t('salary.errorAmount')
    if (!fEmployer.trim()) errs.employer = t('salary.errorEmployer')
    if (Object.keys(errs).length) return setErrors(errs)

    if (isGuest) {
      const newPayment = { id: Date.now(), date: fDate, amount: amt, employer: fEmployer.trim(), note: fNote.trim() }
      const updated = [newPayment, ...payments]
      setPayments(updated)
      safeStorage.setItem('remlo_guest_salary', JSON.stringify(updated))
      closeForm()
      return
    }

    const { data, error: err } = await supabase
      .from('salary_logs')
      .insert({ user_id: user.id, date: fDate, amount: amt, employer: fEmployer.trim(), notes: fNote.trim() || null })
      .select('id').single()

    if (err) { setError(err.message); return }

    setPayments((prev) => [
      { id: data.id, date: fDate, amount: amt, employer: fEmployer.trim(), note: fNote.trim() },
      ...prev,
    ])
    closeForm()
  }

  async function deletePayment(id) {
    if (isGuest) {
      const updated = payments.filter((p) => p.id !== id)
      setPayments(updated)
      safeStorage.setItem('remlo_guest_salary', JSON.stringify(updated))
      if (expandedId === id) setExpandedId(null)
      return
    }
    const { error: err } = await supabase.from('salary_logs').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setPayments((prev) => prev.filter((p) => p.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const monthName = now.toLocaleDateString('en-SG', { month: 'long' })

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
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/more')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0"
            style={{ background: card, border: `1px solid ${border2}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('salary.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('salary.pageSubtitle', { count: payments.length })}</p>
          </div>
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white transition-all active:scale-95 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #E8640C, #CC5708)',
              boxShadow: '0 6px 18px rgba(232,100,12,0.3)',
            }}
          >
            <Plus className="w-4 h-4" />
            {t('salary.logBtn')}
          </button>
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

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="rounded-3xl p-5"
            style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
          >
            <p className="text-xs text-gray-400 mb-1 font-semibold">{t('salary.monthEarnings', { month: monthName })}</p>
            <p className="text-xl font-extrabold text-gray-900 tabular-nums">{formatSGD(earnedThisMonth)}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{t('salary.thisMonth')}</p>
          </div>
          <div
            className="rounded-3xl p-5"
            style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
          >
            <p className="text-xs text-gray-400 mb-1 font-semibold">{t('salary.yearEarnings', { year: thisYear })}</p>
            <p className="text-xl font-extrabold text-gray-900 tabular-nums">{formatSGD(earnedThisYear)}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{t('salary.thisYear')}</p>
          </div>
        </div>

        {/* Late payment alert */}
        {lateCount > 0 && (
          <div
            className="rounded-2xl px-5 py-4 mb-4 flex items-start gap-3"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: '#FCA5A5' }}
            >
              <span className="text-red-700 text-sm font-extrabold">!</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-red-700">
                {t('salary.lateAlert', { count: lateCount })}
              </p>
              <p className="text-xs text-red-500 mt-0.5 font-medium">
                {t('salary.lateAlertDesc', { ordinal: ordinalStr(payday) })}
              </p>
            </div>
          </div>
        )}

        {/* Payday setting */}
        <div
          className="rounded-3xl p-5 mb-6"
          style={{ background: card, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t('salary.paydaySetting')}</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 flex-shrink-0 font-medium">{t('salary.paydayPrefix')}</label>
            <div className="relative">
              <select
                value={payday}
                onChange={(e) => handlePaydayChange(Number(e.target.value))}
                className="rounded-xl pl-3 pr-8 py-2.5 text-sm font-bold appearance-none"
                style={{ border: '2px solid #EDE8E0', background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <span className="text-sm text-gray-700 font-medium">{t('salary.paydaySuffix')}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">{t('salary.paydayNote')}</p>
        </div>

        {/* Payment history */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t('salary.historyTitle')}</p>

        {sorted.length === 0 ? (
          <div
            className="rounded-3xl px-8 py-14 text-center"
            style={{ background: card, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: `1px solid ${border}` }}
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}
            >
              <Banknote className="w-12 h-12" style={{ color: '#065F46' }} strokeWidth={1.5} />
            </div>
            <p className="text-base font-extrabold text-gray-900 mb-2">{t('salary.emptyTitle')}</p>
            <p className="text-sm text-gray-500 mb-7 max-w-[220px] mx-auto leading-relaxed">{t('salary.emptyDesc')}</p>
            <button
              onClick={openForm}
              className="rounded-2xl px-6 py-3 text-sm font-extrabold text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                boxShadow: '0 6px 18px rgba(232,100,12,0.3)',
              }}
            >
              {t('salary.emptyBtn')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((p) => {
              const late = isLate(p.date, payday)
              const days = daysLate(p.date, payday)
              const isExpanded = expandedId === p.id

              return (
                <div
                  key={p.id}
                  className="rounded-3xl overflow-hidden transition-all"
                  style={{
                    background: card,
                    border: late ? '1px solid #FECACA' : `1px solid ${border}`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  <button
                    className="w-full text-left px-5 py-4"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-extrabold text-gray-900">{p.employer}</p>
                          {late && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: '#FEE2E2', color: '#DC2626' }}
                            >
                              {days > 0 ? t('salary.lateBadgeDays', { days }) : t('salary.lateBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-medium">{formatDate(p.date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-extrabold text-gray-900 tabular-nums">{formatSGD(p.amount)}</p>
                        <p className={`text-xs mt-0.5 font-bold transition-transform ${isExpanded ? 'text-orange-500' : 'text-gray-300'}`}>
                          {isExpanded ? '▲' : '▼'}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4" style={{ borderTop: `1px solid ${isDark ? '#252220' : '#F5F2ED'}` }}>
                      <div className="pt-3 space-y-3">
                        {p.note ? (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5 font-semibold">{t('salary.noteLabel')}</p>
                            <p className="text-sm text-gray-700 font-medium">{p.note}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">{t('salary.noNote')}</p>
                        )}
                        {late && (
                          <div className="rounded-2xl p-3" style={{ background: '#FEF2F2' }}>
                            <p className="text-xs font-extrabold text-red-600 mb-0.5">{t('salary.lateDetailsTitle')}</p>
                            <p className="text-xs text-red-500 font-medium">
                              {days > 0
                                ? t('salary.lateDetailsLate', { ordinal: ordinalStr(payday), days })
                                : t('salary.lateDetailsOnTime', { ordinal: ordinalStr(payday) })}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => deletePayment(p.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors font-semibold"
                        >
                          {t('salary.deleteEntry')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div
            className="w-full max-w-sm p-6 scale-in"
            style={{ background: card, borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          >
            <h2 className="text-lg font-extrabold text-gray-900 mb-0.5 tracking-tight">{t('salary.modalTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('salary.modalDesc')}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('salary.dateLabel')}</label>
                <input
                  type="date"
                  value={fDate}
                  max={today}
                  onChange={(e) => setFDate(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium"
                  style={{ border: `2px solid ${errors.date ? '#FCA5A5' : '#EDE8E0'}`, background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1 font-medium">{errors.date}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('salary.amountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none font-bold">S$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                    className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm font-medium"
                    style={{ border: `2px solid ${errors.amount ? '#FCA5A5' : '#EDE8E0'}`, background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500 mt-1 font-medium">{errors.amount}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">{t('salary.employerLabel')}</label>
                <input
                  type="text"
                  placeholder={t('salary.employerPlaceholder')}
                  value={fEmployer}
                  onChange={(e) => setFEmployer(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium"
                  style={{ border: `2px solid ${errors.employer ? '#FCA5A5' : '#EDE8E0'}`, background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
                />
                {errors.employer && <p className="text-xs text-red-500 mt-1 font-medium">{errors.employer}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                  {t('salary.noteLabelModal')} <span className="text-gray-300 font-normal">({t('common.optional')})</span>
                </label>
                <textarea
                  placeholder={t('salary.notePlaceholder')}
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium resize-none"
                  style={{ border: '2px solid #EDE8E0', background: bg, outline: 'none', color: isDark ? '#F5F2EE' : '#1A1A1A' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-gray-700"
                style={{ border: `2px solid ${border2}`, background: card, color: isDark ? '#F5F2EE' : '#374151' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                  boxShadow: '0 4px 14px rgba(232,100,12,0.3)',
                }}
              >
                {t('salary.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
