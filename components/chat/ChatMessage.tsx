'use client'

import { BarChart2 } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Bullet point
    if (/^[-*]\s/.test(line)) {
      nodes.push(
        <li key={i} className="ml-4 list-disc">
          {renderInline(line.replace(/^[-*]\s/, ''))}
        </li>
      )
    // Bold heading-style line (all bold)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      nodes.push(
        <p key={i} className="font-semibold">
          {line.slice(2, -2)}
        </p>
      )
    } else if (line === '') {
      nodes.push(<br key={i} />)
    } else {
      nodes.push(<p key={i}>{renderInline(line)}</p>)
    }
  }
  return nodes
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 max-w-[95%] ${isUser ? 'ml-auto items-end' : ''}`}>
      {/* Chart chip (shown on user messages that had a chart attached) */}
      {isUser && message.attachedChart && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 w-fit max-w-full mb-0.5">
          <BarChart2 size={11} className="text-primary shrink-0" />
          <span className="text-[10px] font-medium text-primary truncate max-w-[200px]">
            {message.attachedChart.title}
          </span>
        </div>
      )}

      <div
        className={[
          'p-3 rounded-xl text-[13px] leading-relaxed',
          isUser
            ? 'bg-primary text-white rounded-tr-none'
            : 'bg-surface-container-low border border-border-subtle rounded-tl-none text-text-primary',
        ].join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {renderMarkdown(message.content)}
          </div>
        )}
      </div>

      <span className={`text-[9px] text-text-secondary ${isUser ? 'mr-1' : 'ml-1'}`}>
        {isUser ? 'You' : 'Chart Assistant'}
      </span>
    </div>
  )
}
