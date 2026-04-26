import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { api, extractErrorMessage } from '../../api/client'
import type { ApiResponse, ChatMessage } from '../../types'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'

const SUGGESTED = [
  'Can I deduct my home office expenses?',
  'What pension deductions am I allowed?',
  'When is the ITX filing deadline?',
  'How is the 32% CIT rate calculated?',
  'What is the difference between PAYE and provisional tax?',
  'Can I claim medical expenses as a deduction?',
]

const TAX_YEARS = ['2024/25', '2023/24']

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput]       = useState('')
  const [sessionId, setSessionId] = useState('')
  const [taxYear, setTaxYear]   = useState(TAX_YEARS[0])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<ApiResponse<{ sessionId: string; message: string }>>(
          '/assistant/chat',
          { message, sessionId: sessionId || undefined, taxYear }
      )
      return res.data.data
    },
    onSuccess: (data) => {
      if (!sessionId) setSessionId(data.sessionId)
      setMessages((prev) => [
        ...prev,
        { role: 'ASSISTANT', content: data.message },
      ])
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: `Sorry, I encountered an error: ${extractErrorMessage(err)}`,
        },
      ])
    },
  })

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || mutation.isPending) return

    setMessages((prev) => [...prev, { role: 'USER', content: msg }])
    setInput('')
    mutation.mutate(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -mt-8 -mx-8">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-teal" />
              </div>
              <div>
                <h1 className="font-display font-bold text-navy text-lg leading-tight">
                  Namibian Tax Assistant
                </h1>
                <p className="text-xs text-slate-400">
                  Powered by Claude · Grounded in Namibian ITA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Tax year:</span>
              <select
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  className="input w-auto text-sm py-1.5"
              >
                {TAX_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
                /* Empty state */
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center
                              justify-center mx-auto mb-4">
                    <Bot size={28} className="text-navy/40" />
                  </div>
                  <h2 className="font-display font-semibold text-navy mb-2">
                    Ask anything about Namibian tax
                  </h2>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">
                    I'm grounded in the Namibian Income Tax Act and NamRA procedures.
                    My answers are informational — always verify with a registered tax practitioner.
                  </p>

                  {/* Suggested questions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {SUGGESTED.map((q) => (
                        <button
                            key={q}
                            onClick={() => handleSend(q)}
                            className="card p-3.5 text-sm text-slate-600 text-left
                               hover:bg-slate-50 transition-colors hover:border-navy/20"
                        >
                          {q}
                        </button>
                    ))}
                  </div>
                </div>
            ) : (
                messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))
            )}

            {/* Typing indicator */}
            {mutation.isPending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-navy rounded-lg flex items-center
                              justify-center shrink-0">
                    <Bot size={14} className="text-teal" />
                  </div>
                  <div className="card px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-8 py-4 border-t border-slate-100 bg-white shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
              <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Namibian tax law…"
                  rows={1}
                  className="input resize-none pr-12 py-3 leading-relaxed"
                  style={{ minHeight: '46px', maxHeight: '120px' }}
              />
              </div>
              <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || mutation.isPending}
                  className="btn-primary px-4 py-3 flex items-center justify-center shrink-0"
              >
                {mutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Informational only — not legal or tax advice. Press Enter to send.
            </p>
          </div>
        </div>
      </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER'

  return (
      <div className={clsx('flex items-start gap-3', isUser && 'flex-row-reverse')}>
        {/* Avatar */}
        <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            isUser ? 'bg-teal' : 'bg-navy'
        )}>
          {isUser ? (
              <User size={14} className="text-white" />
          ) : (
              <Bot size={14} className="text-teal" />
          )}
        </div>

        {/* Bubble */}
        <div className={clsx(
            'max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed',
            isUser
                ? 'bg-navy text-white rounded-tr-sm'
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-card'
        )}>
          {isUser ? (
              message.content
          ) : (
              <ReactMarkdown
                  components={{
                    h1: ({children}) => <h1 className="text-base font-display font-bold text-navy mt-3 mb-1">{children}</h1>,
                    h2: ({children}) => <h2 className="text-sm font-display font-bold text-navy mt-3 mb-1">{children}</h2>,
                    h3: ({children}) => <h3 className="text-sm font-semibold text-navy mt-2 mb-1">{children}</h3>,
                    p:  ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-2 ml-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-2 ml-1">{children}</ol>,
                    li: ({children}) => <li className="text-sm leading-relaxed">{children}</li>,
                    strong: ({children}) => <strong className="font-semibold text-navy">{children}</strong>,
                    em: ({children}) => <em className="italic text-slate-600">{children}</em>,
                    hr: () => <hr className="border-slate-200 my-3" />,
                    blockquote: ({children}) => (
                        <blockquote className="border-l-2 border-teal/40 pl-3 italic text-slate-500 my-2">
                          {children}
                        </blockquote>
                    ),
                    code: ({children}) => (
                        <code className="bg-slate-100 text-navy text-xs px-1.5 py-0.5 rounded font-mono">
                          {children}
                        </code>
                    ),
                  }}
              >
                {message.content}
              </ReactMarkdown>
          )}
        </div>
      </div>
  )
}