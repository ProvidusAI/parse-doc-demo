import { DatasetPagePage, pageMetadata, pageParams } from "@/components/routes";

type Props = { params: Promise<{ id: string[] }> };

export const dynamicParams = false;
export const generateStaticParams = pageParams;
export const generateMetadata = async ({ params }: Props) => pageMetadata("ar", (await params).id);

export default async function DatasetPage({ params }: Props) {
  return <DatasetPagePage lang="ar" id={(await params).id} />;
}
