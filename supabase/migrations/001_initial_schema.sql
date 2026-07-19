-- Users profile (synced from auth.users via trigger)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Battles
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_start timestamptz not null default now(),
  period_end timestamptz not null,
  status text not null default 'preparing' check (status in ('preparing', 'active', 'completed', 'cancelled')),
  max_members int not null default 2,
  created_at timestamptz not null default now()
);

-- Battle members
create table public.battle_members (
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('creator', 'participant')),
  joined_at timestamptz not null default now(),
  primary key (battle_id, user_id)
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  category text not null default 'other' check (category in ('coding', 'study', 'exercise', 'other')),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'completed')),
  approved_by uuid references public.users(id),
  completed_at timestamptz,
  proof_text text,
  created_at timestamptz not null default now()
);

-- RLS policies
alter table public.users enable row level security;
alter table public.battles enable row level security;
alter table public.battle_members enable row level security;
alter table public.tasks enable row level security;

-- Users: can read all, update own
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Battles: members can read
create policy "Battle members can view battles" on public.battles for select
  using (exists (select 1 from public.battle_members where battle_id = id and user_id = auth.uid()));
create policy "Authenticated users can create battles" on public.battles for insert
  with check (auth.uid() is not null);
create policy "Creator can update battle" on public.battles for update
  using (exists (select 1 from public.battle_members where battle_id = id and user_id = auth.uid() and role = 'creator'));

-- Battle members: members can read
create policy "Battle members can view members" on public.battle_members for select
  using (exists (select 1 from public.battle_members bm where bm.battle_id = battle_id and bm.user_id = auth.uid()));
create policy "Authenticated users can join battles" on public.battle_members for insert
  with check (auth.uid() = user_id);

-- Tasks: battle members can read
create policy "Battle members can view tasks" on public.tasks for select
  using (exists (select 1 from public.battle_members where battle_id = tasks.battle_id and user_id = auth.uid()));
create policy "Battle members can create tasks" on public.tasks for insert
  with check (exists (select 1 from public.battle_members where battle_id = tasks.battle_id and user_id = auth.uid()));
create policy "Task owner or approver can update" on public.tasks for update
  using (exists (select 1 from public.battle_members where battle_id = tasks.battle_id and user_id = auth.uid()));

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'ユーザー'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
