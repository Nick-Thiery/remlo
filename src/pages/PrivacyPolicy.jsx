import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      'Email address — collected when you create an account.',
      'Country and language preference — stored to personalise your experience.',
      'Financial tracking data — savings goals, budget income and expenses you enter in the app. This data is stored securely and used only to power the app features you use.',
      'Usage data — anonymous analytics about which features you use, to help us improve the app. No personally identifiable information is included.',
    ],
  },
  {
    title: 'How We Use Your Data',
    body: [
      'To provide and improve the Remlo app features.',
      'To sync your data across devices when you are signed in.',
      'We do not sell your data to third parties.',
      'We do not use your data for advertising.',
    ],
  },
  {
    title: 'Data Storage',
    body: [
      'Your account and financial data is stored securely using Supabase, a cloud database provider. Data is encrypted in transit and at rest.',
      'Guest mode data is stored only on your device and is never uploaded.',
    ],
  },
  {
    title: 'AI Chatbot',
    body: [
      'The AI assistant feature is powered by the Anthropic API (Claude). Messages you send to the chatbot are processed by Anthropic to generate responses.',
      'Do not share sensitive personal or financial information (such as bank account numbers or passwords) in the chat.',
      'Please refer to Anthropic\'s Privacy Policy for details on how they handle data.',
    ],
  },
  {
    title: 'Your Rights',
    body: [
      'You can delete your account and all associated data at any time by contacting us at financeforwardinitiative@gmail.com.',
      'You can export or request a copy of your data by contacting us.',
      'Guest users can clear their local data by clearing app storage in their browser settings.',
    ],
  },
  {
    title: 'Contact Us',
    body: [
      'If you have questions about this Privacy Policy or how we handle your data, please contact us at financeforwardinitiative@gmail.com.',
    ],
  },
]

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 flex-shrink-0" style={{ background: 'white', border: '1px solid #EDE8E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-0.5">Last updated March 2025</p>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 mb-6 flex gap-3">
          <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Remlo is built by FinanceForward, a non-profit supporting migrant workers in Singapore. We are committed to protecting your privacy and being transparent about how we handle your data.
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
