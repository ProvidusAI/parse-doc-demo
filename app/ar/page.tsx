import type { Metadata } from "next";
import BenchHome from "@/components/bench/BenchHome";
import { loadManifest } from "@/lib/manifest";

export const metadata: Metadata = {
  title: "ProvidusBench — المعيار المرجعي لأداء تحليل المستندات",
  description: "قارن أنظمة تحليل المستندات من حيث الدقة والبنية والسرعة والتكلفة على صفحات عربية وإنجليزية حقيقية.",
  icons: { icon: "/brand/logo-mono.png" },
};

/** The Arabic site. GCC visitors land here (see proxy.ts). */
export default async function ArabicHome() {
  return <BenchHome lang="ar" manifest={await loadManifest()} />;
}
