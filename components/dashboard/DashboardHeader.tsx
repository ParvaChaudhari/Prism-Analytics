'use client'

import { Button } from '@/components/ui/Button'

type Props = {
  onAskAi: () => void
  onAddChart: () => void
  onRegenerate: () => void
  onCompare: () => void
  onStory: () => void
  onExport: () => void
  regenerating?: boolean
  exporting?: boolean
}

export function DashboardHeader({
  onAskAi,
  onAddChart,
  onRegenerate,
  onCompare,
  onStory,
  onExport,
  regenerating,
  exporting,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button onClick={onAskAi}>Ask AI</Button>
      <Button variant="secondary" onClick={onStory}>
        Story
      </Button>
      <Button variant="secondary" onClick={onCompare}>
        Compare
      </Button>
      <Button variant="secondary" onClick={onExport} disabled={exporting}>
        {exporting ? 'Exporting…' : 'Export PDF'}
      </Button>
      <Button variant="secondary" onClick={onAddChart}>
        Add chart
      </Button>
      <Button variant="secondary" onClick={onRegenerate} disabled={regenerating}>
        {regenerating ? 'Regenerating…' : 'Regenerate'}
      </Button>
    </div>
  )
}
