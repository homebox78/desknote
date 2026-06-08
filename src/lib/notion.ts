// Export the whole workspace as a Notion-importable bundle: a ZIP of nested
// Markdown files (one per doc page) and CSV files (one per database), mirroring
// the page tree as folders. The user imports it via Notion → "Markdown & CSV".
// Fully offline: the ZIP is built in the WebView and written by a local Rust
// command. (Direct Notion API upload is a separate, opt-in feature.)
import JSZip from "jszip";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { BlockNoteEditor } from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core";
import * as db from "./db";
import * as dv from "./dbviews";
import { toCsv } from "./export";

function safeName(s: string): string {
  return (s.trim() || "제목 없음").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
}

export async function exportToNotionZip(): Promise<number> {
  const pages = await db.listPages();
  const editor = BlockNoteEditor.create();
  const zip = new JSZip();

  const byParent = new Map<string | null, db.Page[]>();
  for (const p of pages) {
    const arr = byParent.get(p.parent_id) ?? [];
    arr.push(p);
    byParent.set(p.parent_id, arr);
  }

  let count = 0;

  const walk = async (parentId: string | null, folder: string) => {
    const used = new Set<string>();
    for (const page of byParent.get(parentId) ?? []) {
      let name = safeName(page.title);
      const base = name;
      let n = 2;
      while (used.has(name.toLowerCase())) name = `${base} (${n++})`;
      used.add(name.toLowerCase());

      if (page.type === "db") {
        const table = await dv.getOrCreateTable(page.id);
        const [cols, rows] = await Promise.all([
          dv.listColumns(table.id),
          dv.listRows(table.id),
        ]);
        const header = cols.map((c) => c.name);
        const body = rows.map((r) => cols.map((c) => dv.formatCell(c, r.data[c.id])));
        zip.file(`${folder}${name}.csv`, "﻿" + toCsv([header, ...body]));
      } else {
        const json = await db.loadContent(page.id);
        let blocks: PartialBlock[] = [];
        try {
          blocks = JSON.parse(json);
        } catch {
          blocks = [];
        }
        const md = await editor.blocksToMarkdownLossy(blocks as PartialBlock[]);
        zip.file(`${folder}${name}.md`, `# ${page.title || "제목 없음"}\n\n${md}`);
      }
      count++;

      const kids = byParent.get(page.id);
      if (kids && kids.length) await walk(page.id, `${folder}${name}/`);
    }
  };

  await walk(null, "");

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const path = await save({
    defaultPath: "DeskNote-Notion.zip",
    filters: [{ name: "ZIP", extensions: ["zip"] }],
  });
  if (!path) return 0;
  await invoke("save_binary_file", { path, bytes: Array.from(bytes) });
  return count;
}
