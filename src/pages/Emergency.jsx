import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDarkMode } from '../hooks/useDarkMode.js'

// Static contact data — org names, numbers, hours are factual/proper nouns
const CATEGORIES = [
  {
    key: 'government',
    color: { section: 'bg-blue-50 border-blue-100', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    contacts: [
      { roleKey: 'police',      org: 'Singapore Police Force',        number: '999',           alt: '1800-255-0000', always: true },
      { roleKey: 'mom',         org: 'Ministry of Manpower (MOM)',    number: '1800-333-1313', hours: 'Mon – Fri 8:00 am – 5:00 pm' },
      { roleKey: 'moneylenders',org: 'Registry of Moneylenders',     number: '1800-2255-529', hours: 'Mon – Fri 8:30 am – 5:30 pm' },
      { roleKey: 'comcare',     org: 'National Helpline (ComCare)',   number: '1800-222-0000', hours: '24 / 7' },
    ],
  },
  {
    key: 'workerSupport',
    color: { section: 'bg-emerald-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    contacts: [
      { roleKey: 'twc2', org: 'Transient Workers Count Too (TWC2)',                            number: '6790-4430', hours: 'Mon – Fri 9:00 am – 6:00 pm', web: 'twc2.org.sg' },
      { roleKey: 'irr',  org: "It's Raining Raincoats (IRR)",                                 number: '9151-4756', hoursKey: 'byAppt',                    web: 'itsrainingraincoats.com' },
      { roleKey: 'home', org: 'HOME (Humanitarian Organisation for Migration Economics)',      number: '6341-5535', hours: 'Mon – Fri 9:00 am – 6:00 pm', web: 'home.org.sg' },
      { roleKey: 'fast', org: 'FAST (Foreign Domestic Worker Association for Social Support)', number: '6258-5025', hours: 'Mon – Fri 9:00 am – 5:00 pm' },
    ],
  },
  {
    key: 'financialHelp',
    color: { section: 'bg-violet-50 border-violet-100', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
    contacts: [
      { roleKey: 'ccs',        org: 'Credit Counselling Singapore (CCS)', number: '6225-5227',     hours: 'Mon – Fri 9:00 am – 6:00 pm', web: 'ccs.org.sg' },
      { roleKey: 'xahlong',    org: 'X-Ah Long Hotline',                 number: '1800-924-5664', always: true },
      { roleKey: 'moneysense', org: 'MoneySense (MAS)',                  number: '1800-227-1177', hours: 'Mon – Fri 9:00 am – 5:30 pm', web: 'moneysense.gov.sg' },
    ],
  },
  {
    key: 'scamReporting',
    color: { section: 'bg-rose-50 border-rose-100', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
    contacts: [
      { roleKey: 'scamshield',    org: 'ScamShield Helpline (NCPC)',               number: '1800-722-6688', hours: 'Mon – Fri 9:00 am – 5:30 pm', web: 'scamalert.sg' },
      { roleKey: 'antiscam',      org: 'Singapore Police Force Anti-Scam Centre', number: '1800-722-6688', always: true },
      { roleKey: 'momtaskforce',  org: 'MOM Taskforce (Job Scams)',               number: '1800-333-1313', hours: 'Mon – Fri 8:00 am – 5:00 pm' },
    ],
  },
]

function CallButton({ number, label }) {
  return (
    <a
      href={`tel:${number.replace(/[^0-9]/g, '')}`}
      className="inline-flex items-center justify-center gap-1.5 bg-orange-500 text-white text-xs font-semibold rounded-xl px-3.5 py-2 hover:bg-orange-600 active:scale-95 transition-all"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.338c0-.966.784-1.75 1.75-1.75h1.386c.46 0 .878.25 1.087.65l1.292 2.582a1.75 1.75 0 01-.38 2.064l-.44.44a12.14 12.14 0 005.586 5.586l.44-.44a1.75 1.75 0 012.064-.38l2.582 1.292c.4.2.65.627.65 1.087v1.386A1.75 1.75 0 0119.662 21.75C9.9 21.75 2.25 14.1 2.25 4.338V2.952A1.75 1.75 0 014 1.202z" />
      </svg>
      {label ?? number}
    </a>
  )
}

export default function Emergency() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isDark = useDarkMode()
  const bg          = isDark ? '#121110' : '#FAFAF8'
  const card        = isDark ? '#1E1C1A' : 'white'
  const border2     = isDark ? '#2C2926' : '#EDE8E0'
  const textPrimary = isDark ? '#F5F2EC' : '#1A1A1A'
  const textMuted   = isDark ? '#9C9590' : '#6B7280'

  return (
    <div className="min-h-screen" style={{ background: bg }}>

      {/* Emergency call bar — always at top */}
      <div className="bg-red-600 px-4 py-4">
        <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-2 text-center">
          {t('emergency.dangerText')}
        </p>
        <a
          href="tel:999"
          className="flex items-center justify-center gap-2.5 rounded-2xl py-4 font-bold text-xl text-red-600 active:scale-[0.97] transition-transform shadow-md"
          style={{ background: isDark ? '#F5F2EC' : 'white' }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.338c0-.966.784-1.75 1.75-1.75h1.386c.46 0 .878.25 1.087.65l1.292 2.582a1.75 1.75 0 01-.38 2.064l-.44.44a12.14 12.14 0 005.586 5.586l.44-.44a1.75 1.75 0 012.064-.38l2.582 1.292c.4.2.65.627.65 1.087v1.386A1.75 1.75 0 0119.662 21.75C9.9 21.75 2.25 14.1 2.25 4.338V2.952A1.75 1.75 0 014 1.202z" />
          </svg>
          {t('emergency.callPolice')}
        </a>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/more')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0" style={{ background: card, border: `1px solid ${border2}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: textPrimary }} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: textPrimary }}>{t('emergency.pageTitle')}</h1>
            <p className="text-sm mt-0.5" style={{ color: textMuted }}>{t('emergency.pageSubtitle')}</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.key}>
              {/* Category label */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${cat.color.dot}`} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: textMuted }}>
                  {t(`emergency.categories.${cat.key}`)}
                </p>
              </div>

              {/* Contact cards */}
              <div className="space-y-2.5">
                {cat.contacts.map((c) => (
                  <div
                    key={c.org}
                    className={`rounded-2xl border p-4 ${!isDark && c.always ? cat.color.section : ''}`}
                    style={isDark
                      ? { background: card, borderColor: border2 }
                      : (!c.always ? { background: 'white', borderColor: '#F3F4F6' } : {})}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold" style={{ color: textPrimary }}>{c.org}</p>
                          {c.always && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cat.color.badge}`}>
                              {t('emergency.badge247')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: textMuted }}>
                          {t(`emergency.roles.${c.roleKey}`)}
                        </p>
                      </div>
                    </div>

                    {/* Phone + actions row */}
                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div>
                        <p className="text-base font-bold" style={{ color: textPrimary }}>{c.number}</p>
                        {c.alt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t('common.nonEmergency')}: {c.alt}
                          </p>
                        )}
                        {c.hoursKey && !c.always && (
                          <p className="text-xs text-gray-400 mt-0.5">{t(`emergency.${c.hoursKey}`)}</p>
                        )}
                        {c.hours && !c.always && (
                          <p className="text-xs text-gray-400 mt-0.5">{c.hours}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.alt && (
                          <CallButton number={c.alt} label={t('common.nonEmergency')} />
                        )}
                        <CallButton number={c.number} label={c.alt ? t('common.emergency') : t('common.call')} />
                      </div>
                    </div>

                    {/* Website */}
                    {c.web && (
                      <p className="text-xs text-blue-500 mt-2">{c.web}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-center text-gray-400 mt-8 leading-relaxed">
          {t('emergency.footer')}
        </p>
        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          {t('disclaimer.educational')}
        </p>
      </div>
    </div>
  )
}
