import "server-only";

import { revalidateTag } from "next/cache";

export function studentDataTag(profileId: string) {
  return `student-data:${profileId}`;
}

export function invalidateStudentData(profileId: string) {
  revalidateTag(studentDataTag(profileId), { expire: 0 });
}
