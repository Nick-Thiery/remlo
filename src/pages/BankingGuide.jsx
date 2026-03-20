import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Landmark, Smartphone, ShieldAlert, ChevronDown, ChevronUp, ChevronLeft, Phone } from 'lucide-react'

// Non-translatable style metadata — merged with locale text at render time
const BANKS_STYLE = [
  { logo: 'PO', color: 'bg-red-500',  feeGood: true  },
  { logo: 'DB', color: 'bg-red-600',  feeGood: false },
  { logo: 'OC', color: 'bg-red-700',  feeGood: false },
  { logo: 'UO', color: 'bg-blue-700', feeGood: false },
]

const DIGITAL_STYLE = [
  { logo: 'GX', color: 'bg-green-500',  badgeColor: 'bg-emerald-100 text-emerald-700' },
  { logo: 'MB', color: 'bg-indigo-500', badgeColor: 'bg-indigo-100 text-indigo-700'  },
  { logo: 'YT', color: 'bg-purple-500', badgeColor: 'bg-purple-100 text-purple-700'  },
  { logo: 'GP', color: 'bg-green-600',  badgeColor: 'bg-green-100 text-green-700'    },
  { logo: 'SD', color: 'bg-red-400',    badgeColor: 'bg-red-100 text-red-700'        },
]

const DOC_ICONS = ['🪪', '📘', '📄', '🏠']

const HELPLINE_NUMBERS = ['1800-333-1313', '999', '6509-0026']

// ─── Expandable bank card ─────────────────────────────────────────────────────

function BankCard({ style, text, feeLabel, minBalanceLabel, docsNeededLabel }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center gap-4 px-4 py-4 text-left" onClick={() => setOpen((o) => !o)}>
        <div className={`w-10 h-10 rounded-xl ${style.color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-xs font-bold">{style.logo}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{text.name}</p>
          <p className={`text-xs mt-0.5 font-medium ${style.feeGood ? 'text-emerald-600' : 'text-gray-500'}`}>
            {text.fee}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 pb-4">
          <p className="text-xs text-gray-600 leading-relaxed mt-3 mb-3">{text.notes}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{minBalanceLabel}</p>
              <p className="text-sm font-semibold text-gray-800">{text.minBalance}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{feeLabel}</p>
              <p className={`text-sm font-semibold ${style.feeGood ? 'text-emerald-600' : 'text-gray-800'}`}>
                {style.feeGood ? text.fee : text.fee.split(' ')[0]}
              </p>
            </div>
          </div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{docsNeededLabel}</p>
          <ul className="space-y-1">
            {text.docs.map((d) => (
              <li key={d} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>{d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankingGuide() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const docs     = t('bankingGuide.docs',     { returnObjects: true })
  const banks    = t('bankingGuide.banks',    { returnObjects: true })
  const digital  = t('bankingGuide.digital',  { returnObjects: true })
  const steps    = t('bankingGuide.steps',    { returnObjects: true })
  const helplines = t('bankingGuide.helplines', { returnObjects: true })

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
            <h1 className="text-2xl font-bold text-gray-900">{t('bankingGuide.pageTitle')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('bankingGuide.pageSubtitle')}</p>
          </div>
        </div>

        {/* Documents */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          {t('bankingGuide.docsHeading')}
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="space-y-3">
            {Array.isArray(docs) && docs.map((d, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{DOC_ICONS[i]}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{d.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-500 leading-relaxed">{t('bankingGuide.docsTip')}</p>
          </div>
        </div>

        {/* Traditional banks */}
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t('bankingGuide.banksHeading')}
          </p>
        </div>
        <div className="space-y-3 mb-6">
          {Array.isArray(banks) && banks.map((bank, i) => (
            <BankCard
              key={i}
              style={BANKS_STYLE[i]}
              text={bank}
              feeLabel={t('bankingGuide.feeLabel')}
              minBalanceLabel={t('bankingGuide.minBalanceLabel')}
              docsNeededLabel={t('bankingGuide.docsNeededLabel')}
            />
          ))}
        </div>

        {/* Recommendation */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 mb-6">
          <p className="text-xs font-bold text-blue-800 mb-1">{t('bankingGuide.recHeading')}</p>
          <p className="text-xs text-blue-700 leading-relaxed">{t('bankingGuide.recDesc')}</p>
        </div>

        {/* Digital alternatives */}
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t('bankingGuide.digitalHeading')}
          </p>
        </div>
        <div className="space-y-3 mb-6">
          {Array.isArray(digital) && digital.map((d, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl ${DIGITAL_STYLE[i].color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{DIGITAL_STYLE[i].logo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIGITAL_STYLE[i].badgeColor}`}>
                      {d.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{d.requirement}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>

        {/* Employer holds card */}
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t('bankingGuide.cardHolderHeading')}
          </p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4 mb-4">
          <p className="text-xs font-semibold text-red-800 mb-1">{t('bankingGuide.cardHolderAlertTitle')}</p>
          <p className="text-xs text-red-700 leading-relaxed">{t('bankingGuide.cardHolderAlertDesc')}</p>
        </div>
        <div className="space-y-3 mb-6">
          {Array.isArray(steps) && steps.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex gap-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Helplines */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-900">{t('bankingGuide.helplineHeading')}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {Array.isArray(helplines) && helplines.map((h, i) => (
              <a
                key={i}
                href={`tel:${HELPLINE_NUMBERS[i].replace(/[^0-9]/g, '')}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <span className="text-xs text-gray-600 leading-snug max-w-[65%]">{h.label}</span>
                <span className="text-sm font-bold text-blue-600">{HELPLINE_NUMBERS[i]}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          {t('bankingGuide.disclaimer')}
        </p>
      </div>
    </div>
  )
}
