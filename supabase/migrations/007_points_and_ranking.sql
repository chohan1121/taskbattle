-- 007: Points (in-app currency) + ranking support.
-- Points accrue +1 per completed task and +5 to the winner(s) of a battle.

alter table public.users add column if not exists points int not null default 0;

-- Backfill existing users from their already-completed tasks.
update public.users u
  set points = (select count(*) from public.tasks t where t.user_id = u.id and t.status = 'completed');

-- Complete a task: validates ownership + active battle, marks it done, +1 point.
create or replace function public.complete_task(p_task_id uuid, p_proof text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_battle uuid;
  v_bstatus text;
  v_bend timestamptz;
begin
  if v_uid is null then return 'unauthorized'; end if;

  select user_id, status, battle_id into v_owner, v_status, v_battle
    from tasks where id = p_task_id;
  if v_owner is null then return 'not_found'; end if;
  if v_owner <> v_uid then return 'not_owner'; end if;
  if v_status <> 'approved' then return 'not_approved'; end if;

  select status, period_end into v_bstatus, v_bend from battles where id = v_battle;
  if v_bstatus <> 'active' then return 'not_active'; end if;
  if v_bend < now() then return 'ended'; end if;

  update tasks set status = 'completed', completed_at = now(), proof_text = p_proof
    where id = p_task_id and status = 'approved';
  update users set points = points + 1 where id = v_uid;

  return 'completed';
end;
$$;

grant execute on function public.complete_task(uuid, text) to authenticated;

-- Finalize a battle whose period has ended: mark completed and award the
-- top scorer(s) a +5 win bonus. Any member may trigger it (SECURITY DEFINER).
create or replace function public.finalize_battle(p_battle_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_end timestamptz;
begin
  select status, period_end into v_status, v_end from battles where id = p_battle_id;
  if v_status is distinct from 'active' then return 'not_active'; end if;
  if v_end > now() then return 'not_ended'; end if;

  update battles set status = 'completed' where id = p_battle_id and status = 'active';

  with sc as (
    select bm.user_id, count(t.id) as n
    from battle_members bm
    left join tasks t
      on t.battle_id = p_battle_id and t.user_id = bm.user_id and t.status = 'completed'
    where bm.battle_id = p_battle_id
    group by bm.user_id
  ), mx as (select max(n) as m from sc)
  update users u set points = points + 5
  from sc, mx
  where u.id = sc.user_id and sc.n = mx.m and mx.m > 0;

  return 'completed';
end;
$$;

grant execute on function public.finalize_battle(uuid) to authenticated;
