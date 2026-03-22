import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, MessageCircle, Mic, MicOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { track } from '../lib/analytics.js'

const SYSTEM_PROMPT =
  'You are a friendly financial assistant for migrant workers in Singapore. You were created by Remlo, an app helping workers manage their money better. You help users with: budgeting, saving money, sending money home, understanding their rights as workers in Singapore, identifying loan sharks and scams, and general financial questions. Always respond in the same language the user writes in. Keep answers simple and practical. If someone describes a loan shark or scam situation, provide the MOM helpline 1800-333-1313 and tell them to contact police if in danger.'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'த'  },
  { code: 'hi', label: 'हि' },
  { code: 'bn', label: 'ব'  },
]

// Map i18next language codes → BCP-47 tags for SpeechRecognition
const SPEECH_LANG = {
  en:  'en-SG',
  ta:  'ta-SG',
  hi:  'hi-IN',
  bn:  'bn-BD',
  my:  'my-MM',
  si:  'si-LK',
  fil: 'fil-PH',
  id:  'id-ID',
  zh:  'zh-CN',
  th:  'th-TH',
  ur:  'ur-PK',
  ne:  'ne-NP',
}

// Detect browser support once at module level
const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
    : null

// Typing indicator — three bouncing dots
function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

export default function Chat() {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  // ── Voice input ───────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef(null)

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(() => {
    if (!SpeechRecognition || isRecording) return

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = SPEECH_LANG[i18n.language] ?? 'en-SG'

    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      if (transcript) setInput((prev) => (prev ? prev + ' ' + transcript : transcript))
    }

    rec.onerror = () => stopRecording()
    rec.onend  = () => stopRecording()

    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }, [i18n.language, isRecording, stopRecording])

  // Stop recognition if the component unmounts while recording
  useEffect(() => () => recognitionRef.current?.stop(), [])

  // ── Scroll ────────────────────────────────────────────────────────────────
  // Scroll to the latest message whenever messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function switchLang(code) {
    i18n.changeLanguage(code)
    localStorage.setItem('remlo_lang', code)
  }

  async function send(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed || isLoading) return

    track('chat_message_sent')
    const userMsg = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content[0].text },
      ])
    } catch (err) {
      console.error('Chat API error:', err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chat.errorMsg'), isError: true },
      ])
    } finally {
      setIsLoading(false)
      // Re-focus input on desktop
      inputRef.current?.focus()
    }
  }

  const suggested = t('chat.suggested', { returnObjects: true })
  const hasMessages = messages.length > 0

  return (
    // Full-height flex column that sits inside the pb-24 app shell
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100dvh - 65px)' }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{t('chat.pageTitle')}</p>
            <p className="text-xs text-gray-400 leading-tight">{t('chat.pageSubtitle')}</p>
          </div>
        </div>

        {/* Language switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLang(l.code)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                i18n.language === l.code
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── No API key banner ──────────────────────────────────────── */}
      {!apiKey && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-3">
          <p className="text-xs text-amber-700 font-medium text-center">{t('chat.noApiKey')}</p>
        </div>
      )}

      {/* ── Messages area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!hasMessages ? (
          /* Empty state with suggested questions */
          <div className="flex flex-col items-center justify-center h-full text-center px-2 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mb-5 shadow-md">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('chat.emptyTitle')}</h2>
            <p className="text-sm text-gray-500 mb-7 leading-relaxed max-w-xs">
              {t('chat.emptySubtitle')}
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              {Array.isArray(suggested) && suggested.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  disabled={!apiKey || isLoading}
                  className="text-left text-sm bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-700 hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm"
                >
                  <span className="text-blue-500 mr-2">→</span>{q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Bot avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <span className="text-xs text-white font-bold">AI</span>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        code: ({ children }) => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <span className="text-xs text-white font-bold">AI</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Anchor for auto-scroll */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input area ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3 pb-4">
        {/* Suggestion chips — shown early in conversation */}
        {hasMessages && messages.length <= 2 && !isLoading && (
          <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-none">
            {Array.isArray(suggested) && suggested.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                disabled={!apiKey || isLoading}
                className="flex-shrink-0 text-xs bg-gray-100 text-gray-700 rounded-full px-3.5 py-1.5 hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={isRecording ? 'Listening…' : t('chat.inputPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            disabled={isLoading || !apiKey}
            className={`flex-1 bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 transition-all ${
              isRecording
                ? 'border-red-300 ring-2 ring-red-200 bg-red-50 placeholder:text-red-400'
                : 'border-gray-200 focus:ring-orange-400'
            }`}
          />

          {/* Mic button — only shown when SpeechRecognition is supported */}
          {SpeechRecognition && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || !apiKey}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              className={`rounded-xl px-3 py-3 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white shadow-md shadow-red-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {isRecording ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <MicOff className="w-4 h-4" />
                </span>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isLoading || !apiKey}
            className="bg-orange-500 text-white rounded-xl px-4 py-3 flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">{t('chat.disclaimer')}</p>
      </div>
    </div>
  )
}
