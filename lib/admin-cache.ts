import "server-only";

import { revalidateTag } from "next/cache";

export const ADMIN_DATA_TAG = "admin-data-v1";

export function invalidateAdminData() {
  revalidateTag(ADMIN_DATA_TAG, { expire: 0 });
}
