import { useState } from 'react'
import { Landmark, Smartphone, FileText, ShieldAlert, ChevronDown, ChevronUp, Phone, ExternalLink } from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const BANKS = [
  {
    name: 'POSB Everyday Savings',
    logo: 'PO',
    color: 'bg-red-500',
    fee: 'No fall-below fee',
    feeGood: true,
    minBalance: 'None',
    notes: 'Best for most workers. Widest ATM network in Singapore (over 1,400 machines). Accepts work permit holders.',
    docs: ['Work Permit (blue card)', 'Passport', 'Singapore address proof (employer letter or tenancy agreement)'],
    link: 'posb.com.sg',
  },
  {
    name: 'DBS Multiplier Account',
    logo: 'DB',
    color: 'bg-red-600',
    fee: 'S$2/month if balance < S$3,000',
    feeGood: false,
    minBalance: 'S$3,000 to avoid fee',
    notes: 'Higher interest rates if you receive salary and transact regularly. Good once you have some savings built up.',
    docs: ['Work Permit or S Pass or Employment Pass', 'Passport', 'SingPass (if available)'],
    link: 'dbs.com.sg',
  },
  {
    name: 'OCBC 360 Account',
    logo: 'OC',
    color: 'bg-red-700',
    fee: 'S$2/month if balance < S$1,000',
    feeGood: false,
    minBalance: 'S$1,000 to avoid fee',
    notes: 'Bonus interest when you credit salary. Work permit holders accepted. Branch visit required to open.',
    docs: ['Work Permit', 'Passport', 'Employer letter'],
    link: 'ocbc.com',
  },
  {
    name: 'UOB One Account',
    logo: 'UO',
    color: 'bg-blue-700',
    fee: 'S$2/month if balance < S$1,000',
    feeGood: false,
    minBalance: 'S$1,000 to avoid fee',
    notes: 'Good interest on salary crediting. Some branches serve foreign workers — call ahead to confirm.',
    docs: ['Work Permit or S Pass', 'Passport', 'Employer letter with company stamp'],
    link: 'uob.com.sg',
  },
]

const DIGITAL = [
  {
    name: 'GXS Bank',
    logo: 'GX',
    color: 'bg-green-500',
    badge: 'Best interest rate',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    desc: 'A fully digital bank open to work permit holders. No minimum balance, no fees. Offers up to 3.48% interest on savings. Open entirely through the app — no branch visit needed.',
    requirement: 'Work permit + Singapore mobile number',
  },
  {
    name: 'MariBank',
    logo: 'MB',
    color: 'bg-indigo-500',
    badge: 'No fees',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    desc: 'Sea Group\'s digital bank. No minimum balance, no fall-below fee, competitive savings rate. Open via app with your work permit details.',
    requirement: 'Work permit + Singapore mobile number',
  },
  {
    name: 'YouTrip',
    logo: 'YT',
    color: 'bg-purple-500',
    badge: 'Best for remittance',
    badgeColor: 'bg-purple-100 text-purple-700',
    desc: 'Multi-currency e-wallet. Great for sending money home at low rates and paying in your home currency when shopping online. Not a full bank — no interest on balance.',
    requirement: 'Work permit or FIN number',
  },
  {
    name: 'GrabPay',
    logo: 'GP',
    color: 'bg-green-600',
    badge: 'Widely accepted',
    badgeColor: 'bg-green-100 text-green-700',
    desc: 'E-wallet linked to your Grab app. Accepted at thousands of merchants, hawker centres, and for GrabFood. Top up via PayNow or ATM. No bank account required to start.',
    requirement: 'Singapore mobile number',
  },
  {
    name: 'Singtel Dash',
    logo: 'SD',
    color: 'bg-red-400',
    badge: 'Easy top-up',
    badgeColor: 'bg-red-100 text-red-700',
    desc: 'E-wallet by Singtel. Top up with cash at 7-Eleven or Cheers stores — useful if you don\'t have a local bank account yet. Can send money to over 30 countries.',
    requirement: 'Any mobile number (no bank account needed)',
  },
]

const DOCS = [
  { icon: '🪪', label: 'Work Permit card', sub: 'The blue card from MOM — always carry it' },
  { icon: '📘', label: 'Passport', sub: 'Original + photocopy of photo page' },
  { icon: '📄', label: 'Employer letter', sub: 'On company letterhead, with company stamp, confirming your employment and salary' },
  { icon: '🏠', label: 'Address proof', sub: 'Tenancy agreement or employer letter showing your Singapore address' },
]

const EMPLOYER_STEPS = [
  {
    step: '1',
    title: 'Know your rights',
    body: 'It is illegal in Singapore for your employer to hold your bank card, ATM card, or passbook. This is covered under the Employment Act and MOM regulations.',
  },
  {
    step: '2',
    title: 'Ask politely first',
    body: 'Tell your employer: "I need my bank card to withdraw my own salary." Most employers will return it when asked directly.',
  },
  {
    step: '3',
    title: 'Contact MOM',
    body: 'If your employer refuses, call MOM at 1800-333-1313 (free call, Monday–Friday 8:30am–5:30pm). They can intervene on your behalf.',
  },
  {
    step: '4',
    title: 'Call the police if threatened',
    body: 'If your employer threatens you for asking for your card back, call 999. Withholding your card by force is a criminal matter.',
  },
  {
    step: '5',
    title: 'Replace the card if needed',
    body: 'Go to your bank branch with your work permit and passport. Tell them your card was taken. The bank will cancel the old card and issue a new one — usually free of charge.',
  },
]

function BankCard({ bank }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-4 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={`w-10 h-10 rounded-xl ${bank.color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-xs font-bold">{bank.logo}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{bank.name}</p>
          <p className={`text-xs mt-0.5 font-medium ${bank.feeGood ? 'text-emerald-600' : 'text-gray-500'}`}>
            {bank.fee}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 pb-4">
          <p className="text-xs text-gray-600 leading-relaxed mt-3 mb-3">{bank.notes}</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Min. balance</p>
              <p className="text-sm font-semibold text-gray-800">{bank.minBalance}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Monthly fee</p>
              <p className={`text-sm font-semibold ${bank.feeGood ? 'text-emerald-600' : 'text-gray-800'}`}>
                {bank.feeGood ? 'None' : bank.fee.split(' ')[0]}
              </p>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Documents needed</p>
          <ul className="space-y-1">
            {bank.docs.map((d) => (
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
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Banking in Singapore</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            How to open an account, what you need, and what to do if something goes wrong.
          </p>
        </div>

        {/* Documents you need */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documents you'll need</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="space-y-3">
            {DOCS.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{d.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{d.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">Tip:</span> Get your employer to print their letter on company letterhead with a company stamp — banks often reject letters without one.
            </p>
          </div>
        </div>

        {/* Traditional banks */}
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Traditional banks</p>
        </div>
        <div className="space-y-3 mb-6">
          {BANKS.map((bank) => (
            <BankCard key={bank.name} bank={bank} />
          ))}
        </div>

        {/* Recommendation callout */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 mb-6">
          <p className="text-xs font-bold text-blue-800 mb-1">Our recommendation for most workers</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Start with a <span className="font-semibold">POSB Everyday Savings</span> account — no fees, no minimum balance, and the largest ATM network. Once you have S$1,000+ saved, consider a digital bank like <span className="font-semibold">GXS</span> for higher interest on your emergency fund.
          </p>
        </div>

        {/* Digital alternatives */}
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-gray-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Digital alternatives</p>
        </div>
        <div className="space-y-3 mb-6">
          {DIGITAL.map((d) => (
            <div key={d.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl ${d.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{d.logo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.badgeColor}`}>
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

        {/* Employer holding card */}
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">If your employer holds your bank card</p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4 mb-4">
          <p className="text-xs font-semibold text-red-800 mb-1">This is illegal in Singapore</p>
          <p className="text-xs text-red-700 leading-relaxed">
            No employer has the right to hold your bank card, ATM card, or bank passbook. Your salary belongs to you. If this is happening to you, follow the steps below.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {EMPLOYER_STEPS.map((s) => (
            <div key={s.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex gap-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Helpline card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-900">Helplines</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: 'MOM Helpline (salary & card disputes)', number: '1800-333-1313' },
              { label: 'Police (emergency / threats)', number: '999' },
              { label: 'TWC2 (Transient Workers Count Too)', number: '6509-0026' },
            ].map(({ label, number }) => (
              <a
                key={number}
                href={`tel:${number.replace(/[^0-9]/g, '')}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <span className="text-xs text-gray-600 leading-snug max-w-[65%]">{label}</span>
                <span className="text-sm font-bold text-blue-600">{number}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          Information correct as of early 2025. Always verify directly with the bank before visiting.
        </p>
      </div>
    </div>
  )
}
