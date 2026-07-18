alter table public.profiles
  add column if not exists language_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_language_code_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_language_code_length
      check (language_code is null or char_length(language_code) <= 16);
  end if;
end
$$;

drop function if exists public.upsert_telegram_profile(bigint, text, text, text, text, text, boolean);

create function public.upsert_telegram_profile(
  p_telegram_user_id bigint,
  p_username text,
  p_first_name text,
  p_last_name text,
  p_language_code text,
  p_photo_url text,
  p_bootstrap_admin boolean default false
)
returns table (
  id uuid,
  telegram_user_id bigint,
  username text,
  first_name text,
  last_name text,
  language_code text,
  photo_url text,
  role public.user_role,
  is_blocked boolean,
  created_at timestamptz,
  last_seen_at timestamptz,
  enrollment_status public.enrollment_status,
  is_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_is_new boolean := false;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0 then
    raise exception 'valid telegram user id required';
  end if;

  insert into public.profiles as profile (
    telegram_user_id,
    username,
    first_name,
    last_name,
    language_code,
    photo_url,
    role,
    last_seen_at
  ) values (
    p_telegram_user_id,
    nullif(trim(p_username), ''),
    p_first_name,
    nullif(trim(p_last_name), ''),
    nullif(trim(p_language_code), ''),
    nullif(trim(p_photo_url), ''),
    case when p_bootstrap_admin then 'admin'::public.user_role else 'student'::public.user_role end,
    now()
  )
  on conflict (telegram_user_id) do nothing
  returning profile.id into v_profile_id;

  if v_profile_id is null then
    update public.profiles as profile
    set
      username = nullif(trim(p_username), ''),
      first_name = p_first_name,
      last_name = nullif(trim(p_last_name), ''),
      language_code = nullif(trim(p_language_code), ''),
      photo_url = nullif(trim(p_photo_url), ''),
      role = case when p_bootstrap_admin then 'admin'::public.user_role else profile.role end,
      last_seen_at = now()
    where profile.telegram_user_id = p_telegram_user_id
    returning profile.id into v_profile_id;
  else
    v_is_new := true;
  end if;

  return query
  select
    profile.id,
    profile.telegram_user_id,
    profile.username,
    profile.first_name,
    profile.last_name,
    profile.language_code,
    profile.photo_url,
    profile.role,
    profile.is_blocked,
    profile.created_at,
    profile.last_seen_at,
    (
      select enrollment.status
      from public.enrollments as enrollment
      where enrollment.user_id = profile.id
      order by enrollment.access_granted_at desc
      limit 1
    ),
    v_is_new
  from public.profiles as profile
  where profile.id = v_profile_id;
end;
$$;

revoke all on function public.upsert_telegram_profile(bigint, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.upsert_telegram_profile(bigint, text, text, text, text, text, boolean)
  to service_role;

comment on function public.upsert_telegram_profile(bigint, text, text, text, text, text, boolean)
  is 'Atomically creates or safely refreshes a profile from server-verified Telegram initData.';
