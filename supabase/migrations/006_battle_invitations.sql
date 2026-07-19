-- 006: Battle invitations
-- Invite friends into a battle at creation; they see a pending invite in-app
-- and accept (join) or decline. Supports N players.

create table if not exists public.battle_invitations (
  battle_id uuid not null references public.battles(id) on delete cascade,
  invitee_id uuid not null references public.users(id) on delete cascade,
  inviter_id uuid references public.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (battle_id, invitee_id)
);

alter table public.battle_invitations enable row level security;

-- Invitee sees their own invites; battle members see invites for their battle.
drop policy if exists "View my invites" on public.battle_invitations;
create policy "View my invites" on public.battle_invitations for select
  using (auth.uid() = invitee_id or public.is_battle_member(battle_id, auth.uid()));

grant select on public.battle_invitations to authenticated;

-- An invitee must be able to read the battle they were invited to (before joining).
drop policy if exists "Invitees can view battle" on public.battles;
create policy "Invitees can view battle" on public.battles for select
  using (exists (
    select 1 from public.battle_invitations
    where battle_id = id and invitee_id = auth.uid()
  ));

-- Create a battle and invite friends in one transaction.
create or replace function public.create_battle_with_invites(
  p_title text,
  p_period_end timestamptz,
  p_invitees uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_invitee uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  insert into battles (title, period_end, status, max_members)
    values (p_title, p_period_end, 'preparing', 1 + coalesce(array_length(p_invitees, 1), 0))
    returning id into v_id;

  insert into battle_members (battle_id, user_id, role)
    values (v_id, v_uid, 'creator');

  if p_invitees is not null then
    foreach v_invitee in array p_invitees loop
      if v_invitee <> v_uid then
        insert into battle_invitations (battle_id, invitee_id, inviter_id)
          values (v_id, v_invitee, v_uid)
          on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;

grant execute on function public.create_battle_with_invites(text, timestamptz, uuid[]) to authenticated;

-- Accept (join) or decline an invite.
create or replace function public.respond_invite(p_battle_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return 'unauthorized'; end if;

  if not exists (
    select 1 from battle_invitations
    where battle_id = p_battle_id and invitee_id = v_uid and status = 'pending'
  ) then
    return 'no_invite';
  end if;

  if p_accept then
    update battle_invitations set status = 'accepted'
      where battle_id = p_battle_id and invitee_id = v_uid;
    insert into battle_members (battle_id, user_id, role)
      values (p_battle_id, v_uid, 'participant')
      on conflict do nothing;
    return 'accepted';
  else
    update battle_invitations set status = 'declined'
      where battle_id = p_battle_id and invitee_id = v_uid;
    return 'declined';
  end if;
end;
$$;

grant execute on function public.respond_invite(uuid, boolean) to authenticated;
