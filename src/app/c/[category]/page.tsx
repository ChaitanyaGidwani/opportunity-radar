import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FeedClient } from "@/components/feed/feed-client";
import { CATEGORIES, type Category } from "@/lib/types";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!CATEGORIES.includes(category as Category)) notFound();
  return (
    <AppShell>
      <FeedClient initialCategory={category as Category} />
    </AppShell>
  );
}
