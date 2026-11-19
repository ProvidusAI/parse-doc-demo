import styles from "./PageWall.module.css";

const CELLS = 260;

/** Decorative wall of corpus thumbnails behind the hero. Not interactive. */
export default function PageWall({ thumbs, blur }: { thumbs: string[]; blur: number }) {
  return (
    <div className={styles.wall} style={{ filter: blur ? `blur(${blur}px)` : undefined }} aria-hidden="true">
      {Array.from({ length: CELLS }, (_, i) =>
        thumbs.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={thumbs[(i * 7) % thumbs.length]} alt="" loading="lazy" decoding="async" />
        ) : (
          <i key={i} />
        ),
      )}
    </div>
  );
}
