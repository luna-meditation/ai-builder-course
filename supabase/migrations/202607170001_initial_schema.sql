create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin', 'mentor');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('active', 'revoked', 'completed');
create type public.unlock_rule as enum ('after_submission', 'after_approval', 'manual', 'none');
create type public.progress_status as enum ('locked', 'available', 'in_progress', 'submitted', 'in_review', 'revision_requested', 'completed');
create type public.submission_status as enum ('draft', 'submitted', 'in_review', 'revision_requested', 'approved');
create type public.notification_status as enum ('pending', 'sent', 'failed');
create type public.block_type as enum ('heading', 'paragraph', 'callout', 'checklist', 'prompt', 'image', 'video', 'file', 'divider');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  username text,
  first_name text not null,
  last_name text,
  photo_url text,
  role public.user_role not null default 'student',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint profiles_username_length check (username is null or char_length(username) <= 64)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  cover_url text,
  status public.course_status not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null,
  slug text not null,
  short_description text not null default '',
  lesson_order integer not null check (lesson_order > 0),
  expected_result text not null default '',
  video_type text check (video_type is null or video_type in ('youtube', 'vimeo', 'mp4', 'external')),
  video_url text,
  unlock_rule public.unlock_rule not null default 'after_submission',
  assignment_required boolean not null default true,
  is_published boolean not null default false,
  assignment_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, lesson_order)
);

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  block_type public.block_type not null,
  content jsonb not null default '{}'::jsonb,
  block_order integer not null check (block_order >= 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, block_order)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status public.enrollment_status not null default 'active',
  access_source text not null default 'manual',
  external_payment_id text,
  plan text not null default 'standard',
  access_granted_at timestamptz not null default now(),
  access_revoked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  status public.progress_status not null default 'locked',
  unlocked_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  text_content text not null default '',
  external_url text,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, lesson_id, attempt_number)
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create table public.submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete restrict,
  comment text not null check (char_length(trim(comment)) > 0),
  is_visible_to_student boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  notification_type text not null,
  related_entity_id uuid,
  idempotency_key text not null unique,
  status public.notification_status not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_last_seen_idx on public.profiles(last_seen_at desc);
create index lessons_course_order_idx on public.lessons(course_id, lesson_order);
create index enrollments_status_idx on public.enrollments(status);
create index lesson_progress_status_idx on public.lesson_progress(status);
create index submissions_status_submitted_idx on public.submissions(status, submitted_at desc);
create index submissions_user_idx on public.submissions(user_id, created_at desc);
create index submission_comments_submission_idx on public.submission_comments(submission_id, created_at);
create index notifications_user_idx on public.notifications_log(user_id, created_at desc);
create index analytics_events_name_time_idx on public.analytics_events(event_name, created_at desc);
create index audit_log_time_idx on public.audit_log(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger lesson_blocks_updated_at before update on public.lesson_blocks for each row execute function public.set_updated_at();
create trigger enrollments_updated_at before update on public.enrollments for each row execute function public.set_updated_at();
create trigger lesson_progress_updated_at before update on public.lesson_progress for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions for each row execute function public.set_updated_at();

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.rate_limits%rowtype;
begin
  insert into public.rate_limits(key, window_started_at, request_count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_started_at = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now()
      else public.rate_limits.window_started_at
    end,
    request_count = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then 1
      else public.rate_limits.request_count + 1
    end,
    updated_at = now()
  returning * into current_row;

  return current_row.request_count <= p_limit;
end;
$$;

create or replace function public.save_submission(
  p_user_id uuid,
  p_enrollment_id uuid,
  p_lesson_id uuid,
  p_submission_id uuid,
  p_text_content text,
  p_external_url text,
  p_submit boolean
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.submissions%rowtype;
  current_progress public.lesson_progress%rowtype;
  current_lesson public.lessons%rowtype;
  next_lesson public.lessons%rowtype;
  next_attempt integer;
begin
  if not exists (
    select 1 from public.enrollments
    where id = p_enrollment_id and user_id = p_user_id and status = 'active'
  ) then
    raise exception 'active enrollment required';
  end if;

  select * into current_progress from public.lesson_progress
  where enrollment_id = p_enrollment_id and lesson_id = p_lesson_id for update;
  if not found or current_progress.status = 'locked' then
    raise exception 'lesson is locked';
  end if;

  select * into current_lesson from public.lessons where id = p_lesson_id;

  if p_submission_id is not null then
    select * into result from public.submissions
    where id = p_submission_id and user_id = p_user_id and status = 'draft' for update;
  end if;

  if result.id is null then
    select * into result from public.submissions
    where user_id = p_user_id and enrollment_id = p_enrollment_id and lesson_id = p_lesson_id and status = 'draft'
    order by attempt_number desc limit 1 for update;
  end if;

  if result.id is null then
    select coalesce(max(attempt_number), 0) + 1 into next_attempt
    from public.submissions where enrollment_id = p_enrollment_id and lesson_id = p_lesson_id;
    insert into public.submissions(user_id, enrollment_id, lesson_id, attempt_number, text_content, external_url)
    values (p_user_id, p_enrollment_id, p_lesson_id, next_attempt, coalesce(p_text_content, ''), nullif(trim(p_external_url), ''))
    returning * into result;
  else
    update public.submissions set
      text_content = coalesce(p_text_content, ''),
      external_url = nullif(trim(p_external_url), '')
    where id = result.id returning * into result;
  end if;

  if p_submit then
    if char_length(trim(result.text_content)) = 0 and result.external_url is null
      and not exists (select 1 from public.submission_files where submission_id = result.id) then
      raise exception 'submission content required';
    end if;

    update public.submissions set status = 'submitted', submitted_at = now()
    where id = result.id returning * into result;

    if current_lesson.unlock_rule in ('after_submission', 'none') then
      update public.lesson_progress set status = 'completed', submitted_at = now(), completed_at = now()
      where id = current_progress.id;
    else
      update public.lesson_progress set status = 'submitted', submitted_at = now()
      where id = current_progress.id;
    end if;

    if current_lesson.unlock_rule = 'after_submission' then
      select * into next_lesson from public.lessons
      where course_id = current_lesson.course_id and lesson_order > current_lesson.lesson_order and is_published
      order by lesson_order limit 1;
      if next_lesson.id is not null then
        insert into public.lesson_progress(enrollment_id, lesson_id, status, unlocked_at)
        values (p_enrollment_id, next_lesson.id, 'available', now())
        on conflict (enrollment_id, lesson_id) do update
          set status = case when public.lesson_progress.status = 'locked' then 'available' else public.lesson_progress.status end,
              unlocked_at = coalesce(public.lesson_progress.unlocked_at, now());
      end if;
    elsif current_lesson.unlock_rule = 'none' then
      update public.enrollments set status = 'completed', completed_at = now() where id = p_enrollment_id;
    end if;
  else
    update public.lesson_progress set status = case when status = 'available' then 'in_progress' else status end,
      started_at = coalesce(started_at, now()) where id = current_progress.id;
  end if;

  return result;
end;
$$;

create or replace function public.review_submission(
  p_admin_id uuid,
  p_submission_id uuid,
  p_action text,
  p_comment text default null
)
returns public.submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.submissions%rowtype;
  current_lesson public.lessons%rowtype;
  next_lesson public.lessons%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin' and not is_blocked) then
    raise exception 'admin required';
  end if;

  select * into result from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'submission not found'; end if;
  select * into current_lesson from public.lessons where id = result.lesson_id;

  if p_action = 'start_review' then
    update public.submissions set status = 'in_review', reviewed_by = p_admin_id where id = result.id returning * into result;
    update public.lesson_progress set status = 'in_review'
      where enrollment_id = result.enrollment_id and lesson_id = result.lesson_id;
  elsif p_action = 'approve' then
    update public.submissions set status = 'approved', reviewed_at = now(), reviewed_by = p_admin_id
      where id = result.id returning * into result;
    update public.lesson_progress set status = 'completed', approved_at = now(), completed_at = now()
      where enrollment_id = result.enrollment_id and lesson_id = result.lesson_id;

    if current_lesson.unlock_rule = 'after_approval' then
      select * into next_lesson from public.lessons
      where course_id = current_lesson.course_id and lesson_order > current_lesson.lesson_order and is_published
      order by lesson_order limit 1;
      if next_lesson.id is not null then
        insert into public.lesson_progress(enrollment_id, lesson_id, status, unlocked_at)
        values (result.enrollment_id, next_lesson.id, 'available', now())
        on conflict (enrollment_id, lesson_id) do update
          set status = case when public.lesson_progress.status = 'locked' then 'available' else public.lesson_progress.status end,
              unlocked_at = coalesce(public.lesson_progress.unlocked_at, now());
      end if;
    end if;
    if current_lesson.unlock_rule = 'none' then
      update public.enrollments set status = 'completed', completed_at = now() where id = result.enrollment_id;
    end if;
  elsif p_action = 'revision' then
    if p_comment is null or char_length(trim(p_comment)) = 0 then raise exception 'comment required'; end if;
    update public.submissions set status = 'revision_requested', reviewed_at = now(), reviewed_by = p_admin_id
      where id = result.id returning * into result;
    update public.lesson_progress set status = 'revision_requested'
      where enrollment_id = result.enrollment_id and lesson_id = result.lesson_id;
  elsif p_action <> 'comment' then
    raise exception 'invalid review action';
  end if;

  if p_comment is not null and char_length(trim(p_comment)) > 0 then
    insert into public.submission_comments(submission_id, author_id, comment)
    values (result.id, p_admin_id, trim(p_comment));
  end if;

  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'submission_' || p_action, 'submission', result.id, jsonb_build_object('status', result.status));
  return result;
end;
$$;

create or replace function public.grant_course_access(p_admin_id uuid, p_user_id uuid, p_course_id uuid)
returns public.enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.enrollments%rowtype;
  first_lesson_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin' and not is_blocked) then
    raise exception 'admin required';
  end if;
  insert into public.enrollments(user_id, course_id, status, access_source, access_granted_at, access_revoked_at)
  values (p_user_id, p_course_id, 'active', 'manual', now(), null)
  on conflict (user_id, course_id) do update set status = 'active', access_granted_at = now(), access_revoked_at = null
  returning * into result;

  select id into first_lesson_id from public.lessons
  where course_id = p_course_id and is_published order by lesson_order limit 1;
  if first_lesson_id is not null then
    insert into public.lesson_progress(enrollment_id, lesson_id, status, unlocked_at)
    values (result.id, first_lesson_id, 'available', now())
    on conflict (enrollment_id, lesson_id) do update set status = 'available', unlocked_at = coalesce(public.lesson_progress.unlocked_at, now());
  end if;
  insert into public.audit_log(actor_id, action, entity_type, entity_id)
  values (p_admin_id, 'access_granted', 'enrollment', result.id);
  return result;
end;
$$;

create or replace function public.unlock_next_lesson(p_admin_id uuid, p_enrollment_id uuid, p_lesson_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare current_lesson public.lessons%rowtype; next_lesson_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin' and not is_blocked) then
    raise exception 'admin required';
  end if;
  select * into current_lesson from public.lessons where id = p_lesson_id;
  select id into next_lesson_id from public.lessons
    where course_id = current_lesson.course_id and lesson_order > current_lesson.lesson_order and is_published
    order by lesson_order limit 1;
  if next_lesson_id is not null then
    insert into public.lesson_progress(enrollment_id, lesson_id, status, unlocked_at)
    values (p_enrollment_id, next_lesson_id, 'available', now())
    on conflict (enrollment_id, lesson_id) do update set status = 'available', unlocked_at = coalesce(public.lesson_progress.unlocked_at, now());
  end if;
  return next_lesson_id;
end;
$$;

create or replace function public.reorder_lesson_blocks(p_admin_id uuid, p_lesson_id uuid, p_block_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare block_id uuid; position integer := 0;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin' and not is_blocked) then
    raise exception 'admin required';
  end if;
  if (select count(*) from public.lesson_blocks where lesson_id = p_lesson_id) <> coalesce(array_length(p_block_ids, 1), 0)
    or exists (select 1 from unnest(p_block_ids) as submitted_id where not exists (select 1 from public.lesson_blocks b where b.id = submitted_id and b.lesson_id = p_lesson_id)) then
    raise exception 'invalid block list';
  end if;
  update public.lesson_blocks set block_order = block_order + 100000 where lesson_id = p_lesson_id;
  foreach block_id in array p_block_ids loop
    position := position + 1;
    update public.lesson_blocks set block_order = position where id = block_id and lesson_id = p_lesson_id;
  end loop;
end;
$$;

create or replace function public.reorder_lessons(p_admin_id uuid, p_course_id uuid, p_lesson_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare lesson_id uuid; position integer := 0;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin' and not is_blocked) then
    raise exception 'admin required';
  end if;
  if (select count(*) from public.lessons where course_id = p_course_id) <> coalesce(array_length(p_lesson_ids, 1), 0)
    or exists (select 1 from unnest(p_lesson_ids) as submitted_id where not exists (select 1 from public.lessons l where l.id = submitted_id and l.course_id = p_course_id)) then
    raise exception 'invalid lesson list';
  end if;
  update public.lessons set lesson_order = lesson_order + 100000 where course_id = p_course_id;
  foreach lesson_id in array p_lesson_ids loop
    position := position + 1;
    update public.lessons set lesson_order = position where id = lesson_id and course_id = p_course_id;
  end loop;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.save_submission(uuid, uuid, uuid, uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.review_submission(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.grant_course_access(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.unlock_next_lesson(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.reorder_lesson_blocks(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_lessons(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.save_submission(uuid, uuid, uuid, uuid, text, text, boolean) to service_role;
grant execute on function public.review_submission(uuid, uuid, text, text) to service_role;
grant execute on function public.grant_course_access(uuid, uuid, uuid) to service_role;
grant execute on function public.unlock_next_lesson(uuid, uuid, uuid) to service_role;
grant execute on function public.reorder_lesson_blocks(uuid, uuid, uuid[]) to service_role;
grant execute on function public.reorder_lessons(uuid, uuid, uuid[]) to service_role;
