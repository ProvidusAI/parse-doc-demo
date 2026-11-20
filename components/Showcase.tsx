"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL, expandForStress, pagesFor } from "@/lib/showcase";
import type { Manifest } from "@/lib/types";
import DatasetBrowser from "./DatasetBrowser";
import Hero from "./Hero";
import Inspector from "./Inspector";
import Nav from "./Nav";
import PageWall from "./PageWall";
import styles from "./Showcase.module.css";

const FADE_PX = 420;

const MAX_STRESS = 2000;

export default function Showcase({ manifest: real }: { manifest: Manifest }) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(ALL);
  const [stress, setStress] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const dataRef = useRef<HTMLElement>(null);

  // load testing: /?stress=400 duplicates the real pages in the browser only
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("stress"));
    if (Number.isFinite(n) && n > 0) setStress(Math.min(Math.floor(n), MAX_STRESS));
  }, []);
  const manifest = useMemo(() => (stress ? expandForStress(real, stress) : real), [real, stress]);

  useEffect(() => {
    const onScroll = () => setProgress(Math.min(1, window.scrollY / FADE_PX));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const explore = useCallback(() => {
    const top = dataRef.current?.offsetTop ?? FADE_PX;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const pages = manifest.categories.reduce((n, c) => n + c.pages.length, 0);
  const tabPages = pagesFor(manifest, active);
  const openIndex = tabPages.findIndex((p) => p.id === openId);

  return (
    <div className={styles.root} data-on-data={progress > 0.85 || undefined} data-inspecting={openIndex >= 0 || undefined}>
      <Nav />
      <PageWall progress={progress} />
      <Hero categories={manifest.categories.length} pages={pages} progress={progress} onExplore={explore} />
      <main id="dataset" ref={dataRef} className={styles.data}>
        <DatasetBrowser manifest={manifest} active={active} onActive={setActive} onOpen={setOpenId} />
      </main>
      {openIndex >= 0 && (
        <Inspector
          pages={tabPages}
          index={openIndex}
          onIndex={(i) => setOpenId(tabPages[i].id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
