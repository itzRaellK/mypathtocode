drop trigger if exists on_auth_user_created on auth.users;
drop table if exists
  public.ai_generation_artifacts,
  public.ai_generation_results,
  public.ai_generation_requests,
  public.ai_models,
  public.ai_providers,
  public.user_achievements,
  public.achievements,
  public.xp_ledger,
  public.user_stats,
  public.study_events,
  public.lesson_unlocks,
  public.ai_evaluations,
  public.attempt_files,
  public.exercise_attempts,
  public.lesson_progress,
  public.track_enrollments,
  public.reference_solutions,
  public.exercise_rubric_items,
  public.exercise_files,
  public.exercise_versions,
  public.exercises,
  public.lesson_content_versions,
  public.lesson_prerequisites,
  public.lessons,
  public.modules,
  public.track_prerequisites,
  public.track_technologies,
  public.tracks,
  public.technologies,
  public.knowledge_areas,
  public.user_settings,
  public.user_roles,
  public.profiles
cascade;
drop function if exists public.can_manage_content() cascade;
drop function if exists public.has_role(text) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_new_profile_stats() cascade;
drop function if exists public.protect_track_enrollment_identity() cascade;
drop function if exists public.protect_exercise_attempt_identity() cascade;
drop function if exists public.set_updated_at() cascade;

drop schema if exists learning cascade;
create schema learning;

grant usage on schema learning to authenticated, service_role;
grant all on all tables in schema learning to service_role;
alter default privileges in schema learning grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema learning grant all on tables to service_role;

create or replace function learning.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists learning.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Estudante',
  bio text,
  preferences jsonb not null default '{
    "accent": "green",
    "suggestedDifficulty": "adaptive",
    "notificationsEnabled": true,
    "reducedMotion": false
  }'::jsonb,
  stats jsonb not null default '{
    "xp": 0,
    "level": 1,
    "currentStreak": 0,
    "longestStreak": 0
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  title text not null,
  topic text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'expert')),
  goal text not null,
  summary text,
  outline jsonb not null,
  status text not null default 'active' check (status in ('generating', 'active', 'archived')),
  generation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists learning.lesson_contents (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references learning.tracks(id) on delete cascade,
  lesson_key text not null,
  version integer not null check (version > 0),
  content jsonb not null,
  status text not null default 'active' check (status in ('draft', 'active', 'superseded')),
  generation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (track_id, lesson_key, version)
);

create unique index if not exists lesson_contents_one_active_idx
  on learning.lesson_contents(track_id, lesson_key)
  where status = 'active';

create table if not exists learning.lesson_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references learning.tracks(id) on delete cascade,
  lesson_key text not null,
  status text not null default 'available'
    check (status in ('locked', 'available', 'in_progress', 'passed')),
  draft_files jsonb not null default '[]'::jsonb,
  best_score numeric(4,2) check (best_score is null or best_score between 0 and 10),
  attempts_count integer not null default 0 check (attempts_count >= 0),
  last_opened_at timestamptz,
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id, lesson_key)
);

create table if not exists learning.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references learning.tracks(id) on delete cascade,
  lesson_key text not null,
  lesson_content_id uuid references learning.lesson_contents(id) on delete set null,
  files jsonb not null,
  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'evaluating', 'evaluated', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning.evaluations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references learning.attempts(id) on delete cascade,
  score numeric(4,2) not null check (score between 0 and 10),
  passed boolean not null,
  feedback jsonb not null,
  generation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists learning.arena_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  difficulty text not null check (difficulty in ('adaptive', 'beginner', 'intermediate', 'advanced')),
  title text not null,
  summary text not null,
  brief text not null,
  starter_files jsonb not null,
  toolbox jsonb not null default '[]'::jsonb,
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

create table if not exists learning.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('track_outline', 'lesson_content', 'code_evaluation', 'arena_challenge', 'arena_evaluation')),
  target_type text not null check (target_type in ('track', 'lesson', 'attempt', 'arena_challenge', 'arena_attempt')),
  target_id uuid,
  target_key text,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed', 'rate_limited')),
  model text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  usage jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tracks_user_created_idx on learning.tracks(user_id, created_at desc);
create index if not exists lesson_contents_track_key_idx on learning.lesson_contents(track_id, lesson_key);
create index if not exists attempts_user_created_idx on learning.attempts(user_id, created_at desc);
create index if not exists arena_challenges_user_created_idx on learning.arena_challenges(user_id, created_at desc);
create index if not exists arena_attempts_user_created_idx on learning.arena_attempts(user_id, created_at desc);
create index if not exists ai_runs_user_created_idx on learning.ai_runs(user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on learning.profiles;
create trigger profiles_set_updated_at before update on learning.profiles
  for each row execute function learning.set_updated_at();
drop trigger if exists tracks_set_updated_at on learning.tracks;
create trigger tracks_set_updated_at before update on learning.tracks
  for each row execute function learning.set_updated_at();
drop trigger if exists lesson_states_set_updated_at on learning.lesson_states;
create trigger lesson_states_set_updated_at before update on learning.lesson_states
  for each row execute function learning.set_updated_at();
drop trigger if exists attempts_set_updated_at on learning.attempts;
create trigger attempts_set_updated_at before update on learning.attempts
  for each row execute function learning.set_updated_at();
drop trigger if exists arena_challenges_set_updated_at on learning.arena_challenges;
create trigger arena_challenges_set_updated_at before update on learning.arena_challenges
  for each row execute function learning.set_updated_at();

create or replace function learning.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into learning.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Estudante'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists learning_on_auth_user_created on auth.users;
create trigger learning_on_auth_user_created
  after insert on auth.users
  for each row execute function learning.handle_new_user();

insert into learning.profiles (user_id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', 'Estudante')
from auth.users
on conflict (user_id) do nothing;

alter table learning.profiles enable row level security;
alter table learning.tracks enable row level security;
alter table learning.lesson_contents enable row level security;
alter table learning.lesson_states enable row level security;
alter table learning.attempts enable row level security;
alter table learning.evaluations enable row level security;
alter table learning.arena_challenges enable row level security;
alter table learning.arena_attempts enable row level security;
alter table learning.ai_runs enable row level security;

create policy "own profile" on learning.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tracks" on learning.tracks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "contents from own tracks" on learning.lesson_contents for all to authenticated
  using (exists (select 1 from learning.tracks where tracks.id = lesson_contents.track_id and tracks.user_id = (select auth.uid())))
  with check (exists (select 1 from learning.tracks where tracks.id = lesson_contents.track_id and tracks.user_id = (select auth.uid())));
create policy "own lesson states" on learning.lesson_states for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own attempts" on learning.attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "evaluations from own attempts" on learning.evaluations for select to authenticated
  using (exists (select 1 from learning.attempts where attempts.id = evaluations.attempt_id and attempts.user_id = (select auth.uid())));
create policy "insert evaluations for own attempts" on learning.evaluations for insert to authenticated
  with check (exists (select 1 from learning.attempts where attempts.id = evaluations.attempt_id and attempts.user_id = (select auth.uid())));
create policy "own arena challenges" on learning.arena_challenges for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own arena attempts" on learning.arena_attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own ai runs" on learning.ai_runs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema learning to authenticated;
grant all on all tables in schema learning to service_role;
