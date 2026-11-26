import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Manifest, PageSummary } from "@/lib/types";
import Dataset from "./Dataset";
import Leaderboard from "./Leaderboard";
import Methodology from "./Methodology";
import Nav from "./Nav";
import Overview from "./Overview";
import PageDetail from "./PageDetail";
import { result } from "./test-fixtures";

const nav = vi.hoisted(() => ({ path: "/", query: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));

const p = (id: string, sub: string, lang: "ar-en" | "en", format: "pdf" | "image", has: string[] = []): PageSummary => ({
  id, subCategoryLabel: sub, fileName: `${sub}.pdf`, thumb: `/showcase/${id}/thumb.jpg`, result: `/showcase/${id}/result.json`, lang, format, has,
});

const m: Manifest = {
  generatedAt: "2026-11-23T00:00:00+00:00",
  categories: [
    { key: "financial", label: "Financial", pages: [p("financial/receipts", "Receipts", "ar-en", "image"), p("financial/invoices", "Invoices", "en", "pdf", ["table"])] },
    { key: "government", label: "Government", pages: [p("government/regulations", "Regulations", "ar-en", "pdf", ["table", "stamp"])] },
  ],
};

beforeEach(() => {
  nav.path = "/";
  nav.query = "";
  nav.replace.mockClear();
  nav.push.mockClear();
});

describe("overview", () => {
  test("the hero asks the question and states true counts", () => {
    render(<Overview lang="en" manifest={m} hero={result} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How well does AI read Arabic documents?");
    expect(screen.getByRole("link", { name: "Browse 3 pages" })).toHaveAttribute("href", "/dataset");
    const stat = (label: string) => screen.getByText(label, { selector: "dt" }).previousElementSibling?.textContent;
    expect(stat("pages")).toBe("3");
    expect(stat("categories")).toBe("2");
    expect(stat("page types")).toBe("3");
    expect(stat("Arabic or bilingual")).toBe("2");
  });

  // the fixture's table with DocAI's cell grid: a header row and one body row
  const cell = (text: string, row: number, col: number) => ({
    text, header: row === 0, rowSpan: 1, colSpan: 1, row, col, box: { page: 1, x0: col ? 500 : 40, y0: row ? 400 : 200, x1: col ? 960 : 500, y1: row ? 600 : 400 },
  });
  const withCells = { ...result, segments: result.segments.map((s) => (s.type === "table" ? { ...s, cells: [cell("Item", 0, 0), cell("Qty", 0, 1), cell("Product 1", 1, 0), cell("10", 1, 1)] } : s)) };
  const card = () => document.querySelector("[aria-live]") as HTMLElement;

  test("the hero page opens on one cell's output and links to the page itself", () => {
    render(<Overview lang="en" manifest={m} hero={withCells} />);
    expect(card()).toHaveTextContent("Table cell · row 2 · column 2");
    expect(card()).toHaveTextContent("Product 1");
    expect(card()).not.toHaveTextContent(/box on the page|x 40–500/);
    expect(screen.getByRole("button", { name: "Product 1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Point at any cell on the page · 4 cells, each with its own box")).toBeInTheDocument();
    expect(screen.getByText("Table · 2 rows × 2 columns")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open this page/ })).toHaveAttribute("href", "/dataset/e4c/223_tender_documents_bid_attachment_p9");
    expect(screen.queryByText(/ground truth/i)).not.toBeInTheDocument();
  });

  test("pointing at a cell shows what DocAI returned for it", () => {
    render(<Overview lang="en" manifest={m} hero={withCells} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "10" }));
    expect(card()).toHaveTextContent("Table cell · row 2 · column 1");
    expect(screen.getByRole("button", { name: "10" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Product 1" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.focus(screen.getByRole("button", { name: "Qty" }));
    expect(card()).toHaveTextContent("Header cell · row 1 · column 1");
  });

  test("the Arabic hero labels the card in Arabic", () => {
    render(<Overview lang="ar" manifest={m} hero={withCells} />);
    expect(card()).toHaveTextContent("خلية جدول · الصف 2 · العمود 2");
    expect(screen.getByRole("link", { name: /افتح هذه الصفحة/ })).toHaveAttribute("href", "/ar/dataset/e4c/223_tender_documents_bid_attachment_p9");
  });

  test("no specimen without a table DocAI read cell by cell", () => {
    render(<Overview lang="en" manifest={m} hero={result} />);
    expect(screen.queryByRole("link", { name: /Open this page/ })).not.toBeInTheDocument();
  });

  test("no progress tracker or 'not yet' wording on the overview", () => {
    render(<Overview lang="en" manifest={m} hero={null} />);
    expect(screen.queryByText(/Two are done|Planned|will name|not yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open this page/ })).not.toBeInTheDocument(); // no hero page data: no specimen
  });

  test("the overview says nothing about removed pages", () => {
    const { unmount } = render(<Overview lang="en" manifest={m} hero={null} />);
    expect(screen.queryByText(/removed|near-duplicates/i)).not.toBeInTheDocument();
    unmount();
    render(<Overview lang="ar" manifest={m} hero={null} />);
    expect(screen.queryByText(/حذف|حُذفت/)).not.toBeInTheDocument();
  });

  test("the leaderboard is hidden for now: not on the overview", () => {
    render(<Overview lang="en" manifest={m} hero={null} />);
    expect(screen.queryByRole("link", { name: /leaderboard/i })).not.toBeInTheDocument();
  });

  test("the Arabic overview is in Arabic only", () => {
    render(<Overview lang="ar" manifest={m} hero={result} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ما مدى دقة الذكاء الاصطناعي في قراءة المستندات العربية؟");
    expect(screen.getByRole("link", { name: "تصفّح 3 صفحة" })).toHaveAttribute("href", "/ar/dataset");
  });
});

describe("dataset", () => {
  test("filters show live counts and write themselves into the address", () => {
    nav.path = "/dataset";
    render(<Dataset lang="en" manifest={m} />);
    expect(screen.getByText("Showing 3 of 3 pages")).toBeInTheDocument();
    const stamps = screen.getByRole("button", { name: /Stamps/ });
    expect(stamps).toHaveTextContent("1");
    fireEvent.click(stamps);
    expect(nav.replace).toHaveBeenCalledWith("/dataset?has=stamp", { scroll: false });
  });

  test("the address sets the filters; each card links to its page", () => {
    nav.path = "/dataset";
    nav.query = "lang=ar-en&has=table";
    render(<Dataset lang="en" manifest={m} />);
    expect(screen.getByText("Showing 1 of 1 pages")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Regulations/ })).toHaveAttribute("href", "/dataset/government/regulations");
    expect(screen.getByRole("button", { name: /English/ })).toHaveTextContent("1"); // English pages with a table
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(nav.replace).toHaveBeenCalledWith("/dataset", { scroll: false });
  });

  test("filters that leave nothing say so", () => {
    nav.query = "lang=en&has=stamp";
    render(<Dataset lang="en" manifest={m} />);
    expect(screen.getByText("No page matches all of these filters.")).toBeInTheDocument();
  });
});

describe("page detail", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))));
  afterEach(() => vi.unstubAllGlobals());

  test("says what the page is and steps through its category", () => {
    const pages = m.categories[0].pages;
    render(<PageDetail lang="en" category={{ key: "financial", label: "Financial" }} pages={pages} index={0} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Receipts");
    expect(screen.getByText("Photo or scan")).toBeInTheDocument();
    expect(screen.queryByText(/answer key/)).not.toBeInTheDocument();
    expect(screen.getByText("1 of 2 in Financial")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/dataset/financial/invoices");
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "/dataset/financial/invoices"); // wraps
    // back to the homepage's gallery
    expect(screen.getByRole("link", { name: "Dataset" })).toHaveAttribute("href", "/#dataset");
    expect(screen.queryByRole("link", { name: "Financial" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // a page, not a modal
  });

  test("arrow keys go to the neighbouring page's address", () => {
    render(<PageDetail lang="ar" category={{ key: "financial", label: "Financial" }} pages={m.categories[0].pages} index={0} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(nav.push).toHaveBeenCalledWith("/ar/dataset/financial/invoices");
  });
});

describe("leaderboard", () => {
  const sys = () => within(screen.getByRole("table")).getAllByRole("rowheader").map((h) => h.querySelector("span")!.textContent);

  test("marks our own row, with no sample-data note", () => {
    render(<Leaderboard lang="en" />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.getByText(/its row is marked as ours/)).toBeInTheDocument();
    expect(within(screen.getByRole("rowheader", { name: /DocAI/ })).getByText("Ours")).toBeInTheDocument();
  });

  test("Arabic pages first: DocAI and model A share first place; English pages rank differently", () => {
    render(<Leaderboard lang="en" />);
    expect(sys().slice(0, 2)).toEqual(["DocAI", "Sample vision-language model A"]);
    const rank = (name: RegExp) => screen.getByRole("rowheader", { name }).previousElementSibling!.textContent;
    expect(rank(/DocAI/)).toBe("=1");
    fireEvent.click(screen.getByRole("button", { name: "English pages" }));
    expect(sys()[0]).toBe("Sample vision-language model A");
    expect(rank(/DocAI/)).toBe("=2");
  });

  test("a column header sorts by that task", () => {
    render(<Leaderboard lang="en" />);
    fireEvent.click(screen.getByRole("button", { name: /^Tables/ }));
    expect(sys()[0]).toBe("Sample vision-language model A"); // best tables score on Arabic pages
    expect(screen.getByRole("columnheader", { name: /Tables/ })).toHaveAttribute("aria-sort", "descending");
  });

  test("the Arabic site names the systems in Arabic", () => {
    render(<Leaderboard lang="ar" />);
    expect(screen.queryByText(/بيانات تجريبية/)).not.toBeInTheDocument();
    expect(sys()).toContain("نموذج رؤية ولغة تجريبي A");
  });
});

describe("nav", () => {
  test("the language switch keeps you on the same page", () => {
    nav.path = "/ar/dataset/financial/receipts";
    render(<Nav lang="ar" />);
    expect(screen.getByRole("link", { name: "EN" })).toHaveAttribute("href", "/dataset/financial/receipts");
    expect(screen.queryByRole("link", { name: "لوحة الصدارة" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "مجموعة البيانات" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "جرّب DocAI" })).toHaveAttribute("href", "https://platform.providus.ai/");
  });
});

describe("methodology", () => {
  test("states the real counts and the conflict of interest, with no removed-pages list or changelog", () => {
    render(<Methodology lang="en" manifest={m} />);
    expect(screen.getByText(/^3 pages in 2 categories/)).toBeInTheDocument();
    expect(screen.queryByText(/removed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/near-duplicates/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Changelog" })).not.toBeInTheDocument();
    expect(screen.getByText(/That is a conflict of interest/)).toBeInTheDocument();
    expect(screen.getByText("Systems are scored in two ways.")).toBeInTheDocument();
    expect(screen.queryByText(/yet|will|so far/)).not.toBeInTheDocument();
  });
});
