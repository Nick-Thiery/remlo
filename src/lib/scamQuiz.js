// Answer metadata for the scam quiz, kept apart from the translated text so an
// answer's correctness never depends on where it is displayed.

// Position of the safe answer inside each locale's scamQuiz.questions[i].options.
// All 12 locales list it second; this describes the translation files, not the screen.
export const CORRECT_SOURCE_INDEX = [1, 1, 1, 1, 1, 1, 1, 1]

// Fixed on-screen order of each question's options, as indices into the locale's
// options. The same order is used for every language, render, session and retry.
// The safe answer shows as C, A, B, A, C, B, C, A (A×3, B×2, C×3); the two other
// options keep their translated order.
export const DISPLAY_ORDER = [
  [0, 2, 1],
  [1, 0, 2],
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
]

// Sent with every quiz event. Events without it (before 18 Sep 2026, or from a
// stale cached app) came from the old order where the safe answer was always B.
// Bump it whenever DISPLAY_ORDER, CORRECT_SOURCE_INDEX or the questions change.
export const QUIZ_VERSION = 2

// Merge one locale's question text with the answer metadata, in display order.
export function buildQuizQuestions(questionTexts) {
  const texts = Array.isArray(questionTexts) ? questionTexts : []
  return DISPLAY_ORDER.map((order, i) => ({
    id: i + 1,
    scenario: texts[i]?.scenario ?? '',
    options: order.map((sourceIdx) => ({
      text: texts[i]?.options?.[sourceIdx] ?? '',
      correct: sourceIdx === CORRECT_SOURCE_INDEX[i],
    })),
    explanation: texts[i]?.explanation ?? '',
  }))
}

export function scoreAnswers(answers) {
  return answers.filter(Boolean).length
}
