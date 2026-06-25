import { AppShell } from "@/components/layout/app-shell";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileClient />
    </AppShell>
  );
}
