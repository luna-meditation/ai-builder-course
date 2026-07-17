import "server-only";

import { notFound } from "next/navigation";
import { canAccessCourse, canOpenLesson } from "@/lib/course-rules";
import { devBlocks, devCourse, devDashboard, devEnrollment, devLessons, devProfileForSession, devProfiles, devProgress, devSubmissions } from "@/lib/dev-fixtures";
import { isStandaloneDevPreview } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Course,
  CourseDashboard,
  Enrollment,
  Lesson,
  LessonBlock,
  LessonProgress,
  Profile,
  SessionUser,
  Submission,
  SubmissionFile,
} from "@/lib/types";

export class DataError extends Error {
  constructor(message: string, public readonly code = "DATA_ERROR") {
    super(message);
  }
}

function unwrap<T>(data: T | null, error: { message: string; code?: string } | null, message: string): T {
  if (error || data === null) {
    console.error("database_query_failed", { message, code: error?.code });
    throw new DataError(message);
  }
  return data;
}

export async function getActiveProfile(session: SessionUser, requiredRole?: "admin" | "student") {
  if (isStandaloneDevPreview()) {
    const profile = devProfileForSession(session);
    if (!profile) throw new DataError("Профиль не найден");
    if (requiredRole && profile.role !== requiredRole) throw new DataError("Недостаточно прав", "FORBIDDEN");
    return profile;
  }
  const result = await getAdminClient().from("profiles").select("*").eq("id", session.profileId).single();
  const profile = unwrap(result.data as Profile | null, result.error, "Профиль не найден");
  if (profile.is_blocked) throw new DataError("Пользователь заблокирован", "BLOCKED");
  if (requiredRole && profile.role !== requiredRole) throw new DataError("Недостаточно прав", "FORBIDDEN");
  return profile;
}

export async function getCourseDashboard(session: SessionUser): Promise<
  { access: true; dashboard: CourseDashboard } | { access: false; profile: Profile; supportUsername: string }
> {
  if (isStandaloneDevPreview()) {
    const profile = await getActiveProfile(session);
    if (profile.id === devProfiles.no_access.id) return { access: false, profile, supportUsername: "ai_builder_support" };
    return { access: true, dashboard: devDashboard(profile) };
  }
  const supabase = getAdminClient();
  const profile = await getActiveProfile(session);
  const enrollmentResult = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", profile.id)
    .in("status", ["active", "completed"])
    .order("access_granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settingsResult = await supabase.from("app_settings").select("value").eq("key", "support").maybeSingle();
  const supportValue = settingsResult.data?.value as { username?: string } | undefined;

  if (!enrollmentResult.data) {
    return { access: false, profile, supportUsername: supportValue?.username ?? "support" };
  }

  const enrollment = enrollmentResult.data as Enrollment;
  if (!canAccessCourse({ hasEnrollment: true, enrollmentStatus: enrollment.status, isBlocked: profile.is_blocked })) {
    return { access: false, profile, supportUsername: supportValue?.username ?? "support" };
  }

  const [courseResult, lessonsResult, progressResult] = await Promise.all([
    supabase.from("courses").select("*").eq("id", enrollment.course_id).single(),
    supabase.from("lessons").select("*").eq("course_id", enrollment.course_id).eq("is_published", true).order("lesson_order"),
    supabase.from("lesson_progress").select("*").eq("enrollment_id", enrollment.id),
  ]);

  const course = unwrap(courseResult.data as Course | null, courseResult.error, "Курс не найден");
  const lessons = unwrap(lessonsResult.data as Lesson[] | null, lessonsResult.error, "Не удалось загрузить уроки");
  const progress = unwrap(progressResult.data as LessonProgress[] | null, progressResult.error, "Не удалось загрузить прогресс");
  const progressMap = new Map(progress.map((item) => [item.lesson_id, item]));
  const withProgress = lessons.map((lesson) => ({ lesson, progress: progressMap.get(lesson.id) ?? null }));
  const completedCount = withProgress.filter((item) => item.progress?.status === "completed").length;

  return {
    access: true,
    dashboard: {
      profile,
      course,
      enrollment,
      lessons: withProgress.map(({ lesson, progress: lessonProgress }) => ({ ...lesson, progress: lessonProgress })),
      percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
      completedCount,
    },
  };
}

async function addSignedUrls(files: SubmissionFile[]) {
  if (!files.length) return files;
  const supabase = getAdminClient();
  return Promise.all(
    files.map(async (file) => {
      const { data } = await supabase.storage.from("submission-files").createSignedUrl(file.storage_path, 900);
      return { ...file, signed_url: data?.signedUrl };
    }),
  );
}

export async function getLessonData(session: SessionUser, courseSlug: string, lessonSlug: string) {
  if (isStandaloneDevPreview()) {
    const profile = await getActiveProfile(session);
    const lesson = devLessons.find((item) => item.slug === lessonSlug && courseSlug === devCourse.slug);
    if (!lesson || profile.id === devProfiles.no_access.id) notFound();
    const progress = devProgress.find((item) => item.lesson_id === lesson.id)!;
    return {
      profile, course: devCourse, enrollment: devEnrollment, lesson, progress,
      blocks: devBlocks.filter((block) => block.lesson_id === lesson.id),
      submissions: devSubmissions.filter((submission) => submission.lesson_id === lesson.id),
      allLessons: devLessons.map(({ id, slug, title, lesson_order }) => ({ id, slug, title, lesson_order })),
    };
  }
  const supabase = getAdminClient();
  const profile = await getActiveProfile(session);
  const courseResult = await supabase.from("courses").select("*").eq("slug", courseSlug).eq("status", "published").single();
  if (!courseResult.data) notFound();
  const course = courseResult.data as Course;

  const enrollmentResult = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", profile.id)
    .eq("course_id", course.id)
    .in("status", ["active", "completed"])
    .maybeSingle();
  if (!enrollmentResult.data) notFound();
  const enrollment = enrollmentResult.data as Enrollment;

  const lessonResult = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .eq("is_published", true)
    .single();
  if (!lessonResult.data) notFound();
  const lesson = lessonResult.data as Lesson & { assignment_description: string };

  const progressResult = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("enrollment_id", enrollment.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  const progress = progressResult.data as LessonProgress | null;
  if (!canOpenLesson({
    isBlocked: profile.is_blocked,
    hasActiveEnrollment: enrollment.status === "active" || enrollment.status === "completed",
    isPublished: lesson.is_published,
    progressStatus: progress?.status ?? null,
  })) notFound();

  if (progress?.status === "available") {
    await supabase
      .from("lesson_progress")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", progress.id);
    progress.status = "in_progress";
  }

  const [blocksResult, submissionsResult, allLessonsResult] = await Promise.all([
    supabase.from("lesson_blocks").select("*").eq("lesson_id", lesson.id).order("block_order"),
    supabase
      .from("submissions")
      .select("*, submission_files(*), submission_comments(*)")
      .eq("user_id", profile.id)
      .eq("lesson_id", lesson.id)
      .order("attempt_number", { ascending: false }),
    supabase.from("lessons").select("id,slug,title,lesson_order").eq("course_id", course.id).eq("is_published", true).order("lesson_order"),
  ]);

  const blocks = unwrap(blocksResult.data as LessonBlock[] | null, blocksResult.error, "Не удалось загрузить материалы");
  const submissions = unwrap(submissionsResult.data as Submission[] | null, submissionsResult.error, "Не удалось загрузить задание");
  const submissionsWithUrls = await Promise.all(
    submissions.map(async (submission) => ({
      ...submission,
      submission_files: await addSignedUrls(submission.submission_files ?? []),
      submission_comments: (submission.submission_comments ?? []).filter((comment) => comment.is_visible_to_student),
    })),
  );

  return {
    profile,
    course,
    enrollment,
    lesson,
    progress: progress!,
    blocks,
    submissions: submissionsWithUrls,
    allLessons: (allLessonsResult.data ?? []) as Array<Pick<Lesson, "id" | "slug" | "title" | "lesson_order">>,
  };
}

export async function getProfileData(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    const result = await getCourseDashboard(session);
    return result.access ? { ...result, submissionCount: devSubmissions.length } : { ...result, submissionCount: 0 };
  }
  const result = await getCourseDashboard(session);
  if (!result.access) return { ...result, submissionCount: 0 };
  const { count } = await getAdminClient()
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", result.dashboard.profile.id)
    .neq("status", "draft");
  return { ...result, submissionCount: count ?? 0 };
}

export async function getCompletionData(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    const profile = await getActiveProfile(session);
    if (profile.id === devProfiles.no_access.id) return null;
    const latestByLesson = new Map<string, { external_url: string | null; text_content: string; status: string }>();
    for (const item of devSubmissions) if (!latestByLesson.has(item.lesson_id)) latestByLesson.set(item.lesson_id, item);
    return { dashboard: { ...devDashboard(profile), enrollment: { ...devEnrollment, status: "completed" as const, completed_at: nowIso() } }, latestByLesson };
  }
  const result = await getCourseDashboard(session);
  if (!result.access || result.dashboard.enrollment.status !== "completed") return null;
  const { data } = await getAdminClient()
    .from("submissions")
    .select("lesson_id,external_url,text_content,status,attempt_number")
    .eq("enrollment_id", result.dashboard.enrollment.id)
    .neq("status", "draft")
    .order("attempt_number", { ascending: false });
  const latestByLesson = new Map<string, { external_url: string | null; text_content: string; status: string }>();
  for (const item of data ?? []) if (!latestByLesson.has(item.lesson_id)) latestByLesson.set(item.lesson_id, item);
  return { dashboard: result.dashboard, latestByLesson };
}

export async function getAdminDashboard(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    await getActiveProfile(session, "admin");
    return { students: 2, active: 1, completed: 0, review: 1, revision: 1, averageProgress: 40, audit: [
      { id: 1, action: "submission_revision", created_at: "2026-07-17T04:00:00.000Z", profiles: { first_name: "Евгений", username: "ai_builder_admin" } },
      { id: 2, action: "access_granted", created_at: "2026-07-16T04:00:00.000Z", profiles: { first_name: "Евгений", username: "ai_builder_admin" } },
    ] };
  }
  await getActiveProfile(session, "admin");
  const supabase = getAdminClient();
  const [students, active, completed, review, revision, progress, audit] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).in("status", ["submitted", "in_review"]),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "revision_requested"),
    supabase.from("lesson_progress").select("status"),
    supabase.from("audit_log").select("*, profiles(first_name, username)").order("created_at", { ascending: false }).limit(8),
  ]);
  const statuses = (progress.data ?? []) as Array<{ status: string }>;
  const averageProgress = statuses.length
    ? Math.round((statuses.filter((item) => item.status === "completed").length / statuses.length) * 100)
    : 0;
  return {
    students: students.count ?? 0,
    active: active.count ?? 0,
    completed: completed.count ?? 0,
    review: review.count ?? 0,
    revision: revision.count ?? 0,
    averageProgress,
    audit: audit.data ?? [],
  };
}

export async function getAdminStudents(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    await getActiveProfile(session, "admin");
    return { rows: [
      { profile: devProfiles.student, enrollment: devEnrollment, progressPercent: 40, currentLesson: 5 },
      { profile: devProfiles.no_access, enrollment: null, progressPercent: 0, currentLesson: 1 },
    ], courses: [{ id: devCourse.id, title: devCourse.title }] };
  }
  await getActiveProfile(session, "admin");
  const supabase = getAdminClient();
  const [profilesResult, enrollmentsResult, progressResult, coursesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("last_seen_at", { ascending: false }),
    supabase.from("enrollments").select("*").order("access_granted_at", { ascending: false }),
    supabase.from("lesson_progress").select("*"),
    supabase.from("courses").select("id,title").eq("status", "published"),
  ]);
  const profiles = (profilesResult.data ?? []) as Profile[];
  const enrollments = (enrollmentsResult.data ?? []) as Enrollment[];
  const progress = (progressResult.data ?? []) as LessonProgress[];
  const rows = profiles.map((profile) => {
    const enrollment = enrollments.find((item) => item.user_id === profile.id) ?? null;
    const statuses = enrollment ? progress.filter((item) => item.enrollment_id === enrollment.id) : [];
    const completed = statuses.filter((item) => item.status === "completed").length;
    const unlocked = statuses.filter((item) => item.status !== "locked").length;
    return {
      profile,
      enrollment,
      progressPercent: statuses.length ? Math.round((completed / statuses.length) * 100) : 0,
      currentLesson: Math.max(1, unlocked),
    };
  });
  return { rows, courses: (coursesResult.data ?? []) as Array<{ id: string; title: string }> };
}

export async function getAdminStudentDetail(session: SessionUser, profileId: string) {
  if (isStandaloneDevPreview()) {
    await getActiveProfile(session, "admin");
    const profile = Object.values(devProfiles).find((item) => item.id === profileId);
    if (!profile) notFound();
    if (profile.id === devProfiles.no_access.id) return { profile, enrollment: null, course: null, lessons: [], submissions: [] };
    return {
      profile, enrollment: devEnrollment, course: devCourse,
      lessons: devLessons.map((lesson) => ({ ...lesson, progress: devProgress.find((item) => item.lesson_id === lesson.id) ?? null })),
      submissions: devSubmissions.map((submission) => ({ ...submission, lessons: devLessons.find((lesson) => lesson.id === submission.lesson_id) })),
    };
  }
  await getActiveProfile(session, "admin");
  const supabase = getAdminClient();
  const profileResult = await supabase.from("profiles").select("*").eq("id", profileId).single();
  if (!profileResult.data) notFound();
  const profile = profileResult.data as Profile;
  const enrollmentResult = await supabase.from("enrollments").select("*").eq("user_id", profileId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const enrollment = enrollmentResult.data as Enrollment | null;
  if (!enrollment) return { profile, enrollment: null, course: null, lessons: [], submissions: [] };
  const [courseResult, lessonsResult, progressResult, submissionsResult] = await Promise.all([
    supabase.from("courses").select("*").eq("id", enrollment.course_id).single(),
    supabase.from("lessons").select("*").eq("course_id", enrollment.course_id).order("lesson_order"),
    supabase.from("lesson_progress").select("*").eq("enrollment_id", enrollment.id),
    supabase.from("submissions").select("*, lessons(title,lesson_order), submission_comments(*)").eq("user_id", profileId).order("created_at", { ascending: false }),
  ]);
  const progress = (progressResult.data ?? []) as LessonProgress[];
  return {
    profile,
    enrollment,
    course: courseResult.data as Course,
    lessons: ((lessonsResult.data ?? []) as Lesson[]).map((lesson) => ({ ...lesson, progress: progress.find((item) => item.lesson_id === lesson.id) ?? null })),
    submissions: submissionsResult.data ?? [],
  };
}

export async function getAdminSubmissions(session: SessionUser, status?: string) {
  if (isStandaloneDevPreview()) {
    await getActiveProfile(session, "admin");
    return devSubmissions.filter((submission) => !status || submission.status === status).map((submission) => ({
      ...submission, profiles: devProfiles.student,
      lessons: devLessons.find((lesson) => lesson.id === submission.lesson_id),
      submission_files: submission.submission_files ?? [],
      submission_comments: (submission.submission_comments ?? []).map((comment) => ({ ...comment, profiles: { first_name: devProfiles.admin.first_name } })),
    }));
  }
  await getActiveProfile(session, "admin");
  let query = getAdminClient()
    .from("submissions")
    .select("*, profiles!submissions_user_id_fkey(id,first_name,last_name,username,telegram_user_id), lessons(id,title,lesson_order), submission_files(*), submission_comments(*, profiles!submission_comments_author_id_fkey(first_name))")
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });
  if (status && ["submitted", "in_review", "revision_requested", "approved"].includes(status)) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) throw new DataError("Не удалось загрузить очередь заданий");
  return Promise.all((data ?? []).map(async (submission) => ({
    ...submission,
    submission_files: await addSignedUrls((submission.submission_files ?? []) as SubmissionFile[]),
  })));
}

export async function getCourseEditorData(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    await getActiveProfile(session, "admin");
    return { course: devCourse, lessons: devLessons.map((lesson) => ({ ...lesson, blocks: devBlocks.filter((block) => block.lesson_id === lesson.id) })) };
  }
  await getActiveProfile(session, "admin");
  const supabase = getAdminClient();
  const courseResult = await supabase.from("courses").select("*").order("created_at").limit(1).single();
  const course = unwrap(courseResult.data as Course | null, courseResult.error, "Курс не найден");
  const [lessonsResult, blocksResult] = await Promise.all([
    supabase.from("lessons").select("*").eq("course_id", course.id).order("lesson_order"),
    supabase.from("lesson_blocks").select("*").order("block_order"),
  ]);
  const lessons = (lessonsResult.data ?? []) as Array<Lesson & { assignment_description: string }>;
  const blocks = (blocksResult.data ?? []) as LessonBlock[];
  return { course, lessons: lessons.map((lesson) => ({ ...lesson, blocks: blocks.filter((block) => block.lesson_id === lesson.id) })) };
}

export async function getAppSettings(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    await getActiveProfile(session, "admin");
    return [
      { key: "branding", value: { project_name: "AI BUILDER", logo_text: "AB", primary_color: "#6d5dfc" } },
      { key: "support", value: { username: "ai_builder_support", no_access_text: "Доступ выдаётся вручную после подтверждения участия." } },
      { key: "uploads", value: { max_file_size_mb: 25 } },
      { key: "notifications", value: { enabled: true } },
    ];
  }
  await getActiveProfile(session, "admin");
  const { data, error } = await getAdminClient().from("app_settings").select("key,value").order("key");
  if (error) throw new DataError("Не удалось загрузить настройки");
  return data ?? [];
}

function nowIso() {
  return "2026-07-17T04:00:00.000Z";
}
