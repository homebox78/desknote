import { CellValue } from "./cells";
import type { ViewProps } from "./DatabaseView";

export function GalleryView(p: ViewProps) {
  const titleCol = p.columns[0];
  const otherCols = p.columns.filter((c) => c.id !== titleCol?.id);

  return (
    <div className="db-gallery-wrap">
      <div className="db-gallery">
        {p.rows.map((row) => (
          <div key={row.id} className="gallery-card">
            <div className="gallery-card-title">
              {titleCol ? String(row.data[titleCol.id] ?? "") || "제목 없음" : "제목 없음"}
            </div>
            <div className="gallery-card-props">
              {otherCols.map((c) => {
                const v = row.data[c.id];
                if (v === undefined || v === null || v === "") return null;
                return (
                  <div key={c.id} className="gallery-prop">
                    <span className="gallery-prop-name">{c.name}</span>
                    <CellValue column={c} value={v} />
                  </div>
                );
              })}
            </div>
            <button
              className="gallery-del"
              title="행 삭제"
              onClick={() => p.deleteRow(row.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="db-add-row" onClick={p.addRow}>
        + 새 행
      </button>
    </div>
  );
}
