-- Optional: run in Supabase SQL editor for AI quota tracking (prism-ai-improvement-plan.md)

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  feature text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_user_model_created_idx
  on public.ai_usage_logs (user_id, model, created_at desc);

alter table public.ai_usage_logs enable row level security;

create policy "Users can read own ai usage"
  on public.ai_usage_logs for select
  using (auth.uid() = user_id);
