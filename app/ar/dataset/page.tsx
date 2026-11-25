import type { Metadata } from "next";
import { DatasetIndexPage } from "@/components/routes";

export const metadata: Metadata = { title: "مجموعة البيانات · ProvidusBench" };

export default function DatasetIndex() {
  return <DatasetIndexPage lang="ar" />;
}
