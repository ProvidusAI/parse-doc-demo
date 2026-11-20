import styles from "./PageWall.module.css";

/**
 * Decorative wall of corpus pages behind the hero: one tiled image (public/showcase/wall.jpg). Not interactive.
 * The blur is drawn once, on a second copy that fades in as `progress` goes 0 → 1: animating `filter: blur()`
 * re-blurred the whole screen on every scroll frame, while opacity is left to the compositor.
 */
export default function PageWall({ progress }: { progress: number }) {
  return (
    <>
      <div className={styles.wall} aria-hidden="true" />
      <div className={`${styles.wall} ${styles.blurred}`} style={{ opacity: progress }} aria-hidden="true" />
    </>
  );
}
