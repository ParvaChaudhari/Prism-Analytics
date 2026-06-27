'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { CHART_STARTER_QUESTIONS, type ChatMessage as ChatMessageType, type AttachedChart } from '@/types/chat'
import type { ChartDataPoint } from '@/types/dashboard'
import type { ChartItem } from '@/components/dashboard/ChartGrid'
import { BarChart2, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  dashboardId: string
  charts: ChartItem[]
  chartData: Record<string, ChartDataPoint[]>
  // Called by DashboardView when user clicks the Sparkles icon on a chart card
  pendingChartId?: string | null
  onPendingChartConsumed?: () => void
}

export function ChatPanel({
  open,
  onClose,
  dashboardId,
  charts,
  chartData,
  pendingChartId,
  onPendingChartConsumed,
}: Props) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachedChart, setAttachedChart] = useState<AttachedChart | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load conversation history once on mount (not on every panel open)
  useEffect(() => {
    if (!dashboardId) return

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
    return () => { cancelled = true }
  }, [dashboardId])

  // Consume a pending chart from the icon button on ChartCard
  useEffect(() => {
    if (!pendingChartId || !open) return
    attachChartById(pendingChartId)
    onPendingChartConsumed?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChartId, open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // When a chart chip is attached, focus the input
  useEffect(() => {
    if (attachedChart) {
      inputRef.current?.focus()
    }
  }, [attachedChart])

  const attachChartById = useCallback((chartId: string) => {
    const chart = charts.find(c => c.id === chartId)
    if (!chart) return
    const data = chartData[chartId] ?? []
    setAttachedChart({
      id: chart.id,
      title: chart.title,
      chartType: chart.chart_type,
      data,
    })
  }, [charts, chartData])

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/prism-chart')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData('application/prism-chart')
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as { chartId: string }
      attachChartById(payload.chartId)
    } catch {
      // invalid payload
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading || streaming) return

    setError(null)
    setLoading(true)

    const currentChart = attachedChart

    const userMessage: ChatMessageType = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      attachedChart: currentChart ?? undefined,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    // Clear attachment after sending so the user can attach a different chart
    setAttachedChart(null)

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
          chartContext: currentChart
            ? {
                chartId: currentChart.id,
                chartTitle: currentChart.title,
                chartType: currentChart.chartType,
                data: currentChart.data,
              }
            : undefined,
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

  const isEmpty = messages.length === 0 && !streaming

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={[
          'fixed z-50 flex flex-col shadow-xl transition-colors duration-200',
          'inset-x-0 bottom-0 h-[80vh] rounded-t-2xl border-t border-border-subtle',
          'lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[380px] lg:h-full lg:rounded-none lg:border-l lg:border-t-0',
          isDragOver ? 'bg-primary/5 border-primary/40' : 'bg-white',
        ].join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-container-low/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg ai-gradient flex items-center justify-center">
              <Icon name="auto_awesome" size={18} className="text-white" filled />
            </div>
            <div>
              <h3 className="font-bold text-primary text-[14px]">Chart Assistant</h3>
              <p className="text-[10px] text-text-secondary">Drop a chart — ask anything</p>
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

        {/* Drop overlay hint */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl ai-gradient flex items-center justify-center shadow-lg">
              <BarChart2 size={32} className="text-white" />
            </div>
            <p className="font-semibold text-primary text-sm">Drop chart here</p>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
          {isEmpty && !isDragOver ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-surface-container-low border-2 border-dashed border-border-subtle flex items-center justify-center">
                <BarChart2 size={36} className="text-text-secondary/50" />
              </div>
              <div>
                <p className="font-semibold text-primary text-sm mb-1">Drag a chart here</p>
                <p className="text-text-secondary text-xs leading-relaxed max-w-[220px]">
                  Drop any chart from the dashboard to ask questions about its data. Or use the{' '}
                  <span className="inline-flex items-center gap-0.5 text-ai-accent font-medium">✨ icon</span>{' '}
                  on a chart card.
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((msg, idx) =>
            msg.role === 'assistant' && !msg.content && streaming && idx === messages.length - 1 ? (
              <div key={idx} className="flex items-center gap-2 text-sm text-ai-accent px-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ai-accent animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ai-accent animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-ai-accent animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            ) : msg.content ? (
              <ChatMessage key={`${msg.timestamp}-${idx}`} message={msg} />
            ) : null
          )}
          <div ref={bottomRef} />
        </div>

        {/* Contextual starter questions (shown when chart attached but no messages yet) */}
        {attachedChart && isEmpty ? (
          <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
            {CHART_STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container-low border border-border-subtle hover:border-ai-accent hover:text-ai-accent transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mx-4 mb-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2 shrink-0">
            {error}
          </div>
        ) : null}

        {/* Input area */}
        <div className="p-4 border-t border-border-subtle bg-white shrink-0">
          {/* Chart chip */}
          {attachedChart && (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/20 w-fit max-w-full">
              <BarChart2 size={13} className="text-primary shrink-0" />
              <span className="text-xs font-medium text-primary truncate max-w-[220px]">
                {attachedChart.title}
              </span>
              <button
                type="button"
                onClick={() => setAttachedChart(null)}
                className="ml-1 text-text-secondary hover:text-primary transition-colors shrink-0"
                aria-label="Remove attached chart"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
          >
            <div className="relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachedChart ? `Ask about "${attachedChart.title}"…` : 'Drop a chart first…'}
                disabled={loading || streaming || !attachedChart}
                className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-4 pr-10 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-40 placeholder:text-text-secondary/60"
              />
              <button
                type="submit"
                disabled={loading || streaming || !input.trim() || !attachedChart}
                className="absolute right-2 top-1.5 w-7 h-7 ai-gradient rounded-md flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
              >
                <Icon name="send" size={16} />
              </button>
            </div>
          </form>
        </div>
      </aside>
    </>
  )
}
