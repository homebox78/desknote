import { Cell } from "./cells";
import { Column, Row } from "../../lib/dbviews";

/** Edit every property of a single row — used by board / gallery / calendar
 *  (and the table's open button) so all views are fully editable. */
export function RowDetailModal({
  row,
  columns,
  onChange,
  onColumnConfig,
  onDelete,
  onClose,
}: {
  row: Row;
  columns: Column[];
  onChange: (colId: string, value: unknown) => void;
  onColumnConfig: (colId: string, config: Column["config"]) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="row-detail" onClick={(e) => e.stopPropagation()}>
        <div className="row-detail-head">
          <span>행 편집</span>
          <button
            className="rd-del"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            🗑️ 삭제
          </button>
        </div>
        <div className="row-detail-body">
          {columns.map((col) => (
            <div key={col.id} className="rd-field">
              <div className="rd-label">{col.name || "이름 없음"}</div>
              <div className="rd-cell">
                <Cell
                  column={col}
                  value={row.data[col.id]}
                  onChange={(v) => onChange(col.id, v)}
                  onColumnConfig={(cfg) => onColumnConfig(col.id, cfg)}
                />
              </div>
            </div>
          ))}
          {!columns.length && (
            <div className="cell-empty">속성이 없습니다. 표 뷰에서 추가하세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}
