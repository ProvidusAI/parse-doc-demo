import { useRef, useState } from "react";
import { exportName, type Sheet } from "@/lib/export";
import { t, type UiLang } from "@/lib/i18n";
import styles from "./StagePanel.module.css";

interface Props {
  lang: UiLang;
  /** the page's source file; downloads are named `<file>-<part>.xlsx|.csv` */
  fileName: string;
  part: string;
  sheets(): Sheet[];
  csv(): string;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** "↓ Excel" "↓ CSV": ExcelJS is fetched on the first Excel click only, so it never slows the page. */
export default function ExportButtons({ lang, fileName, part, sheets, csv }: Props) {
  const [busy, setBusy] = useState(false);
  const loading = useRef(false);

  const excel = async () => {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    try {
      const { workbookBlob } = await import("@/lib/xlsx");
      save(await workbookBlob(sheets()), exportName(fileName, part, "xlsx"));
    } finally {
      loading.current = false;
      setBusy(false);
    }
  };

  return (
    <span className={styles.export} dir="ltr">
      <button type="button" aria-label={t(lang, "export.excel")} title={t(lang, "export.excel")} aria-busy={busy} onClick={excel}>
        ↓ Excel
      </button>
      <button
        type="button"
        aria-label={t(lang, "export.csv")}
        title={t(lang, "export.csv")}
        onClick={() => save(new Blob([csv()], { type: "text/csv;charset=utf-8" }), exportName(fileName, part, "csv"))}
      >
        ↓ CSV
      </button>
    </span>
  );
}
