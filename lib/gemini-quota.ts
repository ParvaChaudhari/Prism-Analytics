import { createAdminClient } from '@/lib/supabase/admin'
import { GEMINI_MODELS, PREMIUM_DAILY_LIMIT } from '@/lib/gemini-models'

/** In-memory fallback when Supabase table is unavailable (serverless cold starts). */
const memoryCounts = new Map<string, number>()

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function countKey(userId: string, model: string) {
  return `${todayKey()}:${userId}:${model}`
}

export async function getPremiumUsageToday(userId: string): Promise<number> {
  const key = countKey(userId, GEMINI_MODELS.premium)

  try {
    const admin = createAdminClient()
    const start = `${todayKey()}T00:00:00.000Z`
    const { count, error } = await admin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('model', GEMINI_MODELS.premium)
      .gte('created_at', start)

    if (!error && count != null) return count
  } catch {
    // Table may not exist yet
  }

  return memoryCounts.get(key) ?? 0
}

export async function isPremiumQuotaExceeded(userId?: string): Promise<boolean> {
  if (!userId) return false
  const used = await getPremiumUsageToday(userId)
  return used >= PREMIUM_DAILY_LIMIT
}

export async function logAiUsage(params: {
  userId?: string
  model: string
  feature: string
}): Promise<void> {
  const key = countKey(params.userId ?? 'anonymous', params.model)
  memoryCounts.set(key, (memoryCounts.get(key) ?? 0) + 1)

  if (!params.userId) return

  try {
    const admin = createAdminClient()
    await admin.from('ai_usage_logs').insert({
      user_id: params.userId,
      model: params.model,
      feature: params.feature,
    })
  } catch {
    // Optional table — see supabase/ai_usage_logs.sql
  }
}
