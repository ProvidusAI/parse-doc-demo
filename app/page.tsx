import Showcase from "@/components/Showcase";
import { loadManifest } from "@/lib/manifest";

export default function Home() {
  return <Showcase manifest={loadManifest()} />;
}
