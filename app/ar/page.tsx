import type { Metadata } from "next";
import { OverviewPage } from "@/components/routes";

export const metadata: Metadata = {
  title: "ProvidusBench · تقييم مفتوح لفهم المستندات العربية والإنجليزية",
  description: "صفحات عربية وإنجليزية حقيقية، وكل مخرجات DocAI منشورة، ومنهجية واضحة لقياس أداء أنظمة الذكاء الاصطناعي للمستندات.",
};

/** The Arabic site. GCC visitors land here (see proxy.ts). */
export default function ArabicHome() {
  return <OverviewPage lang="ar" />;
}
