// @ts-nocheck -- the design's script.js (ProvidusBenchUpdatedFigma), ported as-is: vanilla DOM code that runs once
// on the server-rendered page. Changes from the original are marked "site:". Typing every DOM lookup would double it.
import { docId, type BenchData } from "@/lib/bench";
import type { BenchCopy } from "./copy";

/** Starts every interaction and animation on the homepage. Runs once per page (a second call is ignored, so React's
 * development double-effect doesn't attach every listener twice). */
export function initBench(D: BenchData, L: BenchCopy["script"]) {
  if (document.documentElement.dataset.benchInit) return;
  document.documentElement.dataset.benchInit = "1";

  // site: the page's words come from copy.ts (L), so the same script runs the English and the Arabic homepage
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // site: pages come from this site's own data, not copies in assets/docs
  const KEYS = D.categories.map(([k]) => k);
  const doc = (name) => `${D.base}/showcase/${docId(name, KEYS)}/thumb.jpg`;

  // site: the design's page list, minus any page hidden from the site (lib/bench.ts DESIGN_DOCS)
  const DOCS = D.docs;
  const docLabel = (name) => {
    if (L.lang !== "en") {
      const id = docId(name, KEYS), row = D.pages.find((p) => p[0] === id);
      return row ? `${D.categories[row[2]][1]} · ${row[1]}` : "";
    }
    const [cat, ...rest] = name.replace("travel_transport", "travel").split("_");
    const sub = rest.join(" ").replace(/\b\d+-?/g, "").replace(/-?(eng|arabic)\b/gi, (m) => (/ar/i.test(m) ? "AR" : "EN")).trim();
    return `${cat} · ${sub || "page"}`;
  };

  /* ------------------------------------------------------------------
     1. Hero band — documents only appear while hovered, then trail out
  ------------------------------------------------------------------ */
  function initBand() {
    const band = $("[data-band]");
    const layer = $("[data-slots]");
    const hint = $("[data-hint]");
    if (!band) return;
    let slots = [], cols = 0, cell = 60, current = -1, ambient = null, visible = true;

    function build() {
      const w = band.clientWidth;
      let c = Math.max(6, Math.round(w / 60));
      if (c % 2) c += 1;                       // documents span 2 columns
      cell = w / c;
      cols = c / 2;
      band.style.setProperty("--cell", `${cell}px`);
      layer.textContent = "";
      slots = [];
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < cols; k++) {
          const i = r * cols + k;
          const name = DOCS[(i * 7 + r * 3) % DOCS.length];
          const el = document.createElement("div");
          el.className = "slot";
          el.style.left = `${k * cell * 2}px`;
          el.style.top = `${r * cell * 3}px`;
          el.innerHTML = `<div class="slot__doc"><img src="${doc(name)}" alt="" loading="lazy" decoding="async"><span class="slot__tag">${docLabel(name)}</span></div>`;
          layer.appendChild(el);
          slots.push(el);
        }
      }
      current = -1;
    }

    const on = (i) => slots[i] && slots[i].classList.add("is-on");
    const off = (i) => slots[i] && slots[i].classList.remove("is-on");

    function indexAt(x, y) {
      const r = band.getBoundingClientRect();
      const k = Math.floor((x - r.left) / (cell * 2));
      const row = Math.floor((y - r.top) / (cell * 3));
      if (k < 0 || k >= cols || row < 0 || row > 1) return -1;
      return row * cols + k;
    }

    band.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const i = indexAt(e.clientX, e.clientY);
      if (i === current) return;
      off(current);
      current = i;
      on(i);
      if (hint) hint.style.opacity = "0";
    });
    band.addEventListener("pointerleave", () => { off(current); current = -1; });

    // Touch has no hover: tapping reveals a page, and a slow ambient reveal keeps the band alive.
    band.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      const i = indexAt(e.clientX, e.clientY);
      on(i);
      setTimeout(() => off(i), 1800);
    });
    function startAmbient() {
      stopAmbient();
      if (fineHover.matches || !visible) return;
      ambient = setInterval(() => {
        const i = Math.floor(Math.random() * slots.length);
        on(i);
        setTimeout(() => off(i), 1700);
      }, 1300);
    }
    function stopAmbient() { if (ambient) clearInterval(ambient); ambient = null; }
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? startAmbient() : stopAmbient(); }).observe(band);
    fineHover.addEventListener?.("change", startAmbient);

    let t;
    addEventListener("resize", () => { clearTimeout(t); t = setTimeout(build, 150); });
    build();
  }

  /* ------------------------------------------------------------------
     2. Typewriter word in the pixel face
  ------------------------------------------------------------------ */
  function initTypewriters() {
    $$("[data-type]").forEach((root) => {
      const words = JSON.parse(root.dataset.type);
      const out = $("[data-type-text]", root);
      const once = root.hasAttribute("data-type-once");
      if (reduce) { out.textContent = words[0]; return; }
      out.textContent = "";
      let w = 0, started = false;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      async function typeWord(word) {
        root.classList.add("is-typing");
        for (let i = 1; i <= word.length; i++) { out.textContent = word.slice(0, i); await wait(70 + Math.random() * 40); }
        root.classList.remove("is-typing");
      }
      async function erase() {
        root.classList.add("is-typing");
        for (let i = out.textContent.length; i >= 0; i--) { out.textContent = out.textContent.slice(0, i); await wait(32); }
        root.classList.remove("is-typing");
      }
      async function loop() {
        await typeWord(words[w]);
        if (once) return;
        for (;;) {
          await wait(2400);
          await erase();
          await wait(250);
          w = (w + 1) % words.length;
          await typeWord(words[w]);
        }
      }
      new IntersectionObserver((ents, obs) => {
        if (ents[0].isIntersecting && !started) { started = true; obs.disconnect(); setTimeout(loop, 400); }
      }).observe(root);
    });
  }

  /* ------------------------------------------------------------------
     3. Scramble-text reveal for headings
  ------------------------------------------------------------------ */
  const GLYPHS = L.scramble;
  function scramble(el, final, delay = 0) {
    const n = final.length, D = Math.min(900, 280 + n * 26);
    const start = [], end = [];
    for (let i = 0; i < n; i++) {
      start[i] = (i / n) * D * 0.55;
      end[i] = start[i] + 110 + Math.random() * 260;
    }
    let t0 = null, last = 0;
    el.textContent = "";
    function frame(ts) {
      if (t0 === null) t0 = ts + delay;
      const t = ts - t0;
      if (t < 0) { requestAnimationFrame(frame); return; }
      if (ts - last < 40) { requestAnimationFrame(frame); return; } // ~25fps glyph swap reads like a terminal
      last = ts;
      let s = "", done = true;
      for (let i = 0; i < n; i++) {
        const ch = final[i];
        if (t >= end[i] || ch === " ") s += t >= start[i] ? ch : "";
        else if (t >= start[i]) { s += GLYPHS[(Math.random() * GLYPHS.length) | 0]; done = false; }
        else done = false;
      }
      el.textContent = s;
      if (!done) requestAnimationFrame(frame); else el.textContent = final;
    }
    requestAnimationFrame(frame);
  }
  function initScramble() {
    const targets = [];
    $$("[data-scramble]").forEach((h) => {
      const lines = $$(".ln", h);
      h.setAttribute("aria-label", lines.map((l) => l.textContent.trim()).join(" "));
      lines.forEach((l) => l.setAttribute("aria-hidden", "true"));
      targets.push({ el: h, lines });
    });
    $$("[data-scramble-line],[data-scramble-once]").forEach((l) => targets.push({ el: l, lines: [l] }));
    if (reduce) return;
    targets.forEach((t) => t.lines.forEach((l) => { l.dataset.final = l.textContent.trim(); l.textContent = " "; }));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const t = targets.find((x) => x.el === en.target);
        t.lines.forEach((l, i) => scramble(l, l.dataset.final, i * 160));
      });
    }, { threshold: 0.4 });
    targets.forEach((t) => io.observe(t.el));
  }

  /* ------------------------------------------------------------------
     4. Scroll reveal, rule lines, count-up, active nav
  ------------------------------------------------------------------ */
  function initReveal() {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    $$(".rv,[data-inview]").forEach((el) => io.observe(el));

    const cio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        const el = en.target, to = +el.dataset.count, comma = el.dataset.format === "comma";
        const fmt = (v) => (comma ? v.toLocaleString("en-US") : String(v));
        if (reduce) { el.textContent = fmt(to); return; }
        const t0 = performance.now(), D = 1200;
        (function step(now) {
          const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 4);
          el.textContent = fmt(Math.round(to * e));
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach((el) => cio.observe(el));

    // Sections without a tab of their own clear the highlight instead of leaving a stale one.
    const links = $$("[data-nav]");
    const ALIAS = { "hero-copy": "top" };
    const nio = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = ALIAS[en.target.id] || en.target.id;
        links.forEach((a) => a.setAttribute("aria-current", a.dataset.nav === id ? "true" : "false"));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$("main section[id]").forEach((s) => nio.observe(s));
  }

  /* ------------------------------------------------------------------
     5. Leaderboard (illustrative data, clearly labelled in the UI)
  ------------------------------------------------------------------ */
  const PARSERS = [
    { name: "Parser A", kind: ["commercial", "vlm"], tag: "VLM · Commercial", text: 94.1, table: 88.4, layout: 90.2, grounding: 86.0, time: 2.4, cost: 0.012 },
    { name: "Parser B", kind: ["open", "vlm"], tag: "VLM · Open", text: 92.3, table: 84.9, layout: 87.5, grounding: 81.2, time: 1.8, cost: 0.004 },
    { name: "Parser C", kind: ["commercial", "ocr"], tag: "OCR · Commercial", text: 91.0, table: 79.3, layout: 83.1, grounding: 89.4, time: 0.9, cost: 0.0015 },
    { name: "Parser D", kind: ["open", "ocr"], tag: "OCR · Open", text: 88.6, table: 71.2, layout: 76.4, grounding: 84.7, time: 0.6, cost: 0.0006 },
    { name: "Parser E", kind: ["commercial", "vlm"], tag: "VLM · Commercial", text: 93.0, table: 86.1, layout: 85.0, grounding: null, time: 3.1, cost: 0.018 },
    { name: "Parser F", kind: ["open", "vlm"], tag: "VLM · Open", text: 89.9, table: 80.7, layout: 82.3, grounding: null, time: 2.2, cost: 0.003 },
    { name: "Parser G", kind: ["open", "ocr"], tag: "OCR · Open", text: 84.2, table: 62.5, layout: 70.8, grounding: 78.0, time: 0.4, cost: 0.0004 },
    { name: "Parser H", kind: ["commercial", "ocr"], tag: "OCR · Commercial", text: 90.1, table: 75.6, layout: 80.2, grounding: 87.1, time: 1.1, cost: 0.0025 },
  ];
  const METRICS = ["text", "table", "layout", "grounding"];
  const ASC = new Set(["time", "cost"]);
  function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; }

  function initLeaderboard() {
    const root = $("[data-lb]");
    if (!root) return;
    const body = $("[data-lb-body]", root), count = $("[data-lb-count]", root);
    const sortSel = $("[data-sort]", root), catSel = $("[data-cat]", root);
    const state = { filter: "all", sort: "overall", cat: "all" };

    function rows() {
      return PARSERS.filter((p) => state.filter === "all" || p.kind.includes(state.filter)).map((p) => {
        const r = { ...p };
        if (state.cat !== "all") METRICS.forEach((m) => { if (r[m] != null) r[m] = Math.min(99, Math.max(40, +(r[m] + (hash(p.name + state.cat + m) - 0.55) * 14).toFixed(1))); });
        const v = METRICS.map((m) => r[m]).filter((x) => x != null);
        r.overall = +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
        return r;
      }).sort((a, b) => {
        const k = state.sort, x = a[k], y = b[k];
        if (x == null) return 1; if (y == null) return -1;
        return ASC.has(k) ? x - y : y - x;
      });
    }
    const cell = (v) => (v == null ? '<span style="color:var(--color-text-secondary)">—</span>' : v.toFixed(1));
    function render() {
      const data = rows();
      count.textContent = fill(data.length === 1 ? L.lbOne : L.lbMany, { n: data.length, sort: sortSel.selectedOptions[0].textContent.toLowerCase() });
      if (!data.length) { body.innerHTML = `<tr><td colspan="9" class="lb__empty">${L.lbNone}</td></tr>`; return; }
      body.innerHTML = data.map((p, i) => `
        <tr class="is-enter" style="--i:${i}">
          <td><span class="rank ${i === 0 ? "rank--1" : ""}">${String(i + 1).padStart(2, "0")}</span></td>
          <td><span class="pname">${fill(L.parser, { x: p.name.slice(-1) })}</span><span class="ptype">${p.tag.replace(/Commercial|Open/, (w) => L.kinds[w])}</span></td>
          <td><div class="score"><div class="score__track"><span class="score__fill" style="--v:${(p.overall / 100).toFixed(3)}"></span></div><b>${p.overall.toFixed(1)}</b></div></td>
          <td class="num">${cell(p.text)}</td><td class="num">${cell(p.table)}</td><td class="num">${cell(p.layout)}</td><td class="num">${cell(p.grounding)}</td>
          <td class="num">${p.time.toFixed(1)}${L.sec === "s" ? " s" : L.sec}</td><td class="num">$${p.cost.toFixed(4)}</td>
        </tr>`).join("");
      $$("[data-sortcol]", root).forEach((b) => {
        const on = b.dataset.sortcol === state.sort;
        b.setAttribute("aria-pressed", on);
        b.textContent = b.textContent.replace(/ [↓↑]$/, "") + (on ? (ASC.has(state.sort) ? " ↑" : " ↓") : "");
      });
    }
    $$("[data-filter]", root).forEach((b) => b.addEventListener("click", () => {
      state.filter = b.dataset.filter;
      $$("[data-filter]", root).forEach((x) => x.setAttribute("aria-pressed", x === b));
      render();
    }));
    $$("[data-sortcol]", root).forEach((b) => b.addEventListener("click", () => { state.sort = b.dataset.sortcol; sortSel.value = state.sort; render(); }));
    sortSel.addEventListener("change", () => { state.sort = sortSel.value; render(); });
    catSel.addEventListener("change", () => { state.cat = catSel.value; render(); });
    render();
  }

  /* ------------------------------------------------------------------
     6. Category explorer (dark section), auto-advancing tabs
  ------------------------------------------------------------------ */
  const DIMS = L.dims;
  const CATS = [
    { name: "Financial reports", keys: ["financial"], chips: ["Tables", "Figures"], dims: [0, 1, 2, 5],
      desc: "Dense tables, financial figures, footnotes and reporting structures, plus invoices and receipts with line items, totals and vendor details.",
      docs: ["financial_financial_reports", "financial_receipts", "financial_invoices"], challenges: ["Dense tables", "Footnotes", "Line items", "Totals"] },
    { name: "Government", keys: ["government"], chips: ["Forms", "Hierarchy"], dims: [0, 2, 4, 5],
      desc: "Official notices, regulations, tender documents and application forms with formal hierarchy and structured fields.",
      docs: ["government_regulations", "government_applications_and_forms", "government_official_notices"], challenges: ["Section hierarchy", "Form fields", "Mixed script"] },
    { name: "Technical documents", keys: ["manufacturing", "chemical"], chips: ["Diagrams", "Annotations"], dims: [0, 2, 3, 4],
      desc: "Diagrams, annotations, complex layouts and technical information.",
      docs: ["chemical_02-eng", "manufacturing_11-arabic", "manufacturing_01-eng"], challenges: ["Diagrams", "Annotations", "Complex layouts"] },
    { name: "Research & reports", keys: ["research", "statistical"], chips: ["Long-form", "Figures"], dims: [0, 1, 2, 3],
      desc: "Long-form content, figures, references and structured sections.",
      docs: ["statistical_statistical_reports", "educational_05-eng", "research_research_papers"], challenges: ["Figures", "References", "Sections"] },
    { name: "Legal documents", keys: ["legal"], chips: ["Clauses", "Hierarchy"], dims: [0, 2, 4],
      desc: "Clauses, hierarchy, formatting and contextual content.",
      docs: ["government_tender_documents", "government_regulations", "legal_laws"], challenges: ["Clauses", "Numbering", "Formatting"] },
    { name: "Complex layouts", keys: ["media"], chips: ["Multi-column", "Reading order"], dims: [0, 2, 3, 4],
      desc: "Multi-column pages, mixed content and reading-order challenges.",
      docs: ["media_advertisements", "media_magazines", "media_newspapers"], challenges: ["Multi-column", "Mixed content", "Reading order"] },
  ];

  // site: names, chips, descriptions and challenges in the page's language (copy.ts, same order)
  CATS.forEach((c, i) => Object.assign(c, L.cats[i]));

  function initCategories() {
    const root = $("[data-cat-explorer]");
    if (!root) return;
    const tabs = $("[data-tabs]", root), stack = $("[data-stack]", root), dims = $("[data-dims]", root);
    const chips = $("[data-chips]", root), countEl = $("[data-catcount]", root), wires = $("[data-wires]", root), panel = $("[data-panel]", root);
    let active = 0, inView = false;

    tabs.innerHTML = CATS.map((c, i) => `
      <button class="tab" role="tab" id="cat-tab-${i}" aria-controls="cat-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">
        <span class="tab__chips">${c.chips.map((x) => `<span>${x}</span>`).join("")}</span>
        <span class="tab__row"><span class="tab__title"><span class="tab__dot"></span>${c.name}</span><span class="tab__n">// ${String(i + 1).padStart(3, "0")}</span></span>
        <span class="tab__desc"><div><p>${c.desc}</p></div></span>
        <span class="tab__prog"><i></i></span>
      </button>`).join("");
    panel.id = "cat-panel";
    stack.innerHTML = "<img alt=''><img alt=''><img alt=''>";
    dims.innerHTML = DIMS.map((d) => `<li>${d}</li>`).join("");

    function show(i, focus) {
      active = (i + CATS.length) % CATS.length;
      const c = CATS[active];
      $$(".tab", tabs).forEach((t, k) => { t.setAttribute("aria-selected", k === active); t.tabIndex = k === active ? 0 : -1; });
      if (focus) $$(".tab", tabs)[active].focus();
      panel.setAttribute("aria-labelledby", `cat-tab-${active}`);
      stack.classList.add("is-swap");
      setTimeout(() => {
        $$("img", stack).forEach((img, k) => { img.src = doc(c.docs[k]); img.alt = k === 2 ? fill(L.sample, { name: c.name }) : ""; });
        stack.classList.remove("is-swap");
      }, reduce ? 0 : 220);
      $$("li", dims).forEach((li, k) => li.classList.toggle("on", c.dims.includes(k)));
      chips.innerHTML = c.challenges.map((x, k) => `<span style="--i:${k}">${x}</span>`).join("");
      countEl.textContent = c.count;
      if (!inView) root.classList.add("is-paused");
    }
    tabs.addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) show(+b.dataset.i); });
    tabs.addEventListener("keydown", (e) => {
      const m = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (m) { e.preventDefault(); show(active + m, true); }
      if (e.key === "Home") { e.preventDefault(); show(0, true); }
      if (e.key === "End") { e.preventDefault(); show(CATS.length - 1, true); }
    });
    tabs.addEventListener("animationend", (e) => { if (e.animationName === "prog") show(active + 1); });
    root.addEventListener("pointerenter", () => root.classList.add("is-paused"));
    root.addEventListener("pointerleave", () => inView && root.classList.remove("is-paused"));
    root.addEventListener("focusin", () => root.classList.add("is-paused"));
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; root.classList.toggle("is-paused", !inView); }, { threshold: 0.35 }).observe(root);

    function drawWires() {
      const d = $(".diag", root), r = d.getBoundingClientRect();
      const box = (s) => { const b = $(s, d).getBoundingClientRect(); return { l: b.left - r.left, r: b.right - r.left, t: b.top - r.top, b: b.bottom - r.top, cx: (b.left + b.right) / 2 - r.left, cy: (b.top + b.bottom) / 2 - r.top }; };
      const s = box(".diag__src"), o = box(".diag__out"), c = box(".diag__core"), g = box(".diag__sig");
      wires.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      const p1 = `M${s.r} ${c.cy} H${c.l}`, p2 = `M${c.r} ${c.cy} H${o.l}`, p3 = `M${c.cx} ${c.b} V${g.t}`;
      wires.innerHTML = [p1, p2, p3].map((p) => `<path d="${p}"/><path class="flow" d="${p}"/>`).join("");
    }
    show(0);
    drawWires();
    addEventListener("resize", drawWires);
    document.fonts?.ready.then(drawWires);

    // Document marquee in the feature row
    const marq = $("[data-marq]");
    if (marq) {
      const row = (list) => { const imgs = list.map((n) => `<img src="${doc(n)}" alt="" loading="lazy">`).join(""); return imgs + imgs; };
      marq.innerHTML = `<div class="marq__row">${row(DOCS.slice(0, 16))}</div><div class="marq__row marq__row--rev">${row(DOCS.slice(16, 32))}</div>`;
    }
  }

  /* ------------------------------------------------------------------
     7. Cost / quality trade-off chart with a draggable budget line
  ------------------------------------------------------------------ */
  function initChart() {
    const chart = $("[data-chart]");
    if (!chart) return;
    const plot = $("[data-plot]", chart), split = $("[data-split]", chart);
    let seed = 7;
    const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const N = 72, MAX = 20;
    const configs = Array.from({ length: N }, (_, i) => {
      const cost = +(0.2 + (i / (N - 1)) * 19.6).toFixed(2);
      const q = Math.max(42, Math.min(97, 50 + 42 * (1 - Math.exp(-cost / 4.2)) + (rnd() - 0.5) * 12));
      const time = Math.max(0.3, 0.35 + cost * 0.13 + (rnd() - 0.5) * 0.6);
      return { cost, q: +q.toFixed(1), time: +time.toFixed(2) };
    });
    const frag = document.createDocumentFragment();
    const bars = configs.map((c, i) => {
      const b = document.createElement("div");
      b.className = "bar";
      b.style.setProperty("--i", i);
      b.innerHTML = `<i style="--h:${((c.q - 30) / 70) * 100}%"></i>`;
      frag.appendChild(b);
      return b;
    });
    plot.insertBefore(frag, split);

    let budget = 10;
    const stats = { q: $('[data-stat="q"]'), t: $('[data-stat="t"]'), c: $('[data-stat="c"]'), p: $('[data-stat="p"]') };
    function update() {
      split.style.left = `${(budget / MAX) * 100}%`;
      split.setAttribute("aria-valuenow", budget.toFixed(1));
      split.setAttribute("aria-valuetext", fill(L.budget, { v: budget.toFixed(2) }));
      let best = null, bi = -1;
      configs.forEach((c, i) => { const inb = c.cost <= budget; bars[i].classList.toggle("in", inb); if (inb && (!best || c.q > best.q)) { best = c; bi = i; } });
      bars.forEach((b, i) => b.classList.toggle("best", i === bi));
      if (!best) { Object.values(stats).forEach((s) => (s.textContent = "—")); return; }
      stats.q.textContent = best.q.toFixed(1);
      stats.t.textContent = `${best.time.toFixed(2)}${L.sec.trim()}`;
      stats.c.textContent = `$${best.cost.toFixed(2)}`;
      stats.p.textContent = `~${Math.round(60 / best.time)}`;
    }
    const fromX = (x) => { const r = plot.getBoundingClientRect(); budget = Math.max(0, Math.min(MAX, ((x - r.left) / r.width) * MAX)); update(); };
    let drag = false;
    plot.addEventListener("pointerdown", (e) => { drag = true; split.classList.add("is-drag"); plot.setPointerCapture(e.pointerId); fromX(e.clientX); });
    plot.addEventListener("pointermove", (e) => drag && fromX(e.clientX));
    const end = () => { drag = false; split.classList.remove("is-drag"); };
    plot.addEventListener("pointerup", end);
    plot.addEventListener("pointercancel", end);
    split.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5, PageUp: 2, PageDown: -2 }[e.key];
      if (step) budget = Math.max(0, Math.min(MAX, budget + step));
      else if (e.key === "Home") budget = 0;
      else if (e.key === "End") budget = MAX;
      else return;
      e.preventDefault(); update();
    });
    update();
    new IntersectionObserver(([en], o) => { if (en.isIntersecting) { chart.classList.add("is-in"); o.disconnect(); } }, { threshold: 0.3 }).observe(chart);
  }

  /* ------------------------------------------------------------------
     8. Test case viewer (illustrative output)
  ------------------------------------------------------------------ */
  function initTestCase() {
    const tabs = $("[data-tcv]");
    if (!tabs) return;
    const code = $("[data-code]"), status = $("[data-tcstatus]");
    const head = `<span class="c">## Line items</span>\n| <span class="k">Description</span> | <span class="k">Qty</span> | <span class="k">Unit price</span> | <span class="k">Amount</span> |\n|-------------|-----|------------|--------|\n`;
    const V = {
      ref: { s: L.tcRef, h: head +
        `| Item 01     | <span class="n">2</span>   | <span class="n">150.00</span>     | <span class="n">300.00</span> |\n| Item 02     | <span class="n">1</span>   | <span class="n">75.50</span>      | <span class="n">75.50</span>  |\n| Item 03     | <span class="n">4</span>   | <span class="n">12.25</span>      | <span class="n">49.00</span>  |\n| Subtotal    |     |            | <span class="n">424.50</span> |\n| VAT 15%     |     |            | <span class="n">63.68</span>  |\n| <span class="s">Total</span>       |     |            | <span class="n">488.18</span> |` },
      out: { s: L.tcOut, h: head +
        `| Item 01     | <span class="n">2</span>   | <span class="n">150.00</span>     | <span class="n">300.00</span> |\n| Item 02 1 75.50 |  |        | <span class="n">75.50</span>  |\n| Item 03     | <span class="n">4</span>   | <span class="n">12.25</span>      | <span class="n">49.00</span>  |\n| Subtotal    |     |            | <span class="n">424.50</span> |\n| VAT 15%     |     |            | <span class="n">63.86</span>  |\n| <span class="s">Total</span>       |     |            | <span class="n">488.18</span> |` },
      diff: { s: "", h: head +
        `| Item 01     | 2   | 150.00     | 300.00 |\n<span class="del">| Item 02 1 75.50 |  |        | 75.50  |</span>\n<span class="ins">| Item 02     | 1   | 75.50      | 75.50  |</span>  <span class="c">← merged cells</span>\n| Item 03     | 4   | 12.25      | 49.00  |\n| Subtotal    |     |            | 424.50 |\n| VAT 15%     |     |            | <span class="del">63.86</span><span class="ins">63.68</span>  |  <span class="c">← digit swap</span>\n| Total       |     |            | 488.18 |` },
    };
    function show(v) {
      $$("button", tabs).forEach((b) => { const on = b.dataset.view === v; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
      code.innerHTML = `<span class="code-view">${V[v].h}</span>`;
      status.innerHTML = v === "diff" ? `<span class="bad">${L.tcErr}</span>` : V[v].s;
    }
    tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.view); });
    tabs.addEventListener("keydown", (e) => {
      const bs = $$("button", tabs), i = bs.findIndex((b) => b.getAttribute("aria-selected") === "true");
      const m = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!m) return;
      e.preventDefault();
      const n = bs[(i + m + bs.length) % bs.length]; show(n.dataset.view); n.focus();
    });
    show("ref");
  }

  /* ------------------------------------------------------------------
     9. Methodology steps — auto-advancing progress + pixel icons
  ------------------------------------------------------------------ */
  const PX = {
    dataset: [".######", ".#....#", "###...#", "#.#...#", "#.#####", "#....#.", "######."],
    eval: ["..###..", ".#...#.", "#.....#", "#..#..#", "#.....#", ".#...##", "..###.#"],
    score: ["......#", "....#.#", "....#.#", "..#.#.#", "..#.#.#", "#.#.#.#", "#######"],
    compare: ["###.###", "#.#.#.#", "#.#.#.#", "###.###", ".......", "#######", "......."],
  };
  function initSteps() {
    $$("[data-px]").forEach((el) => {
      const rows = PX[el.dataset.px], s = 7;
      let r = "";
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") r += `<rect x="${x * s}" y="${y * s}" width="${s - 1}" height="${s - 1}"/>`; }));
      el.innerHTML = `<svg width="49" height="49" viewBox="0 0 49 49" fill="currentColor" aria-hidden="true">${r}</svg>`;
    });
    const wrap = $("[data-steps]");
    if (!wrap) return;
    const steps = $$(".step", wrap);
    let i = -1, started = false;
    function go(n) {
      i = n;
      steps.forEach((s, k) => { s.classList.toggle("done", k < i); s.classList.toggle("active", k === i); });
    }
    wrap.addEventListener("animationend", (e) => {
      if (e.animationName !== "prog") return;
      if (i < steps.length - 1) go(i + 1);
      else { go(steps.length); setTimeout(() => go(0), 1600); }
    });
    wrap.addEventListener("pointerenter", () => wrap.classList.add("is-paused"));
    wrap.addEventListener("pointerleave", () => wrap.classList.remove("is-paused"));
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !started) { started = true; go(0); }
      wrap.classList.toggle("is-paused", !en.isIntersecting);
    }, { threshold: 0.4 }).observe(wrap);
  }

  /* ------------------------------------------------------------------
     11. Dataset gallery (site: data from the page list, lib/bench.ts)
  ------------------------------------------------------------------ */
  function initGallery() {
    const root = $("[data-gallery]");
    if (!D || !root) return;
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const LANG = L.langs;
    const FMT = L.fmts;
    const HAS = [1, 2, 4, 8, 16].map((b, i) => [b, L.has[i]]);
    const STEP = 24;   // four rows of six
    const pages = D.pages.map((r, i) => ({ id: r[0], sub: r[1], cat: r[2], lang: r[3], fmt: r[4], has: r[5], n: i + 1 }));
    const state = { cat: -1, lang: -1, fmt: -1, has: 0, shown: STEP };

    const grid = $("[data-ggrid]", root), countEl = $("[data-gcount]", root), cats = $("[data-gcats]", root);
    const empty = $("[data-gempty]", root), more = $("[data-gmore]", root), resets = $$("[data-greset]", root);
    const sel = { lang: $('[data-gf="lang"]', root), fmt: $('[data-gf="fmt"]', root), has: $('[data-gf="has"]', root) };
    const fmtN = (n) => n.toLocaleString("en-US");

    // Section copy follows the data, so the numbers can't drift from the gallery.
    $$("[data-gtotal]").forEach((el) => (el.textContent = fmtN(pages.length)));
    $$("[data-gcatn]").forEach((el) => (el.textContent = D.categories.length));
    $$("[data-gfull]").forEach((el) => (el.href = `${D.base}${L.datasetHref}`));

    const opts = (all, items) => `<option value="-1">${all}</option>` + items.map(([v, label, n]) => `<option value="${v}">${esc(label)} (${fmtN(n)})</option>`).join("");
    sel.lang.innerHTML = opts(L.allLangs, LANG.map((l, i) => [i, l, pages.filter((p) => p.lang === i).length]));
    sel.fmt.innerHTML = opts(L.allSources, FMT.map((l, i) => [i, l, pages.filter((p) => p.fmt === i).length]));
    sel.has.innerHTML = opts(L.anything, HAS.map(([b, l]) => [b, l, pages.filter((p) => p.has & b).length]));

    const match = (p, ignoreCat) =>
      (ignoreCat || state.cat < 0 || p.cat === state.cat) &&
      (state.lang < 0 || p.lang === state.lang) &&
      (state.fmt < 0 || p.fmt === state.fmt) &&
      (!state.has || (p.has & state.has));

    function renderCats() {
      const pool = pages.filter((p) => match(p, true));
      const n = D.categories.map((_, i) => pool.filter((p) => p.cat === i).length);
      const chip = (v, label, c) =>
        `<button class="chip" type="button" data-gcat="${v}" aria-pressed="${state.cat === v}" ${c === 0 && state.cat !== v ? "disabled" : ""}>${esc(label)} <b>${fmtN(c)}</b></button>`;
      cats.innerHTML = chip(-1, L.allCats, pool.length) + D.categories.map(([, label], i) => chip(i, label, n[i])).join("");
    }

    // Compact card for a 6-per-row grid; the full description lives in the title and accessible name.
    const LANG_S = L.langsShort, FMT_S = L.fmtsShort;
    function card(p, i) {
      const tagList = HAS.filter(([b]) => p.has & b).map(([, l]) => l);
      const cat = D.categories[p.cat][1];
      const full = `${p.sub} · ${cat} · ${LANG[p.lang]} · ${FMT[p.fmt]}${tagList.length ? L.containsIn + tagList.join(", ").toLowerCase() : ""}`;
      return `<li><a class="gcard is-new" style="--i:${i}" data-id="${esc(p.id)}" href="${D.base}${L.datasetHref}/${esc(p.id)}" title="${esc(full)}" aria-label="${esc(fill(L.output, { name: full }))}">
        <span class="gcard__mat"><img src="${D.base}/showcase/${esc(p.id)}/thumb.jpg" alt="" loading="lazy" decoding="async"></span>
        <span class="gcard__n"><i>//</i>${String(p.n).padStart(4, "0")}</span>
        <span class="gcard__go" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 10 10 2M4 2h6v6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span>
        <span class="gcard__body">
          <span class="gcard__name">${esc(p.sub)}</span>
          <span class="gcard__meta">${esc(cat)} · ${LANG_S[p.lang]} · ${FMT_S[p.fmt]}</span>
          <span class="gcard__tags">${tagList.join(" · ")}</span>
        </span>
      </a></li>`;
    }

    let rendered = 0;
    function render(append) {
      const list = pages.filter((p) => match(p));
      const upto = Math.min(state.shown, list.length);
      if (!append) { grid.innerHTML = ""; rendered = 0; }
      grid.insertAdjacentHTML("beforeend", list.slice(rendered, upto).map((p, k) => card(p, Math.min(k, 20))).join(""));
      const firstNew = grid.children[rendered];
      rendered = upto;
      countEl.innerHTML = fill(L.showing, { a: fmtN(upto), b: fmtN(list.length) });
      empty.hidden = list.length > 0;
      more.parentElement.hidden = upto >= list.length;
      const active = state.cat >= 0 || state.lang >= 0 || state.fmt >= 0 || state.has;
      resets.forEach((b) => { if (b.closest(".gal__filters")) b.hidden = !active; });
      return firstNew;
    }
    function refresh() { state.shown = STEP; renderCats(); render(false); }

    cats.addEventListener("click", (e) => {
      const b = e.target.closest("[data-gcat]");
      if (!b || b.disabled) return;
      state.cat = +b.dataset.gcat;
      refresh();
      $(`[data-gcat="${state.cat}"]`, cats)?.focus();
    });
    Object.entries(sel).forEach(([k, s]) => s.addEventListener("change", () => { state[k] = +s.value; if (k === "has" && state.has < 0) state.has = 0; refresh(); }));
    resets.forEach((b) => b.addEventListener("click", () => {
      Object.assign(state, { cat: -1, lang: -1, fmt: -1, has: 0 });
      Object.values(sel).forEach((s) => (s.value = "-1"));
      refresh();
      $('[data-gcat="-1"]', cats).focus();
    }));
    more.addEventListener("click", () => {
      state.shown += STEP;
      const first = render(true);
      if (more.parentElement.hidden && first) $("a", first).focus();   // keep keyboard users in place
    });
    grid.addEventListener("error", (e) => { if (e.target.tagName === "IMG") e.target.classList.add("is-broken"); }, true);

    refresh();
  }

  // site: category page counts come from the data, e.g. "325 pages · Financial"
  CATS.forEach((c) => {
    const n = D.pages.filter((p) => c.keys.includes(D.categories[p[2]][0])).length;
    c.count = fill(L.catCount, { n: n.toLocaleString("en-US"), cats: c.keys.map((k) => D.categories.find(([key]) => key === k)?.[1] ?? k).join(" + ") });
  });

  initBand();
  initGallery();
  initTypewriters();
  initScramble();
  initReveal();
  initLeaderboard();
  initCategories();
  initChart();
  initTestCase();
  initSteps();
}
