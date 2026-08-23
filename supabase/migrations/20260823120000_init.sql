-- Gym Bro — начальная схема.
--
-- Правило доступа одно и то же во всех таблицах: человек видит и меняет только
-- свои строки. Оно включается через RLS на уровне базы, а не в коде приложения,
-- потому что ключ, с которым ходит сайт, публичный и лежит в браузере.
--
-- Челленджей и подписок здесь нет: этих функций в приложении пока не существует,
-- заводить под них таблицы рано. Недельный объём по группам мышц тоже не хранится
-- отдельно — он считается из выполненных подходов, чтобы не разъезжался с ними.

/* ── Профиль ──────────────────────────────────────────────────────────────── */

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  sex text check (sex in ('male', 'female')),
  height_cm smallint check (height_cm between 100 and 250),
  weight_kg numeric(5, 2) check (weight_kg between 30 and 300),
  -- Год рождения, а не возраст: возраст протухает через год после записи
  birth_year smallint check (birth_year between 1900 and 2100),
  level text not null default 'novice'
    check (level in ('novice', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Данные человека для расчёта объёма и для ИИ-помощника';

/* ── Личные веса в упражнениях ────────────────────────────────────────────── */

create table public.exercise_weights (
  user_id uuid not null references auth.users on delete cascade,
  -- Идентификатор из каталога в web/src/lib/demo.ts, не внешний ключ:
  -- каталог живёт в коде и версионируется вместе с ним
  exercise_id text not null,
  peak_kg numeric(5, 1) check (peak_kg > 0),
  working_kg numeric(5, 1) check (working_kg > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

/* ── Свои тренировки ──────────────────────────────────────────────────────── */

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 120),
  target_min smallint not null check (target_min between 10 and 240),
  -- Слоты читаются и пишутся всегда целиком, по отдельности не запрашиваются
  slots jsonb not null default '[]'::jsonb,
  ai_generated boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index programs_user_idx on public.programs (user_id, created_at desc);

/* ── Проведённые тренировки ───────────────────────────────────────────────── */

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- Программу могли удалить, а тренировка по ней остаётся в истории
  program_id uuid references public.programs on delete set null
);

create index workouts_user_idx on public.workouts (user_id, started_at desc);

-- Подходы лежат отдельными строками, а не в jsonb: главный вопрос к этим
-- данным — как менялся вес в конкретном упражнении со временем, и это запрос
create table public.workout_sets (
  id bigint generated always as identity primary key,
  workout_id uuid not null references public.workouts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  exercise_id text not null,
  set_index smallint not null check (set_index > 0),
  reps smallint check (reps > 0),
  weight_kg numeric(5, 1) check (weight_kg >= 0),
  feedback text check (feedback in ('easy', 'ok', 'hard', 'failed')),
  done_at timestamptz not null default now()
);

create index workout_sets_progress_idx
  on public.workout_sets (user_id, exercise_id, done_at desc);

/* ── Цели ─────────────────────────────────────────────────────────────────── */

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('lift', 'weight')),
  -- Для kind = 'lift' — упражнение, в котором нужен результат
  exercise_id text,
  target_value numeric(6, 2) not null check (target_value > 0),
  deadline date not null,
  -- Вердикт помощника: реалистична ли цель. Заполняется моделью, не человеком
  verdict jsonb,
  created_at timestamptz not null default now(),
  check (kind <> 'lift' or exercise_id is not null)
);

create index goals_user_idx on public.goals (user_id, deadline);

/* ── Доступ: каждый видит только своё ─────────────────────────────────────── */

alter table public.profiles enable row level security;
alter table public.exercise_weights enable row level security;
alter table public.programs enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.goals enable row level security;

create policy "свой профиль" on public.profiles
  for all to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "свои веса" on public.exercise_weights
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "свои программы" on public.programs
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "свои тренировки" on public.workouts
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "свои подходы" on public.workout_sets
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "свои цели" on public.goals
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/* ── Профиль заводится вместе с аккаунтом ─────────────────────────────────── */

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ── Отметка времени правки ───────────────────────────────────────────────── */

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger exercise_weights_touch before update on public.exercise_weights
  for each row execute function public.touch_updated_at();
