import type { ChatMessage as ChatMessageType } from '@/types/chat'

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-[14px] px-4 py-2.5 text-[15px] leading-relaxed',
          isUser
            ? 'bg-primary text-on-primary'
            : 'glass-card border border-border-subtle text-text-primary',
        ].join(' ')}
      >
        {!isUser ? (
          <div className="text-xs font-semibold ai-gradient-text mb-1">Prism AI</div>
        ) : null}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
