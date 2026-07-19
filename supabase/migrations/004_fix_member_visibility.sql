-- 004: Fix battle_members visibility.
-- An earlier recursion fix restricted the SELECT policy to `auth.uid() = user_id`,
-- which meant each user could only see their OWN membership row, so the opponent
-- never showed up (the ○ VS △ hero, home-card opponent score, etc.).
-- Use a SECURITY DEFINER helper so the membership check bypasses RLS and does
-- NOT recurse, while letting you see every member of any battle you belong to.

create or replace function public.is_battle_member(p_battle_id uuid, p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from battle_members
    where battle_id = p_battle_id and user_id = p_uid
  );
$$;

grant execute on function public.is_battle_member(uuid, uuid) to authenticated;

-- Replace whichever variant of the SELECT policy currently exists.
drop policy if exists "Battle members can view members" on public.battle_members;
drop policy if exists "Members can view own memberships" on public.battle_members;
drop policy if exists "View members of my battles" on public.battle_members;

create policy "View members of my battles" on public.battle_members for select
  using (public.is_battle_member(battle_id, auth.uid()));
