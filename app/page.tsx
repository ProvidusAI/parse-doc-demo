import Showcase from "@/components/Showcase";
import { loadManifest } from "@/lib/showcase";

export default function Home() {
  return <Showcase manifest={loadManifest()} />;
}
