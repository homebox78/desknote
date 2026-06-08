// Local SQLite access via the Tauri SQL plugin. Every query runs against the
// single on-disk database; nothing here touches the network.
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!_db) {
    // The connection string depends on the chosen data folder (Rust decides).
    const url = await invoke<string>("db_url");
    _db = await Database.load(url);
  }
  return _db;
}

export interface Page {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string;
  is_favorite: number;
  type: string; // 'doc' | 'db'
}

const SELECT_COLS =
  "id, parent_id, title, icon, is_favorite, type";

export async function listPages(): Promise<Page[]> {
  const db = await getDb();
  return db.select<Page[]>(
    `SELECT ${SELECT_COLS} FROM pages WHERE is_trashed = 0 ORDER BY sort_order, created_at`
  );
}

export async function listTrash(): Promise<Page[]> {
  const db = await getDb();
  return db.select<Page[]>(
    `SELECT ${SELECT_COLS} FROM pages WHERE is_trashed = 1 ORDER BY updated_at DESC`
  );
}

async function nextSortOrder(parentId: string | null): Promise<number> {
  const db = await getDb();
  const r = await db.select<{ m: number }[]>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS m FROM pages WHERE parent_id IS ?",
    [parentId]
  );
  return r[0]?.m ?? 1;
}

export async function createPage(parentId: string | null = null): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const sort = await nextSortOrder(parentId);
  await db.execute(
    "INSERT INTO pages (id, parent_id, title, sort_order) VALUES (?, ?, ?, ?)",
    [id, parentId, "", sort]
  );
  await db.execute("INSERT INTO page_content (page_id, content) VALUES (?, '[]')", [id]);
  return id;
}

export async function trashPage(id: string): Promise<void> {
  const db = await getDb();
  // Cascade the soft-delete to descendants so children disappear with the parent.
  const all = await db.select<{ id: string; parent_id: string | null }[]>(
    "SELECT id, parent_id FROM pages WHERE is_trashed = 0"
  );
  const ids = collectSubtree(id, all);
  for (const pid of ids) {
    await db.execute(
      "UPDATE pages SET is_trashed = 1, updated_at = datetime('now') WHERE id = ?",
      [pid]
    );
  }
}

function collectSubtree(
  root: string,
  rows: { id: string; parent_id: string | null }[]
): string[] {
  const out = [root];
  for (const r of rows) {
    if (r.parent_id === root) out.push(...collectSubtree(r.id, rows));
  }
  return out;
}

export async function restorePage(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE pages SET is_trashed = 0 WHERE id = ?", [id]);
}

export async function purgePage(id: string): Promise<void> {
  const db = await getDb();
  // FK ON DELETE CASCADE removes page_content; FTS rows cleared explicitly.
  await db.execute("DELETE FROM pages_fts WHERE page_id = ?", [id]);
  await db.execute("DELETE FROM page_content WHERE page_id = ?", [id]);
  await db.execute("DELETE FROM pages WHERE id = ?", [id]);
}

export async function duplicatePage(id: string): Promise<string | null> {
  const db = await getDb();
  const src = await db.select<Page[]>(
    `SELECT ${SELECT_COLS} FROM pages WHERE id = ?`,
    [id]
  );
  if (!src[0]) return null;
  const newId = crypto.randomUUID();
  const sort = await nextSortOrder(src[0].parent_id);
  await db.execute(
    "INSERT INTO pages (id, parent_id, title, icon, type, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    [newId, src[0].parent_id, `${src[0].title} (사본)`, src[0].icon, src[0].type, sort]
  );
  const content = await loadContent(id);
  await db.execute("INSERT INTO page_content (page_id, content) VALUES (?, ?)", [
    newId,
    content,
  ]);
  return newId;
}

export async function toggleFavorite(id: string, current: number): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE pages SET is_favorite = ? WHERE id = ?", [
    current ? 0 : 1,
    id,
  ]);
}

export async function loadContent(id: string): Promise<string> {
  const db = await getDb();
  const r = await db.select<{ content: string }[]>(
    "SELECT content FROM page_content WHERE page_id = ?",
    [id]
  );
  return r[0]?.content ?? "[]";
}

export async function saveContent(
  id: string,
  content: string,
  plain: string
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE page_content SET content = ? WHERE page_id = ?", [
    content,
    id,
  ]);
  // Keep the full-text index in sync for ⌘K search.
  await db.execute("DELETE FROM pages_fts WHERE page_id = ?", [id]);
  await db.execute("INSERT INTO pages_fts (page_id, title, body) VALUES (?, ?, ?)", [
    id,
    await titleOf(id),
    plain,
  ]);

  // Periodic version snapshot: at most one every ~3 minutes, keep last 50.
  const recent = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM page_versions WHERE page_id = ? AND created_at > datetime('now', '-3 minutes')",
    [id]
  );
  if ((recent[0]?.c ?? 0) === 0) {
    await db.execute(
      "INSERT INTO page_versions (id, page_id, content) VALUES (?, ?, ?)",
      [crypto.randomUUID(), id, content]
    );
    await db.execute(
      `DELETE FROM page_versions WHERE page_id = ? AND id NOT IN (
         SELECT id FROM page_versions WHERE page_id = ? ORDER BY created_at DESC LIMIT 50
       )`,
      [id, id]
    );
  }
}

async function titleOf(id: string): Promise<string> {
  const db = await getDb();
  const r = await db.select<{ title: string }[]>(
    "SELECT title FROM pages WHERE id = ?",
    [id]
  );
  return r[0]?.title ?? "";
}

export async function updateMeta(
  id: string,
  title: string,
  icon: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE pages SET title = ?, icon = ?, updated_at = datetime('now') WHERE id = ?",
    [title, icon, id]
  );
  // Keep the search index title current on rename (no-op until content exists).
  await db.execute("UPDATE pages_fts SET title = ? WHERE page_id = ?", [title, id]);
}

export interface Hit {
  page_id: string;
  title: string;
  icon: string;
}

export async function search(q: string): Promise<Hit[]> {
  const query = q.trim();
  if (!query) return [];
  const db = await getDb();
  // Match a prefix on the last token; escape FTS quotes by wrapping tokens.
  const term = query.replace(/"/g, '""');
  return db.select<Hit[]>(
    `SELECT p.id AS page_id, p.title, p.icon
       FROM pages_fts f
       JOIN pages p ON p.id = f.page_id
      WHERE pages_fts MATCH ? AND p.is_trashed = 0
      LIMIT 20`,
    [`"${term}"*`]
  );
}
