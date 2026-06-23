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
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-3">
      <div className="flex-1 max-w-4xl">
        {title ? (
          <h1 className="font-display-lg text-xl md:text-2xl font-bold text-primary mb-1 tracking-tight">{title}</h1>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:justify-end shrink-0">
        <Button variant="ai" onClick={onAskAi} className="gap-2 shadow-sm">
          <Icon name="auto_awesome" size={20} filled className="text-white" />
          Ask AI
        </Button>
        <Button variant="secondary" onClick={onStory}>
          Story
        </Button>
        <Button variant="secondary" onClick={onExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export PDF'}
        </Button>
        <Button variant="secondary" onClick={onAddChart} className="gap-1.5">
          <Icon name="add_chart" size={18} />
          Add chart
        </Button>
        <Button variant="secondary" onClick={onRegenerate} disabled={regenerating}>
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </Button>
      </div>
    </div>
  )
}
