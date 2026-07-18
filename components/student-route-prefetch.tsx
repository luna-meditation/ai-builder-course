"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export function StudentRoutePrefetch({ lessonHrefs = [] }: { lessonHrefs?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const lessonKey = lessonHrefs.join("|");
  const prefetchedKey = useRef("");

  useEffect(() => {
    const key = `${pathname}:${lessonKey}`;
    if (prefetchedKey.current === key) return;
    prefetchedKey.current = key;
    if (pathname !== "/course") router.prefetch("/course");
    if (pathname !== "/profile") router.prefetch("/profile");
    for (const href of lessonKey ? lessonKey.split("|") : []) {
      if (href.split("#", 1)[0] !== pathname) router.prefetch(href);
    }
  }, [lessonKey, pathname, router]);

  return null;
}
