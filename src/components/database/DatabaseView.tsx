import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import * as dv from "../../lib/dbviews";
import { exportCsv, toCsv } from "../../lib/export";
import { Icon, type IconProps } from "../icons";
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { GalleryView } from "./GalleryView";
import { CalendarView } from "./CalendarView";
import { RowDetailModal } from "./RowDetailModal";

const VIEWS: { kind: dv.ViewKind; label: string; Ic: (p: IconProps) => ReactElement }[] = [
  { kind: "table", label: "표", Ic: Icon.table },
  { kind: "board", label: "보드", Ic: Icon.board },
  { kind: "gallery", label: "갤러리", Ic: Icon.gallery },
  { kind: "calendar", label: "캘린더", Ic: Icon.calendar },
];

export interface ViewProps {
  columns: dv.Column[];
  rows: dv.Row[];
  updateCell: (rowId: string, colId: string, value: unknown) => void;
  addRow: () => Promise<string>;
  deleteRow: (id: string) => void;
  addColumn: (type: dv.ColType) => void;
  updateColumn: (id: string, patch: { name?: string; type?: dv.ColType; config?: dv.ColumnConfig }) => void;
  deleteColumn: (id: string) => void;
  onOpenRow: (id: string) => void;
}

export function DatabaseView({ pageId, title }: { pageId: string; title?: string }) {
  const [table, setTable] = useState<dv.DbTable | null>(null);
  const [columns, setColumns] = useState<dv.Column[]>([]);
  const [rows, setRows] = useState<dv.Row[]>([]);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
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

  const exportToCsv = () => {
    const header = columns.map((c) => c.name);
    const body = rows.map((r) => columns.map((c) => dv.formatCell(c, r.data[c.id])));
    void exportCsv(title || "데이터베이스", toCsv([header, ...body]));
  };

  const updateCell = (rowId: string, colId: string, value: unknown) => {
    const row = rowsRef.current.find((r) => r.id === rowId);
    const data = { ...(row?.data ?? {}), [colId]: value };
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, data } : r)));
    void dv.updateRow(rowId, data);
  };

  const addRow = async (): Promise<string> => {
    const id = await dv.addRow(table.id);
    setRows(await dv.listRows(table.id));
    return id;
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
    onOpenRow: setOpenRowId,
  };

  const openRow = openRowId ? rows.find((r) => r.id === openRowId) : null;

  return (
    <div className="db-root">
      <div className="db-toolbar">
        {VIEWS.map((v) => (
          <button
            key={v.kind}
            className={`db-view-tab ${table.view === v.kind ? "active" : ""}`}
            onClick={() => changeView(v.kind)}
          >
            <v.Ic size={15} /> {v.label}
          </button>
        ))}
        <div className="db-toolbar-spacer" />
        <span className="db-count">{rows.length}개</span>
        <button className="db-view-tab" onClick={exportToCsv} title="CSV로 내보내기">
          <Icon.download size={14} /> CSV
        </button>
      </div>

      {table.view === "table" && <TableView {...props} />}
      {table.view === "board" && <BoardView {...props} />}
      {table.view === "gallery" && <GalleryView {...props} />}
      {table.view === "calendar" && <CalendarView {...props} />}

      {openRow && (
        <RowDetailModal
          row={openRow}
          columns={columns}
          onChange={(colId, v) => updateCell(openRow.id, colId, v)}
          onColumnConfig={(colId, config) => updateColumn(colId, { config })}
          onDelete={() => deleteRow(openRow.id)}
          onClose={() => setOpenRowId(null)}
        />
      )}
    </div>
  );
}
