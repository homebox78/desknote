// Import Markdown / DOCX / CSV files into pages or databases. Files are read
// through local Rust commands; nothing is uploaded.
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { BlockNoteEditor } from "@blocknote/core";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as db from "./db";
import { importCsvDatabase } from "./dbviews";

export async function importFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "가져오기 (MD/DOCX/CSV/XLSX)",
        extensions: ["md", "markdown", "txt", "docx", "csv", "xlsx", "xls"],
      },
    ],
  });
  if (!selected || typeof selected !== "string") return null;
  return importPath(selected);
}

/** Import a file by path (used by the dialog, Explorer "Send to D-Note", CLI). */
export async function importPath(path: string): Promise<string> {
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  const base = (path.split(/[\\/]/).pop() ?? "가져온 문서").replace(/\.[^.]+$/, "");

  if (ext === "csv") return importCsv(path, base);
  if (ext === "xlsx" || ext === "xls") return importXlsx(path, base);
  if (ext === "docx") return importDocx(path, base);
  return importMarkdown(path, base);
}

async function newDocPage(title: string, blocks: unknown, plain: string): Promise<string> {
  const id = await db.createPage(null);
  await db.updateMeta(id, title, "📄");
  await db.saveContent(id, JSON.stringify(blocks), plain);
  return id;
}

async function importMarkdown(path: string, base: string): Promise<string> {
  const text = await invoke<string>("read_text_file", { path });
  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseMarkdownToBlocks(text);
  return newDocPage(base, blocks, text);
}

async function importDocx(path: string, base: string): Promise<string> {
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  const arrayBuffer = new Uint8Array(bytes).buffer;
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseHTMLToBlocks(html);
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return newDocPage(base, blocks, plain);
}

async function importCsv(path: string, base: string): Promise<string> {
  const text = await invoke<string>("read_text_file", { path });
  const table = parseCsv(text);
  const headers = table[0]?.length ? table[0] : ["열 1"];
  const rows = table.slice(1);
  return importCsvDatabase(base, headers, rows);
}

async function importXlsx(path: string, base: string): Promise<string> {
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  const wb = XLSX.read(new Uint8Array(bytes), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const csv = sheet ? XLSX.utils.sheet_to_csv(sheet) : "";
  const table = parseCsv(csv);
  const headers = table[0]?.length ? table[0] : ["열 1"];
  const rows = table.slice(1);
  return importCsvDatabase(base, headers, rows);
}

/** RFC-4180-ish CSV parser: handles quotes, escaped quotes, embedded newlines. */
function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (c === "\r") {
      i++;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r.some((c) => c.trim() !== ""));
}
