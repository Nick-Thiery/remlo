import { useNavigate } from 'react-router-dom'
import { ChevronLeft, FileText } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Informational Purposes Only',
    body: [
      'Remlo is a financial education and tracking tool. The content provided — including budgeting guidance, savings tips, remittance comparisons, and educational articles — is for informational purposes only.',
      'Nothing in this app constitutes financial, legal, or investment advice. You should consult a qualified financial adviser before making significant financial decisions.',
    ],
  },
  {
    title: 'No Liability for Financial Decisions',
    body: [
      'FinanceForward and the Remlo app are not responsible or liable for any financial decisions you make based on information or tools provided in this app.',
      'We make no guarantees about the accuracy, completeness, or suitability of any content for your specific situation.',
    ],
  },
  {
    title: 'Remittance Rates',
    body: [
      'Exchange rates and transfer fees shown in the Remittance Comparator are indicative only. They are based on publicly available data and estimated provider spreads.',
      'Actual rates offered to you may differ based on the amount sent, your account type, promotions, and other factors. Always verify the final rate directly with your chosen provider before sending money.',
    ],
  },
  {
    title: 'AI Chatbot',
    body: [
      'The AI assistant provides general information based on your questions. It is not a substitute for professional financial advice.',
      'Responses may occasionally be inaccurate or incomplete. Use your own judgement and verify important information from authoritative sources.',
    ],
  },
  {
    title: 'User Responsibilities',
    body: [
      'You are responsible for keeping your account credentials secure.',
      'You agree to use the app for lawful purposes only.',
      'Guest mode data is stored on your device only. We are not responsible for data loss if you clear your browser storage.',
    ],
  },
  {
    title: 'Changes to These Terms',
    body: [
      'We may update these Terms of Service from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.',
      'For questions about these terms, contact us at financeforwardinitiative@gmail.com.',
    ],
  },
]

export default function TermsOfService() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500 mt-0.5">Last updated March 2025</p>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4 mb-6 flex gap-3">
          <FileText className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            By using Remlo you agree to these terms. Please read them carefully. Remlo is built by FinanceForward to help migrant workers manage their finances — it is not a licensed financial institution.
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
