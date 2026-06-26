import { NextResponse } from 'next/server'
import ai from '@/lib/gemini'
import { modelForFeature } from '@/lib/gemini-models'
import { logAiUsage } from '@/lib/gemini-quota'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ChatMessage } from '@/types/chat'

export const runtime = 'nodejs'
export const maxDuration = 60

type ChartContext = {
  chartId: string
  chartTitle: string
  chartType: string
  data: Array<Record<string, unknown>>
}

type PostBody = {
  dashboardId: string
  message: string
  conversationId?: string
  chartContext?: ChartContext
}

function buildPrompt(message: string, chartContext: ChartContext | undefined, history: ChatMessage[]): string {
  const historyText = history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  if (!chartContext) {
    return `The user has asked: "${message}"
    
Please tell them they need to drop a chart from the dashboard into the chat panel first before asking a question. Be friendly and brief.`
  }

  return `You are a precise data analyst assistant. The user is asking about a "${chartContext.chartType}" chart titled "${chartContext.chartTitle}".

The chart contains the following data points (this is the complete data — do not reference any data outside of this):
${JSON.stringify(chartContext.data, null, 2)}

Rules:
- Answer using ONLY the data above. Never invent numbers.
- If asked for max, min, average, total — compute it from the data points above.
- Keep answers concise and friendly. Use bullet points for lists.
- If the question cannot be answered from the chart data alone, say so clearly.
- Do not mention "JSON" or "data points" — refer to them naturally as values in the chart.

${historyText ? `Conversation so far:\n${historyText}\n\n` : ''}User: ${message}`
}

export async function GET(request: Request) {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dashboardId = new URL(request.url).searchParams.get('dashboardId')
  if (!dashboardId) {
    return NextResponse.json({ error: 'Missing dashboardId' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify user owns this dashboard
  const { data: dashboard, error: dashError } = await admin
    .from('dashboards')
    .select('id')
    .eq('id', dashboardId)
    .eq('user_id', user.id)
    .single()

  if (dashError || !dashboard) {
    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
  }

  const { data: conversation } = await admin
    .from('conversations')
    .select('id, messages')
    .eq('dashboard_id', dashboardId)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    conversationId: conversation?.id ?? null,
    messages: (conversation?.messages as ChatMessage[]) ?? [],
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createUserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as PostBody
    if (!body.dashboardId || !body.message?.trim()) {
      return NextResponse.json({ error: 'Missing dashboardId or message' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify user owns this dashboard (lightweight check, no heavy DB joins)
    const { data: dashboard, error: dashError } = await admin
      .from('dashboards')
      .select('id')
      .eq('id', body.dashboardId)
      .eq('user_id', user.id)
      .single()

    if (dashError || !dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }

    let conversationId = body.conversationId
    let messages: ChatMessage[] = []

    if (conversationId) {
      const { data: existing } = await admin
        .from('conversations')
        .select('id, messages')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .eq('dashboard_id', body.dashboardId)
        .single()

      if (existing) {
        messages = (existing.messages as ChatMessage[]) ?? []
      } else {
        conversationId = undefined
      }
    }

    if (!conversationId) {
      const { data: created, error: createError } = await admin
        .from('conversations')
        .insert({
          dashboard_id: body.dashboardId,
          user_id: user.id,
          messages: [],
        })
        .select('id')
        .single()

      if (createError || !created) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversationId = created.id
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: body.message.trim(),
      timestamp: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attachedChart: body.chartContext as any,
    }
    messages = [...messages, userMessage]

    const prompt = buildPrompt(body.message.trim(), body.chartContext, messages.slice(0, -1))
    const chatModel = modelForFeature('chat')

    const stream = await ai.models.generateContentStream({
      model: chatModel,
      contents: prompt,
      config: { temperature: 0.2 },
    })

    const encoder = new TextEncoder()
    let fullReply = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text ?? ''
            if (text) {
              fullReply += text
              controller.enqueue(encoder.encode(text))
            }
          }

          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullReply.trim() || 'I could not generate a response.',
            timestamp: new Date().toISOString(),
          }

          await logAiUsage({ userId: user.id, model: chatModel, feature: 'chat' })

          await admin
            .from('conversations')
            .update({
              messages: [...messages, assistantMessage],
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId!)
            .eq('user_id', user.id)

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Conversation-Id': conversationId!,
      },
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
