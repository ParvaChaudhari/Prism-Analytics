import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-[18px] bg-surface-elevated border border-border-subtle shadow-[0_2px_20px_rgba(0,0,0,0.06)] ${className}`}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'
