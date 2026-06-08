import { useState } from "react";
import { Cell, popoverPos } from "./cells";
import { Column, ColType, TYPE_LABELS } from "../../lib/dbviews";
import type { ViewProps } from "./DatabaseView";

const ALL_TYPES: ColType[] = [
  "text",
  "number",
  "select",
  "multiselect",
  "date",
  "checkbox",
  "url",
];

export function TableView(p: ViewProps) {
  return (
    <div className="db-table-wrap">
      <table className="db-table">
        <thead>
          <tr>
            {p.columns.map((col) => (
              <ColumnHeader
                key={col.id}
                col={col}
                onRename={(name) => p.updateColumn(col.id, { name })}
                onType={(type) => p.updateColumn(col.id, { type })}
                onDelete={() => p.deleteColumn(col.id)}
              />
            ))}
            <th className="db-add-col">
              <AddColumn onAdd={p.addColumn} />
            </th>
          </tr>
        </thead>
        <tbody>
          {p.rows.map((row) => (
            <tr key={row.id}>
              {p.columns.map((col) => (
                <td key={col.id} className="db-cell">
                  <Cell
                    column={col}
                    value={row.data[col.id]}
                    onChange={(v) => p.updateCell(row.id, col.id, v)}
                    onColumnConfig={(config) => p.updateColumn(col.id, { config })}
                  />
                </td>
              ))}
              <td className="db-row-actions">
                <button
                  className="db-row-del"
                  title="행 열기"
                  onClick={() => p.onOpenRow(row.id)}
                >
                  ⤢
                </button>
                <button
                  className="db-row-del"
                  title="행 삭제"
                  onClick={() => p.deleteRow(row.id)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="db-add-row" onClick={p.addRow}>
        + 새 행
      </button>
    </div>
  );
}

function ColumnHeader({
  col,
  onRename,
  onType,
  onDelete,
}: {
  col: Column;
  onRename: (name: string) => void;
  onType: (type: ColType) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [name, setName] = useState(col.name);

  return (
    <th className="db-th">
      <div
        className="db-th-inner"
        onClick={(e) => {
          setPos(popoverPos(e, 220, 360));
          setOpen(true);
        }}
      >
        <span className="db-th-name">{col.name || "이름 없음"}</span>
      </div>
      {open && (
        <>
          <div className="select-overlay" onClick={() => setOpen(false)} />
          <div className="col-menu" style={{ left: pos.left, top: pos.top }}>
            <input
              className="col-name-input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={() => onRename(name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(name);
                  setOpen(false);
                }
              }}
            />
            <div className="col-menu-label">유형</div>
            <div className="col-types">
              {ALL_TYPES.map((t) => (
                <div
                  key={t}
                  className={`col-type ${col.type === t ? "active" : ""}`}
                  onClick={() => {
                    onType(t);
                    setOpen(false);
                  }}
                >
                  {TYPE_LABELS[t]}
                </div>
              ))}
            </div>
            <div
              className="col-menu-item danger"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
            >
              🗑️ 속성 삭제
            </div>
          </div>
        </>
      )}
    </th>
  );
}

function AddColumn({ onAdd }: { onAdd: (type: ColType) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  return (
    <div className="add-col-wrap">
      <button
        className="add-col-btn"
        title="속성 추가"
        onClick={(e) => {
          setPos(popoverPos(e, 220, 320));
          setOpen(true);
        }}
      >
        +
      </button>
      {open && (
        <>
          <div className="select-overlay" onClick={() => setOpen(false)} />
          <div className="col-menu" style={{ left: pos.left, top: pos.top }}>
            <div className="col-menu-label">새 속성 유형</div>
            <div className="col-types">
              {ALL_TYPES.map((t) => (
                <div
                  key={t}
                  className="col-type"
                  onClick={() => {
                    onAdd(t);
                    setOpen(false);
                  }}
                >
                  {TYPE_LABELS[t]}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
