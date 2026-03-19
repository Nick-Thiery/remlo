import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, ChevronRight, RotateCcw, Trophy } from 'lucide-react'

const QUESTIONS = [
  {
    id: 1,
    scenario:
      'A stranger messages you on WhatsApp: "Hi, I am from MOM. Your work pass has a problem. Send me your SingPass login and password now or your pass will be cancelled today."',
    options: [
      { text: 'Send my SingPass details quickly so I don\'t lose my job', correct: false },
      { text: 'This is a scam — MOM never asks for SingPass passwords', correct: true },
      { text: 'Ask the person for their staff ID first, then decide', correct: false },
    ],
    explanation:
      'MOM, police, banks, and government agencies will NEVER ask for your SingPass password or OTP. Hang up or ignore the message and call MOM directly at 6438-5122 to verify.',
  },
  {
    id: 2,
    scenario:
      'A Facebook ad offers a job in Singapore paying S$4,000/month for light work. No experience needed. You just need to pay a S$300 "registration fee" to secure your spot.',
    options: [
      { text: 'Pay the fee — good jobs go fast', correct: false },
      { text: 'This is a job scam — legitimate employers never charge workers upfront fees', correct: true },
      { text: 'Negotiate the fee down to S$100 before paying', correct: false },
    ],
    explanation:
      'Under the Employment of Foreign Manpower Act, employers cannot charge workers recruitment fees. Any job that requires you to pay money first is a scam. Report to MOM at 1800-333-1313.',
  },
  {
    id: 3,
    scenario:
      'Someone slips a card under your dormitory door: "Need cash fast? No credit check! Borrow up to S$5,000 today. WhatsApp us." The card has no company name or licence number.',
    options: [
      { text: 'WhatsApp them — it\'s convenient and I need money urgently', correct: false },
      { text: 'Ignore it — this is an unlicensed loan shark (Ah Long)', correct: true },
      { text: 'Borrow a small amount first to test if they\'re trustworthy', correct: false },
    ],
    explanation:
      'Licensed moneylenders in Singapore advertise only through their own websites, business directories, or physical premises — never by flyers or SMS. Borrowing from loan sharks leads to harassment and violence. Call the X-Ah Long hotline: 1800-924-5664.',
  },
  {
    id: 4,
    scenario:
      'Your employer has not paid your salary for 2 months. He says: "Don\'t report to MOM or I will cancel your work pass and send you home." What should you do?',
    options: [
      { text: 'Wait quietly — I can\'t risk losing my work pass', correct: false },
      { text: 'Report to MOM — they protect workers and cannot cancel your pass for reporting', correct: true },
      { text: 'Borrow money from friends and say nothing', correct: false },
    ],
    explanation:
      'MOM protects workers who make salary claims. Your employer CANNOT cancel your work pass just for reporting unpaid wages — that would be an additional offence. File a salary claim at mom.gov.sg or call 1800-333-1313.',
  },
  {
    id: 5,
    scenario:
      'A new friend asks if you can receive S$8,000 into your bank account and transfer it to another account for a "small commission." He says it\'s for his business.',
    options: [
      { text: 'Agree — it\'s easy money and I\'m just moving funds', correct: false },
      { text: 'Refuse — using your account this way is money mule fraud, which is a criminal offence', correct: true },
      { text: 'Ask for a bigger commission before agreeing', correct: false },
    ],
    explanation:
      'Allowing others to use your bank account to move money is a criminal offence in Singapore under the Corruption, Drug Trafficking and Other Serious Crimes Act. You can be jailed up to 3 years and fined up to S$50,000, even if you didn\'t know the money was from crime.',
  },
  {
    id: 6,
    scenario:
      'You receive an SMS: "DBS Bank: Unusual login detected on your account. Click this link to verify: dbs-secure-login.com." The link looks different from the official DBS website.',
    options: [
      { text: 'Click the link and log in quickly to protect my account', correct: false },
      { text: 'Delete the SMS — this is a phishing scam. Call DBS directly at 1800-111-1111', correct: true },
      { text: 'Forward the link to a friend to check if it\'s real', correct: false },
    ],
    explanation:
      'Banks never send links asking you to log in. The real DBS site is dbs.com.sg — anything else is fake. Always type the bank\'s URL yourself or call the number on the back of your card. You can also call ScamShield helpline: 1799.',
  },
  {
    id: 7,
    scenario:
      'An online "investment guru" in a Telegram group says you can double your money in 30 days by investing in a special cryptocurrency fund. Many people in the group post screenshots of their big profits.',
    options: [
      { text: 'Invest S$500 — the testimonials look convincing', correct: false },
      { text: 'Report the group — this is a classic investment scam with fake testimonials', correct: true },
      { text: 'Wait to see if others get paid before investing', correct: false },
    ],
    explanation:
      'Guaranteed high returns in a short time is the #1 sign of a scam. The profit screenshots are fake, and the "group members" praising the scheme are paid scammers. Report investment scams to the police at police.gov.sg/iwitness or call 999.',
  },
  {
    id: 8,
    scenario:
      'A landlord on Carousell asks for 3 months\' rent (S$2,400) as deposit via PayNow before you can view the room. He says many people want the room and it will be gone by tonight.',
    options: [
      { text: 'Transfer the money fast before someone else takes the room', correct: false },
      { text: 'Refuse — never pay before viewing. This is likely a rental scam', correct: true },
      { text: 'Pay half now and half after viewing', correct: false },
    ],
    explanation:
      'Urgency and pressure to pay before viewing are classic rental scam tactics. Always view the property in person, verify the landlord\'s identity and ownership, and never transfer money before signing a contract. Check scamalert.sg for reported scam listings.',
  },
]

const RATINGS = [
  { min: 0, max: 3, label: 'You need to be careful', color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    emoji: '⚠️' },
  { min: 4, max: 6, label: 'Good awareness',          color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200',  emoji: '👍' },
  { min: 7, max: 8, label: 'Scam expert!',            color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🏆' },
]

function getRating(score) {
  return RATINGS.find((r) => score >= r.min && score <= r.max)
}

export default function ScamQuiz() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)   // index of chosen option
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])        // array of booleans
  const [done, setDone] = useState(false)

  const q = QUESTIONS[current]
  const answered = selected !== null
  const isLast = current === QUESTIONS.length - 1

  function choose(idx) {
    if (answered) return
    const correct = q.options[idx].correct
    setSelected(idx)
    if (correct) setScore((s) => s + 1)
    setAnswers((prev) => [...prev, correct])
  }

  function next() {
    if (isLast) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
    }
  }

  function restart() {
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setDone(false)
  }

  // ── Results screen ───────────────────────────────────────────────────────
  if (done) {
    const rating = getRating(score)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-8">

          {/* Score card */}
          <div className={`rounded-2xl border ${rating.border} ${rating.bg} p-8 text-center mb-6`}>
            <p className="text-5xl mb-3">{rating.emoji}</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">{score}/{QUESTIONS.length}</p>
            <p className={`text-lg font-semibold ${rating.color} mb-2`}>{rating.label}</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              {score <= 3
                ? 'Scammers specifically target migrant workers. Learn the warning signs below and stay safe.'
                : score <= 6
                ? 'You know some scam tactics — but one mistake can cost you thousands. Review the tips below.'
                : 'Excellent! Share what you know with your friends and help keep your community safe.'}
            </p>
          </div>

          {/* Answer breakdown */}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Your answers</p>
          <div className="space-y-2 mb-6">
            {QUESTIONS.map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  answers[i]
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-red-50 border-red-100'
                }`}
              >
                {answers[i]
                  ? <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <p className="text-xs text-gray-700 leading-snug line-clamp-2">Q{i + 1}: {q.scenario.slice(0, 70)}…</p>
              </div>
            ))}
          </div>

          {/* Trophy badge for perfect */}
          {score === QUESTIONS.length && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 mb-6">
              <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800">Perfect score! You\'re scam-aware. Help a friend take the quiz.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
            <button
              onClick={() => navigate('/scams')}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              See scam alerts
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────
  const progress = ((current) / QUESTIONS.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-8">

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Scam Awareness Quiz</p>
            </div>
            <p className="text-sm font-medium text-gray-400">{current + 1} / {QUESTIONS.length}</p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Score badge */}
        <div className="flex justify-end mb-4">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm rounded-full px-3 py-1 text-xs font-semibold text-gray-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            {score} correct
          </span>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Scenario</p>
          <p className="text-sm text-gray-800 leading-relaxed">{q.scenario}</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5 mb-4">
          {q.options.map((opt, idx) => {
            let style = 'bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-blue-50'
            if (answered) {
              if (opt.correct) {
                style = 'bg-emerald-50 border-emerald-400 text-emerald-800'
              } else if (idx === selected && !opt.correct) {
                style = 'bg-red-50 border-red-400 text-red-800'
              } else {
                style = 'bg-white border-gray-100 text-gray-400'
              }
            }
            return (
              <button
                key={idx}
                onClick={() => choose(idx)}
                disabled={answered}
                className={`w-full text-left border rounded-xl px-4 py-3.5 text-sm leading-snug transition-all active:scale-[0.98] disabled:cursor-default ${style}`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                {opt.text}
                {answered && opt.correct && (
                  <span className="ml-2 text-emerald-600 font-semibold">✓</span>
                )}
                {answered && idx === selected && !opt.correct && (
                  <span className="ml-2 text-red-500 font-semibold">✗</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Explanation (shown after answering) */}
        {answered && (
          <div className={`rounded-xl border px-4 py-3.5 mb-5 ${
            q.options[selected].correct
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${
              q.options[selected].correct ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {q.options[selected].correct ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {answered && (
          <button
            onClick={next}
            className="w-full bg-blue-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isLast ? 'See my results' : 'Next question'}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
