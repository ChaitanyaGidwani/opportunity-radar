import { AppShell } from "@/components/layout/app-shell";
import { ForYouClient } from "@/components/for-you/for-you-client";

export const metadata = { title: "For You" };

export default function ForYouPage() {
  return (
    <AppShell>
      <ForYouClient />
    </AppShell>
  );
}
