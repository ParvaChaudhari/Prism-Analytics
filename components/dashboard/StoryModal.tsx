'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { MarkdownView } from '@/components/dashboard/MarkdownView'

type Props = {
  isOpen: boolean
  onClose: () => void
  dashboardId: string
}

export function StoryModal({ isOpen, onClose, dashboardId }: Props) {
  const [story, setStory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !dashboardId) return

    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setStory(null)
      try {
        const res = await fetch('/api/dashboard/story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboardId }),
        })
        const data = (await res.json()) as { story?: string; error?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to generate story')
        if (!cancelled) setStory(data.story ?? '')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, dashboardId])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data story">
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <p className="text-sm text-text-secondary pt-2">Writing your data story…</p>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : story ? (
          <MarkdownView content={story} />
        ) : null}
      </div>
    </Modal>
  )
}
