import ai from '@/lib/gemini'
import {
  fallbackModel,
  isPremiumModel,
  modelForFeature,
  type GeminiFeature,
} from '@/lib/gemini-models'
import { isPremiumQuotaExceeded, logAiUsage } from '@/lib/gemini-quota'

export type GenerateResult = {
  text: string
  modelUsed: string
  usedFallback: boolean
  notice?: string
}

type GenerateOptions = {
  feature: GeminiFeature
  json?: boolean
  userId?: string
  maxRetries?: number
}

const JSON_RETRY_SUFFIX =
  '\n\nYour last response was not valid JSON. Return ONLY valid JSON. No markdown fences. No preamble.'

async function callGemini(prompt: string, model: string, json: boolean) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  return ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0,
      ...(json ? { responseMimeType: 'application/json' as const } : {}),
    },
  })
}

export async function generateText(
  prompt: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const primary = modelForFeature(options.feature)
  let model = primary
  let usedFallback = false
  let notice: string | undefined

  if (isPremiumModel(primary) && options.userId && (await isPremiumQuotaExceeded(options.userId))) {
    model = fallbackModel(primary)
    usedFallback = true
    notice = 'Premium model quota reached — using faster model for this request.'
  }

  const maxRetries = options.maxRetries ?? 2
  let lastError: Error | null = null
  let attemptPrompt = prompt

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await callGemini(attemptPrompt, model, options.json ?? false)
      const text = (response.text ?? '').trim()

      await logAiUsage({ userId: options.userId, model, feature: options.feature })

      return { text, modelUsed: model, usedFallback, notice }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Retry premium failures on lite model once
      if (!usedFallback && isPremiumModel(model) && i === 0) {
        model = fallbackModel(model)
        usedFallback = true
        notice = 'Premium model unavailable — using faster model.'
        continue
      }

      if (options.json && i < maxRetries) {
        attemptPrompt = prompt + JSON_RETRY_SUFFIX
        continue
      }
    }
  }

  throw lastError ?? new Error('AI request failed')
}

export function parseJsonArray(text: string): unknown[] | null {
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s)
      return Array.isArray(v) ? v : null
    } catch {
      return null
    }
  }

  const direct = tryParse(text.trim())
  if (direct) return direct

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    const fromFence = tryParse(fenced[1].trim())
    if (fromFence) return fromFence
  }

  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end > start) {
    const slice = tryParse(text.slice(start, end + 1))
    if (slice) return slice
  }

  return null
}

export function parseJsonObject(text: string): Record<string, unknown> | null {
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s)
      return v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }

  const direct = tryParse(text.trim())
  if (direct) return direct

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    const fromFence = tryParse(fenced[1].trim())
    if (fromFence) return fromFence
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    const slice = tryParse(text.slice(start, end + 1))
    if (slice) return slice
  }

  return null
}

export async function generateJsonObject(
  prompt: string,
  options: GenerateOptions
): Promise<{ data: Record<string, unknown>; meta: GenerateResult }> {
  const result = await generateText(prompt, { ...options, json: true })
  const data = parseJsonObject(result.text)
  if (!data) throw new Error('AI returned invalid JSON')
  return { data, meta: result }
}

export async function generateJsonArray(
  prompt: string,
  options: GenerateOptions
): Promise<{ data: unknown[]; meta: GenerateResult }> {
  const result = await generateText(prompt, { ...options, json: true })
  const data = parseJsonArray(result.text)
  if (!data) throw new Error('AI returned invalid JSON')
  return { data, meta: result }
}
