// Per-page version snapshots (page_versions). Snapshots are written by
// db.saveContent on a throttle; here we list and restore them.
import { getDb } from "./db";

export interface Version {
  id: string;
  created_at: string; // UTC "YYYY-MM-DD HH:MM:SS"
}

export async function listVersions(pageId: string): Promise<Version[]> {
  const db = await getDb();
  return db.select<Version[]>(
    "SELECT id, created_at FROM page_versions WHERE page_id = ? ORDER BY created_at DESC",
    [pageId]
  );
}

export async function getVersionContent(versionId: string): Promise<string> {
  const db = await getDb();
  const r = await db.select<{ content: string }[]>(
    "SELECT content FROM page_versions WHERE id = ?",
    [versionId]
  );
  return r[0]?.content ?? "[]";
}

/** Copy a snapshot's content back into the live page. */
export async function restoreVersion(pageId: string, versionId: string): Promise<void> {
  const db = await getDb();
  const content = await getVersionContent(versionId);
  await db.execute("UPDATE page_content SET content = ? WHERE page_id = ?", [
    content,
    pageId,
  ]);
}

/** Format a UTC SQLite timestamp into the user's local date-time string. */
export function formatVersionTime(utc: string): string {
  // SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC.
  const d = new Date(utc.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return utc;
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
