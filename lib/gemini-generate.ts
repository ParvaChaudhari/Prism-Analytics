import ai from '@/lib/gemini'

export async function generateText(prompt: string, model = 'gemini-2.5-flash') {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  })

  return (response.text ?? '').trim()
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
