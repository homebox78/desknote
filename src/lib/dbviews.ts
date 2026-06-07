// Database (table/board/gallery/calendar) data layer over the local SQLite
// tables db_tables / db_columns / db_rows. All local; no network.
import { getDb } from "./db";

export type ColType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "checkbox"
  | "url";

export type ViewKind = "table" | "board" | "gallery" | "calendar";

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}
export interface ColumnConfig {
  options?: SelectOption[];
}
export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: ColType;
  config: ColumnConfig;
  sort_order: number;
}
export interface Row {
  id: string;
  table_id: string;
  data: Record<string, unknown>;
  sort_order: number;
}
export interface DbTable {
  id: string;
  page_id: string;
  name: string;
  view: ViewKind;
}

/** Notion-like tag palette for select / multi-select options. */
export const SELECT_COLORS = [
  "#e3e2e0",
  "#ffe2dd",
  "#ffdeb3",
  "#fdecc8",
  "#dbeddb",
  "#d3e5ef",
  "#e8deee",
  "#f5e0e9",
  "#eee0da",
];

export const TYPE_LABELS: Record<ColType, string> = {
  text: "텍스트",
  number: "숫자",
  select: "선택",
  multiselect: "다중 선택",
  date: "날짜",
  checkbox: "체크박스",
  url: "URL",
};

const uuid = () => crypto.randomUUID();

async function nextSort(table: string, where: string, val: string | null): Promise<number> {
  const db = await getDb();
  const r = await db.select<{ m: number }[]>(
    `SELECT COALESCE(MAX(sort_order),0)+1 AS m FROM ${table} WHERE ${where} IS ?`,
    [val]
  );
  return r[0]?.m ?? 1;
}

function newOption(name: string, i: number): SelectOption {
  return { id: uuid(), name, color: SELECT_COLORS[i % SELECT_COLORS.length] };
}

async function createDefaultColumns(tableId: string): Promise<void> {
  const db = await getDb();
  const cols: Array<[string, ColType, ColumnConfig]> = [
    ["이름", "text", {}],
    [
      "상태",
      "select",
      {
        options: [
          newOption("시작 전", 0),
          newOption("진행 중", 5),
          newOption("완료", 4),
        ],
      },
    ],
    ["날짜", "date", {}],
  ];
  let i = 0;
  for (const [name, type, config] of cols) {
    await db.execute(
      "INSERT INTO db_columns (id, table_id, name, type, config, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [uuid(), tableId, name, type, JSON.stringify(config), i++]
    );
  }
}

/** Create a new database page (type='db') with a table, default columns, rows. */
export async function createDatabasePage(parentId: string | null = null): Promise<string> {
  const db = await getDb();
  const pageId = uuid();
  const sort = await nextSort("pages", "parent_id", parentId);
  await db.execute(
    "INSERT INTO pages (id, parent_id, title, icon, type, sort_order) VALUES (?, ?, ?, ?, 'db', ?)",
    [pageId, parentId, "", "🗃️", sort]
  );
  await db.execute("INSERT INTO page_content (page_id, content) VALUES (?, '[]')", [pageId]);

  const tableId = uuid();
  await db.execute(
    "INSERT INTO db_tables (id, page_id, name, view) VALUES (?, ?, '', 'table')",
    [tableId, pageId]
  );
  await createDefaultColumns(tableId);
  for (let i = 0; i < 3; i++) {
    await db.execute(
      "INSERT INTO db_rows (id, table_id, data, sort_order) VALUES (?, ?, '{}', ?)",
      [uuid(), tableId, i]
    );
  }
  return pageId;
}

export async function getOrCreateTable(pageId: string): Promise<DbTable> {
  const db = await getDb();
  const r = await db.select<DbTable[]>(
    "SELECT id, page_id, name, view FROM db_tables WHERE page_id = ? LIMIT 1",
    [pageId]
  );
  if (r[0]) return r[0];
  const tableId = uuid();
  await db.execute(
    "INSERT INTO db_tables (id, page_id, name, view) VALUES (?, ?, '', 'table')",
    [tableId, pageId]
  );
  await createDefaultColumns(tableId);
  return { id: tableId, page_id: pageId, name: "", view: "table" };
}

export async function setView(tableId: string, view: ViewKind): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE db_tables SET view = ? WHERE id = ?", [view, tableId]);
}

export async function listColumns(tableId: string): Promise<Column[]> {
  const db = await getDb();
  const rows = await db.select<
    { id: string; table_id: string; name: string; type: ColType; config: string; sort_order: number }[]
  >(
    "SELECT id, table_id, name, type, config, sort_order FROM db_columns WHERE table_id = ? ORDER BY sort_order",
    [tableId]
  );
  return rows.map((c) => ({
    ...c,
    config: safeParse<ColumnConfig>(c.config, {}),
  }));
}

export async function listRows(tableId: string): Promise<Row[]> {
  const db = await getDb();
  const rows = await db.select<
    { id: string; table_id: string; data: string; sort_order: number }[]
  >(
    "SELECT id, table_id, data, sort_order FROM db_rows WHERE table_id = ? ORDER BY sort_order, rowid",
    [tableId]
  );
  return rows.map((r) => ({ ...r, data: safeParse<Record<string, unknown>>(r.data, {}) }));
}

export async function addColumn(tableId: string, name: string, type: ColType): Promise<string> {
  const db = await getDb();
  const id = uuid();
  const sort = await nextSort("db_columns", "table_id", tableId);
  await db.execute(
    "INSERT INTO db_columns (id, table_id, name, type, config, sort_order) VALUES (?, ?, ?, ?, '{}', ?)",
    [id, tableId, name, type, sort]
  );
  return id;
}

export async function updateColumn(
  id: string,
  patch: { name?: string; type?: ColType; config?: ColumnConfig }
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    vals.push(patch.name);
  }
  if (patch.type !== undefined) {
    sets.push("type = ?");
    vals.push(patch.type);
  }
  if (patch.config !== undefined) {
    sets.push("config = ?");
    vals.push(JSON.stringify(patch.config));
  }
  if (!sets.length) return;
  vals.push(id);
  await db.execute(`UPDATE db_columns SET ${sets.join(", ")} WHERE id = ?`, vals);
}

export async function deleteColumn(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM db_columns WHERE id = ?", [id]);
}

export async function addRow(tableId: string): Promise<string> {
  const db = await getDb();
  const id = uuid();
  const sort = await nextSort("db_rows", "table_id", tableId);
  await db.execute(
    "INSERT INTO db_rows (id, table_id, data, sort_order) VALUES (?, ?, '{}', ?)",
    [id, tableId, sort]
  );
  return id;
}

export async function updateRow(id: string, data: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE db_rows SET data = ? WHERE id = ?", [JSON.stringify(data), id]);
}

export async function deleteRow(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM db_rows WHERE id = ?", [id]);
}

/** Plain-text representation of a cell value (for CSV export). */
export function formatCell(column: Column, value: unknown): string {
  switch (column.type) {
    case "checkbox":
      return value ? "true" : "false";
    case "select": {
      const o = column.config.options?.find((x) => x.id === value);
      return o?.name ?? "";
    }
    case "multiselect": {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      return (column.config.options ?? [])
        .filter((o) => ids.includes(o.id))
        .map((o) => o.name)
        .join(", ");
    }
    default:
      return value != null ? String(value) : "";
  }
}

/** Create a database page from parsed CSV (headers + string rows). */
export async function importCsvDatabase(
  name: string,
  headers: string[],
  rows: string[][]
): Promise<string> {
  const db = await getDb();
  const pageId = uuid();
  const sort = await nextSort("pages", "parent_id", null);
  await db.execute(
    "INSERT INTO pages (id, parent_id, title, icon, type, sort_order) VALUES (?, NULL, ?, '🗃️', 'db', ?)",
    [pageId, name, sort]
  );
  await db.execute("INSERT INTO page_content (page_id, content) VALUES (?, '[]')", [pageId]);

  const tableId = uuid();
  await db.execute(
    "INSERT INTO db_tables (id, page_id, name, view) VALUES (?, ?, '', 'table')",
    [tableId, pageId]
  );
  const colIds: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const id = uuid();
    colIds.push(id);
    await db.execute(
      "INSERT INTO db_columns (id, table_id, name, type, config, sort_order) VALUES (?, ?, ?, 'text', '{}', ?)",
      [id, tableId, headers[i] || `열 ${i + 1}`, i]
    );
  }
  let order = 0;
  for (const r of rows) {
    const data: Record<string, string> = {};
    colIds.forEach((cid, i) => {
      if (r[i] !== undefined && r[i] !== "") data[cid] = r[i];
    });
    await db.execute(
      "INSERT INTO db_rows (id, table_id, data, sort_order) VALUES (?, ?, ?, ?)",
      [uuid(), tableId, JSON.stringify(data), order++]
    );
  }
  return pageId;
}

function safeParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
