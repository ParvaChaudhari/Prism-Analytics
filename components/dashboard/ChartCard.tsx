'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ChartRenderer } from '@/components/dashboard/ChartRenderer'
import type { ChartConfig, ChartType } from '@/types/dashboard'

export function ChartCard({
  id,
  title,
  chartType,
  config,
  series,
  isManual,
  onDelete,
  onTitleChange,
}: {
  id: string
  title: string
  chartType: ChartType
  config: ChartConfig
  series?: Array<Record<string, string | number>>
  isManual?: boolean
  onDelete?: (id: string) => void
  onTitleChange?: (id: string, title: string) => void
}) {
  const description = config.description ?? ''
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)

  function commitTitle() {
    const next = draftTitle.trim()
    if (next && next !== title) onTitleChange?.(id, next)
    setEditing(false)
  }

  return (
    <Card className="p-8 flex flex-col gap-4 group relative min-h-[320px]">
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(id)}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-surface text-text-secondary hover:text-destructive"
          aria-label="Delete chart"
        >
          <Trash2 size={16} />
        </button>
      ) : null}

      <div className="flex flex-col gap-1 pr-8">
        <div className="flex items-center gap-2 flex-wrap">
          {editing ? (
            <input
              className="font-semibold text-lg border border-border-subtle rounded-[8px] px-2 py-1 flex-1 min-w-0"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle()
                if (e.key === 'Escape') {
                  setDraftTitle(title)
                  setEditing(false)
                }
              }}
              autoFocus
            />
          ) : (
            <h3
              className="font-semibold text-lg cursor-text"
              onDoubleClick={() => {
                setDraftTitle(title)
                setEditing(true)
              }}
              title="Double-click to edit title"
            >
              {title}
            </h3>
          )}
          <Badge variant={isManual ? 'default' : 'ai'}>
            {isManual ? 'Manual' : 'AI'}
          </Badge>
        </div>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      <ChartRenderer chartType={chartType} config={config} series={series} />
    </Card>
  )
}
