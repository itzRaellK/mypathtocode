-- Execute uma vez no SQL Editor para adicionar a Arena sem reinstalar o banco.

create table if not exists learning.arena_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  difficulty text not null check (difficulty in ('adaptive', 'beginner', 'intermediate', 'advanced')),
  title text not null,
  summary text not null,
  brief text not null,
  starter_files jsonb not null,
  acceptance_criteria jsonb not null,
  evaluation_focus jsonb not null default '[]'::jsonb,
  draft_files jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  best_score numeric(4,2) check (best_score is null or best_score between 0 and 10),
  generation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists learning.arena_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references learning.arena_challenges(id) on delete cascade,
  files jsonb not null,
  score numeric(4,2) not null check (score between 0 and 10),
  passed boolean not null,
  feedback jsonb not null,
  generation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists arena_challenges_user_created_idx on learning.arena_challenges(user_id, created_at desc);
create index if not exists arena_attempts_user_created_idx on learning.arena_attempts(user_id, created_at desc);

drop trigger if exists arena_challenges_set_updated_at on learning.arena_challenges;
create trigger arena_challenges_set_updated_at before update on learning.arena_challenges
  for each row execute function learning.set_updated_at();

alter table learning.arena_challenges enable row level security;
alter table learning.arena_attempts enable row level security;

drop policy if exists "own arena challenges" on learning.arena_challenges;
create policy "own arena challenges" on learning.arena_challenges for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own arena attempts" on learning.arena_attempts;
create policy "own arena attempts" on learning.arena_attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on learning.arena_challenges, learning.arena_attempts to authenticated;
grant all on learning.arena_challenges, learning.arena_attempts to service_role;

alter table learning.ai_runs drop constraint if exists ai_runs_operation_check;
alter table learning.ai_runs add constraint ai_runs_operation_check
  check (operation in ('track_outline', 'lesson_content', 'code_evaluation', 'arena_challenge', 'arena_evaluation'));

alter table learning.ai_runs drop constraint if exists ai_runs_target_type_check;
alter table learning.ai_runs add constraint ai_runs_target_type_check
  check (target_type in ('track', 'lesson', 'attempt', 'arena_challenge', 'arena_attempt'));
