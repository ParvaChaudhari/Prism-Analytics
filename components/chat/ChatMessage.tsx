import type { ChatMessage as ChatMessageType } from '@/types/chat'

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 max-w-[95%] ${isUser ? 'ml-auto items-end' : ''}`}>
      <div
        className={[
          'p-3 rounded-xl text-[13px] leading-snug',
          isUser
            ? 'bg-primary text-white rounded-tr-none'
            : 'bg-surface-container-low border border-border-subtle rounded-tl-none text-text-primary',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      <span className={`text-[9px] text-text-secondary ${isUser ? 'mr-1' : 'ml-1'}`}>
        {isUser ? 'You' : 'AI Assistant'}
      </span>
    </div>
  )
}
