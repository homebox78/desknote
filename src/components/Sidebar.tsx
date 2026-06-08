import type { MouseEvent } from "react";
import * as db from "../lib/db";

interface Props {
  pages: db.Page[];
  current: string | null;
  expanded: Set<string>;
  theme: "light" | "dark";
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: (parent: string | null) => void;
  onAddDatabase: (parent: string | null) => void;
  onImport: () => void;
  onExportNotion: () => void;
  onMenu: (e: MouseEvent, page: db.Page) => void;
  onSearch: () => void;
  onTrash: () => void;
  onThemeToggle: () => void;
}

export function Sidebar(p: Props) {
  const childrenOf = (pid: string | null) =>
    p.pages.filter((pg) => pg.parent_id === pid);
  const favs = p.pages.filter((pg) => pg.is_favorite);

  const renderTree = (parentId: string | null, depth = 0) =>
    childrenOf(parentId).map((pg) => {
      const kids = childrenOf(pg.id);
      const open = p.expanded.has(pg.id);
      return (
        <div key={pg.id}>
          <div
            className={`tree-row ${p.current === pg.id ? "active" : ""}`}
            style={{ paddingLeft: 8 + depth * 16 }}
            onClick={() => p.onSelect(pg.id)}
            onContextMenu={(e) => p.onMenu(e, pg)}
          >
            <span
              className="toggle"
              onClick={(e) => {
                e.stopPropagation();
                p.onToggle(pg.id);
              }}
            >
              {kids.length ? (open ? "▼" : "▶") : ""}
            </span>
            <span className="icon">{pg.icon || "📄"}</span>
            <span className="label">{pg.title || "제목 없음"}</span>
            <span
              className="add"
              title="하위 페이지 추가"
              onClick={(e) => {
                e.stopPropagation();
                p.onAdd(pg.id);
              }}
            >
              ＋
            </span>
          </div>
          {open && renderTree(pg.id, depth + 1)}
        </div>
      );
    });

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span>🗒️</span> DeskNote
      </div>

      <div className="sb-item" onClick={p.onSearch}>
        <span className="icon">🔍</span>
        <span className="label">검색</span>
        <span className="shortcut">⌘K</span>
      </div>
      <div className="sb-item" onClick={p.onThemeToggle}>
        <span className="icon">{p.theme === "light" ? "🌙" : "☀️"}</span>
        <span className="label">{p.theme === "light" ? "다크 모드" : "라이트 모드"}</span>
      </div>
      <div className="sb-item" onClick={p.onTrash}>
        <span className="icon">🗑️</span>
        <span className="label">휴지통</span>
      </div>

      {favs.length > 0 && (
        <>
          <div className="sb-section">즐겨찾기</div>
          {favs.map((pg) => (
            <div
              key={pg.id}
              className={`tree-row ${p.current === pg.id ? "active" : ""}`}
              onClick={() => p.onSelect(pg.id)}
              onContextMenu={(e) => p.onMenu(e, pg)}
            >
              <span className="icon" style={{ marginLeft: 4 }}>
                {pg.icon || "📄"}
              </span>
              <span className="label">{pg.title || "제목 없음"}</span>
            </div>
          ))}
        </>
      )}

      <div className="sb-section">개인 페이지</div>
      {renderTree(null)}

      <div className="sb-item" onClick={() => p.onAdd(null)}>
        <span className="icon">＋</span>
        <span className="label">새 페이지</span>
      </div>
      <div className="sb-item" onClick={() => p.onAddDatabase(null)}>
        <span className="icon">🗃️</span>
        <span className="label">새 데이터베이스</span>
      </div>
      <div className="sb-item" onClick={p.onImport}>
        <span className="icon">📥</span>
        <span className="label">가져오기 (MD/DOCX/CSV)</span>
      </div>
      <div className="sb-item" onClick={p.onExportNotion}>
        <span className="icon">📤</span>
        <span className="label">노션으로 내보내기</span>
      </div>
    </aside>
  );
}
