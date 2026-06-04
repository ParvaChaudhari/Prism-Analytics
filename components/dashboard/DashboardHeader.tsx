'use client'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

type Props = {
  title?: string
  onAskAi: () => void
  onAddChart: () => void
  onRegenerate: () => void
  onCompare: () => void
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
  onCompare,
  onStory,
  onExport,
  regenerating,
  exporting,
  summary,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        {title ? (
          <h1 className="font-display-lg text-[28px] md:text-[32px] font-bold text-primary mb-2 tracking-tight">{title}</h1>
        ) : null}
        {summary ? (
          <p className="text-text-secondary text-[14px] md:text-[16px] max-w-2xl">{summary}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ai" onClick={onAskAi} className="gap-2 shadow-sm">
          <Icon name="auto_awesome" size={20} filled className="text-white" />
          Ask AI
        </Button>
        <Button variant="secondary" onClick={onStory}>
          Story
        </Button>
        <Button variant="secondary" onClick={onCompare}>
          Compare
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
