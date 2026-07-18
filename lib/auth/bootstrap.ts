import type { TelegramUser } from "@/lib/auth/telegram";
import type { AccessStatus, Enrollment, Role } from "@/lib/types";

export function telegramProfileRpcInput(user: TelegramUser, bootstrapAdmin: boolean) {
  return {
    p_telegram_user_id: user.id,
    p_username: user.username ?? null,
    p_first_name: user.first_name,
    p_last_name: user.last_name ?? null,
    p_language_code: user.language_code ?? null,
    p_photo_url: user.photo_url ?? null,
    p_bootstrap_admin: bootstrapAdmin,
  };
}

export function resolveAccessStatus({
  isBlocked,
  enrollmentStatus,
}: {
  isBlocked: boolean;
  enrollmentStatus?: Enrollment["status"] | null;
}): AccessStatus {
  if (isBlocked) return "blocked";
  if (enrollmentStatus === "active" || enrollmentStatus === "completed" || enrollmentStatus === "revoked") {
    return enrollmentStatus;
  }
  return "no_access";
}

export function hasCourseAccess(status: AccessStatus) {
  return status === "active" || status === "completed";
}

export function bootstrapDestination(role: Role, accessStatus: AccessStatus) {
  if (role === "admin") return "/admin";
  return hasCourseAccess(accessStatus) ? "/course" : "/course";
}
