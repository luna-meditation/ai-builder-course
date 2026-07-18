alter type public.block_type add value if not exists 'link';

alter table public.lessons
  add column if not exists duration_minutes integer not null default 30,
  add column if not exists difficulty text not null default 'Старт',
  add column if not exists mission_steps text[] not null default '{}'::text[],
  add column if not exists assignment_criteria text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lessons_duration_minutes_range'
      and conrelid = 'public.lessons'::regclass
  ) then
    alter table public.lessons
      add constraint lessons_duration_minutes_range
      check (duration_minutes between 1 and 600);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'lessons_difficulty_length'
      and conrelid = 'public.lessons'::regclass
  ) then
    alter table public.lessons
      add constraint lessons_difficulty_length
      check (char_length(difficulty) between 1 and 40);
  end if;
end
$$;

update public.lessons
set
  duration_minutes = case lesson_order
    when 1 then 25
    when 2 then 35
    when 3 then 45
    when 4 then 50
    when 5 then 30
    else duration_minutes
  end,
  difficulty = case lesson_order
    when 1 then 'Старт'
    when 2 then 'Легко'
    when 3 then 'Средне'
    when 4 then 'Средне'
    when 5 then 'Финал'
    else difficulty
  end,
  mission_steps = case
    when cardinality(mission_steps) = 0 then array[
      'Посмотреть вводное видео',
      'Пройти материал по порядку',
      'Использовать промпты миссии',
      'Собрать результат и отправить практику'
    ]::text[]
    else mission_steps
  end,
  assignment_criteria = case
    when cardinality(assignment_criteria) = 0 then array[
      'Результат открывается и работает',
      'В ответе есть краткое описание выполненной работы',
      'Добавлена ссылка или файл, если они нужны для проверки'
    ]::text[]
    else assignment_criteria
  end;

update public.lesson_blocks
set
  content = case
    when coalesce(content ->> 'tool', '') = ''
      then jsonb_set(content, '{tool}', '"ChatGPT"'::jsonb, true)
    else content
  end,
  settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'preview_enabled', coalesce((settings ->> 'preview_enabled')::boolean, true),
    'preview_lines', coalesce((settings ->> 'preview_lines')::integer, 6)
  )
where block_type = 'prompt';

create or replace function public.enable_admin_student_mode(
  p_admin_id uuid,
  p_course_id uuid
)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_previous_status public.enrollment_status;
  v_first_lesson_id uuid;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_admin_id and role = 'admin' and not is_blocked
  ) then
    raise exception 'admin required';
  end if;

  if not exists (
    select 1
    from public.courses
    where id = p_course_id and status = 'published'
  ) then
    raise exception 'published course required';
  end if;

  select status
  into v_previous_status
  from public.enrollments
  where user_id = p_admin_id and course_id = p_course_id
  for update;

  insert into public.enrollments as enrollment (
    user_id,
    course_id,
    status,
    access_source,
    plan,
    access_granted_at,
    access_revoked_at
  ) values (
    p_admin_id,
    p_course_id,
    'active',
    'admin_student_mode',
    'internal',
    now(),
    null
  )
  on conflict (user_id, course_id) do update
  set
    status = case
      when enrollment.status = 'completed' then enrollment.status
      else 'active'::public.enrollment_status
    end,
    access_source = case
      when enrollment.status = 'completed' then enrollment.access_source
      else 'admin_student_mode'
    end,
    access_granted_at = case
      when enrollment.status = 'revoked' then now()
      else enrollment.access_granted_at
    end,
    access_revoked_at = null,
    completed_at = case
      when enrollment.status = 'completed' then enrollment.completed_at
      else null
    end
  returning * into v_enrollment;

  select id
  into v_first_lesson_id
  from public.lessons
  where course_id = p_course_id and is_published
  order by lesson_order
  limit 1;

  if v_first_lesson_id is not null then
    insert into public.lesson_progress (enrollment_id, lesson_id, status, unlocked_at)
    values (v_enrollment.id, v_first_lesson_id, 'available', now())
    on conflict (enrollment_id, lesson_id) do nothing;
  end if;

  if v_previous_status is null or v_previous_status = 'revoked' then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
    values (
      p_admin_id,
      'admin_student_mode_enabled',
      'enrollment',
      v_enrollment.id,
      jsonb_build_object('course_id', p_course_id)
    );
  end if;

  return v_enrollment;
end;
$$;

revoke all on function public.enable_admin_student_mode(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.enable_admin_student_mode(uuid, uuid)
  to service_role;

create index if not exists enrollments_course_id_idx
  on public.enrollments(course_id);
create index if not exists lesson_progress_lesson_id_idx
  on public.lesson_progress(lesson_id);
create index if not exists submissions_lesson_id_idx
  on public.submissions(lesson_id);
create index if not exists submissions_reviewed_by_idx
  on public.submissions(reviewed_by)
  where reviewed_by is not null;
create index if not exists submission_files_submission_id_idx
  on public.submission_files(submission_id);
create index if not exists submission_comments_author_id_idx
  on public.submission_comments(author_id);
create index if not exists analytics_events_user_id_idx
  on public.analytics_events(user_id)
  where user_id is not null;
create index if not exists audit_log_actor_id_idx
  on public.audit_log(actor_id)
  where actor_id is not null;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/quicktime'
]::text[]
where id = 'submission-files';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.jwt_telegram_user_id()
returns bigint
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_user_id', '')::bigint
$$;

revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_profile_id() to authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated, service_role;
