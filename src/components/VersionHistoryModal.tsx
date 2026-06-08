import { useEffect, useState } from "react";
import { listVersions, formatVersionTime, Version } from "../lib/version";
import { Icon } from "./icons";

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
  const [sel, setSel] = useState(0);

  useEffect(() => {
    listVersions(pageId).then(setVersions);
  }, [pageId]);

  const current = versions[sel];

  return (
    <div className="dn-overlay dn-overlay--center" onMouseDown={onClose}>
      <div className="dn-overlay-inner" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dn-version">
          <div className="dn-version-list">
            <div className="dn-version-head">
              <Icon.history size={17} /> 버전 기록
            </div>
            <div className="dn-version-scroll">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  className={`dn-version-item ${i === sel ? "is-sel" : ""}`}
                  onClick={() => setSel(i)}
                >
                  <span className="dn-version-time">{formatVersionTime(v.created_at)}</span>
                  <span className="dn-version-label">
                    {i === 0 ? "가장 최근 스냅샷" : "스냅샷"}
                    {i === 0 && <em className="dn-version-now">최신</em>}
                  </span>
                </button>
              ))}
              {versions.length === 0 && (
                <div className="dn-version-empty">
                  저장된 버전이 없습니다.
                  <br />
                  편집하면 자동 기록됩니다.
                </div>
              )}
            </div>
          </div>
          <div className="dn-version-preview">
            <div className="dn-version-pv-head">
              <span>{current ? formatVersionTime(current.created_at) : "버전 없음"}</span>
              <div className="dn-version-actions">
                <button className="dn-chip" onClick={onClose}>
                  닫기
                </button>
                <button
                  className="dn-btn-primary dn-version-restore"
                  disabled={!current}
                  onClick={() => {
                    if (current) {
                      onRestore(current.id);
                      onClose();
                    }
                  }}
                >
                  이 버전 복원
                </button>
              </div>
            </div>
            <div className="dn-version-pv-body">
              <div className="dn-version-empty">
                {current
                  ? "이 시점의 스냅샷으로 본문을 되돌립니다."
                  : "복원할 버전을 선택하세요."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
