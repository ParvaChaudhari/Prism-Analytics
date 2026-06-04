import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'ai' | 'secondary'
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-surface-container text-text-secondary',
    success: 'bg-secondary/10 text-secondary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    ai: 'bg-ai-gradient-start/10 text-ai-accent uppercase tracking-wider text-[10px]',
    secondary: 'bg-secondary-container/10 text-secondary',
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
