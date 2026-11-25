import { DatasetPagePage, pageMetadata, pageParams } from "@/components/routes";

type Props = { params: Promise<{ id: string[] }> };

export const dynamicParams = false;
export const generateStaticParams = pageParams;
export const generateMetadata = async ({ params }: Props) => pageMetadata("en", (await params).id);

export default async function DatasetPage({ params }: Props) {
  return <DatasetPagePage lang="en" id={(await params).id} />;
}
