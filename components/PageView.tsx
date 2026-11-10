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

/** The page image with DocAI's grounding boxes drawn over it (0–1000 coords → %). */
export default function PageView({ result, boxes, highlight, scanning }: Props) {
  const { image, width, height } = result.page;
  return (
    <div
      className={`${styles.page} ${scanning ? styles.scanning : ""}`}
      style={{ "--ar": `${width} / ${height}`, "--ratio": width / height } as React.CSSProperties}
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
    </div>
  );
}
