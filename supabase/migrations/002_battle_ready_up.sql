-- 002: Battle ready-up lifecycle
-- Adds a per-member "ready" flag and an RPC that starts the battle
-- (preparing -> active) once every member (>= 2) has readied up.

alter table public.battle_members
  add column if not exists is_ready boolean not null default false;

-- ready_up: mark the caller ready. When all members are ready and there
-- are at least 2 of them, flip the battle to 'active' and re-base the
-- period so it starts now with the same duration.
create or replace function public.ready_up(p_battle_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total int;
  v_ready int;
  v_status text;
begin
  if v_uid is null then
    return 'unauthorized';
  end if;

  if not exists (
    select 1 from battle_members
    where battle_id = p_battle_id and user_id = v_uid
  ) then
    return 'not_member';
  end if;

  select status into v_status from battles where id = p_battle_id;
  if v_status is distinct from 'preparing' then
    return 'not_preparing';
  end if;

  update battle_members
    set is_ready = true
    where battle_id = p_battle_id and user_id = v_uid;

  select count(*), count(*) filter (where is_ready)
    into v_total, v_ready
    from battle_members
    where battle_id = p_battle_id;

  if v_total >= 2 and v_ready = v_total then
    update battles
      set status = 'active',
          period_start = now(),
          period_end = now() + (period_end - period_start)
      where id = p_battle_id and status = 'preparing';
    return 'started';
  end if;

  return 'ready';
end;
$$;

grant execute on function public.ready_up(uuid) to authenticated;
