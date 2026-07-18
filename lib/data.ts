import "server-only";

import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { hasCourseAccess, resolveAccessStatus } from "@/lib/auth/bootstrap";
import { canOpenLesson } from "@/lib/course-rules";
import { ADMIN_DATA_TAG, STUDENT_CATALOG_TAG } from "@/lib/admin-cache";
import { devBlocks, devCourse, devDashboard, devEnrollment, devLessons, devProfileForSession, devProfiles, devProgress, devSubmissions } from "@/lib/dev-fixtures";
import { isStandaloneDevPreview } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import { studentDataTag } from "@/lib/student-cache";
import type {
  AccessStatus,
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

export const getActiveProfile = cache(async (session: SessionUser, requiredRole?: "admin" | "student") => {
  if (isStandaloneDevPreview()) {
    const profile = devProfileForSession(session);
    if (!profile) throw new DataError("Профиль не найден");
    if (requiredRole && profile.role !== requiredRole) throw new DataError("Недостаточно прав", "FORBIDDEN");
    return profile;
  }
  const result = await getAdminClient().from("profiles").select("*").eq("id", session.profileId).single();
  const profile = unwrap(result.data as Profile | null, result.error, "Профиль не найден");
  if (String(profile.telegram_user_id) !== session.telegramUserId) throw new DataError("Сессия не соответствует профилю", "FORBIDDEN");
  if (profile.is_blocked) throw new DataError("Пользователь заблокирован", "BLOCKED");
  if (requiredRole && profile.role !== requiredRole) throw new DataError("Недостаточно прав", "FORBIDDEN");
  return profile;
});

const readCachedProfile = unstable_cache(async (profileId: string) => {
  const result = await getAdminClient().from("profiles").select("*").eq("id", profileId).single();
  return unwrap(result.data as Profile | null, result.error, "Профиль не найден");
}, ["active-profile-v1"], { revalidate: 30 });

export async function getCachedAdminProfile(session: SessionUser) {
  if (isStandaloneDevPreview()) return getActiveProfile(session, "admin");
  const profile = await readCachedProfile(session.profileId);
  if (String(profile.telegram_user_id) !== session.telegramUserId) throw new DataError("Сессия не соответствует профилю", "FORBIDDEN");
  if (profile.is_blocked) throw new DataError("Пользователь заблокирован", "BLOCKED");
  if (profile.role !== "admin") throw new DataError("Недостаточно прав", "FORBIDDEN");
  return profile;
}

type EnrollmentWithLearning = Enrollment & {
  lesson_progress: LessonProgress[];
  courses: Course | null;
};

type StudentBootstrap = {
  profile: Profile;
  enrollment: Enrollment | null;
  course: Course | null;
  progress: LessonProgress[];
  accessStatus: AccessStatus;
};

async function readStudentBootstrap(profileId: string, telegramUserId: string): Promise<StudentBootstrap> {
  const result = await getAdminClient()
    .from("profiles")
    .select("*, enrollments(*, lesson_progress(*), courses(*))")
    .eq("id", profileId)
    .single();
  type ProfileWithLearning = Profile & { enrollments: EnrollmentWithLearning[] };
  const row = unwrap(result.data as ProfileWithLearning | null, result.error, "Профиль не найден");
  if (String(row.telegram_user_id) !== telegramUserId) throw new DataError("Сессия не соответствует профилю", "FORBIDDEN");

  const enrollments = [...(row.enrollments ?? [])].sort((left, right) => right.access_granted_at.localeCompare(left.access_granted_at));
  const selected = enrollments.find((item) => item.status === "active" || item.status === "completed") ?? enrollments[0] ?? null;
  const profile = row as Profile;
  const accessStatus = resolveAccessStatus({ isBlocked: profile.is_blocked, enrollmentStatus: selected?.status });
  return {
    profile,
    enrollment: selected,
    course: selected?.courses ?? null,
    progress: selected?.lesson_progress ?? [],
    accessStatus,
  };
}

const loadStudentBootstrap = cache(async (profileId: string, telegramUserId: string) => unstable_cache(
  () => readStudentBootstrap(profileId, telegramUserId),
  ["student-bootstrap-v1", profileId, telegramUserId],
  { revalidate: 60, tags: [studentDataTag(profileId)] },
)());

type CatalogLesson = Lesson & { lesson_blocks: LessonBlock[] };

async function readCourseCatalog(courseId: string) {
  const supabase = getAdminClient();
  const [courseResult, lessonsResult] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).eq("status", "published").single(),
    supabase.from("lessons").select("*, lesson_blocks(*)").eq("course_id", courseId).eq("is_published", true).order("lesson_order"),
  ]);
  const course = unwrap(courseResult.data as Course | null, courseResult.error, "Курс не найден");
  const rawLessons = unwrap(lessonsResult.data as CatalogLesson[] | null, lessonsResult.error, "Не удалось загрузить уроки");
  const lessons = rawLessons.map((lesson) => ({
    ...lesson,
    lesson_blocks: [...(lesson.lesson_blocks ?? [])].sort((left, right) => left.block_order - right.block_order),
  }));
  return { course, lessons };
}

function getCourseCatalog(courseId: string) {
  return unstable_cache(
    () => readCourseCatalog(courseId),
    ["student-course-catalog-v1", courseId],
    { revalidate: 60, tags: [STUDENT_CATALOG_TAG] },
  )();
}

const readSupportUsername = unstable_cache(async () => {
  const result = await getAdminClient().from("app_settings").select("value").eq("key", "support").maybeSingle();
  const value = result.data?.value as { username?: string } | undefined;
  return value?.username ?? "support";
}, ["student-support-v1"], { revalidate: 60, tags: [STUDENT_CATALOG_TAG] });

const readPublishedCourse = unstable_cache(async () => {
  const result = await getAdminClient().from("courses").select("*").eq("status", "published").order("created_at").limit(1).single();
  return unwrap(result.data as Course | null, result.error, "Курс не найден");
}, ["student-published-course-v1"], { revalidate: 60, tags: [STUDENT_CATALOG_TAG] });

export async function getStudentAccessStatus(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    const profile = await getActiveProfile(session);
    return {
      profile,
      accessStatus: profile.id === devProfiles.no_access.id ? "no_access" as const : "active" as const,
    };
  }
  const bootstrap = await readStudentBootstrap(session.profileId, session.telegramUserId);
  return { profile: bootstrap.profile, accessStatus: bootstrap.accessStatus };
}

const previewStatuses: LessonProgress["status"][] = ["completed", "in_progress", "locked", "locked", "locked"];
const previewEnrollmentId = "d9999999-9999-4999-8999-999999999999";

function buildPreviewDashboard(profile: Profile, course: Course, lessons: Lesson[]): CourseDashboard {
  const studentProfile: Profile = { ...profile, role: "student" };
  const enrollment: Enrollment = {
    id: previewEnrollmentId,
    user_id: profile.id,
    course_id: course.id,
    status: "active",
    access_source: "admin_preview",
    plan: "preview",
    access_granted_at: profile.created_at,
    access_revoked_at: null,
    completed_at: null,
  };
  const lessonsWithProgress = lessons.map((lesson, index) => ({
    ...lesson,
    progress: {
      id: `f9999999-9999-4999-8999-${String(index + 1).padStart(12, "0")}`,
      enrollment_id: previewEnrollmentId,
      lesson_id: lesson.id,
      status: previewStatuses[index] ?? "available",
      unlocked_at: profile.created_at,
      started_at: index < 4 ? profile.created_at : null,
      submitted_at: index < 2 ? profile.created_at : null,
      approved_at: index < 2 ? profile.created_at : null,
      completed_at: index < 2 ? profile.created_at : null,
    } satisfies LessonProgress,
  }));
  const completedCount = lessonsWithProgress.filter((lesson) => lesson.progress.status === "completed").length;
  return {
    profile: studentProfile,
    course,
    enrollment,
    lessons: lessonsWithProgress,
    completedCount,
    percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
  };
}

async function getAdminStudentPreview(session: SessionUser) {
  const [profile, publishedCourse] = await Promise.all([getCachedAdminProfile(session), isStandaloneDevPreview() ? Promise.resolve(devCourse) : readPublishedCourse()]);
  if (isStandaloneDevPreview()) return buildPreviewDashboard(profile, devCourse, devLessons);
  const catalog = await getCourseCatalog(publishedCourse.id);
  const lessons = catalog.lessons.map((lesson) => {
    const { lesson_blocks: blocks, ...lessonData } = lesson;
    void blocks;
    return lessonData;
  });
  return buildPreviewDashboard(profile, catalog.course, lessons);
}

export async function getCourseDashboard(session: SessionUser): Promise<
  { access: true; dashboard: CourseDashboard } | { access: false; profile: Profile; supportUsername: string; accessStatus: AccessStatus }
> {
  if (session.role === "admin" && session.previewAsStudent) {
    return { access: true, dashboard: await getAdminStudentPreview(session) };
  }
  if (isStandaloneDevPreview()) {
    const profile = await getActiveProfile(session);
    if (profile.id === devProfiles.no_access.id) return { access: false, profile, supportUsername: "ai_builder_support", accessStatus: "no_access" };
    return { access: true, dashboard: devDashboard(profile) };
  }
  const bootstrap = await loadStudentBootstrap(session.profileId, session.telegramUserId);
  if (!hasCourseAccess(bootstrap.accessStatus) || !bootstrap.enrollment) {
    return {
      access: false,
      profile: bootstrap.profile,
      supportUsername: await readSupportUsername(),
      accessStatus: bootstrap.accessStatus,
    };
  }

  const { course, lessons } = await getCourseCatalog(bootstrap.enrollment.course_id);
  const progressMap = new Map(bootstrap.progress.map((item) => [item.lesson_id, item]));
  const withProgress = lessons.map((lesson) => ({ lesson, progress: progressMap.get(lesson.id) ?? null }));
  const completedCount = withProgress.filter((item) => item.progress?.status === "completed").length;

  return {
    access: true,
    dashboard: {
      profile: bootstrap.profile,
      course,
      enrollment: bootstrap.enrollment,
      lessons: withProgress.map(({ lesson, progress: lessonProgress }) => {
        const { lesson_blocks: blocks, ...lessonData } = lesson;
        void blocks;
        return { ...lessonData, progress: lessonProgress };
      }),
      percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
      completedCount,
    },
  };
}

async function addSignedUrls(files: SubmissionFile[]) {
  if (!files.length) return files;
  const supabase = getAdminClient();
  const { data } = await supabase.storage.from("submission-files").createSignedUrls(files.map((file) => file.storage_path), 900);
  const signedByPath = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
  return files.map((file) => ({ ...file, signed_url: signedByPath.get(file.storage_path) ?? undefined }));
}

export async function getLessonData(session: SessionUser, courseSlug: string, lessonSlug: string) {
  if (session.role === "admin" && session.previewAsStudent) {
    const dashboard = await getAdminStudentPreview(session);
    if (dashboard.course.slug !== courseSlug) notFound();
    const lesson = dashboard.lessons.find((item) => item.slug === lessonSlug);
    if (!lesson) notFound();
    const blocks = isStandaloneDevPreview()
      ? devBlocks.filter((block) => block.lesson_id === lesson.id)
      : (await getCourseCatalog(dashboard.course.id)).lessons.find((item) => item.id === lesson.id)?.lesson_blocks ?? [];
    return {
      profile: dashboard.profile,
      course: dashboard.course,
      enrollment: dashboard.enrollment,
      lesson,
      progress: lesson.progress!,
      blocks,
      submissions: [] as Submission[],
      allLessons: dashboard.lessons.map(({ id, slug, title, lesson_order, progress }) => ({ id, slug, title, lesson_order, status: progress?.status ?? "locked" })),
      shouldMarkStarted: false,
    };
  }
  if (isStandaloneDevPreview()) {
    const profile = await getActiveProfile(session);
    const lesson = devLessons.find((item) => item.slug === lessonSlug && courseSlug === devCourse.slug);
    if (!lesson || profile.id === devProfiles.no_access.id) notFound();
    const progress = devProgress.find((item) => item.lesson_id === lesson.id)!;
    return {
      profile, course: devCourse, enrollment: devEnrollment, lesson, progress,
      blocks: devBlocks.filter((block) => block.lesson_id === lesson.id),
      submissions: devSubmissions.filter((submission) => submission.lesson_id === lesson.id),
      allLessons: devLessons.map(({ id, slug, title, lesson_order }) => ({ id, slug, title, lesson_order, status: devProgress.find((item) => item.lesson_id === id)?.status ?? "locked" })),
      shouldMarkStarted: progress.status === "available",
    };
  }
  const supabase = getAdminClient();
  const bootstrap = await loadStudentBootstrap(session.profileId, session.telegramUserId);
  if (!hasCourseAccess(bootstrap.accessStatus) || !bootstrap.enrollment) notFound();
  const catalog = await getCourseCatalog(bootstrap.enrollment.course_id);
  if (catalog.course.slug !== courseSlug) notFound();
  const catalogLesson = catalog.lessons.find((item) => item.slug === lessonSlug);
  if (!catalogLesson) notFound();
  const { lesson_blocks: blocks, ...lesson } = catalogLesson;
  const progressMap = new Map(bootstrap.progress.map((item) => [item.lesson_id, item]));
  const storedProgress = progressMap.get(lesson.id) ?? null;
  if (!canOpenLesson({
    isBlocked: bootstrap.profile.is_blocked,
    hasActiveEnrollment: hasCourseAccess(bootstrap.accessStatus),
    isPublished: lesson.is_published,
    progressStatus: storedProgress?.status ?? null,
  })) notFound();

  const progress = storedProgress?.status === "available"
    ? { ...storedProgress, status: "in_progress" as const, started_at: storedProgress.started_at ?? new Date().toISOString() }
    : storedProgress;
  if (!progress) notFound();
  const submissionsResult = await supabase
    .from("submissions")
    .select("*, submission_files(*), submission_comments(*)")
    .eq("user_id", bootstrap.profile.id)
    .eq("lesson_id", lesson.id)
    .order("attempt_number", { ascending: false });

  const submissions = unwrap(submissionsResult.data as Submission[] | null, submissionsResult.error, "Не удалось загрузить задание");
  const signedFiles = await addSignedUrls(submissions.flatMap((submission) => submission.submission_files ?? []));
  const signedById = new Map(signedFiles.map((file) => [file.id, file]));
  const submissionsWithUrls = submissions.map((submission) => ({
      ...submission,
      submission_files: (submission.submission_files ?? []).map((file) => signedById.get(file.id) ?? file),
      submission_comments: (submission.submission_comments ?? []).filter((comment) => comment.is_visible_to_student),
    }));

  return {
    profile: bootstrap.profile,
    course: catalog.course,
    enrollment: bootstrap.enrollment,
    lesson,
    progress,
    blocks,
    submissions: submissionsWithUrls,
    allLessons: catalog.lessons.map(({ id, slug, title, lesson_order }) => ({
      id,
      slug,
      title,
      lesson_order,
      status: progressMap.get(id)?.status ?? "locked",
    })),
    shouldMarkStarted: storedProgress?.status === "available",
  };
}

export async function getProfileData(session: SessionUser) {
  if (isStandaloneDevPreview()) {
    const result = await getCourseDashboard(session);
    return result;
  }
  return getCourseDashboard(session);
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

const loadAdminDashboard = unstable_cache(async () => {
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
}, ["admin-dashboard-v1"], { revalidate: 30, tags: [ADMIN_DATA_TAG] });

export async function getAdminDashboard(session: SessionUser) {
  await getCachedAdminProfile(session);
  if (isStandaloneDevPreview()) {
    return { students: 2, active: 1, completed: 0, review: 1, revision: 1, averageProgress: 40, audit: [
      { id: 1, action: "submission_revision", created_at: "2026-07-17T04:00:00.000Z", profiles: { first_name: "Евгений", username: "ai_builder_admin" } },
      { id: 2, action: "access_granted", created_at: "2026-07-16T04:00:00.000Z", profiles: { first_name: "Евгений", username: "ai_builder_admin" } },
    ] };
  }
  return loadAdminDashboard();
}

const loadAdminStudents = unstable_cache(async () => {
  const supabase = getAdminClient();
  const [profilesResult, coursesResult] = await Promise.all([
    supabase.from("profiles").select("*, enrollments(*, lesson_progress(*))").eq("role", "student").order("last_seen_at", { ascending: false }),
    supabase.from("courses").select("id,title").eq("status", "published"),
  ]);
  type ProfileWithLearning = Profile & { enrollments: Array<Enrollment & { lesson_progress: LessonProgress[] }> };
  const profiles = (profilesResult.data ?? []) as ProfileWithLearning[];
  const rows = profiles.map(({ enrollments, ...profile }) => {
    const enrollmentWithProgress = [...enrollments].sort((a, b) => b.access_granted_at.localeCompare(a.access_granted_at))[0] ?? null;
    const enrollment = enrollmentWithProgress as Enrollment | null;
    const statuses = enrollmentWithProgress?.lesson_progress ?? [];
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
}, ["admin-students-v1"], { revalidate: 30, tags: [ADMIN_DATA_TAG] });

export async function getAdminStudents(session: SessionUser) {
  await getCachedAdminProfile(session);
  if (isStandaloneDevPreview()) {
    return { rows: [
      { profile: devProfiles.student, enrollment: devEnrollment, progressPercent: 40, currentLesson: 5 },
      { profile: devProfiles.no_access, enrollment: null, progressPercent: 0, currentLesson: 1 },
    ], courses: [{ id: devCourse.id, title: devCourse.title }] };
  }
  return loadAdminStudents();
}

const loadAdminStudentDetail = unstable_cache(async (profileId: string) => {
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
}, ["admin-student-detail-v1"], { revalidate: 30, tags: [ADMIN_DATA_TAG] });

export async function getAdminStudentDetail(session: SessionUser, profileId: string) {
  await getCachedAdminProfile(session);
  if (isStandaloneDevPreview()) {
    const profile = Object.values(devProfiles).find((item) => item.id === profileId);
    if (!profile) notFound();
    if (profile.id === devProfiles.no_access.id) return { profile, enrollment: null, course: null, lessons: [], submissions: [] };
    return {
      profile, enrollment: devEnrollment, course: devCourse,
      lessons: devLessons.map((lesson) => ({ ...lesson, progress: devProgress.find((item) => item.lesson_id === lesson.id) ?? null })),
      submissions: devSubmissions.map((submission) => ({ ...submission, lessons: devLessons.find((lesson) => lesson.id === submission.lesson_id) })),
    };
  }
  return loadAdminStudentDetail(profileId);
}

const loadAdminSubmissions = unstable_cache(async (status?: string) => {
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
}, ["admin-submissions-v1"], { revalidate: 30, tags: [ADMIN_DATA_TAG] });

export async function getAdminSubmissions(session: SessionUser, status?: string) {
  await getCachedAdminProfile(session);
  if (isStandaloneDevPreview()) {
    return devSubmissions.filter((submission) => !status || submission.status === status).map((submission) => ({
      ...submission, profiles: devProfiles.student,
      lessons: devLessons.find((lesson) => lesson.id === submission.lesson_id),
      submission_files: submission.submission_files ?? [],
      submission_comments: (submission.submission_comments ?? []).map((comment) => ({ ...comment, profiles: { first_name: devProfiles.admin.first_name } })),
    }));
  }
  return loadAdminSubmissions(status);
}

const loadCourseEditorData = unstable_cache(async () => {
  const supabase = getAdminClient();
  const courseResult = await supabase.from("courses").select("*").order("created_at").limit(1).single();
  const course = unwrap(courseResult.data as Course | null, courseResult.error, "Курс не найден");
  const lessonsResult = await supabase
    .from("lessons")
    .select("*, lesson_blocks(*)")
    .eq("course_id", course.id)
    .order("lesson_order")
    .order("block_order", { referencedTable: "lesson_blocks" });
  type LessonWithBlocks = Lesson & { assignment_description: string; lesson_blocks: LessonBlock[] };
  const lessons = (lessonsResult.data ?? []) as LessonWithBlocks[];
  return { course, lessons: lessons.map(({ lesson_blocks, ...lesson }) => ({ ...lesson, blocks: lesson_blocks })) };
}, ["admin-course-editor-v1"], { revalidate: 30, tags: [ADMIN_DATA_TAG] });

export async function getCourseEditorData(session: SessionUser) {
  await getCachedAdminProfile(session);
  if (isStandaloneDevPreview()) {
    return { course: devCourse, lessons: devLessons.map((lesson) => ({ ...lesson, blocks: devBlocks.filter((block) => block.lesson_id === lesson.id) })) };
  }
  return loadCourseEditorData();
}

const loadAppSettings = unstable_cache(async () => {
  const { data, error } = await getAdminClient().from("app_settings").select("key,value").order("key");
  if (error) throw new DataError("Не удалось загрузить настройки");
  return data ?? [];
}, ["admin-settings-v1"], { revalidate: 30, tags: [ADMIN_DATA_TAG] });

export async function getAppSettings(session: SessionUser) {
  await getCachedAdminProfile(session);
  if (isStandaloneDevPreview()) {
    return [
      { key: "branding", value: { project_name: "AI BUILDER", logo_text: "AB", primary_color: "#6d5dfc" } },
      { key: "support", value: { username: "ai_builder_support", no_access_text: "Доступ выдаётся вручную после подтверждения участия." } },
      { key: "uploads", value: { max_file_size_mb: 25 } },
      { key: "notifications", value: { enabled: true } },
    ];
  }
  return loadAppSettings();
}

function nowIso() {
  return "2026-07-17T04:00:00.000Z";
}
