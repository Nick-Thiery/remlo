import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'

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
  const { t } = useTranslation()
  const { user, authLoading, isGuest } = useRequireAuth()

  const [payments, setPayments] = useState([])
  const [payday, setPayday] = useState(() => {
    const saved = localStorage.getItem('remlo_payday')
    return saved ? parseInt(saved, 10) : 1
  })
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state
  const [fDate, setFDate] = useState(today)
  const [fAmount, setFAmount] = useState('')
  const [fEmployer, setFEmployer] = useState('')
  const [fNote, setFNote] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(localStorage.getItem('remlo_guest_salary') || '[]')
      setPayments(stored)
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    supabase
      .from('salary_logs')
      .select('id, payment_date, amount, employer, note')
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setPayments(
            (data || []).map((row) => ({
              id: row.id,
              date: row.payment_date,
              amount: row.amount,
              employer: row.employer,
              note: row.note || '',
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
    () =>
      payments
        .filter((p) => {
          const d = new Date(p.date)
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear
        })
        .reduce((s, p) => s + p.amount, 0),
    [payments, thisMonth, thisYear]
  )

  const earnedThisYear = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.date).getFullYear() === thisYear)
        .reduce((s, p) => s + p.amount, 0),
    [payments, thisYear]
  )

  const lateCount = useMemo(
    () => payments.filter((p) => isLate(p.date, payday)).length,
    [payments, payday]
  )

  function handlePaydayChange(val) {
    setPayday(val)
    localStorage.setItem('remlo_payday', String(val))
  }

  function openForm() {
    setFDate(today)
    setFAmount('')
    setFEmployer('')
    setFNote('')
    setErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setErrors({})
  }

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
      localStorage.setItem('remlo_guest_salary', JSON.stringify(updated))
      closeForm()
      return
    }

    const { data, error: err } = await supabase
      .from('salary_logs')
      .insert({
        user_id: user.id,
        payment_date: fDate,
        amount: amt,
        employer: fEmployer.trim(),
        note: fNote.trim() || null,
      })
      .select('id')
      .single()

    if (err) {
      setError(err.message)
      return
    }

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
      localStorage.setItem('remlo_guest_salary', JSON.stringify(updated))
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('salary.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('salary.pageSubtitle', { count: payments.length })}</p>
          </div>
          <button
            onClick={openForm}
            className="bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {t('salary.logBtn')}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
          </div>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">{t('salary.monthEarnings', { month: monthName })}</p>
            <p className="text-xl font-bold text-gray-900">{formatSGD(earnedThisMonth)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('salary.thisMonth')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">{t('salary.yearEarnings', { year: thisYear })}</p>
            <p className="text-xl font-bold text-gray-900">{formatSGD(earnedThisYear)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('salary.thisYear')}</p>
          </div>
        </div>

        {/* Late payment alert */}
        {lateCount > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-4 flex items-start gap-3">
            <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {t('salary.lateAlert', { count: lateCount })}
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {t('salary.lateAlertDesc', { ordinal: ordinalStr(payday) })}
              </p>
            </div>
          </div>
        )}

        {/* Payday setting */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('salary.paydaySetting')}</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 flex-shrink-0">{t('salary.paydayPrefix')}</label>
            <div className="relative">
              <select
                value={payday}
                onChange={(e) => handlePaydayChange(Number(e.target.value))}
                className="border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">{t('salary.paydaySuffix')}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{t('salary.paydayNote')}</p>
        </div>

        {/* Payment history */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('salary.historyTitle')}</p>

        {sorted.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-3">💵</p>
            <p className="font-semibold text-gray-900 mb-1">{t('salary.emptyTitle')}</p>
            <p className="text-sm text-gray-500 mb-5">{t('salary.emptyDesc')}</p>
            <button
              onClick={openForm}
              className="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
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
                  className={`bg-white rounded-2xl shadow-sm border transition-all ${
                    late ? 'border-red-100' : 'border-gray-100'
                  }`}
                >
                  <button
                    className="w-full text-left px-5 py-4"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{p.employer}</p>
                          {late && (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                              {days > 0 ? t('salary.lateBadgeDays', { days }) : t('salary.lateBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-gray-900">{formatSGD(p.amount)}</p>
                        <p className={`text-xs mt-0.5 transition-transform ${isExpanded ? 'text-blue-500' : 'text-gray-300'}`}>
                          {isExpanded ? '▲' : '▼'}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-gray-50">
                      <div className="pt-3 space-y-3">
                        {p.note ? (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">{t('salary.noteLabel')}</p>
                            <p className="text-sm text-gray-700">{p.note}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">{t('salary.noNote')}</p>
                        )}
                        {late && (
                          <div className="bg-red-50 rounded-xl p-3">
                            <p className="text-xs font-medium text-red-600 mb-0.5">{t('salary.lateDetailsTitle')}</p>
                            <p className="text-xs text-red-500">
                              {days > 0
                                ? t('salary.lateDetailsLate', { ordinal: ordinalStr(payday), days })
                                : t('salary.lateDetailsOnTime', { ordinal: ordinalStr(payday) })}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => deletePayment(p.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
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
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t('salary.modalTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('salary.modalDesc')}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('salary.dateLabel')}</label>
                <input
                  type="date"
                  value={fDate}
                  max={today}
                  onChange={(e) => setFDate(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.date ? 'border-red-300' : 'border-gray-200'}`}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('salary.amountLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                    className={`w-full border rounded-lg pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('salary.employerLabel')}</label>
                <input
                  type="text"
                  placeholder={t('salary.employerPlaceholder')}
                  value={fEmployer}
                  onChange={(e) => setFEmployer(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.employer ? 'border-red-300' : 'border-gray-200'}`}
                />
                {errors.employer && <p className="text-xs text-red-500 mt-1">{errors.employer}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  {t('salary.noteLabelModal')} <span className="text-gray-300 font-normal">({t('common.optional')})</span>
                </label>
                <textarea
                  placeholder={t('salary.notePlaceholder')}
                  value={fNote}
                  onChange={(e) => setFNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
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
