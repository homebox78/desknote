// Sticky-note persistence: which pages are open as desktop sticky windows and
// their geometry/color. A sticky is a normal page mirrored in a small window.
import { getDb } from "./db";
import * as db from "./db";

export interface Sticky {
  page_id: string;
  x: number | null;
  y: number | null;
  w: number;
  h: number;
  color: string;
  is_open: number;
}

export const STICKY_COLORS = [
  "#fff8b8", // yellow
  "#d8f0c8", // green
  "#cfe6f7", // blue
  "#f8d3e0", // pink
  "#ecdcc6", // tan
  "#e6dcf2", // purple
];

export async function listOpenStickies(): Promise<Sticky[]> {
  const d = await getDb();
  return d.select<Sticky[]>(
    "SELECT page_id, x, y, w, h, color, is_open FROM stickies WHERE is_open = 1"
  );
}

export async function getSticky(pageId: string): Promise<Sticky | null> {
  const d = await getDb();
  const r = await d.select<Sticky[]>(
    "SELECT page_id, x, y, w, h, color, is_open FROM stickies WHERE page_id = ?",
    [pageId]
  );
  return r[0] ?? null;
}

/** Mark a page as having an open sticky (creating the record if needed). */
export async function markStickyOpen(pageId: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO stickies (page_id, is_open) VALUES (?, 1) ON CONFLICT(page_id) DO UPDATE SET is_open = 1",
    [pageId]
  );
}

export async function markStickyClosed(pageId: string): Promise<void> {
  const d = await getDb();
  await d.execute("UPDATE stickies SET is_open = 0 WHERE page_id = ?", [pageId]);
}

export async function saveStickyGeom(
  pageId: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE stickies SET x = ?, y = ?, w = ?, h = ?, updated_at = datetime('now') WHERE page_id = ?",
    [Math.round(x), Math.round(y), Math.round(w), Math.round(h), pageId]
  );
}

export async function saveStickyColor(pageId: string, color: string): Promise<void> {
  const d = await getDb();
  await d.execute("UPDATE stickies SET color = ? WHERE page_id = ?", [color, pageId]);
}

/** Create a brand-new page intended to be used as a sticky, returns its id. */
export async function createStickyPage(): Promise<string> {
  const id = await db.createPage(null);
  await db.updateMeta(id, "", "📌");
  await markStickyOpen(id);
  return id;
}
