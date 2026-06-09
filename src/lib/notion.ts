// Export the whole workspace as a Notion-importable bundle: a ZIP of nested
// Markdown files (one per doc page) and CSV files (one per database), mirroring
// the page tree as folders. The user imports it via Notion → "Markdown & CSV".
// Fully offline: the ZIP is built in the WebView and written by a local Rust
// command. (Direct Notion API upload is a separate, opt-in feature.)
import JSZip from "jszip";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { markdownToBlocks } from "@tryfabric/martian";
import { BlockNoteEditor } from "@blocknote/core";
import type { PartialBlock } from "@blocknote/core";
import * as db from "./db";
import * as dv from "./dbviews";
import { toCsv } from "./export";
import { recordEgress } from "./net";

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
    defaultPath: "D-Note-Notion.zip",
    filters: [{ name: "ZIP", extensions: ["zip"] }],
  });
  if (!path) return 0;
  await invoke("save_binary_file", { path, bytes: Array.from(bytes) });
  return count;
}

/* ============================================================
   Direct upload to the Notion API. The HTTP request runs in Rust
   (tauri-plugin-http, scoped to api.notion.com), so the WebView's
   strict CSP stays intact. Opt-in; requires a Notion integration
   token and a parent page shared with that integration.
   ============================================================ */

const NOTION_VERSION = "2022-06-28";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extract a Notion page id (dashed UUID) from a URL or raw id. */
export function parseNotionId(input: string): string | null {
  const hex = input.replace(/[^0-9a-fA-F]/g, "");
  if (hex.length < 32) return null;
  const id = hex.slice(-32).toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function notionFetch(
  token: string,
  url: string,
  method: string,
  body: unknown
): Promise<any> {
  // Record this outbound request in the transparency log before it leaves the
  // machine. This is the app's only egress path.
  try {
    const { pathname } = new URL(url);
    await recordEgress("api.notion.com", `${method} ${pathname}`);
  } catch {
    /* logging must never block the upload */
  }
  const resp = await tauriFetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json: any = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.message || `HTTP ${resp.status}`);
  return json;
}

async function createNotionPage(
  token: string,
  parentId: string,
  title: string,
  children: unknown[]
): Promise<string> {
  const res = await notionFetch(token, "https://api.notion.com/v1/pages", "POST", {
    parent: { page_id: parentId },
    properties: { title: [{ text: { content: title || "제목 없음" } }] },
    children: children.slice(0, 100),
  });
  const id = res.id as string;
  for (let i = 100; i < children.length; i += 100) {
    await sleep(350);
    await notionFetch(
      token,
      `https://api.notion.com/v1/blocks/${id}/children`,
      "PATCH",
      { children: children.slice(i, i + 100) }
    );
  }
  return id;
}

export interface UploadResult {
  created: number;
  skipped: number;
  errors: string[];
}

export async function uploadToNotion(
  token: string,
  parentInput: string,
  onProgress: (msg: string) => void
): Promise<UploadResult> {
  const rootId = parseNotionId(parentInput);
  if (!rootId) throw new Error("올바른 노션 페이지 URL 또는 ID가 아닙니다");

  const pages = await db.listPages();
  const editor = BlockNoteEditor.create();
  const byParent = new Map<string | null, db.Page[]>();
  for (const p of pages) {
    const arr = byParent.get(p.parent_id) ?? [];
    arr.push(p);
    byParent.set(p.parent_id, arr);
  }

  const result: UploadResult = { created: 0, skipped: 0, errors: [] };

  const walk = async (deskParent: string | null, notionParent: string) => {
    for (const page of byParent.get(deskParent) ?? []) {
      if (page.type === "db") {
        // Databases aren't created via the simple API in v1; recurse children.
        result.skipped++;
        onProgress(`데이터베이스 건너뜀: ${page.title || "제목 없음"}`);
        await walk(page.id, notionParent);
        continue;
      }
      try {
        onProgress(`업로드 중: ${page.title || "제목 없음"}`);
        const json = await db.loadContent(page.id);
        let blocks: PartialBlock[] = [];
        try {
          blocks = JSON.parse(json);
        } catch {
          blocks = [];
        }
        let md = await editor.blocksToMarkdownLossy(blocks as PartialBlock[]);
        md = md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim(); // drop local images
        const nblocks = markdownToBlocks(md, {
          notionLimits: { truncate: true, onError: () => {} },
        }) as unknown[];
        await sleep(350);
        const newId = await createNotionPage(token, notionParent, page.title, nblocks);
        result.created++;
        await walk(page.id, newId);
      } catch (e) {
        result.errors.push(`${page.title || "제목 없음"}: ${String(e)}`);
        onProgress(`실패: ${page.title || "제목 없음"}`);
      }
    }
  };

  await walk(null, rootId);
  return result;
}
