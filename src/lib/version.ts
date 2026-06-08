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

/** Relative label like the mockup: 방금 전 / N분 전 / 오늘 HH:MM / 어제 HH:MM / 날짜. */
export function relativeTime(utc: string): string {
  const d = new Date(utc.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return utc;
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  const hhmm = d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (d.toDateString() === now.toDateString()) return `오늘 ${hhmm}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `어제 ${hhmm}`;
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da} ${hhmm}`;
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
