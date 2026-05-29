'use client'

import { Button } from '@/components/ui/Button'

type Props = {
  onAddChart: () => void
  onRegenerate: () => void
  onAskAi: () => void
  regenerating?: boolean
}

export function DashboardHeader({ onAddChart, onRegenerate, onAskAi, regenerating }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button onClick={onAskAi}>Ask AI</Button>
      <Button variant="secondary" onClick={onAddChart}>
        Add chart
      </Button>
      <Button variant="secondary" onClick={onRegenerate} disabled={regenerating}>
        {regenerating ? 'Regenerating…' : 'Regenerate dashboard'}
      </Button>
    </div>
  )
}
