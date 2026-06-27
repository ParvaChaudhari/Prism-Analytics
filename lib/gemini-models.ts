/** Gemini model assignments — see prism-ai-improvement-plan.md */

export const GEMINI_MODELS = {
  lite: process.env.GEMINI_LITE_MODEL ?? 'gemini-3.1-flash-lite',
  premium: process.env.GEMINI_PREMIUM_MODEL ?? 'gemini-3.5-flash',
} as const

export type GeminiFeature =
  | 'health_scan'
  | 'dashboard_generation'
  | 'dashboard_analysis'
  | 'chat'
  | 'nl_to_chart'
  | 'story'
  | 'compare'
  | 'schema_aggregation'

/** Primary model per feature (from updated plan) */
export function modelForFeature(feature: GeminiFeature): string {
  switch (feature) {
    case 'dashboard_generation':
    case 'nl_to_chart':
      return GEMINI_MODELS.premium
    case 'health_scan':
    case 'dashboard_analysis':
    case 'chat':
    case 'story':
    case 'compare':
    case 'schema_aggregation':
      return GEMINI_MODELS.lite
    default:
      return GEMINI_MODELS.lite
  }
}

/** When premium quota is exhausted, fall back to lite */
export function fallbackModel(primary: string): string {
  if (primary === GEMINI_MODELS.premium) return GEMINI_MODELS.lite
  return primary
}

export function isPremiumModel(model: string): boolean {
  return model === GEMINI_MODELS.premium
}

export const PREMIUM_DAILY_LIMIT = Number(process.env.GEMINI_PREMIUM_DAILY_LIMIT ?? '50')
