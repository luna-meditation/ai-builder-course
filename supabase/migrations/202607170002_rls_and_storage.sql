create or replace function public.jwt_telegram_user_id()
returns bigint language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_user_id', '')::bigint
$$;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where telegram_user_id = public.jwt_telegram_user_id()
$$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = public.current_profile_id() and role = 'admin' and not is_blocked
  )
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;
alter table public.submission_comments enable row level security;
alter table public.notifications_log enable row level security;
alter table public.app_settings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.audit_log enable row level security;

create policy "profile own or admin read" on public.profiles for select to authenticated
  using (id = public.current_profile_id() or public.current_user_is_admin());
create policy "published enrolled courses read" on public.courses for select to authenticated
  using (public.current_user_is_admin() or exists (
    select 1 from public.enrollments e where e.course_id = courses.id and e.user_id = public.current_profile_id() and e.status in ('active', 'completed')
  ));
create policy "unlocked lessons read" on public.lessons for select to authenticated
  using (public.current_user_is_admin() or exists (
    select 1 from public.lesson_progress lp join public.enrollments e on e.id = lp.enrollment_id
    where lp.lesson_id = lessons.id and e.user_id = public.current_profile_id() and e.status in ('active', 'completed') and lp.status <> 'locked'
  ));
create policy "unlocked lesson blocks read" on public.lesson_blocks for select to authenticated
  using (public.current_user_is_admin() or exists (
    select 1 from public.lesson_progress lp join public.enrollments e on e.id = lp.enrollment_id
    where lp.lesson_id = lesson_blocks.lesson_id and e.user_id = public.current_profile_id() and e.status in ('active', 'completed') and lp.status <> 'locked'
  ));
create policy "own enrollment read" on public.enrollments for select to authenticated
  using (user_id = public.current_profile_id() or public.current_user_is_admin());
create policy "own progress read" on public.lesson_progress for select to authenticated
  using (public.current_user_is_admin() or exists (
    select 1 from public.enrollments e where e.id = lesson_progress.enrollment_id and e.user_id = public.current_profile_id()
  ));
create policy "own submissions read" on public.submissions for select to authenticated
  using (user_id = public.current_profile_id() or public.current_user_is_admin());
create policy "own submission files read" on public.submission_files for select to authenticated
  using (public.current_user_is_admin() or exists (
    select 1 from public.submissions s where s.id = submission_files.submission_id and s.user_id = public.current_profile_id()
  ));
create policy "visible own comments read" on public.submission_comments for select to authenticated
  using (public.current_user_is_admin() or (is_visible_to_student and exists (
    select 1 from public.submissions s where s.id = submission_comments.submission_id and s.user_id = public.current_profile_id()
  )));
create policy "own notifications read" on public.notifications_log for select to authenticated
  using (user_id = public.current_profile_id() or public.current_user_is_admin());
create policy "settings admin read" on public.app_settings for select to authenticated
  using (public.current_user_is_admin());
create policy "audit admin read" on public.audit_log for select to authenticated
  using (public.current_user_is_admin());

revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.courses, public.lessons, public.lesson_blocks, public.enrollments,
  public.lesson_progress, public.submissions, public.submission_files, public.submission_comments,
  public.notifications_log, public.app_settings, public.audit_log to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('submission-files', 'submission-files', false, 26214400),
  ('course-materials', 'course-materials', false, 26214400),
  ('course-images', 'course-images', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy "students read own submission objects" on storage.objects for select to authenticated
  using (
    bucket_id = 'submission-files' and
    ((storage.foldername(name))[2] = public.jwt_telegram_user_id()::text or public.current_user_is_admin())
  );
create policy "admins read course storage" on storage.objects for select to authenticated
  using (bucket_id in ('course-materials', 'course-images') and public.current_user_is_admin());
