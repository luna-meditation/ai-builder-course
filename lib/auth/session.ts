import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { cache } from "react";
import { z } from "zod";
import { canAccessAdminSurface, canMutateWhilePreviewing } from "@/lib/auth/access";
import { getServerEnv, isDevLoginEnabled } from "@/lib/env";
import type { Role, SessionUser } from "@/lib/types";

const COOKIE_NAME = "ai_builder_session";
const sessionSchema = z.object({
  profileId: z.uuid(),
  telegramUserId: z.string().min(1),
  role: z.enum(["student", "admin", "mentor"]),
  firstName: z.string().min(1),
  username: z.string().nullable(),
  previewAsStudent: z.boolean().optional().default(false),
  studentMode: z.enum(["preview", "learning"]).nullable().optional().default(null),
  isNewUser: z.boolean().optional().default(false),
});

function getSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (isDevLoginEnabled()) return new TextEncoder().encode("ai-builder-local-preview-secret-only");
  const sessionSecret = getServerEnv().SESSION_SECRET;
  if (!sessionSecret) throw new Error("SESSION_SECRET не настроен");
  return new TextEncoder().encode(sessionSecret);
}

export async function createSession(user: SessionUser) {
  const isProduction = process.env.NODE_ENV === "production";
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("ai-builder")
    .setAudience("ai-builder-web")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    partitioned: isProduction,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSession() {
  const store = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    partitioned: isProduction,
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });
}

const readSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "ai-builder",
      audience: "ai-builder-web",
    });
    return sessionSchema.parse(payload);
  } catch {
    return null;
  }
});

export async function getSession() {
  return readSession();
}

export async function requireSession(role?: Role) {
  const session = await getSession();
  if (!session) redirect("/");
  if (role === "admin" && !canAccessAdminSurface(session)) redirect("/course");
  if (role && role !== "admin" && session.role !== role) redirect("/course");
  return session;
}

export async function requireApiSession(role?: Role) {
  const session = await getSession();
  if (!session) return { error: "Необходима авторизация", status: 401 as const };
  if (!canMutateWhilePreviewing(session)) return { error: "В режиме предпросмотра изменения отключены", status: 403 as const };
  if (role === "admin" && !canAccessAdminSurface(session)) return { error: "Недостаточно прав", status: 403 as const };
  if (role && role !== "admin" && session.role !== role) return { error: "Недостаточно прав", status: 403 as const };
  return { session };
}
