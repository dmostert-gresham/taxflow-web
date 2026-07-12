import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Send, Loader2, User, Bot, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import clsx from 'clsx'
import { api, formatNAD } from '../../api/client'
import type { ApiResponse, Transaction } from '../../types'

interface ChatMessage {
  role: 'USER' | 'ASSISTANT'
  content: string
}

const SUGGESTIONS = [
  'Is this transaction tax deductible?',
  'What percentage of this can I claim?',
  'Which expense category does this fall under?',
  'How does this affect my tax return?',
]

export default function TransactionChatModal({
  transaction,
  taxYear,
  onClose,
}: {
  transaction: Transaction
  taxYear: string
  onClose: () => void
}) {
  const [sessionId] = useState(() => crypto.randomUUID())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post<ApiResponse<{ sessionId: string; message: string }>>(
        '/assistant/chat',
        { message, sessionId, taxYear, transactionId: String(transaction.id) },
      )
      return res.data.data
    },
    onMutate: (message) => {
      setMessages((prev) => [...prev, { role: 'USER', content: message }])
      setInput('')
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'ASSISTANT', content: data.message }])
    },
  })

  const handleSend = () => {
    const text = input.trim()
    if (!text || mutation.isPending) return
    mutation.mutate(text)
  }

  const isDebit = transaction.transactionType === 'DEBIT'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquare size={15} className="text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm truncate">{transaction.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">
                {new Date(transaction.transactionDate).toLocaleDateString('en-NA', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className={clsx(
                'text-xs font-medium font-mono',
                isDebit ? 'text-slate-600' : 'text-teal-dark',
              )}>
                {isDebit ? '-' : '+'}{formatNAD(Math.abs(transaction.amount))}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500
                       flex items-center justify-center transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 text-center">Ask a question about this transaction</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => mutation.mutate(s)}
                    disabled={mutation.isPending}
                    className="text-left text-xs text-slate-600 bg-slate-50 hover:bg-teal/5 hover:text-teal-dark
                               border border-slate-200 hover:border-teal/30 rounded-xl px-3 py-2.5
                               transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
          )}

          {mutation.isPending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shrink-0">
                <Bot size={14} className="text-teal" />
              </div>
              <div className="card px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
              placeholder="Ask about this transaction…"
              className="input flex-1 text-sm"
              disabled={mutation.isPending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || mutation.isPending}
              className="w-9 h-9 rounded-xl bg-navy hover:bg-navy/80 disabled:opacity-40
                         disabled:cursor-not-allowed text-white flex items-center justify-center
                         transition-colors shrink-0"
            >
              {mutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={14} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER'
  return (
    <div className={clsx('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div className={clsx(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        isUser ? 'bg-teal' : 'bg-navy',
      )}>
        {isUser
          ? <User size={14} className="text-white" />
          : <Bot size={14} className="text-teal" />}
      </div>
      <div className={clsx(
        'max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-navy text-white rounded-tr-sm'
          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-card',
      )}>
        {isUser ? message.content : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold text-navy">{children}</strong>,
              code: ({ children }) => <code className="bg-slate-100 px-1 rounded text-xs">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
