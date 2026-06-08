import type { MouseEvent } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { CellValue } from "./cells";
import { Icon } from "../icons";
import type { ViewProps } from "./DatabaseView";

const COVER_KEY = "__cover";

export function GalleryView(p: ViewProps) {
  const titleCol = p.columns[0];
  const otherCols = p.columns.filter((c) => c.id !== titleCol?.id);

  const attachCover = async (rowId: string, e: MouseEvent) => {
    e.stopPropagation();
    const sel = await open({
      multiple: false,
      filters: [
        { name: "이미지", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"] },
      ],
    });
    if (!sel || typeof sel !== "string") return;
    const name = sel.split(/[\\/]/).pop() ?? "image";
    const bytes = await invoke<number[]>("read_file_bytes", { path: sel });
    const savedPath = await invoke<string>("save_asset", { name, bytes });
    p.updateCell(rowId, COVER_KEY, convertFileSrc(savedPath));
  };

  return (
    <div className="db-gallery-wrap">
      <div className="db-gallery">
        {p.rows.map((row) => {
          const cover = row.data[COVER_KEY];
          return (
            <div key={row.id} className="gallery-card">
              <div
                className="gallery-card-cover"
                title="이미지 첨부/변경"
                onClick={(e) => attachCover(row.id, e)}
              >
                {typeof cover === "string" && cover ? (
                  <img src={cover} alt="" />
                ) : (
                  <span className="gallery-cover-add">
                    <Icon.plus size={16} /> 이미지
                  </span>
                )}
              </div>
              <div className="gallery-card-inner" onClick={() => p.onOpenRow(row.id)}>
                <div className="gallery-card-title">
                  {titleCol
                    ? String(row.data[titleCol.id] ?? "") || "제목 없음"
                    : "제목 없음"}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    p.deleteRow(row.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="db-add-row" onClick={p.addRow}>
        + 새 행
      </button>
    </div>
  );
}
