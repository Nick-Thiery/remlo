import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Weights stay in component — not translatable, just numeric
const FLAG_WEIGHTS = {
  unsolicited_contact: 2,
  no_license:          3,
  high_interest:       3,
  singpass_demand:     3,
  bank_login_demand:   3,
  no_contract:         2,
  upfront_fee:         2,
  no_office:           2,
  threats:             3,
  retain_id:           3,
}

// Style data stays in component; label/summary come from locale
const RISK_BAND_STYLES = [
  {
    min: 0, max: 0, level: 'green',
    bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅',
    bar: 'bg-emerald-500', text: 'text-emerald-800', sub: 'text-emerald-700',
  },
  {
    min: 1, max: 4, level: 'yellow',
    bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️',
    bar: 'bg-amber-500', text: 'text-amber-900', sub: 'text-amber-700',
  },
  {
    min: 5, max: Infinity, level: 'red',
    bg: 'bg-red-50', border: 'border-red-200', icon: '🚨',
    bar: 'bg-red-500', text: 'text-red-900', sub: 'text-red-700',
  },
]

// Icons for help contacts (by index, matching locale helpContacts array)
const HELP_CONTACT_META = [
  { color: 'bg-red-50 border-red-100',       icon: '🚨' },
  { color: 'bg-blue-50 border-blue-100',     icon: '🚔' },
  { color: 'bg-violet-50 border-violet-100', icon: '🏛️' },
  { color: 'bg-sky-50 border-sky-100',       icon: '🤝' },
  { color: 'bg-emerald-50 border-emerald-100', icon: '💬' },
]

// Icons for legal facts (by index, matching locale legalFacts array)
const LEGAL_ICONS = ['🏢', '📋', '🪪', '💰', '📣', '🔒', '🤝']

export default function LoanShark() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [checked, setChecked] = useState(new Set())
  const [showAll, setShowAll] = useState(false)

  // Read arrays from locale
  const flags = t('loanshark.flags', { returnObjects: true })
  const legalFacts = t('loanshark.legalFacts', { returnObjects: true })
  const helpContacts = t('loanshark.helpContacts', { returnObjects: true })
  const risks = t('loanshark.risks', { returnObjects: true })

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalWeight = flags
    .filter((f) => checked.has(f.id))
    .reduce((s, f) => s + (FLAG_WEIGHTS[f.id] ?? 2), 0)
  const checkedCount = checked.size
  const maxWeight = flags.reduce((s, f) => s + (FLAG_WEIGHTS[f.id] ?? 2), 0)
  const barPct = Math.min((totalWeight / maxWeight) * 100, 100)

  const riskStyle = RISK_BAND_STYLES.find((b) => totalWeight >= b.min && totalWeight <= b.max)
  const riskData = risks[riskStyle.level]

  const VISIBLE_LIMIT = 5
  const visibleFlags = showAll ? flags : flags.slice(0, VISIBLE_LIMIT)

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/more')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0" style={{ background: 'white', border: '1px solid #EDE8E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{t('loanshark.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('loanshark.pageSubtitle')}</p>
          </div>
        </div>

        {/* Legal limit note */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-6 flex items-start gap-2.5">
          <span className="text-base mt-0.5">ℹ️</span>
          <p className="text-xs text-blue-800 leading-relaxed">{t('loanshark.infoNote')}</p>
        </div>

        {/* Checklist */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          {t('loanshark.checklistTitle')}
        </p>
        <div className="space-y-2.5 mb-3">
          {visibleFlags.map((flag) => {
            const isChecked = checked.has(flag.id)
            return (
              <label
                key={flag.id}
                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Custom checkbox */}
                <div
                  className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'
                  }`}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggle(flag.id)} />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${isChecked ? 'text-red-900' : 'text-gray-800'}`}>
                    {flag.label}
                  </p>
                  {isChecked && (
                    <p className="text-xs text-red-700 mt-1.5 leading-relaxed">{flag.detail}</p>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        {/* Show more / less toggle */}
        {flags.length > VISIBLE_LIMIT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mb-6"
          >
            {showAll
              ? t('loanshark.showLess')
              : t('loanshark.showMore', { count: flags.length - VISIBLE_LIMIT })}
          </button>
        )}

        {/* Risk meter */}
        <div className={`rounded-2xl border p-5 mb-6 ${riskStyle.bg} ${riskStyle.border}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('loanshark.riskTitle')}</p>
            <span className="text-xs text-gray-400">
              {t('loanshark.riskCounter', { checked: checkedCount, total: flags.length })}
            </span>
          </div>

          {/* Bar */}
          <div className="w-full bg-white/60 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${riskStyle.bar}`}
              style={{ width: `${barPct}%` }}
            />
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">{riskStyle.icon}</span>
            <div>
              <p className={`text-base font-bold ${riskStyle.text}`}>{riskData.label}</p>
              <p className={`text-sm mt-1 leading-relaxed ${riskStyle.sub}`}>{riskData.summary}</p>
            </div>
          </div>

          {riskStyle.level === 'red' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <a
                href="tel:18009245664"
                className="flex-1 bg-red-600 text-white rounded-xl py-3 text-sm font-semibold text-center hover:bg-red-700 transition-colors"
              >
                {t('loanshark.callXAhLong')}
              </a>
              <a
                href="tel:999"
                className="flex-1 border-2 border-red-600 text-red-700 rounded-xl py-3 text-sm font-semibold text-center hover:bg-red-50 transition-colors"
              >
                {t('loanshark.callPolice')}
              </a>
            </div>
          )}
        </div>

        {/* What legal moneylending looks like */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          {t('loanshark.legalTitle')}
        </p>
        <div className="rounded-3xl p-5 mb-6" style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{t('loanshark.legalDesc')}</p>
          <div className="space-y-3">
            {legalFacts.map((fact, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base leading-none mt-0.5">{LEGAL_ICONS[i] ?? '✓'}</span>
                <p className="text-sm text-gray-700 leading-relaxed">{fact}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-500 leading-relaxed">{t('loanshark.verifyNote')}</p>
          </div>
        </div>

        {/* Get Help */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{t('loanshark.helpTitle')}</p>
        <div className="space-y-3">
          {helpContacts.map((c, i) => {
            const meta = HELP_CONTACT_META[i] ?? HELP_CONTACT_META[0]
            return (
              <a
                key={i}
                href={`tel:${c.number.replace(/[^0-9]/g, '')}`}
                className={`block rounded-2xl border p-4 transition-all hover:shadow-sm active:scale-95 ${meta.color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5">{meta.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.org}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.hours}</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.note}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900">{c.number}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{t('common.tapToCall')}</p>
                  </div>
                </div>
              </a>
            )
          })}
        </div>

        <p className="text-xs text-center text-gray-400 mt-8 leading-relaxed">
          {t('loanshark.disclaimer')}
        </p>
      </div>
    </div>
  )
}
