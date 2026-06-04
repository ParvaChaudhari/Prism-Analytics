import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', glass = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl ${glass ? 'glass-card' : 'bg-surface-elevated border border-border-subtle shadow-[0_4px_20px_rgba(0,0,0,0.04)]'} ${className}`}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'
