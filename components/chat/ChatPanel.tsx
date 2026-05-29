'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { STARTER_QUESTIONS, type ChatMessage as ChatMessageType } from '@/types/chat'

type Props = {
  open: boolean
  onClose: () => void
  dashboardId: string
}

export function ChatPanel({ open, onClose, dashboardId }: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !dashboardId) return

    let cancelled = false
    async function loadHistory() {
      try {
        const res = await fetch(`/api/dashboard/chat?dashboardId=${dashboardId}`)
        const data = (await res.json()) as {
          conversationId?: string | null
          messages?: ChatMessageType[]
          error?: string
        }
        if (!res.ok) throw new Error(data.error || 'Failed to load chat')
        if (cancelled) return
        setConversationId(data.conversationId ?? null)
        setMessages(data.messages ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load chat')
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [open, dashboardId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading || streaming) return

    setError(null)
    setLoading(true)

    const userMessage: ChatMessageType = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    const assistantPlaceholder: ChatMessageType = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantPlaceholder])
    setStreaming(true)
    setLoading(false)

    try {
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId,
          message: trimmed,
          conversationId: conversationId ?? undefined,
        }),
      })

      const newConvId = res.headers.get('X-Conversation-Id')
      if (newConvId) setConversationId(newConvId)

      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error || 'Chat request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: full }
          }
          return next
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setMessages((prev) => prev.filter((m) => m.content !== '' || m.role !== 'assistant'))
    } finally {
      setStreaming(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={[
          'fixed z-50 flex flex-col bg-surface-elevated border-border-subtle shadow-xl',
          'inset-x-0 bottom-0 h-[70vh] rounded-t-[18px] border-t',
          'md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:h-full md:rounded-none md:border-l md:border-t-0',
          'animate-in slide-in-from-bottom md:slide-in-from-right duration-300',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <h2 className="font-semibold text-lg">Ask AI</h2>
            <p className="text-xs text-text-secondary">Questions about your data</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface text-text-secondary"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {messages.length === 0 && !streaming ? (
            <div className="text-sm text-text-secondary text-center py-8">
              Ask anything about your dataset. Prism answers from your uploaded data only.
            </div>
          ) : null}

          {messages.map((msg, idx) =>
            msg.role === 'assistant' && !msg.content && streaming && idx === messages.length - 1 ? (
              <div key={idx} className="text-sm text-text-tertiary px-2">
                ✦ AI is thinking…
              </div>
            ) : msg.content ? (
              <ChatMessage key={`${msg.timestamp}-${idx}`} message={msg} />
            ) : null
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && !streaming ? (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-surface border border-border-subtle hover:border-accent hover:text-accent transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mx-4 mb-2 text-sm text-destructive bg-destructive/10 rounded-[10px] px-3 py-2">
            {error}
          </div>
        ) : null}

        <form
          className="p-4 border-t border-border-subtle flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data…"
            disabled={loading || streaming}
            className="flex-1 h-10 rounded-[10px] border border-border-subtle bg-background px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={loading || streaming || !input.trim()}>
            <Send size={16} />
          </Button>
        </form>
      </aside>
    </>
  )
}
