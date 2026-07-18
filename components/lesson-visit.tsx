"use client";

import { useEffect, useRef } from "react";

export function LessonVisit({ enrollmentId, lessonId, disabled = false }: { enrollmentId: string; lessonId: string; disabled?: boolean }) {
  const sent = useRef(false);

  useEffect(() => {
    if (disabled || sent.current) return;
    sent.current = true;
    void fetch("/api/progress/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, lessonId }),
    });
  }, [disabled, enrollmentId, lessonId]);

  return null;
}
