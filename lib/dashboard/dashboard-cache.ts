import type { ChartItem } from '@/components/dashboard/ChartGrid'
import type { Insight } from '@/types/dashboard'

export type CachedDashboard = {
  dashboard: {
    id: string
    title: string
    ai_summary: string
    ai_insights: Insight[]
  }
  charts: ChartItem[]
  columns: string[]
  chartData: Record<string, Array<Record<string, string | number>>>
  savedAt: number
}

const TTL_MS = 5 * 60 * 1000

function cacheKey(datasetId: string) {
  return `prism-dashboard:${datasetId}`
}

export function readDashboardCache(datasetId: string): CachedDashboard | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(datasetId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedDashboard
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(cacheKey(datasetId))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeDashboardCache(datasetId: string, data: Omit<CachedDashboard, 'savedAt'>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      cacheKey(datasetId),
      JSON.stringify({ ...data, savedAt: Date.now() } satisfies CachedDashboard)
    )
  } catch {
    // quota exceeded — ignore
  }
}

export function clearDashboardCache(datasetId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(cacheKey(datasetId))
}
