-- 003: Friend system
-- A friendship is one row per pair, stored with a canonical order
-- (user_a < user_b) so (A,B) and (B,A) can't both exist.

create table if not exists public.friendships (
  user_a uuid not null references public.users(id) on delete cascade,
  user_b uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.friendships enable row level security;

-- You can see a friendship only if you're one of the two people in it.
drop policy if exists "View own friendships" on public.friendships;
create policy "View own friendships" on public.friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

grant select on public.friendships to authenticated;

-- add_friend: make the caller and p_other mutual friends (idempotent).
create or replace function public.add_friend(p_other uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a uuid;
  b uuid;
begin
  if v_uid is null then return 'unauthorized'; end if;
  if v_uid = p_other then return 'self'; end if;
  if not exists (select 1 from users where id = p_other) then return 'not_found'; end if;

  if v_uid < p_other then a := v_uid; b := p_other; else a := p_other; b := v_uid; end if;

  insert into friendships (user_a, user_b)
  values (a, b)
  on conflict do nothing;

  return 'added';
end;
$$;

grant execute on function public.add_friend(uuid) to authenticated;
