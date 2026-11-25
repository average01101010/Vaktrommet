-- Vaktrommet – grunnskjema (klargjort, ikke kjørt automatisk).
-- Prinsipp: klienten kan lese topplister og lese/skrive sin egen lagring,
-- men poeng skrives KUN av server-side validering (service role / Edge Function)
-- som re-simulerer med samme motor som klienten (src/engine).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  ward_name text not null check (char_length(ward_name) between 1 and 28),
  county text not null,
  profession text not null check (profession in ('sykepleier', 'vernepleier', 'helsefagarbeider', 'assistent', 'student', 'annet')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Siste lagrede spilltilstand per spiller (GameState som JSON).
create table if not exists public.game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  state_version integer not null,
  -- Servertid da tilstanden ble godkjent; brukes som fasit for offline-beregning.
  validated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Driftsligaen («drift») og Kvalitetsindeksen («kvalitet»).
create table if not exists public.leaderboard_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  league text not null check (league in ('drift', 'kvalitet')),
  ward_name text not null,
  county text not null,
  profession text not null,
  score bigint not null check (score >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, league)
);
create index if not exists leaderboard_scores_rank_idx on public.leaderboard_scores (league, score desc);
create index if not exists leaderboard_scores_county_idx on public.leaderboard_scores (league, county, score desc);
create index if not exists leaderboard_scores_profession_idx on public.leaderboard_scores (league, profession, score desc);

-- Ukentlige tilsyn (ISO-uke, f.eks. «2026-W48»).
create table if not exists public.inspection_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_key text not null,
  inspection_id text not null,
  county text not null,
  profession text not null,
  points bigint not null check (points >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, week_key)
);
create index if not exists inspection_scores_rank_idx on public.inspection_scores (week_key, points desc);

-- Kjøp (kvitteringer valideres server-side før de innvilges).
create table if not exists public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  provider text not null,
  receipt text not null,
  created_at timestamptz not null default now(),
  unique (provider, receipt)
);

alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.leaderboard_scores enable row level security;
alter table public.inspection_scores enable row level security;
alter table public.purchases enable row level security;

-- Profiler: eier kan lese og endre sin egen.
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Lagring: eier kan lese sin egen. Skriving går via Edge Function (service role) etter validering.
create policy "game_saves_select_own" on public.game_saves for select to authenticated using ((select auth.uid()) = user_id);

-- Topplister og tilsyn: åpne for lesing, ingen klientskriving.
create policy "leaderboard_select_all" on public.leaderboard_scores for select to anon, authenticated using (true);
create policy "inspection_select_all" on public.inspection_scores for select to anon, authenticated using (true);

-- Kjøp: eier kan se sine egne.
create policy "purchases_select_own" on public.purchases for select to authenticated using ((select auth.uid()) = user_id);
