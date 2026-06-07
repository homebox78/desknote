import type { DragEvent } from "react";
import { CellValue } from "./cells";
import type { ViewProps } from "./DatabaseView";

export function BoardView(p: ViewProps) {
  const groupCol = p.columns.find((c) => c.type === "select");
  const titleCol = p.columns[0];

  if (!groupCol) {
    return (
      <div className="db-empty-note">
        보드 뷰는 그룹 기준이 될 <b>'선택'</b> 속성이 필요합니다. 표 뷰에서 선택
        속성을 추가하세요.
      </div>
    );
  }

  const groups = [
    { id: null as string | null, name: "없음", color: "var(--nt-hover)" },
    ...(groupCol.config.options ?? []),
  ];

  const otherCols = p.columns.filter((c) => c.id !== groupCol.id && c.id !== titleCol?.id);

  const onDrop = (e: DragEvent, groupId: string | null) => {
    e.preventDefault();
    const rowId = e.dataTransfer.getData("text/plain");
    if (rowId) p.updateCell(rowId, groupCol.id, groupId);
  };

  return (
    <div className="db-board">
      {groups.map((g) => {
        const items = p.rows.filter((r) => (r.data[groupCol.id] ?? null) === g.id);
        return (
          <div
            key={g.id ?? "_none"}
            className="board-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, g.id)}
          >
            <div className="board-col-head">
              <span className="db-tag" style={{ background: "color" in g ? (g as any).color : "var(--nt-hover)" }}>
                {g.name}
              </span>
              <span className="board-count">{items.length}</span>
            </div>
            {items.map((row) => (
              <div
                key={row.id}
                className="board-card"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", row.id)}
              >
                <div className="board-card-title">
                  {titleCol
                    ? String(row.data[titleCol.id] ?? "") || "제목 없음"
                    : "제목 없음"}
                </div>
                {otherCols.map((c) => {
                  const v = row.data[c.id];
                  if (v === undefined || v === null || v === "") return null;
                  return (
                    <div key={c.id} className="board-card-prop">
                      <CellValue column={c} value={v} />
                    </div>
                  );
                })}
              </div>
            ))}
            <button
              className="board-add"
              onClick={async () => {
                await p.addRow();
              }}
            >
              + 추가
            </button>
          </div>
        );
      })}
    </div>
  );
}
