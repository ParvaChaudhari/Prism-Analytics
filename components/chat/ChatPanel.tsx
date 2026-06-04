'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={[
          'fixed z-50 flex flex-col bg-white shadow-xl',
          'inset-x-0 bottom-0 h-[75vh] rounded-t-xl border-t border-border-subtle',
          'lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[360px] lg:h-full lg:rounded-none lg:border-l lg:border-t-0',
        ].join(' ')}
      >
        <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-surface-container-low/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg ai-gradient flex items-center justify-center">
              <Icon name="auto_awesome" size={18} className="text-white" filled />
            </div>
            <div>
              <h3 className="font-bold text-primary text-[14px]">Prism Intelligence</h3>
              <p className="text-[10px] text-text-secondary">AI-Powered Insights</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-primary transition-colors p-1"
            aria-label="Close chat"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {messages.length === 0 && !streaming ? (
            <div className="text-sm text-text-secondary text-center py-8">
              Ask anything about your dataset. Prism answers from your uploaded data only.
            </div>
          ) : null}

          {messages.map((msg, idx) =>
            msg.role === 'assistant' && !msg.content && streaming && idx === messages.length - 1 ? (
              <div key={idx} className="flex items-center gap-2 text-sm text-ai-accent px-2">
                <Icon name="auto_awesome" size={16} filled />
                AI is thinking…
              </div>
            ) : msg.content ? (
              <ChatMessage key={`${msg.timestamp}-${idx}`} message={msg} />
            ) : null
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && !streaming ? (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container-low border border-border-subtle hover:border-secondary hover:text-secondary transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mx-5 mb-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            {error}
          </div>
        ) : null}

        <form
          className="p-4 border-t border-border-subtle bg-white"
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
        >
          <div className="relative">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask follow-up…"
              disabled={loading || streaming}
              className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-4 pr-10 text-[14px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={loading || streaming || !input.trim()} 
              className="absolute right-2 top-1.5 w-7 h-7 ai-gradient rounded-md flex items-center justify-center text-white disabled:opacity-50"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
