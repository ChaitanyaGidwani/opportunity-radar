import { AppShell } from "@/components/layout/app-shell";
import { ProfileClient } from "@/components/profile/profile-client";
import { AuthGuard } from "@/components/profile/auth-guard";

export const metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <AppShell>
      <AuthGuard>
        <ProfileClient />
      </AuthGuard>
    </AppShell>
  );
}
