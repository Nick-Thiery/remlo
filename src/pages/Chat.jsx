import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Sparkles, Mic, MicOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { track } from '../lib/analytics.js'
import { supabase } from '../lib/supabase.js'

const SYSTEM_PROMPT =
  'You are a friendly financial assistant built by Remlo, an app helping workers in Singapore manage their money better. You help users with: budgeting, saving money, sending money home, understanding their rights as workers in Singapore, identifying loan sharks and scams, and general financial questions. Always respond in the same language the user writes in. Keep answers simple and practical. If someone describes a loan shark or scam situation, provide the MOM helpline 1800-333-1313 and tell them to contact police if in danger.'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'த'  },
  { code: 'hi', label: 'हि' },
  { code: 'bn', label: 'ব'  },
]

const SPEECH_LANG = {
  en:  'en-SG', ta:  'ta-SG', hi:  'hi-IN', bn:  'bn-BD',
  my:  'my-MM', si:  'si-LK', fil: 'fil-PH', id:  'id-ID',
  zh:  'zh-CN', th:  'th-TH', ur:  'ur-PK',  ne:  'ne-NP',
}

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
    : null

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

  useEffect(() => () => recognitionRef.current?.stop(), [])

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
      const res = await fetch('https://clxkokkavwclduvxqubl.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, system: SYSTEM_PROMPT }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
      inputRef.current?.focus()
    }
  }

  const suggested = t('chat.suggested', { returnObjects: true })
  const hasMessages = messages.length > 0

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100dvh - 65px)', background: '#FAFAF8' }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ background: 'white', borderBottom: '1px solid #F0EDE8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8640C, #CC5708)', boxShadow: '0 4px 12px rgba(232,100,12,0.3)' }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-tight">{t('chat.pageTitle')}</p>
            <p className="text-xs text-gray-400 leading-tight font-medium">{t('chat.pageSubtitle')}</p>
          </div>
        </div>

        {/* Language switcher */}
        <div
          className="flex gap-0.5 p-0.5 rounded-xl"
          style={{ background: '#F5F2EC' }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLang(l.code)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: i18n.language === l.code ? 'white' : 'transparent',
                color: i18n.language === l.code ? '#E8640C' : '#9CA3AF',
                boxShadow: i18n.language === l.code ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            {/* Illustration */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 float-anim"
              style={{
                background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                boxShadow: '0 8px 24px rgba(232,100,12,0.3)',
              }}
            >
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">{t('chat.emptyTitle')}</h2>
            <p className="text-sm text-gray-500 mb-7 leading-relaxed max-w-xs font-medium">
              {t('chat.emptySubtitle')}
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              {Array.isArray(suggested) && suggested.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  disabled={isLoading}
                  className="text-left text-sm rounded-2xl px-4 py-3.5 font-medium transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: 'white',
                    border: '1px solid #EDE8E0',
                    color: '#374151',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <span style={{ color: '#E8640C' }} className="mr-2 font-bold">→</span>{q}
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
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                    style={{ background: 'linear-gradient(135deg, #E8640C, #CC5708)' }}
                  >
                    <span className="text-[10px] text-white font-extrabold">AI</span>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className="max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, #E8640C, #CC5708)',
                          color: 'white',
                          borderBottomRightRadius: 4,
                          boxShadow: '0 4px 12px rgba(232,100,12,0.25)',
                        }
                      : msg.isError
                      ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderBottomLeftRadius: 4 }
                      : { background: 'white', color: '#1A1A1A', border: '1px solid #F0EDE8', borderBottomLeftRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                  }
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
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
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                  style={{ background: 'linear-gradient(135deg, #E8640C, #CC5708)' }}
                >
                  <span className="text-[10px] text-white font-extrabold">AI</span>
                </div>
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: 'white',
                    border: '1px solid #F0EDE8',
                    borderBottomLeftRadius: 4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ── Input area ────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-4"
        style={{ background: 'white', borderTop: '1px solid #F0EDE8' }}
      >
        {/* Suggestion chips */}
        {hasMessages && messages.length <= 2 && !isLoading && (
          <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-none">
            {Array.isArray(suggested) && suggested.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                disabled={isLoading}
                className="flex-shrink-0 text-xs rounded-full px-3.5 py-1.5 font-semibold transition-colors disabled:opacity-40"
                style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
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
            placeholder={isRecording ? t('chat.listeningPlaceholder') : t('chat.inputPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            disabled={isLoading}
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all disabled:opacity-50"
            style={{
              border: isRecording ? '2px solid #FCA5A5' : '2px solid #EDE8E0',
              background: isRecording ? '#FFF5F5' : '#FAFAF8',
              outline: 'none',
              color: '#1A1A1A',
            }}
          />

          {SpeechRecognition && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              className="rounded-2xl px-3 py-3 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
              style={{
                background: isRecording ? '#EF4444' : '#F5F2EC',
                color: isRecording ? 'white' : '#6B7280',
                boxShadow: isRecording ? '0 4px 12px rgba(239,68,68,0.3)' : 'none',
              }}
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
            disabled={!input.trim() || isLoading}
            className="rounded-2xl px-4 py-3 flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #E8640C, #CC5708)',
              color: 'white',
              boxShadow: input.trim() ? '0 4px 14px rgba(232,100,12,0.3)' : 'none',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2 font-medium">{t('chat.disclaimer')}</p>
      </div>
    </div>
  )
}
