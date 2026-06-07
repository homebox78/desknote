// Page export to Markdown / HTML / PDF. A native save dialog chooses the
// destination; the actual write goes through local Rust commands so the
// WebView never needs broad filesystem access.
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import jsPDF from "jspdf";

function safeName(title: string): string {
  return (title.trim() || "문서").replace(/[\\/:*?"<>|]/g, "_");
}

export async function exportMarkdown(title: string, markdown: string): Promise<void> {
  const path = await save({
    defaultPath: `${safeName(title)}.md`,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!path) return;
  await invoke("save_text_file", {
    path,
    contents: `# ${title || "제목 없음"}\n\n${markdown}`,
  });
}

export async function exportHTML(title: string, bodyHtml: string): Promise<void> {
  const doc = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    max-width: 720px; margin: 40px auto; color: #37352f; line-height: 1.6;
    padding: 0 24px; }
  h1 { font-size: 40px; font-weight: 700; margin-bottom: 16px; }
  img { max-width: 100%; border-radius: 4px; }
  pre { background: #f7f6f3; padding: 16px; border-radius: 6px; overflow-x: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  blockquote { border-left: 3px solid #37352f; margin: 0; padding-left: 14px; color: #555; }
</style>
</head>
<body>
<h1>${escapeHtml(title || "제목 없음")}</h1>
${bodyHtml}
</body>
</html>`;
  const path = await save({
    defaultPath: `${safeName(title)}.html`,
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (!path) return;
  await invoke("save_text_file", { path, contents: doc });
}

export async function exportPDF(title: string, markdown: string): Promise<void> {
  const path = await save({
    defaultPath: `${safeName(title)}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return;

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFontSize(22);
  pdf.text(title || "제목 없음", 15, 22);
  pdf.setFontSize(11);
  // Note: jsPDF's built-in fonts are Latin-only. Korean glyphs need a CJK font
  // registered with addFont(); see README for the optional setup.
  const lines = pdf.splitTextToSize(markdown || "", 180) as string[];
  let y = 34;
  const pageHeight = pdf.internal.pageSize.getHeight();
  for (const line of lines) {
    if (y > pageHeight - 15) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, 15, y);
    y += 7;
  }

  const bytes = Array.from(new Uint8Array(pdf.output("arraybuffer")));
  await invoke("save_binary_file", { path, bytes });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
