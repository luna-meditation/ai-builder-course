export type Role = "student" | "admin" | "mentor";
export type StudentMode = "preview" | "learning";
export type AccessStatus = "active" | "completed" | "no_access" | "revoked" | "blocked";
export type UnlockRule = "after_submission" | "after_approval" | "manual" | "none";
export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "revision_requested"
  | "approved";

export type ProgressStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "submitted"
  | "in_review"
  | "revision_requested"
  | "completed";

export interface SessionUser {
  profileId: string;
  telegramUserId: string;
  role: Role;
  firstName: string;
  username: string | null;
  /** UI-only student view for a real administrator. Never changes the stored role. */
  previewAsStudent?: boolean;
  /** Separates read-only preview from a real, persisted admin enrollment. */
  studentMode?: StudentMode | null;
  /** True only for the first authenticated session after an atomic Telegram registration. */
  isNewUser?: boolean;
}

export interface Profile {
  id: string;
  telegram_user_id: string;
  username: string | null;
  first_name: string;
  last_name: string | null;
  language_code: string | null;
  photo_url: string | null;
  role: Role;
  is_blocked: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_url: string | null;
  status: "draft" | "published" | "archived";
  settings: Record<string, unknown>;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  short_description: string;
  lesson_order: number;
  expected_result: string;
  duration_minutes: number;
  difficulty: string;
  mission_steps: string[];
  assignment_criteria: string[];
  video_type: "youtube" | "vimeo" | "mp4" | "external" | null;
  video_url: string | null;
  unlock_rule: UnlockRule;
  assignment_required: boolean;
  assignment_description: string;
  is_published: boolean;
}

export interface LessonBlock {
  id: string;
  lesson_id: string;
  block_type:
    | "heading"
    | "paragraph"
    | "callout"
    | "checklist"
    | "prompt"
    | "image"
    | "video"
    | "file"
    | "link"
    | "divider";
  content: Record<string, unknown>;
  block_order: number;
  settings: Record<string, unknown>;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: "active" | "revoked" | "completed";
  access_source: string;
  plan: string;
  access_granted_at: string;
  access_revoked_at: string | null;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  status: ProgressStatus;
  unlocked_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  signed_url?: string;
}

export interface SubmissionComment {
  id: string;
  submission_id: string;
  author_id: string;
  comment: string;
  is_visible_to_student: boolean;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  enrollment_id: string;
  lesson_id: string;
  attempt_number: number;
  text_content: string;
  external_url: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  submission_files?: SubmissionFile[];
  submission_comments?: SubmissionComment[];
}

export interface CourseDashboard {
  profile: Profile;
  course: Course;
  enrollment: Enrollment;
  lessons: Array<Lesson & { progress: LessonProgress | null }>;
  percent: number;
  completedCount: number;
}
