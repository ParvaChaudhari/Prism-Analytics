import { NextResponse } from 'next/server'
import ai from '@/lib/gemini'
import { modelForFeature } from '@/lib/gemini-models'
import { logAiUsage } from '@/lib/gemini-quota'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSchemaFromRows } from '@/lib/parsers/schema'
import type { ChatMessage } from '@/types/chat'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_SAMPLE_ROWS = 100

type PostBody = {
  dashboardId: string
  message: string
  conversationId?: string
}

async function loadDashboardContext(admin: ReturnType<typeof createAdminClient>, dashboardId: string, userId: string) {
  const { data: dashboard, error } = await admin
    .from('dashboards')
    .select('id, title, ai_summary, ai_insights, dataset_id')
    .eq('id', dashboardId)
    .eq('user_id', userId)
    .single()

  if (error || !dashboard) return null

  const { data: dataset } = await admin
    .from('datasets')
    .select('upload_id, cleaned_data, raw_schema')
    .eq('id', dashboard.dataset_id)
    .eq('user_id', userId)
    .single()

  const { data: upload } = await admin
    .from('uploads')
    .select('computed_stats')
    .eq('id', dataset?.upload_id)
    .single()

  const rows = (dataset?.cleaned_data as Array<Record<string, unknown>>) ?? []
  const schema =
    (dataset?.raw_schema as ReturnType<typeof buildSchemaFromRows>) ??
    buildSchemaFromRows(rows)

  return {
    dashboard,
    schema,
    sampleData: rows.slice(0, MAX_SAMPLE_ROWS),
    computedStats: upload?.computed_stats,
  }
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
  const ctx = await loadDashboardContext(admin, dashboardId, user.id)
  if (!ctx) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })

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
    const ctx = await loadDashboardContext(admin, body.dashboardId, user.id)
    if (!ctx) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 })

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
    }
    messages = [...messages, userMessage]

    const historyText = messages
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    const prompt = `You are a data analyst assistant. Answer questions about this dataset accurately.
Dataset stats (computed from full dataset — these are exact values, not estimates):
${JSON.stringify(ctx.computedStats, null, 2)}

Dataset schema: ${JSON.stringify(ctx.schema)}
Dashboard insights already shown: ${ctx.dashboard.ai_summary}

Answer concisely. If asked for averages or totals use the exact values above.
If the question implies a chart, describe what chart would show that. Use plain language — the user may not be technical. Never make up numbers not present in the stats.

Conversation so far:
${historyText}

Respond to the latest user message only.`

    const chatModel = modelForFeature('chat')

    const stream = await ai.models.generateContentStream({
      model: chatModel,
      contents: prompt,
      config: { temperature: 0.3 },
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
