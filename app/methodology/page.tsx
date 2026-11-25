import type { Metadata } from "next";
import { MethodologyPage } from "@/components/routes";

export const metadata: Metadata = { title: "Methodology · ProvidusBench" };

export default function Page() {
  return <MethodologyPage lang="en" />;
}
