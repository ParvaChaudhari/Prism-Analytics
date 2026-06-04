import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'ai'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl'

    const variants = {
      primary: 'bg-primary text-on-primary hover:opacity-90 active:scale-[0.98] shadow-sm',
      secondary:
        'bg-surface-container-low text-primary hover:bg-surface-container border border-border-subtle',
      ghost: 'bg-transparent text-text-primary hover:bg-surface-container-low',
      ai: 'ai-gradient text-white shadow-md hover:opacity-95 active:scale-[0.98]',
    }

    const sizes = {
      sm: 'h-9 px-4 text-[13px] gap-1.5',
      md: 'h-10 px-5 text-[14px] gap-2',
      lg: 'h-12 px-6 text-[15px] gap-2',
    }

    return (
      <button ref={ref} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
    )
  }
)
Button.displayName = 'Button'
