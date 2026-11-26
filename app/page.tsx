import type { Metadata } from "next";
import BenchHome from "@/components/bench/BenchHome";
import { loadManifest } from "@/lib/manifest";

export const metadata: Metadata = {
  title: "ProvidusBench — The benchmark for document parsing performance",
  description: "Compare document parsing systems across accuracy, structure, speed and cost on real Arabic and English pages.",
  icons: { icon: "/brand/logo-mono.png" },
};

export default async function Home() {
  return <BenchHome manifest={await loadManifest()} />;
}
