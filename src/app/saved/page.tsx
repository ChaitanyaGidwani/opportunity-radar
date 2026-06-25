import { AppShell } from "@/components/layout/app-shell";
import { SavedClient } from "@/components/saved/saved-client";

export const metadata = { title: "Saved & tracked" };

export default function SavedPage() {
  return (
    <AppShell>
      <SavedClient />
    </AppShell>
  );
}
