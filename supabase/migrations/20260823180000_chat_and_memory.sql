-- Переписка с помощником и то, что он запомнил про человека.
--
-- Разделено намеренно. Переписка — это лента, она растёт и стареет: модели
-- уходит только хвост. Факты не стареют и подставляются в каждый разговор,
-- поэтому их мало, они короткие и их видно списком.

/* ── Переписка ────────────────────────────────────────────────────────────── */

create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  -- У сообщения с одними лишь вызовами инструментов текста нет
  content text,
  -- Что модель попросила выполнить и к какому вызову относится ответ.
  -- Без этой пары продолжить разговор нельзя: поставщик отвергнет ленту,
  -- где ответ инструмента висит без своего вызова
  tool_calls jsonb,
  tool_call_id text,
  created_at timestamptz not null default now()
);

create index chat_messages_user_idx
  on public.chat_messages (user_id, created_at desc);

/* ── Память о человеке ────────────────────────────────────────────────────── */

create table public.memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- Короткая фраза: «болит колено», «тренируюсь дома, штанги нет».
  -- Ограничение по длине не косметическое — факты уходят в каждый запрос
  fact text not null check (length(btrim(fact)) between 1 and 300),
  created_at timestamptz not null default now(),
  -- Один и тот же факт не заводится дважды
  unique (user_id, fact)
);

create index memory_facts_user_idx on public.memory_facts (user_id, created_at);

/* ── Доступ: каждый видит только своё ─────────────────────────────────────── */

alter table public.chat_messages enable row level security;
alter table public.memory_facts enable row level security;

create policy "своя переписка" on public.chat_messages
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "своя память" on public.memory_facts
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
