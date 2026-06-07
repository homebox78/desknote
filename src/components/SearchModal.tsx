import { useEffect, useRef, useState } from "react";
import { search, Hit } from "../lib/db";

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
      // Ignore out-of-order responses from a stale keystroke.
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-box" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="search-input"
          placeholder="페이지 검색…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="search-results">
          {hits.map((h, i) => (
            <div
              key={h.page_id}
              className={`search-hit ${i === sel ? "sel" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => choose(h)}
            >
              <span>{h.icon || "📄"}</span>
              <span>{h.title || "제목 없음"}</span>
            </div>
          ))}
          {q && hits.length === 0 && <div className="search-empty">결과 없음</div>}
          {!q && <div className="search-empty">제목이나 내용을 검색하세요</div>}
        </div>
      </div>
    </div>
  );
}
