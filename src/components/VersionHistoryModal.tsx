import { useEffect, useState } from "react";
import { listVersions, relativeTime, Version } from "../lib/version";
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
  const isCurrent = sel === 0; // newest snapshot

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
                  <span className="dn-version-time">{relativeTime(v.created_at)}</span>
                  <span className="dn-version-label">
                    자동 저장
                    {i === 0 && <em className="dn-version-now">현재</em>}
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
              <span>
                {current ? `${relativeTime(current.created_at)} · 자동 저장` : "버전 없음"}
              </span>
              <div className="dn-version-actions">
                <button className="dn-chip" onClick={onClose}>
                  닫기
                </button>
                <button
                  className="dn-btn-primary dn-version-restore"
                  disabled={!current || isCurrent}
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
              {current ? (
                <>
                  <div className="dn-pv-line dn-pv-h" />
                  <div className="dn-pv-line" style={{ width: "92%" }} />
                  <div className="dn-pv-line" style={{ width: "80%" }} />
                  <div className="dn-pv-line" style={{ width: "88%" }} />
                  <div className="dn-pv-line dn-pv-gap" style={{ width: "60%" }} />
                  <div className="dn-pv-line" style={{ width: "95%" }} />
                  <div className="dn-pv-line" style={{ width: "70%" }} />
                  <div className="dn-version-watermark">스냅샷 미리보기</div>
                </>
              ) : (
                <div className="dn-version-empty">복원할 버전을 선택하세요.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
