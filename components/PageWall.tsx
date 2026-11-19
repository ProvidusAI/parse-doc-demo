import styles from "./PageWall.module.css";

/** Decorative wall of corpus pages behind the hero: one tiled image (public/showcase/wall.jpg). Not interactive. */
export default function PageWall({ blur }: { blur: number }) {
  return <div className={styles.wall} style={{ filter: blur ? `blur(${blur}px)` : undefined }} aria-hidden="true" />;
}
