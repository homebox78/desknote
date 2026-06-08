import { useEffect, useState } from "react";
import { listVersions, formatVersionTime, Version } from "../lib/version";

/** Lists saved snapshots for a page; restoring is handled by the editor. */
export function VersionHistoryModal({
  pageId,
  onClose,
  onRestore,
}: {
  pageId: string;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);

  useEffect(() => {
    listVersions(pageId).then(setVersions);
  }, [pageId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trash-box" onClick={(e) => e.stopPropagation()}>
        <div className="trash-head">
          <span>🕘 버전 기록</span>
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--nt-text-light)" }}>
            {versions.length}개
          </span>
        </div>
        <div className="trash-list">
          {versions.map((v, i) => (
            <div key={v.id} className="trash-row">
              <span className="label">
                {formatVersionTime(v.created_at)}
                {i === 0 && <span style={{ color: "var(--nt-text-faint)" }}> · 최신</span>}
              </span>
              <div className="t-actions">
                <button
                  onClick={() => {
                    onRestore(v.id);
                    onClose();
                  }}
                >
                  이 버전으로 복원
                </button>
              </div>
            </div>
          ))}
          {!versions.length && (
            <div className="search-empty">저장된 버전이 없습니다 (편집하면 자동 기록됩니다)</div>
          )}
        </div>
      </div>
    </div>
  );
}
