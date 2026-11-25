import type { Metadata } from "next";
import { DatasetIndexPage } from "@/components/routes";

export const metadata: Metadata = { title: "Dataset · ProvidusBench" };

export default function DatasetIndex() {
  return <DatasetIndexPage lang="en" />;
}
