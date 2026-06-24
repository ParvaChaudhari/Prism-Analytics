'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-bg-secondary p-6 text-center shadow-sm border border-border">
          <div className="flex flex-col items-center gap-2 text-text-tertiary">
            <span className="material-symbols-outlined text-4xl text-text-muted">warning</span>
            <h3 className="text-sm font-medium text-text-primary">Failed to render chart</h3>
            <p className="text-xs">There was a problem rendering this visualization.</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
