import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Receipt, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useRequireAuth } from '../hooks/useRequireAuth.js'

function formatSGD(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.max(amount, 0))
}

function formatSGDExact(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(Math.max(amount, 0))
}

function monthsElapsed(startIso) {
  const start = new Date(startIso)
  const now = new Date()
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  return Math.max(months, 0)
}

function calcRemaining(principal, monthlyRatePct, monthlyPayment, paymentsMade) {
  if (paymentsMade === 0) return principal
  const r = monthlyRatePct / 100
  if (r === 0) return Math.max(principal - monthlyPayment * paymentsMade, 0)
  const balance =
    principal * Math.pow(1 + r, paymentsMade) -
    monthlyPayment * ((Math.pow(1 + r, paymentsMade) - 1) / r)
  return Math.max(balance, 0)
}

function totalPayoffMonths(principal, monthlyRatePct, monthlyPayment) {
  const r = monthlyRatePct / 100
  if (monthlyPayment <= 0) return Infinity
  if (r === 0) return Math.ceil(principal / monthlyPayment)
  if (monthlyPayment <= principal * r) return Infinity
  return Math.ceil(-Math.log(1 - (r * principal) / monthlyPayment) / Math.log(1 + r))
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
}

function computeLoan(loan) {
  const made = Math.min(monthsElapsed(loan.startDate), totalPayoffMonths(loan.principal, loan.rate, loan.monthlyPayment))
  const remaining = calcRemaining(loan.principal, loan.rate, loan.monthlyPayment, made)
  const totalMonths = totalPayoffMonths(loan.principal, loan.rate, loan.monthlyPayment)
  const neverPaidOff = totalMonths === Infinity
  const payoffDate = neverPaidOff ? null : addMonths(new Date(loan.startDate), totalMonths)
  const paidOff = remaining <= 0
  const progressPct = paidOff ? 100 : Math.min(((loan.principal - remaining) / loan.principal) * 100, 100)
  const totalInterestPaid = paidOff || neverPaidOff
    ? null
    : loan.monthlyPayment * totalMonths - loan.principal
  return { ...loan, made, remaining, totalMonths, neverPaidOff, payoffDate, paidOff, progressPct, totalInterestPaid }
}

const ILLEGAL_RATE_THRESHOLD = 4

const today = new Date().toISOString().slice(0, 10)

export default function Loans() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, authLoading, isGuest } = useRequireAuth()

  const [loans, setLoans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form fields
  const [fLender, setFLender] = useState('')
  const [fPrincipal, setFPrincipal] = useState('')
  const [fRate, setFRate] = useState('')
  const [fPayment, setFPayment] = useState('')
  const [fStart, setFStart] = useState(today)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isGuest) {
      const stored = JSON.parse(localStorage.getItem('remlo_guest_loans') || '[]')
      setLoans(stored)
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    supabase
      .from('loans')
      .select('id, lender, total_amount, interest_rate, monthly_payment, start_date')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setLoans(
            (data || []).map((row) => ({
              id: row.id,
              lender: row.lender,
              principal: row.total_amount,
              rate: row.interest_rate,
              monthlyPayment: row.monthly_payment,
              startDate: row.start_date,
            }))
          )
        }
        setLoading(false)
      })
  }, [user, isGuest])

  const computed = useMemo(() => loans.map(computeLoan), [loans])

  const totalDebt = useMemo(
    () => computed.reduce((s, l) => s + l.remaining, 0),
    [computed]
  )
  const illegalCount = computed.filter((l) => l.rate > ILLEGAL_RATE_THRESHOLD).length
  const activeCount = computed.filter((l) => !l.paidOff).length

  function openForm() {
    setFLender(''); setFPrincipal(''); setFRate(''); setFPayment(''); setFStart(today)
    setErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setErrors({})
  }

  async function handleAdd() {
    const errs = {}
    if (!fLender.trim()) errs.lender = t('loans.errorRequired')
    const principal = parseFloat(fPrincipal)
    if (!principal || principal <= 0) errs.principal = t('loans.errorAmount')
    const rate = parseFloat(fRate)
    if (isNaN(rate) || rate < 0) errs.rate = t('loans.errorRate')
    const payment = parseFloat(fPayment)
    if (!payment || payment <= 0) errs.payment = t('loans.errorPayment')
    if (!fStart) errs.start = t('loans.errorRequired')
    if (Object.keys(errs).length) return setErrors(errs)

    if (isGuest) {
      const newLoan = { id: Date.now(), lender: fLender.trim(), principal, rate, monthlyPayment: payment, startDate: fStart }
      const updated = [...loans, newLoan]
      setLoans(updated)
      localStorage.setItem('remlo_guest_loans', JSON.stringify(updated))
      closeForm()
      return
    }

    const { data, error: err } = await supabase
      .from('loans')
      .insert({
        user_id: user.id,
        lender: fLender.trim(),
        total_amount: principal,
        interest_rate: rate,
        monthly_payment: payment,
        start_date: fStart,
      })
      .select('id')
      .single()

    if (err) {
      setError(err.message)
      return
    }

    setLoans((prev) => [
      ...prev,
      { id: data.id, lender: fLender.trim(), principal, rate, monthlyPayment: payment, startDate: fStart },
    ])
    closeForm()
  }

  async function deleteLoan(id) {
    if (isGuest) {
      const updated = loans.filter((l) => l.id !== id)
      setLoans(updated)
      localStorage.setItem('remlo_guest_loans', JSON.stringify(updated))
      if (expandedId === id) setExpandedId(null)
      return
    }
    const { error: err } = await supabase.from('loans').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setLoans((prev) => prev.filter((l) => l.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF8F5' }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: '#F97316', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/more')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0" style={{ background: 'white', border: '1px solid #EDE8E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('loans.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('loans.pageSubtitle', { count: activeCount })}
            </p>
          </div>
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white transition-all active:scale-95 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 6px 18px rgba(249,115,22,0.3)' }}
          >
            {t('loans.addBtn')}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
          </div>
        )}

        {/* Illegal loan alert banner */}
        {illegalCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl leading-none mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-bold text-red-700">
                  {t('loans.illegalBanner', { count: illegalCount })}
                </p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  {t('loans.illegalBannerDesc', { threshold: ILLEGAL_RATE_THRESHOLD })}
                </p>
                <button
                  onClick={() => navigate('/loanshark')}
                  className="inline-block mt-2 text-xs font-semibold text-red-600 underline underline-offset-2"
                >
                  {t('loans.illegalBannerLink')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Total debt summary */}
        {computed.length > 0 && (
          <div className="rounded-3xl p-6 mb-6" style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{t('loans.totalDebtLabel')}</p>
            <p className="text-3xl font-bold text-gray-900">{formatSGD(totalDebt)}</p>
            <p className="text-sm text-gray-500 mt-1">{t('loans.totalDebtSub', { count: computed.length })}</p>
          </div>
        )}

        {/* Loan cards */}
        {computed.length === 0 ? (
          <div className="rounded-3xl px-8 py-12 text-center" style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}>
            <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Receipt className="w-10 h-10 text-violet-400" strokeWidth={1.5} />
            </div>
            <p className="text-base font-bold text-gray-900 mb-2">{t('loans.emptyTitle')}</p>
            <p className="text-sm text-gray-500 mb-6 max-w-[220px] mx-auto leading-relaxed">{t('loans.emptyDesc')}</p>
            <button
              onClick={openForm}
              className="rounded-2xl px-6 py-3 text-sm font-extrabold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 6px 18px rgba(249,115,22,0.3)' }}
            >
              {t('loans.emptyBtn')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {computed.map((loan) => {
              const isIllegal = loan.rate > ILLEGAL_RATE_THRESHOLD
              const isExpanded = expandedId === loan.id

              return (
                <div
                  key={loan.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-all ${
                    isIllegal ? 'border-red-200' : loan.paidOff ? 'border-emerald-100' : 'border-gray-100'
                  }`}
                >
                  {isIllegal && (
                    <div className="bg-red-600 rounded-t-2xl px-5 py-2 flex items-center gap-2">
                      <span className="text-white text-xs">⚠</span>
                      <p className="text-white text-xs font-semibold">
                        {t('loans.illegalCardTitle').replace('⚠ ', '')}
                      </p>
                    </div>
                  )}

                  <button
                    className="w-full text-left px-5 pt-4 pb-4"
                    onClick={() => setExpandedId(isExpanded ? null : loan.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{loan.lender}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t('loans.rateMonthly', { rate: loan.rate, payment: formatSGDExact(loan.monthlyPayment) })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {loan.paidOff ? (
                          <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {t('loans.paidOffBadge')}
                          </span>
                        ) : isIllegal ? (
                          <span className="bg-red-100 text-red-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {loan.rate}%/mo
                          </span>
                        ) : null}
                        <p className={`text-xs transition-colors ${isExpanded ? 'text-blue-500' : 'text-gray-300'}`}>
                          {isExpanded ? '▲' : '▼'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">{t('loans.remainingLabel')}</p>
                        <p className={`text-xl font-bold ${loan.paidOff ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {loan.paidOff ? formatSGD(0) : formatSGD(loan.remaining)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-0.5">
                        {Math.round(loan.progressPct)}%
                      </p>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          loan.paidOff ? 'bg-emerald-500' : isIllegal ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${loan.progressPct}%` }}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-50 px-5 py-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl" style={{ background: '#F5F2EC' }} className="p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{t('loans.originalAmount')}</p>
                          <p className="text-sm font-semibold text-gray-900">{formatSGD(loan.principal)}</p>
                        </div>
                        <div className="rounded-xl" style={{ background: '#F5F2EC' }} className="p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{t('loans.paymentsMade')}</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {t('loans.paymentsMade', { count: loan.made })}
                          </p>
                        </div>
                        <div className="rounded-xl" style={{ background: '#F5F2EC' }} className="p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{t('loans.projectedPayoff')}</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {loan.paidOff
                              ? t('loans.projectedComplete')
                              : loan.neverPaidOff
                              ? t('loans.projectedNever')
                              : formatMonthYear(loan.payoffDate)}
                          </p>
                        </div>
                        <div className="rounded-xl" style={{ background: '#F5F2EC' }} className="p-3">
                          <p className="text-xs text-gray-400 mb-0.5">{t('loans.totalInterest')}</p>
                          <p className={`text-sm font-semibold ${isIllegal ? 'text-red-600' : 'text-gray-900'}`}>
                            {loan.neverPaidOff || loan.totalInterestPaid == null
                              ? '—'
                              : formatSGD(loan.totalInterestPaid)}
                          </p>
                        </div>
                      </div>

                      {loan.neverPaidOff && !loan.paidOff && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-700 mb-0.5">{t('loans.neverTitle')}</p>
                          <p className="text-xs text-amber-600">
                            {t('loans.neverDesc', {
                              payment: formatSGDExact(loan.monthlyPayment),
                              interest: formatSGDExact(loan.principal * loan.rate / 100),
                            })}
                          </p>
                        </div>
                      )}

                      {isIllegal && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-red-700 mb-1">{t('loans.illegalCardTitle')}</p>
                          <p className="text-xs text-red-600 leading-relaxed">
                            {t('loans.illegalCardDesc', { rate: loan.rate })}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => deleteLoan(loan.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        {t('loans.deleteLoan')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t('loans.modalTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('loans.modalDesc')}</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('loans.lenderLabel')}</label>
                <input
                  autoFocus
                  type="text"
                  placeholder={t('loans.lenderPlaceholder')}
                  value={fLender}
                  onChange={(e) => setFLender(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.lender ? 'border-red-300' : 'border-gray-200'}`}
                />
                {errors.lender && <p className="text-xs text-red-500 mt-1">{errors.lender}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('loans.principalLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    value={fPrincipal}
                    onChange={(e) => setFPrincipal(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.principal ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                {errors.principal && <p className="text-xs text-red-500 mt-1">{errors.principal}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  {t('loans.rateLabel')}
                  <span className="ml-1.5 font-normal text-gray-400">{t('loans.rateNote')}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={t('loans.ratePlaceholder')}
                    min="0"
                    step="0.01"
                    value={fRate}
                    onChange={(e) => setFRate(e.target.value)}
                    className={`w-full border rounded-xl px-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.rate ? 'border-red-300' : parseFloat(fRate) > ILLEGAL_RATE_THRESHOLD ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                </div>
                {parseFloat(fRate) > ILLEGAL_RATE_THRESHOLD && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{t('loans.rateWarning')}</p>
                )}
                {errors.rate && <p className="text-xs text-red-500 mt-1">{errors.rate}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('loans.paymentLabel')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">S$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    value={fPayment}
                    onChange={(e) => setFPayment(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.payment ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                {errors.payment && <p className="text-xs text-red-500 mt-1">{errors.payment}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('loans.startDateLabel')}</label>
                <input
                  type="date"
                  value={fStart}
                  max={today}
                  onChange={(e) => setFStart(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.start ? 'border-red-300' : 'border-gray-200'}`}
                />
                {errors.start && <p className="text-xs text-red-500 mt-1">{errors.start}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm"
              >
                {t('loans.addLoanBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
