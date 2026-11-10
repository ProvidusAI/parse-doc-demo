"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Manifest } from "@/lib/types";
import DatasetBrowser from "./DatasetBrowser";
import Hero from "./Hero";
import Nav from "./Nav";
import PageWall from "./PageWall";
import styles from "./Showcase.module.css";

const FADE_PX = 420;

export default function Showcase({ manifest }: { manifest: Manifest }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(manifest.categories[0]?.key ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const dataRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setProgress(Math.min(1, window.scrollY / FADE_PX));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const explore = useCallback(() => {
    const top = (dataRef.current?.offsetTop ?? FADE_PX) - 64;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const pages = manifest.categories.reduce((n, c) => n + c.pages.length, 0);

  return (
    <div className={styles.root} data-on-data={progress > 0.85 || undefined}>
      <Nav />
      <PageWall thumbs={manifest.wall} blur={progress * 4} />
      <Hero categories={manifest.categories.length} pages={pages} progress={progress} onExplore={explore} />
      <main id="dataset" ref={dataRef} className={styles.data}>
        <DatasetBrowser manifest={manifest} active={active} onActive={setActive} onOpen={setOpenId} />
      </main>
    </div>
  );
}
