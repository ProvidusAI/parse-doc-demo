import { fill, type BenchCopy } from "./copy";
import LangSwitch from "./LangSwitch";
import "./bench.css";

export { geist, geistMono } from "./fonts";

/** `at` is where the homepage's sections are: "" on the homepage itself, its address ("/" or "/ar") anywhere else. */
interface Props {
  c: BenchCopy;
  at: string;
}

const br = (s: string) => <><span className="br">&lt;</span>{s}<span className="br">&gt;</span></>;

/** The design's sticky tab bar. Its current tab is set by the homepage's script as you scroll. `other` is this page in
 * the other language; the other homepage when not given. */
export function BenchNav({ c, at, cats, other }: Props & { cats: number; other?: string }) {
  const n = c.nav;
  const s = `${at}#`;
  return (
    <header className="nav">
      <div className="container nav__inner">
        <nav className="nav__tabs" aria-label={n.primary}>
          <a href={`${s}top`} data-nav="top" aria-current={at === "" ? "true" : undefined}>{br(n.home)}</a>
          <a href={`${s}leaderboard`} data-nav="leaderboard">{br(n.leaderboard)}</a>
          <a href={`${s}dataset`} data-nav="dataset" className="hide-sm">{br(n.dataset)}</a>
          <a href={`${s}metrics`} data-nav="metrics" className="hide-sm">{br(n.metrics)}</a>
          <a href={`${s}categories`} data-nav="categories">{br(n.categories)}<span className="nav__count" aria-label={fill(n.catsAria, { n: cats })}>{cats}</span></a>
          <a href={`${s}methodology`} data-nav="methodology" className="hide-sm">{br(n.methodology)}</a>
          <a href="https://docs.providus.ai/introduction" className="hide-sm" target="_blank" rel="noopener">{n.docs}</a>
          <LangSwitch href={other ?? n.other.href} lang={n.other.lang} label={n.other.label} />
        </nav>
        <a className="nav__cta" href="https://platform.providus.ai/" target="_blank" rel="noopener">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>
          <span>{n.try}</span>
        </a>
      </div>
    </header>
  );
}

export function BenchFooter({ c, at }: Props) {
  const f = c.footer;
  const s = `${at}#`;
  return (
    <footer className="container">
      <div className="foot">
        <div>
          <p className="foot__lede">{f.lede}</p>
          <div className="wordmark" dir="ltr"><img className="wordmark__mark" src="/brand/logo-color.png" alt="" width="725" height="849" />ProvidusBench</div>
        </div>
        <div>
          <h4>{f.benchmark}</h4>
          <ul>
            <li><a href={`${s}leaderboard`}>{c.nav.leaderboard}</a></li>
            <li><a href={`${s}metrics`}>{c.nav.metrics}</a></li>
            <li><a href={`${s}categories`}>{c.nav.categories}</a></li>
            <li><a href={`${s}methodology`}>{c.nav.methodology}</a></li>
            <li><a href={`${s}dataset`}>{c.nav.dataset}</a></li>
          </ul>
        </div>
        <div>
          <h4>{f.providus}</h4>
          <ul>
            <li><a href="https://docs.providus.ai/introduction" target="_blank" rel="noopener">{f.docs} ↗</a></li>
            <li><a href="https://platform.providus.ai/" target="_blank" rel="noopener">{f.try} ↗</a></li>
            <li><a href="https://providus.ai/#cta-contact" target="_blank" rel="noopener">{f.talk} ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="legal"><span dir="ltr">© 2026 Providus · ProvidusBench</span><span>{f.note}</span></div>
    </footer>
  );
}
