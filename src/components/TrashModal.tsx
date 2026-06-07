import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";

/** Trash bin: restore soft-deleted pages or purge them for good. */
export function TrashModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<db.Page[]>([]);

  const load = useCallback(async () => setItems(await db.listTrash()), []);
  useEffect(() => {
    load();
  }, [load]);

  const restore = async (id: string) => {
    await db.restorePage(id);
    await load();
    onChanged();
  };

  const purge = async (id: string) => {
    await db.purgePage(id);
    await load();
    onChanged();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trash-box" onClick={(e) => e.stopPropagation()}>
        <div className="trash-head">
          <span>🗑️ 휴지통</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--nt-text-light)" }}>
            {items.length}개 항목
          </span>
        </div>
        <div className="trash-list">
          {items.map((p) => (
            <div key={p.id} className="trash-row">
              <span>{p.icon || "📄"}</span>
              <span className="label">{p.title || "제목 없음"}</span>
              <div className="t-actions">
                <button onClick={() => restore(p.id)}>복구</button>
                <button className="danger" onClick={() => purge(p.id)}>
                  완전 삭제
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="search-empty">휴지통이 비어 있습니다</div>}
        </div>
      </div>
    </div>
  );
}
