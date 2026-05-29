import type { ChatMessage as ChatMessageType } from '@/types/chat'

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-[14px] px-4 py-2.5 text-[15px] leading-relaxed',
          isUser
            ? 'bg-accent text-white'
            : 'bg-surface border border-border-subtle text-text-primary',
        ].join(' ')}
      >
        {!isUser ? (
          <div className="text-xs font-semibold text-text-tertiary mb-1">✦ AI</div>
        ) : null}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
