import type { CSSProperties } from "react";
import { benchData, docThumb } from "@/lib/bench";
import { categoryLabel, type UiLang } from "@/lib/i18n";
import type { Manifest } from "@/lib/types";
import BenchMotion from "./BenchMotion";
import { BenchFooter, BenchNav, geist, geistMono } from "./BenchChrome";
import { COPY, fill } from "./copy";

const fmt = (v: number) => v.toLocaleString("en-US");

/** the leaderboard's category filter (illustrative scores) */
const LB_CATS = ["financial", "government", "research", "legal", "media"];

/** The new homepage (design: ProvidusBenchUpdatedFigma/ProvidusBench): the design's markup as is, with its page
 * images, counts and gallery taken from the site's own data. Its motion and the interactive parts (gallery,
 * leaderboard, category explorer, chart, test case) are started by BenchMotion once the page is in the browser.
 * The leaderboard, trade-off chart and test case are the design's illustrative figures, labelled as such on the page. */
export default function BenchHome({ manifest, lang = "en" }: { manifest: Manifest; lang?: UiLang }) {
  const c = COPY[lang];
  const data = benchData(manifest, lang);
  const keys = data.categories.map(([k]) => k);
  const thumb = (name: string) => docThumb(name, keys);
  const pages = data.pages.length;
  const cats = data.categories.length;
  const catName = (k: string) => categoryLabel(lang, k, manifest.categories.find((x) => x.key === k)?.label ?? k);

  return (
    <div className={`pb ${geist.variable} ${geistMono.variable}`} lang={lang} dir={c.dir}>
      <a className="skip-link" href="#main">{c.nav.skip}</a>

      <BenchNav c={c} at="" cats={cats} />

      <main id="main">
        {/* ===== Hero band: dark grid, documents reveal on hover ===== */}
        <section id="top" className="band" aria-label={c.band.aria} data-band>
          <div className="band__slots" data-slots aria-hidden="true"></div>
          <div className="band__ui">
            <div className="container">
              <div className="band__brand">
                <a className="logo" href="#top" aria-label={c.band.homeAria} dir="ltr">
                  <img className="logo__mark" src="/brand/logo-mono.png" alt="" width="26" height="30" />ProvidusBench<sup>®</sup>
                </a>
                <span className="tag-chip">AR·EN</span>
              </div>
              <a className="band__scroll" href="#hero-copy"><span>{c.band.scroll}</span><span aria-hidden="true">↓</span></a>
              <p className="band__hint" data-hint>{c.band.hint[0]} <b>{c.band.hint[1]}</b> {c.band.hint[2]}</p>
            </div>
          </div>
        </section>

        {/* ===== Hero copy ===== */}
        <section className="hero" id="hero-copy">
          <div className="container hero__grid">
            <div>
              <p className="label" style={{ marginBottom: "18px" }}><span>{c.hero.label}</span></p>
              <h1 className="display" aria-label={c.hero.aria}>
                <span aria-hidden="true">{c.hero.before}<br />
                  <span className="type" data-type={JSON.stringify(c.hero.words)}><span data-type-text>{c.hero.words[0]}</span><span className="type__caret"></span></span><br />
                  {c.hero.after}</span>
              </h1>
            </div>
            <div className="hero__side">
              <div className="proof">
                <span className="proof__docs" aria-hidden="true">
                  <img src={thumb("financial_invoices")} alt="" />
                  <img src={thumb("research_research_papers")} alt="" />
                  <img src={thumb("government_official_notices")} alt="" />
                </span>
                <span><b>{fmt(pages)}</b> {c.hero.pages}</span>
                <span className="proof__sep" aria-hidden="true"></span>
                <span><b>{cats}</b> {c.hero.cats}</span>
              </div>
              <p className="hero__lede">{c.hero.lede}</p>
              <div className="hero__ctas">
                <a className="btn" href="#leaderboard"><span className="btn__sq" aria-hidden="true"></span>{c.hero.cta}</a>
                <a className="btn--ghost" href="#methodology">
                  <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 1l10 6-10 6z" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>
                  {c.hero.ghost}</a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Benchmark snapshot ===== */}
        <section className="container" aria-label={c.snapshot.aria}>
          <div className="snapshot">
            <div className="snapshot__cell rv"><div className="snapshot__num" data-count={cats}>{cats}</div><div className="snapshot__label">{c.snapshot.labels[0]}</div></div>
            <div className="snapshot__cell rv" style={{ "--d": "1" } as CSSProperties}><div className="snapshot__num" data-count={pages} data-format="comma">{fmt(pages)}</div><div className="snapshot__label">{c.snapshot.labels[1]}</div></div>
            <div className="snapshot__cell rv" style={{ "--d": "2" } as CSSProperties}><div className="snapshot__num">AR·EN</div><div className="snapshot__label">{c.snapshot.labels[2]}</div></div>
            {/* 8 parsers matches the sample leaderboard (Parser A–H); 6 dimensions = the "What we measure" cards;
                 5 pipeline stages comes from the current parsebench.providus.ai hero. Update 8 when real results land. */}
            <div className="snapshot__cell rv" style={{ "--d": "3" } as CSSProperties}><div className="snapshot__num" data-count="8">8</div><div className="snapshot__label">{c.snapshot.labels[3]}</div></div>
            <div className="snapshot__cell rv" style={{ "--d": "4" } as CSSProperties}><div className="snapshot__num" data-count="6">6</div><div className="snapshot__label">{c.snapshot.labels[4]}</div></div>
            <div className="snapshot__cell rv" style={{ "--d": "5" } as CSSProperties}><div className="snapshot__num" data-count="5">5</div><div className="snapshot__label">{c.snapshot.labels[5]}</div></div>
          </div>
          <div className="ticker" aria-hidden="true">
            <span className="ticker__edge">··· &gt;</span>
            <span data-scramble-once>{c.snapshot.ticker}</span>
            <span className="ticker__edge">&lt; ···</span>
          </div>
        </section>

        {/* ===== N.01 Leaderboard ===== */}
        <section className="section container" id="leaderboard" aria-labelledby="lb-h">
          <div className="label" data-inview><span className="label__n">[N.<b>01</b>/08]</span><span className="label__rule"></span><span>&gt; {c.lb.label}</span><span className="label__line"></span></div>
          <div className="head">
            <div>
              <h2 className="h2" id="lb-h" data-scramble><span className="ln">{c.lb.h2[0]}</span><span className="ln">{c.lb.h2[1]}</span></h2>
              <p className="sub rv">{c.lb.sub}</p>
            </div>
            <span className="illus rv">{c.lb.illus}</span>
          </div>

          <div className="lb rv" data-lb>
            <div className="lb__bar">
              <div className="chips" role="group" aria-label={c.lb.filtersAria}>
                {c.lb.filters.map(([v, l], i) => <button key={v} className="chip" aria-pressed={i === 0} data-filter={v}>{l}</button>)}
              </div>
              <div className="lb__controls">
                <label className="select">{c.lb.category}
                  <select data-cat>
                    <option value="all">{c.lb.allCats}</option>
                    {LB_CATS.map((k) => <option key={k} value={k}>{catName(k)}</option>)}
                  </select>
                </label>
                <label className="select">{c.lb.sort}
                  <select data-sort>
                    {c.lb.sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="lb__scroll" tabIndex={0} aria-label={c.lb.tableAria}>
              <table>
                <caption className="sr-only">{c.lb.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{c.lb.cols.rank}</th>
                    <th scope="col">{c.lb.cols.parser}</th>
                    <th scope="col"><button data-sortcol="overall" aria-pressed="true">{c.lb.cols.overall} ↓</button></th>
                    <th scope="col" className="num"><button data-sortcol="text" aria-pressed="false">{c.lb.cols.text}</button></th>
                    <th scope="col" className="num"><button data-sortcol="table" aria-pressed="false">{c.lb.cols.table}</button></th>
                    <th scope="col" className="num"><button data-sortcol="layout" aria-pressed="false">{c.lb.cols.layout}</button></th>
                    <th scope="col" className="num"><button data-sortcol="grounding" aria-pressed="false">{c.lb.cols.grounding}</button></th>
                    <th scope="col" className="num"><button data-sortcol="time" aria-pressed="false">{c.lb.cols.time}</button></th>
                    <th scope="col" className="num"><button data-sortcol="cost" aria-pressed="false">{c.lb.cols.cost}</button></th>
                  </tr>
                </thead>
                <tbody data-lb-body></tbody>
              </table>
            </div>
            <div className="lb__foot"><span data-lb-count>{c.lb.count}</span><span>{c.lb.foot}</span></div>
          </div>
        </section>

        {/* ===== N.02 Dataset gallery (data/dataset.js, from bench-staging.providus.ai/dataset) ===== */}
        <section className="section container" id="dataset" aria-labelledby="ds-h">
          <div className="label" data-inview><span className="label__n">[N.<b>02</b>/08]</span><span className="label__rule"></span><span>&gt; {c.ds.label}</span><span className="label__line"></span></div>
          <div className="head">
            <div>
              <h2 className="h2" id="ds-h" data-scramble><span className="ln">{c.ds.h2[0]}</span><span className="ln">{c.ds.h2[1]}</span></h2>
              <p className="sub rv">{c.ds.sub[0]}<span data-gtotal>{fmt(pages)}</span>{c.ds.sub[1]}<span data-gcatn>{cats}</span>{c.ds.sub[2]}</p>
            </div>
            <a className="btn btn--sm rv" href={c.script.datasetHref} data-gfull><span className="btn__sq" aria-hidden="true"></span>{c.ds.full}</a>
          </div>

          <div className="gal" data-gallery>
            <div className="gal__bar rv">
              <div className="gal__cats" role="group" aria-label={c.ds.catsAria} data-gcats></div>
              <div className="gal__filters">
                <label className="select">{c.ds.language} <select data-gf="lang"></select></label>
                <label className="select">{c.ds.source} <select data-gf="fmt"></select></label>
                <label className="select">{c.ds.contains} <select data-gf="has"></select></label>
                <button className="gal__reset" type="button" data-greset hidden>{c.ds.reset}</button>
              </div>
            </div>
            <p className="gal__count" aria-live="polite" data-gcount></p>
            <ul className="gal__grid" data-ggrid></ul>
            <div className="gal__empty" data-gempty hidden>
              <p>{c.ds.none}</p>
              <button className="btn btn--sm" type="button" data-greset><span className="btn__sq" aria-hidden="true"></span>{c.ds.resetAll}</button>
            </div>
            <div className="gal__more"><button className="btn--ghost" type="button" data-gmore>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M1 6h10" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>
              {c.ds.more}</button></div>
          </div>
        </section>

        {/* ===== N.03 Evaluation dimensions ===== */}
        <section className="section container" id="metrics" aria-labelledby="m-h">
          <div className="label" data-inview><span className="label__n">[N.<b>03</b>/08]</span><span className="label__rule"></span><span>&gt; {c.metrics.label}</span><span className="label__line"></span></div>
          <div className="head">
            <div>
              <h2 className="h2" id="m-h" data-scramble><span className="ln">{c.metrics.h2[0]}</span><span className="ln">{c.metrics.h2[1]}</span></h2>
              <p className="sub rv">{c.metrics.sub}</p>
            </div>
            <a className="btn btn--sm rv" href="#methodology"><span className="btn__sq" aria-hidden="true"></span>{c.metrics.rules}</a>
          </div>

          <div className="cards">
            <article className="card rv" tabIndex={0}>
              <span className="card__n"><i>//</i>001</span>
              <div className="card__icon" aria-hidden="true">
                <svg viewBox="0 0 132 120"><g fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke">
                  <g transform="translate(66 46) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(66 32) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(66 18) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/>
                    <path d="M8 10h40M8 18h34M8 26h40M8 34h22M8 42h36" vectorEffect="non-scaling-stroke"/></g>
                </g></svg>
              </div>
              <h3>{c.metrics.cards[0][0]}</h3>
              <p>{c.metrics.cards[0][1]}</p>
              <div className="card__foot">{c.metrics.core}</div>
            </article>
            <article className="card rv" style={{ "--d": "1" } as CSSProperties} tabIndex={0}>
              <span className="card__n"><i>//</i>002</span>
              <div className="card__icon" aria-hidden="true">
                <svg viewBox="0 0 132 120"><g fill="none" stroke="currentColor" strokeWidth="1.2">
                  <g transform="translate(66 44) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(66 22) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/>
                    <rect width="56" height="14" fill="currentColor" fillOpacity=".18" vectorEffect="non-scaling-stroke"/>
                    <path d="M14 0v56M28 0v56M42 0v56M0 14h56M0 28h56M0 42h56" vectorEffect="non-scaling-stroke"/></g>
                </g></svg>
              </div>
              <h3>{c.metrics.cards[1][0]}</h3>
              <p>{c.metrics.cards[1][1]}</p>
              <div className="card__foot">{c.metrics.core}</div>
            </article>
            <article className="card rv" style={{ "--d": "2" } as CSSProperties} tabIndex={0}>
              <span className="card__n"><i>//</i>003</span>
              <div className="card__icon" aria-hidden="true">
                <svg viewBox="0 0 132 120"><g fill="none" stroke="currentColor" strokeWidth="1.2">
                  <g transform="translate(66 50) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/><rect x="4" y="4" width="48" height="10" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(66 34) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/><rect x="4" y="18" width="22" height="34" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(66 18) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/><rect x="4" y="4" width="48" height="10" vectorEffect="non-scaling-stroke"/><rect x="4" y="18" width="22" height="34" vectorEffect="non-scaling-stroke"/><rect x="30" y="18" width="22" height="15" vectorEffect="non-scaling-stroke"/><rect x="30" y="37" width="22" height="15" vectorEffect="non-scaling-stroke"/></g>
                </g></svg>
              </div>
              <h3>{c.metrics.cards[2][0]}</h3>
              <p>{c.metrics.cards[2][1]}</p>
              <div className="card__foot">{c.metrics.core}</div>
            </article>
            <article className="card rv" tabIndex={0}>
              <span className="card__n"><i>//</i>004</span>
              <div className="card__icon" aria-hidden="true">
                <svg viewBox="0 0 132 120"><g fill="none" stroke="currentColor" strokeWidth="1.2">
                  <g transform="translate(66 52) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(17.5 80) matrix(.866 -.5 0 1 0 0)"><rect className="fill" x="0" y="-58" width="56" height="58" vectorEffect="non-scaling-stroke"/>
                    <rect x="6" y="-22" width="8" height="22" fill="currentColor" fillOpacity=".18" vectorEffect="non-scaling-stroke"/>
                    <rect x="18" y="-38" width="8" height="38" vectorEffect="non-scaling-stroke"/>
                    <rect x="30" y="-30" width="8" height="30" fill="currentColor" fillOpacity=".18" vectorEffect="non-scaling-stroke"/>
                    <rect x="42" y="-50" width="8" height="50" vectorEffect="non-scaling-stroke"/></g>
                </g></svg>
              </div>
              <h3>{c.metrics.cards[3][0]}</h3>
              <p>{c.metrics.cards[3][1]}</p>
              <div className="card__foot">{c.metrics.supported}</div>
            </article>
            <article className="card rv" style={{ "--d": "1" } as CSSProperties} tabIndex={0}>
              <span className="card__n"><i>//</i>005</span>
              <div className="card__icon" aria-hidden="true">
                <svg viewBox="0 0 132 120"><g fill="none" stroke="currentColor" strokeWidth="1.2">
                  <g transform="translate(66 34) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/>
                    <path d="M8 8h40M8 14h30M8 44h40M8 50h26" vectorEffect="non-scaling-stroke"/>
                    <rect x="6" y="20" width="36" height="18" fill="currentColor" fillOpacity=".18" vectorEffect="non-scaling-stroke"/>
                    <path d="M24 -10v76M-12 29h80" strokeDasharray="2 3" vectorEffect="non-scaling-stroke"/></g>
                </g></svg>
              </div>
              <h3>{c.metrics.cards[4][0]}</h3>
              <p>{c.metrics.cards[4][1]}</p>
              <div className="card__foot">{c.metrics.supported}</div>
            </article>
            <article className="card rv" style={{ "--d": "2" } as CSSProperties} tabIndex={0}>
              <span className="card__n"><i>//</i>006</span>
              <div className="card__icon" aria-hidden="true">
                <svg viewBox="0 0 132 120"><g fill="none" stroke="currentColor" strokeWidth="1.2">
                  <g transform="translate(66 44) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/></g>
                  <g transform="translate(66 26) matrix(.866 .5 -.866 .5 0 0)"><rect className="fill" width="56" height="56" vectorEffect="non-scaling-stroke"/>
                    <rect x="6" y="6" width="12" height="6" vectorEffect="non-scaling-stroke"/><rect x="22" y="6" width="28" height="6" fill="currentColor" fillOpacity=".18" vectorEffect="non-scaling-stroke"/>
                    <rect x="6" y="18" width="12" height="6" vectorEffect="non-scaling-stroke"/><rect x="22" y="18" width="28" height="6" vectorEffect="non-scaling-stroke"/>
                    <rect x="6" y="30" width="12" height="6" vectorEffect="non-scaling-stroke"/><rect x="22" y="30" width="28" height="6" fill="currentColor" fillOpacity=".18" vectorEffect="non-scaling-stroke"/>
                    <rect x="6" y="42" width="6" height="6" vectorEffect="non-scaling-stroke"/><rect x="16" y="42" width="6" height="6" fill="currentColor" fillOpacity=".4" vectorEffect="non-scaling-stroke"/></g>
                </g></svg>
              </div>
              <h3>{c.metrics.cards[5][0]}</h3>
              <p>{c.metrics.cards[5][1]}</p>
              <div className="card__foot">{c.metrics.supported}</div>
            </article>
          </div>
        </section>

        {/* ===== N.04 Document categories (dark) ===== */}
        <section className="dark" id="categories" aria-labelledby="c-h">
          <div className="container">
            <div className="label" data-inview><span className="label__n">[N.<b>04</b>/08]</span><span className="label__rule"></span><span>&gt; {c.cats.label}</span><span className="label__line"></span></div>
            <div className="cat" data-cat-explorer>
              <div className="cat__left">
                <div className="tabs" role="tablist" aria-label={c.cats.label} data-tabs></div>
                <div className="cat__head">
                  <h2 className="h2" id="c-h" data-scramble><span className="ln">{c.cats.h2[0]}</span><span className="ln">{c.cats.h2[1]}</span></h2>
                  <p className="sub rv" style={{ color: "#c4c4c4" }}>{c.cats.sub}</p>
                </div>
              </div>
              <div className="cat__right" role="tabpanel" data-panel aria-live="polite">
                <div className="diag">
                  <svg className="wires" aria-hidden="true" preserveAspectRatio="none" data-wires></svg>
                  <div className="diag__box diag__src"><h4>{c.cats.src}</h4><div className="diag__stack" data-stack></div></div>
                  <div className="diag__core" aria-hidden="true"><img src="/brand/logo-mono.png" alt="" width="30" height="35" /></div>
                  <div className="diag__box diag__out"><h4>{c.cats.out}</h4><ul data-dims></ul></div>
                  <div className="diag__box diag__sig"><h4>{c.cats.sig}</h4><div className="diag__chips" data-chips></div></div>
                </div>
                <span className="cat__count" data-catcount></span>
              </div>
            </div>

            <div className="feat">
              <div>
                <h3>{c.cats.feat[0][0]}</h3>
                <p>{fill(c.cats.feat[0][1], { n: cats })}</p>
                <div className="marq" aria-hidden="true" data-marq></div>
              </div>
              <div>
                <h3>{c.cats.feat[1][0]}</h3>
                <p>{c.cats.feat[1][1]}</p>
                <span className="feat__icon" aria-hidden="true">ع/A</span>
              </div>
              <div>
                <h3>{fill(c.cats.feat[2][0], { n: cats })}</h3>
                <p>{c.cats.feat[2][1]}</p>
                <span className="feat__icon" aria-hidden="true">▤▦</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== N.05 Cost and performance ===== */}
        <section className="section container" id="tradeoffs" aria-labelledby="t-h">
          <div className="label" data-inview><span className="label__n">[N.<b>05</b>/08]</span><span className="label__rule"></span><span>&gt; {c.trade.label}</span><span className="label__line"></span></div>
          <div className="trade__top">
            <div>
              <h2 className="h2" id="t-h" data-scramble><span className="ln">{c.trade.h2[0]}</span><span className="ln">{c.trade.h2[1]}</span></h2>
              <p className="sub rv">{c.trade.sub}</p>
              <p className="rv" style={{ marginTop: "22px" }}><span className="illus">{c.trade.illus}</span></p>
            </div>
            <div className="stats rv" aria-live="polite">
              {(["q", "t", "c", "p"] as const).map((k, i) => (
                <div className="stat" key={k}><div className="stat__v" data-stat={k}>—</div><div className="stat__l">{c.trade.stats[i][0]}</div><div className="stat__k">{c.trade.stats[i][1]}</div></div>
              ))}
            </div>
          </div>
          <div className="chart" data-chart dir="ltr">
            <div className="chart__plot" data-plot>
              <div className="chart__grid" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              <div className="split" data-split role="slider" tabIndex={0} aria-label={c.trade.slider} aria-valuemin={0} aria-valuemax={20} aria-valuenow={10}>
                <div className="split__knob">
                  <span className="split__lab split__lab--on">{c.trade.within}</span>
                  <span className="split__grip"></span>
                  <span className="split__lab">{c.trade.over}</span>
                </div>
              </div>
            </div>
            <div className="chart__axis" aria-hidden="true"><span>$0</span><span>$2.5</span><span>$5</span><span>$7.5</span><span>$10</span><span>$12.5</span><span>$15</span><span>$17.5</span><span>$20</span></div>
            <div className="chart__x"><span>{c.trade.height}</span><span>{c.trade.axis}</span></div>
          </div>
        </section>

        {/* ===== N.05 Test case explorer ===== */}
        <section className="section container" id="cases" aria-labelledby="x-h">
          <div className="label" data-inview><span className="label__n">[N.<b>06</b>/08]</span><span className="label__rule"></span><span>&gt; {c.cases.label}</span><span className="label__line"></span></div>
          <div className="tc">
            <div className="tc__panel rv">
              <div className="win">
                <div className="win__bar">
                  <span>{c.cases.bar}</span>
                  <div className="win__tabs" role="tablist" aria-label={c.cases.tabsAria} data-tcv>
                    <button role="tab" aria-selected="true" data-view="ref">{c.cases.tabs[0]}</button>
                    <button role="tab" aria-selected="false" data-view="out">{c.cases.tabs[1]}</button>
                    <button role="tab" aria-selected="false" data-view="diff">{c.cases.tabs[2]}</button>
                  </div>
                </div>
                <div className="win__body">
                  <div className="win__doc">
                    <img src={thumb("financial_invoices")} alt={c.cases.alt} />
                    <span className="hl" aria-hidden="true"></span>
                    <div className="win__meta">{c.cases.meta.map(([k, v], i) => <span key={k}>{i > 0 && <br />}{k} <b>{v}</b></span>)}</div>
                  </div>
                  <pre className="code" role="tabpanel" data-code tabIndex={0}></pre>
                </div>
                <div className="win__status"><span>{c.cases.status}</span><span data-tcstatus></span></div>
              </div>
            </div>
            <div>
              <h2 className="h2" id="x-h" data-scramble><span className="ln">{c.cases.h2[0]}</span><span className="ln">{c.cases.h2[1]}</span></h2>
              <p className="sub rv">{c.cases.sub}</p>
              <p className="rv" style={{ marginTop: "28px" }}><a className="btn" href="#dataset"><span className="btn__sq" aria-hidden="true"></span>{c.cases.browse}</a></p>
              <div className="tc__list">
                <div className="tc__item rv"><h3>{c.cases.list[0][0]}</h3><p>{c.cases.list[0][1]}</p></div>
                <div className="tc__item rv" style={{ "--d": "1" } as CSSProperties}><h3>{c.cases.list[1][0]}</h3><p>{c.cases.list[1][1]}</p></div>
                <div className="tc__item rv" style={{ "--d": "2" } as CSSProperties}><h3>{c.cases.list[2][0]}</h3><p>{c.cases.list[2][1]}</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== N.06 Methodology ===== */}
        <section className="section container" id="methodology" aria-labelledby="h-h">
          <div className="label" data-inview><span className="label__n">[N.<b>07</b>/08]</span><span className="label__rule"></span><span>&gt; {c.method.label}</span><span className="label__line"></span></div>
          <div className="head">
            <div>
              <h2 className="h2" id="h-h" data-scramble><span className="ln">{c.method.h2[0]}</span><span className="ln">{c.method.h2[1]}</span></h2>
              <p className="sub rv">{c.method.sub}</p>
            </div>
            <a className="btn btn--sm rv" href="#details"><span className="btn__sq" aria-hidden="true"></span>{c.method.read}</a>
          </div>
          <ol className="steps" data-steps style={{ listStyle: "none", margin: "0", padding: "0" }}>
            <li className="step rv"><div className="step__top"><span className="step__n">// 01</span><p className="step__desc">{c.method.steps[0][1]}</p></div><div className="step__bar"><i></i></div><div className="step__bot"><h3 className="step__title" style={{ margin: "0", fontWeight: "400" }}>{c.method.steps[0][0]}</h3><span className="step__px" data-px="dataset"></span></div></li>
            <li className="step rv" style={{ "--d": "1" } as CSSProperties}><div className="step__top"><span className="step__n">// 02</span><p className="step__desc">{c.method.steps[1][1]}</p></div><div className="step__bar"><i></i></div><div className="step__bot"><h3 className="step__title" style={{ margin: "0", fontWeight: "400" }}>{c.method.steps[1][0]}</h3><span className="step__px" data-px="eval"></span></div></li>
            <li className="step rv" style={{ "--d": "2" } as CSSProperties}><div className="step__top"><span className="step__n">// 03</span><p className="step__desc">{c.method.steps[2][1]}</p></div><div className="step__bar"><i></i></div><div className="step__bot"><h3 className="step__title" style={{ margin: "0", fontWeight: "400" }}>{c.method.steps[2][0]}</h3><span className="step__px" data-px="score"></span></div></li>
            <li className="step rv" style={{ "--d": "3" } as CSSProperties}><div className="step__top"><span className="step__n">// 04</span><p className="step__desc">{c.method.steps[3][1]}</p></div><div className="step__bar"><i></i></div><div className="step__bot"><h3 className="step__title" style={{ margin: "0", fontWeight: "400" }}>{c.method.steps[3][0]}</h3><span className="step__px" data-px="compare"></span></div></li>
          </ol>
        </section>

        {/* ===== N.07 Benchmark transparency ===== */}
        <section className="section container" id="details" aria-labelledby="d-h">
          <div className="label" data-inview><span className="label__n">[N.<b>08</b>/08]</span><span className="label__rule"></span><span>&gt; {c.details.label}</span><span className="label__line"></span></div>
          <div className="head">
            <div>
              <h2 className="h2" id="d-h" data-scramble><span className="ln">{c.details.h2[0]}</span><span className="ln">{c.details.h2[1]}</span></h2>
            </div>
          </div>
          <div className="docs">
            <div className="docs__intro rv">
              <h3>{c.details.intro[0]}</h3>
              <p>{c.details.intro[1]}</p>
            </div>
            <a className="doc rv" href="#dataset">
              <div className="doc__tags">{c.details.docs[0][0].map((x) => <span key={x}>{x}</span>)}</div>
              <h3>{c.details.docs[0][1]}</h3><p>{c.details.docs[0][2]}</p>
              <div className="doc__foot"><span><i>//</i> 001</span><span className="doc__view">{c.details.view} <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg></span></div>
            </a>
            <a className="doc rv" style={{ "--d": "1" } as CSSProperties} href="#methodology">
              <div className="doc__tags">{c.details.docs[1][0].map((x) => <span key={x}>{x}</span>)}</div>
              <h3>{c.details.docs[1][1]}</h3><p>{c.details.docs[1][2]}</p>
              <div className="doc__foot"><span><i>//</i> 002</span><span className="doc__view">{c.details.view} <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg></span></div>
            </a>
            <a className="doc rv" href="#methodology">
              <div className="doc__tags">{c.details.docs[2][0].map((x) => <span key={x}>{x}</span>)}</div>
              <h3>{c.details.docs[2][1]}</h3><p>{c.details.docs[2][2]}</p>
              <div className="doc__foot"><span><i>//</i> 003</span><span className="doc__view">{c.details.view} <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg></span></div>
            </a>
            <a className="doc rv" style={{ "--d": "1" } as CSSProperties} href="#methodology">
              <div className="doc__tags">{c.details.docs[3][0].map((x) => <span key={x}>{x}</span>)}</div>
              <h3>{c.details.docs[3][1]}</h3><p>{c.details.docs[3][2]}</p>
              <div className="doc__foot"><span><i>//</i> 004</span><span className="doc__view">{c.details.view} <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg></span></div>
            </a>
          </div>
        </section>

        {/* ===== Closing CTA ===== */}
        <section className="closing" aria-labelledby="cta-h">
          <div className="closing__band">
            <div className="container">
              <div className="closing__box">
                <span className="corner tl"></span><span className="corner tr"></span><span className="corner bl"></span><span className="corner br"></span>
                <span className="closing__tag">{c.closing.tag}</span>
                <h2 id="cta-h" aria-label={c.closing.aria}>
                  <span className="ln" aria-hidden="true" data-scramble-line>{c.closing.line}</span>
                  <span className="ln type" aria-hidden="true" data-type={JSON.stringify([c.closing.typed])} data-type-once><span data-type-text>{c.closing.typed}</span><span className="type__caret"></span></span>
                </h2>
                <p>{c.closing.p}</p>
                <div className="closing__ctas">
                  <a className="btn" href="https://platform.providus.ai/" target="_blank" rel="noopener"><span className="btn__sq" aria-hidden="true"></span>{c.closing.try}</a>
                  <a className="btn--ghost" href="https://providus.ai/#cta-contact" target="_blank" rel="noopener">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>
                    {c.closing.talk}</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <BenchFooter c={c} at="" />
      <BenchMotion data={data} words={c.script} />
    </div>
  );
}
