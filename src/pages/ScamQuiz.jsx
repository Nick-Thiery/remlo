import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, ShieldAlert, ChevronRight, ChevronLeft, RotateCcw, Trophy } from 'lucide-react'
import { track } from '../lib/analytics.js'

// Correct answer index for each question (option B = index 1 for all 8)
const CORRECT_IDX = [1, 1, 1, 1, 1, 1, 1, 1]

// Non-translatable style metadata for the three rating bands
const RATING_STYLE = [
  { min: 0, max: 3, color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     emoji: '⚠️' },
  { min: 4, max: 6, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '👍' },
  { min: 7, max: 8, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🏆' },
]

export default function ScamQuiz() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]       = useState(0)
  const [answers, setAnswers]   = useState([])
  const [done, setDone]         = useState(false)

  // Pull all question text from the active locale
  const questionTexts = t('scamQuiz.questions', { returnObjects: true })
  const ratingTexts   = t('scamQuiz.ratings',   { returnObjects: true })

  // Build full question objects by merging locale text with correct-answer metadata
  const questions = CORRECT_IDX.map((correctIdx, i) => ({
    id: i + 1,
    scenario: questionTexts[i]?.scenario ?? '',
    options:  (questionTexts[i]?.options ?? []).map((text, j) => ({ text, correct: j === correctIdx })),
    explanation: questionTexts[i]?.explanation ?? '',
  }))

  const q        = questions[current]
  const answered = selected !== null
  const isLast   = current === questions.length - 1

  function getRating(score) {
    const styleIdx = score <= 3 ? 0 : score <= 6 ? 1 : 2
    return { ...RATING_STYLE[styleIdx], ...ratingTexts[styleIdx] }
  }

  function choose(idx) {
    if (answered) return
    const correct = q.options[idx].correct
    setSelected(idx)
    if (correct) setScore((s) => s + 1)
    setAnswers((prev) => [...prev, correct])
  }

  function next() {
    if (isLast) {
      track('scam_quiz_completed', { score, total: questions.length })
      setDone(true)
    } else { setCurrent((c) => c + 1); setSelected(null) }
  }

  function restart() {
    setCurrent(0); setSelected(null); setScore(0); setAnswers([]); setDone(false)
  }

  // ── Results screen ───────────────────────────────────────────────────────
  if (done) {
    const rating = getRating(score)
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
        <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition-all shadow-sm mb-5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className={`rounded-2xl border ${rating.border} ${rating.bg} p-8 text-center mb-6`}>
            <p className="text-5xl mb-3">{rating.emoji}</p>
            <p className="text-4xl font-bold text-gray-900 mb-1">{score}/{questions.length}</p>
            <p className={`text-lg font-semibold ${rating.color} mb-2`}>{rating.label}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{rating.desc}</p>
          </div>

          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            {t('scamQuiz.yourAnswers')}
          </p>
          <div className="space-y-2 mb-6">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  answers[i] ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                }`}
              >
                {answers[i]
                  ? <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <ShieldAlert  className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <p className="text-xs text-gray-700 leading-snug line-clamp-2">
                  Q{i + 1}: {q.scenario.slice(0, 70)}…
                </p>
              </div>
            ))}
          </div>

          {score === questions.length && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 mb-6">
              <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800">{t('scamQuiz.perfectBadge')}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> {t('scamQuiz.retryBtn')}
            </button>
            <button
              onClick={() => navigate('/scams')}
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm"
            >
              {t('scamQuiz.scamAlertsBtn')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz screen ──────────────────────────────────────────────────────────
  const progress = (current / questions.length) * 100

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF8' }}>
      <div className="max-w-lg mx-auto px-4 pt-5 pb-4">

        <div className="mb-5">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-95 transition-all shadow-sm mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">{t('scamQuiz.pageTitle')}</p>
            </div>
            <p className="text-sm font-medium text-gray-400">{current + 1} / {questions.length}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm rounded-full px-3 py-1 text-xs font-semibold text-gray-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            {t('scamQuiz.scoreLabel', { score })}
          </span>
        </div>

        <div className="rounded-3xl p-5 mb-4" style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EDE8' }}>
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-2">
            {t('scamQuiz.scenarioLabel')}
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{q.scenario}</p>
        </div>

        <div className="space-y-2.5 mb-4">
          {q.options.map((opt, idx) => {
            let style = 'bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-blue-50'
            if (answered) {
              if (opt.correct)                        style = 'bg-emerald-50 border-emerald-400 text-emerald-800'
              else if (idx === selected && !opt.correct) style = 'bg-red-50 border-red-400 text-red-800'
              else                                    style = 'bg-white border-gray-100 text-gray-400'
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
                {answered && opt.correct             && <span className="ml-2 text-emerald-600 font-semibold">✓</span>}
                {answered && idx === selected && !opt.correct && <span className="ml-2 text-red-500 font-semibold">✗</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className={`rounded-xl border px-4 py-3.5 mb-5 ${
            q.options[selected].correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${
              q.options[selected].correct ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {q.options[selected].correct ? t('scamQuiz.correct') : t('scamQuiz.incorrect')}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {answered && (
          <button
            onClick={next}
            className="w-full bg-orange-500 text-white rounded-xl py-3.5 text-sm font-bold hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isLast ? t('scamQuiz.resultsBtn') : t('scamQuiz.nextBtn')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
