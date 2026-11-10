import styles from "./Nav.module.css";

export default function Nav() {
  return (
    <nav className={styles.nav} aria-label="Main">
      <a className={styles.mark} href="#top" aria-label="ProvidusBench home">
        P
      </a>
      <div className={styles.tabs}>
        <a className={styles.on} href="#top" aria-current="page">
          ProvidusBench
        </a>
        <a href="#dataset">Dataset</a>
        <a href="#pipeline">Pipeline</a>
      </div>
      <span className={styles.sp} />
      <a className="btn" href="https://providus.ai" target="_blank" rel="noreferrer">
        Docs
      </a>
      <a className="btn btn-dark" href="https://providus.ai" target="_blank" rel="noreferrer">
        Try DocAI
      </a>
    </nav>
  );
}
