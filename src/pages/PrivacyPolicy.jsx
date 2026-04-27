import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: [
      'Email address — collected when you create an account.',
      'Country and language preference — stored to personalise your experience.',
      'Financial tracking data — savings goals, budget entries, and expenses you enter in the app. This data is stored securely and used only to power the features you use.',
      'Chat messages — if you use the AI assistant, your messages are sent to Anthropic (the company that makes Claude) to generate a response. We do not store your chat history on our servers.',
      'Usage data — we use PostHog, an analytics tool, to collect anonymous data about which features are used. This helps us improve the app. PostHog does not receive your name, email, or financial data.',
    ],
  },
  {
    title: 'How We Use Your Data',
    body: [
      'To provide and improve the Remlo app features.',
      'To sync your data across devices when you are signed in.',
      'To deliver scam alert information relevant to users in Singapore.',
      'We do not sell your data to any third party.',
      'We do not use your data for advertising.',
    ],
  },
  {
    title: 'Data Storage',
    body: [
      'Your account and financial data is stored using Supabase, a secure cloud database. All data is encrypted when sent over the internet and when stored.',
      'Scam alerts are fetched from our Supabase Edge Functions — these are small server programs that run in the cloud. No personal data is sent during this process.',
      'Guest mode data is stored only on your device and is never uploaded to our servers.',
    ],
  },
  {
    title: 'AI Chatbot (Claude by Anthropic)',
    body: [
      'The AI assistant is powered by Claude, made by Anthropic. When you send a message, it is processed by Anthropic\'s servers to generate a reply.',
      'Do not share sensitive information in the chat — such as your bank account number, passwords, or ID numbers.',
      'Anthropic has its own privacy policy that covers how they handle messages. We recommend reading it at anthropic.com.',
    ],
  },
  {
    title: 'Analytics (PostHog)',
    body: [
      'We use PostHog to understand how people use the app — for example, which pages are visited most often. This helps us fix problems and improve features.',
      'PostHog collects anonymous usage data only. It does not receive your name, email address, or any financial information.',
      'You can learn more about PostHog\'s data practices at posthog.com.',
    ],
  },
  {
    title: 'Your Rights',
    body: [
      'You can delete your account and all associated data at any time by contacting us at financeforwardinitiative@gmail.com.',
      'You can request a copy of your data by contacting us.',
      'Guest users can clear their local data by clearing app storage in their device browser settings.',
    ],
  },
  {
    title: 'Contact Us',
    body: [
      'If you have any questions about this Privacy Policy, please contact us at financeforwardinitiative@gmail.com.',
    ],
  },
]

export default function PrivacyPolicy() {
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
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-0.5">Last updated April 2026</p>
          </div>
        </div>

        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 mb-6 flex gap-3">
          <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Remlo is built by FinanceForward. We are committed to protecting your privacy and being transparent about how we handle your data. This policy explains what we collect, why we collect it, and who can see it.
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
