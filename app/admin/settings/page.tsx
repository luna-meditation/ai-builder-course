import { AdminHeader } from "@/components/admin/admin-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireSession } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/data";

export default async function SettingsPage() {
  const session = await requireSession("admin"); const settings = await getAppSettings(session);
  return <><AdminHeader eyebrow="Конфигурация" title="Настройки" description="Изменяйте бренд, поддержку, ограничения загрузок и уведомления без правки компонентов." /><SettingsForm initial={settings as Array<{ key: string; value: Record<string, unknown> }>} /></>;
}
