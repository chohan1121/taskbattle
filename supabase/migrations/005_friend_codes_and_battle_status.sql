-- 005: Friend codes + guarantee new battles start in 'preparing'.

-- ── Part A: new battles must start in 'preparing' ──────────────────
-- Recreate create_battle so a battle is always born 'preparing' (so the
-- ready-up flow applies and completion is blocked until it starts).
create or replace function public.create_battle(p_title text, p_period_end timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  insert into battles (title, period_end, status)
    values (p_title, p_period_end, 'preparing')
    returning id into v_id;

  insert into battle_members (battle_id, user_id, role)
    values (v_id, v_uid, 'creator');

  return v_id;
end;
$$;

grant execute on function public.create_battle(text, timestamptz) to authenticated;

-- ── Part B: friend codes ───────────────────────────────────────────
alter table public.users add column if not exists friend_code text unique;

-- Backfill existing users with a 6-char code.
update public.users
  set friend_code = upper(substr(md5(random()::text || id::text), 1, 6))
  where friend_code is null;

-- New signups get a friend code too (extends the existing trigger fn).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, avatar_url, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'ユーザー'),
    new.raw_user_meta_data->>'avatar_url',
    upper(substr(md5(random()::text || new.id::text), 1, 6))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Add a friend by their code.
create or replace function public.add_friend_by_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_other uuid;
begin
  if v_uid is null then return 'unauthorized'; end if;

  select id into v_other from users where friend_code = upper(trim(p_code));
  if v_other is null then return 'not_found'; end if;
  if v_other = v_uid then return 'self'; end if;

  perform public.add_friend(v_other);
  return 'added';
end;
$$;

grant execute on function public.add_friend_by_code(text) to authenticated;
