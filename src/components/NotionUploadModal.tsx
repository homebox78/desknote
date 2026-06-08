import { useState } from "react";
import { uploadToNotion, UploadResult } from "../lib/notion";
import { Icon } from "./icons";

/**
 * Opt-in direct upload to Notion. The HTTP runs in Rust (plugin-http, scoped to
 * api.notion.com); the WebView CSP stays 'none'.
 */
export function NotionUploadModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState("");
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  const start = async () => {
    if (!token.trim() || !parent.trim() || busy) return;
    setBusy(true);
    setResult(null);
    setLog("시작…");
    try {
      const r = await uploadToNotion(token.trim(), parent.trim(), setLog);
      setResult(r);
      setLog("완료");
    } catch (e) {
      setLog("오류: " + String(e));
    }
    setBusy(false);
  };

  return (
    <div
      className="dn-overlay dn-overlay--center"
      onMouseDown={busy ? undefined : onClose}
    >
      <div className="dn-overlay-inner" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dn-notion">
          <div className="dn-notion-head">
            <span className="dn-notion-title">
              <Icon.link size={18} /> 노션에 직접 업로드
            </span>
            <button className="dn-iconbtn" onClick={onClose} disabled={busy}>
              <Icon.close size={16} />
            </button>
          </div>
          <ol className="dn-notion-steps">
            <li>
              notion.so/my-integrations 에서 <b>내부 통합</b>을 만들고 시크릿 토큰(
              <code>ntn_…</code> / <code>secret_…</code>)을 복사하세요.
            </li>
            <li>
              노션에서 대상(부모) 페이지를 열고 우측 상단 ⋯ → <b>연결</b>에 통합을 추가한
              뒤, 페이지 URL을 붙여넣으세요.
            </li>
          </ol>
          <div className="dn-notion-fields">
            <input
              type="password"
              placeholder="노션 통합 토큰 (ntn_… / secret_…)"
              value={token}
              disabled={busy}
              onChange={(e) => setToken(e.target.value)}
            />
            <input
              placeholder="대상 페이지 URL 또는 ID"
              value={parent}
              disabled={busy}
              onChange={(e) => setParent(e.target.value)}
            />
          </div>
          <button className="dn-btn-primary dn-notion-go" onClick={start} disabled={busy}>
            {busy ? "업로드 중…" : "업로드 시작"}
          </button>
          {log && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--nt-text-light)" }}>
              {log}
            </div>
          )}
          {result && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              ✅ 생성 {result.created}개 · 건너뜀(DB) {result.skipped}개
              {result.errors.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ color: "var(--nt-red)", cursor: "pointer" }}>
                    실패 {result.errors.length}건
                  </summary>
                  <div style={{ maxHeight: 130, overflowY: "auto", marginTop: 4 }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--nt-text-light)" }}>
                        • {e}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
          <div className="dn-notion-foot">
            <Icon.shield size={14} />
            <span>
              외부 통신은 이 작업에서만, <b>api.notion.com</b> 도메인으로만 발생합니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
