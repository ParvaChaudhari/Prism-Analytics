'use client'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

type Props = {
  title?: string
  onAskAi: () => void
  onAddChart: () => void
  onRegenerate: () => void
  onStory: () => void
  onExport: () => void
  regenerating?: boolean
  exporting?: boolean
  summary?: string
}

export function DashboardHeader({
  title,
  onAskAi,
  onAddChart,
  onRegenerate,
  onStory,
  onExport,
  regenerating,
  exporting,
  summary,
}: Props) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div className="flex-1 max-w-4xl">
        {title ? (
          <h1 className="font-display-lg text-xl md:text-2xl font-bold text-primary mb-1 tracking-tight">{title}</h1>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-end shrink-0">
        <Button variant="ai" size="sm" onClick={onAskAi} title="Ask AI" className="px-3 shadow-sm">
          <Icon name="auto_awesome" size={18} filled className="text-white" />
        </Button>
        <Button variant="secondary" size="sm" onClick={onStory} title="Story Mode" className="px-3">
          <Icon name="auto_stories" size={18} />
        </Button>
        <Button variant="secondary" size="sm" onClick={onAddChart} title="Add Chart" className="px-3">
          <Icon name="add_chart" size={18} />
        </Button>
        <Button variant="secondary" size="sm" onClick={onRegenerate} disabled={regenerating} title="Regenerate Dashboard" className="px-3">
          <Icon name={regenerating ? "sync" : "refresh"} size={18} className={regenerating ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  )
}
