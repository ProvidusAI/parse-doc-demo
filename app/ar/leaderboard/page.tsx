import type { Metadata } from "next";
import { LeaderboardPage } from "@/components/routes";

export const metadata: Metadata = { title: "لوحة الصدارة · ProvidusBench" };

export default function Page() {
  return <LeaderboardPage lang="ar" />;
}
