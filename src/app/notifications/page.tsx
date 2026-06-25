import { AppShell } from "@/components/layout/app-shell";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export const metadata = { title: "Deadline nudges" };

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsClient />
    </AppShell>
  );
}
