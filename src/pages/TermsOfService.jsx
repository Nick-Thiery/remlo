import { useNavigate } from 'react-router-dom'
import { ChevronLeft, FileText } from 'lucide-react'

const SECTIONS = [
  {
    title: 'What Remlo Is',
    body: [
      'Remlo is a free app for budgeting, savings tracking, remittance comparison, scam awareness, and general financial information.',
      'Remlo is available to anyone. You do not need to be in Singapore to use it.',
      'Remlo is not a bank, financial institution, or licensed financial adviser.',
    ],
  },
  {
    title: 'Information Only — Not Financial Advice',
    body: [
      'All content in the app — including budgeting tools, savings tips, remittance comparisons, scam alerts, and AI chat responses — is for general information only.',
      'Nothing in this app is financial, legal, or investment advice. For important financial decisions, please speak to a qualified professional.',
      'FinanceForward is not responsible for any decisions you make based on information in this app.',
    ],
  },
  {
    title: 'Remittance Rates',
    body: [
      'Exchange rates and fees shown in the Remittance Comparator are estimates based on publicly available data. They may not be exactly what a provider offers you.',
      'Always confirm the final rate and fee directly with the provider before sending money.',
    ],
  },
  {
    title: 'AI Chatbot (Claude by Anthropic)',
    body: [
      'The AI assistant is powered by Claude, made by Anthropic. It provides general information — it is not a financial adviser.',
      'Responses may sometimes be incomplete or incorrect. Always verify important information from official sources.',
      'Do not enter sensitive information in the chat, such as passwords, bank account numbers, or ID numbers.',
      'Your messages are processed by Anthropic. See our Privacy Policy for details.',
    ],
  },
  {
    title: 'Scam Alerts',
    body: [
      'Scam alerts in the app are based on advisories from Singapore government agencies (SPF, MOM, MAS). They are for awareness only.',
      'Always verify scam information through official government sources such as scamalert.sg or police.gov.sg.',
      'If you are in danger, call 999. For financial scams, call the police at 1800-255-0000.',
    ],
  },
  {
    title: 'Your Responsibilities',
    body: [
      'You are responsible for keeping your login details secure. Do not share your password with anyone.',
      'You agree to use Remlo only for lawful purposes.',
      'Guest mode data is stored on your device only. We are not responsible for data loss if you clear your browser or app storage.',
    ],
  },
  {
    title: 'Changes to These Terms',
    body: [
      'We may update these terms from time to time. If you continue to use the app after an update, it means you accept the new terms.',
      'For questions, contact us at financeforwardinitiative@gmail.com.',
    ],
  },
]

export default function TermsOfService() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0" style={{ background: 'white', border: '1px solid #EDE8E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
            <p className="text-sm text-gray-500 mt-0.5">Last updated April 2026</p>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-6 flex gap-3">
          <FileText className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            By using Remlo you agree to these terms. Please read them carefully. Remlo is a free financial tool built by FinanceForward — it is not a bank or licensed financial institution.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.body.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                    <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
          FinanceForward · financeforwardinitiative@gmail.com
        </p>
      </div>
    </div>
  )
}
