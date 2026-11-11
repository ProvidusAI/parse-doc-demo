import { useState } from "react";
import { t } from "@/lib/i18n";
import { boxToPercent } from "@/lib/showcase";
import type { Box, ShowcaseResult } from "@/lib/types";
import styles from "./PageView.module.css";

export interface PageBox {
  key: string;
  box: Box;
}

interface Props {
  result: ShowcaseResult;
  boxes: PageBox[];
  highlight: string | null;
  scanning: boolean;
}

const ZOOM = 2.5;
const LENS = 180; // px diameter

/** The page image with DocAI's grounding boxes drawn over it (0–1000 coords → %). */
export default function PageView({ result, boxes, highlight, scanning }: Props) {
  const { image, width, height } = result.page;
  const [magnify, setMagnify] = useState(false);
  const [lens, setLens] = useState<React.CSSProperties | null>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!magnify) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const half = LENS / 2;
    setLens({
      left: x - half,
      top: y - half,
      backgroundImage: `url("${image}")`,
      backgroundSize: `${r.width * ZOOM}px ${r.height * ZOOM}px`,
      backgroundPosition: `${half - x * ZOOM}px ${half - y * ZOOM}px`,
    });
  };

  return (
    <div
      className={`${styles.page} ${scanning ? styles.scanning : ""} ${magnify ? styles.magnify : ""}`}
      style={{ "--ar": `${width} / ${height}`, "--ratio": width / height } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={() => setLens(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={`${result.subCategoryLabel} page`} />
      {boxes
        .filter((b) => b.box.page === 1)
        .map((b) => (
          <div
            key={b.key}
            data-box={b.key}
            data-hi={b.key === highlight || undefined}
            className={styles.box}
            style={boxToPercent(b.box)}
          />
        ))}
      <div className={styles.scan} aria-hidden="true" />
      {magnify && lens && <div data-lens className={styles.lens} style={{ ...lens, width: LENS, height: LENS }} aria-hidden="true" />}
      <button
        type="button"
        className={styles.mag}
        aria-label={t("en", "magnifier")}
        aria-pressed={magnify}
        title={t("en", "magnifier")}
        onClick={() => {
          setMagnify((m) => !m);
          setLens(null);
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
