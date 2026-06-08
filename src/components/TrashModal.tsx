import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";
import { Icon } from "./icons";

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
    <div className="dn-overlay dn-overlay--top" onMouseDown={onClose}>
      <div className="dn-overlay-inner" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dn-trash">
          <div className="dn-trash-head">
            <span className="dn-trash-title">
              <Icon.trash size={18} /> 휴지통
            </span>
            <span className="dn-trash-count">{items.length}개 항목</span>
          </div>
          <div className="dn-trash-body">
            {items.map((p) => (
              <div key={p.id} className="dn-trash-item">
                <span className="dn-trash-item-ic">
                  {p.type === "db" ? <Icon.database size={16} /> : <Icon.doc size={16} />}
                </span>
                <span className="dn-trash-item-title">{p.title || "제목 없음"}</span>
                <div className="dn-trash-actions">
                  <button className="dn-textbtn" onClick={() => restore(p.id)}>
                    복원
                  </button>
                  <button
                    className="dn-textbtn dn-textbtn--danger"
                    onClick={() => purge(p.id)}
                  >
                    영구 삭제
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="dn-search-hint">휴지통이 비어 있습니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
