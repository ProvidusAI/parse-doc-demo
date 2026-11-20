import Showcase from "@/components/Showcase";
import { loadManifest } from "@/lib/manifest";

export default async function Home() {
  return <Showcase manifest={await loadManifest()} />;
}
