import "server-only";

import { revalidateTag } from "next/cache";

export const ADMIN_DATA_TAG = "admin-data-v1";
export const STUDENT_CATALOG_TAG = "student-catalog-v1";

export function invalidateAdminData(options?: { catalog?: boolean }) {
  revalidateTag(ADMIN_DATA_TAG, { expire: 0 });
  if (options?.catalog) revalidateTag(STUDENT_CATALOG_TAG, { expire: 0 });
}
