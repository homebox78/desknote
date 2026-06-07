import { useCallback, useEffect, useRef, useState } from "react";
import * as dv from "../../lib/dbviews";
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { GalleryView } from "./GalleryView";
import { CalendarView } from "./CalendarView";

const VIEWS: { kind: dv.ViewKind; label: string; icon: string }[] = [
  { kind: "table", label: "표", icon: "▦" },
  { kind: "board", label: "보드", icon: "▤" },
  { kind: "gallery", label: "갤러리", icon: "▥" },
  { kind: "calendar", label: "캘린더", icon: "▦" },
];

export interface ViewProps {
  columns: dv.Column[];
  rows: dv.Row[];
  updateCell: (rowId: string, colId: string, value: unknown) => void;
  addRow: () => void;
  deleteRow: (id: string) => void;
  addColumn: (type: dv.ColType) => void;
  updateColumn: (id: string, patch: { name?: string; type?: dv.ColType; config?: dv.ColumnConfig }) => void;
  deleteColumn: (id: string) => void;
}

export function DatabaseView({ pageId }: { pageId: string }) {
  const [table, setTable] = useState<dv.DbTable | null>(null);
  const [columns, setColumns] = useState<dv.Column[]>([]);
  const [rows, setRows] = useState<dv.Row[]>([]);
  const rowsRef = useRef<dv.Row[]>([]);
  rowsRef.current = rows;

  const reloadMeta = useCallback(async (tableId: string) => {
    const [cols, rws] = await Promise.all([
      dv.listColumns(tableId),
      dv.listRows(tableId),
    ]);
    setColumns(cols);
    setRows(rws);
  }, []);

  useEffect(() => {
    let alive = true;
    dv.getOrCreateTable(pageId).then(async (t) => {
      if (!alive) return;
      setTable(t);
      await reloadMeta(t.id);
    });
    return () => {
      alive = false;
    };
  }, [pageId, reloadMeta]);

  if (!table) return <div className="db-loading">데이터베이스 불러오는 중…</div>;

  const changeView = async (kind: dv.ViewKind) => {
    setTable({ ...table, view: kind });
    await dv.setView(table.id, kind);
  };

  const updateCell = (rowId: string, colId: string, value: unknown) => {
    const row = rowsRef.current.find((r) => r.id === rowId);
    const data = { ...(row?.data ?? {}), [colId]: value };
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, data } : r)));
    void dv.updateRow(rowId, data);
  };

  const addRow = async () => {
    await dv.addRow(table.id);
    setRows(await dv.listRows(table.id));
  };
  const deleteRow = async (id: string) => {
    await dv.deleteRow(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };
  const addColumn = async (type: dv.ColType) => {
    const n = columns.filter((c) => c.type === type).length;
    await dv.addColumn(table.id, `${dv.TYPE_LABELS[type]}${n ? " " + (n + 1) : ""}`, type);
    setColumns(await dv.listColumns(table.id));
  };
  const updateColumn = async (
    id: string,
    patch: { name?: string; type?: dv.ColType; config?: dv.ColumnConfig }
  ) => {
    await dv.updateColumn(id, patch);
    setColumns(await dv.listColumns(table.id));
  };
  const deleteColumn = async (id: string) => {
    await dv.deleteColumn(id);
    setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const props: ViewProps = {
    columns,
    rows,
    updateCell,
    addRow,
    deleteRow,
    addColumn,
    updateColumn,
    deleteColumn,
  };

  return (
    <div className="db-root">
      <div className="db-toolbar">
        {VIEWS.map((v) => (
          <button
            key={v.kind}
            className={`db-view-tab ${table.view === v.kind ? "active" : ""}`}
            onClick={() => changeView(v.kind)}
          >
            <span className="db-view-icon">{v.icon}</span> {v.label}
          </button>
        ))}
        <div className="db-toolbar-spacer" />
        <span className="db-count">{rows.length}개</span>
      </div>

      {table.view === "table" && <TableView {...props} />}
      {table.view === "board" && <BoardView {...props} />}
      {table.view === "gallery" && <GalleryView {...props} />}
      {table.view === "calendar" && <CalendarView {...props} />}
    </div>
  );
}
