import { useEffect, useRef, useState } from "react";
import { search, Hit } from "../lib/db";
import { Icon } from "./icons";

/** ⌘K / Ctrl+K full-text search over page titles and body (FTS5). */
export function SearchModal({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    search(q).then((r) => {
      if (id === reqId.current) {
        setHits(r);
        setSel(0);
      }
    });
  }, [q]);

  const choose = (h: Hit) => {
    onOpen(h.page_id);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && hits[sel]) {
      choose(hits[sel]);
    }
  };

  return (
    <div className="dn-overlay dn-overlay--top" onMouseDown={onClose}>
      <div className="dn-overlay-inner" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dn-search">
          <div className="dn-search-head">
            <Icon.search size={18} />
            <input
              autoFocus
              value={q}
              placeholder="페이지 검색…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
            />
            <span className="dn-kbd">ESC</span>
          </div>
          <div className="dn-search-body">
            {q.trim() === "" ? (
              <div className="dn-search-hint">제목이나 내용을 검색하세요</div>
            ) : hits.length === 0 ? (
              <div className="dn-search-hint">검색 결과가 없습니다</div>
            ) : (
              hits.map((h, i) => (
                <button
                  key={h.page_id}
                  className={`dn-search-item ${i === sel ? "sel" : ""}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => choose(h)}
                >
                  <span className="dn-search-item-ic">
                    {h.type === "db" ? <Icon.database size={16} /> : <Icon.doc size={16} />}
                  </span>
                  <span className="dn-search-item-title">{h.title || "제목 없음"}</span>
                  <span className="dn-search-item-type">
                    {h.type === "db" ? "데이터베이스" : "페이지"}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="dn-search-foot">
            <span>
              <span className="dn-kbd">↑↓</span> 이동
            </span>
            <span>
              <span className="dn-kbd">↵</span> 열기
            </span>
            <span className="dn-search-foot-note">
              <Icon.shield size={13} /> 로컬 FTS5 · 오프라인 검색
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
