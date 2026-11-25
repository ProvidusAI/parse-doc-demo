import type { Metadata } from "next";
import { LeaderboardPage } from "@/components/routes";

export const metadata: Metadata = { title: "Leaderboard · ProvidusBench" };

export default function Page() {
  return <LeaderboardPage lang="en" />;
}
