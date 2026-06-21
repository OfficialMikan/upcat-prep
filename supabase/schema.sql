-- UPCAT PREP — Supabase Schema. Run in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  subject text not null,
  subtopic text not null,
  topic text not null,
  difficulty text not null default 'Medium',
  question text not null,
  choices jsonb not null,
  correct integer not null,
  explanation text not null,
  hint text default '',
  has_visual boolean default false,
  visual_type text,
  visual_data text,
  language text default 'en',
  created_at timestamptz default now()
);
create index if not exists idx_questions_subject on questions(subject);
create index if not exists idx_questions_topic on questions(topic);
create index if not exists idx_questions_subject_topic on questions(subject, topic);

create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  mode text not null,
  subjects jsonb not null,
  difficulty text,
  correct integer not null,
  total integer not null,
  pct integer not null,
  avg_time numeric not null,
  total_time_sec integer not null,
  upg numeric,
  sub_stats jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_sessions_created on sessions(created_at desc);

create table if not exists topic_stats (
  id text primary key,
  subject text not null,
  subtopic text not null,
  topic text not null,
  correct integer not null default 0,
  total integer not null default 0,
  accuracy numeric not null default 0,
  last_seen timestamptz default now()
);
create index if not exists idx_topic_stats_accuracy on topic_stats(accuracy);

create table if not exists sr_queue (
  id text primary key,
  subject text not null,
  topic text not null,
  subtopic text not null,
  interval integer not null default 1,
  ease_factor numeric not null default 2.5,
  repetitions integer not null default 0,
  next_review timestamptz not null default now()
);
create index if not exists idx_sr_queue_next_review on sr_queue(next_review);

alter table questions enable row level security;
alter table sessions enable row level security;
alter table topic_stats enable row level security;
alter table sr_queue enable row level security;

create policy "Allow all on questions" on questions for all using (true) with check (true);
create policy "Allow all on sessions" on sessions for all using (true) with check (true);
create policy "Allow all on topic_stats" on topic_stats for all using (true) with check (true);
create policy "Allow all on sr_queue" on sr_queue for all using (true) with check (true);

-- After running this, copy your Project URL and anon key from
-- Project Settings → API into your .env.local file.
