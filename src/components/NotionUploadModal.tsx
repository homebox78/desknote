import { useState } from "react";
import { uploadToNotion, UploadResult } from "../lib/notion";

/**
 * Opt-in direct upload to Notion. The HTTP runs in Rust (plugin-http, scoped to
 * api.notion.com); the WebView CSP stays 'none'. Requires a Notion integration
 * token and a parent page shared with that integration.
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
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="trash-box" onClick={(e) => e.stopPropagation()}>
        <div className="trash-head">
          <span>📤 노션에 직접 업로드</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12.5, color: "var(--nt-text-light)", lineHeight: 1.6 }}>
            ① notion.so/my-integrations 에서 <b>내부 통합</b>을 만들고 <b>시크릿 토큰</b>(
            <code>ntn_…</code> 또는 <code>secret_…</code>)을 복사하세요. ② 노션에서 업로드할{" "}
            <b>대상(부모) 페이지</b>를 열고 우측 상단 ⋯ → <b>연결</b>에서 그 통합을 추가한 뒤,
            그 페이지의 URL을 붙여넣으세요. 외부 통신은 이 작업에서만, 노션 도메인으로만
            발생합니다.
          </p>
          <input
            className="lock-like-input"
            type="password"
            placeholder="노션 통합 토큰 (ntn_... / secret_...)"
            value={token}
            disabled={busy}
            onChange={(e) => setToken(e.target.value)}
          />
          <input
            className="lock-like-input"
            placeholder="대상 페이지 URL 또는 ID"
            value={parent}
            disabled={busy}
            onChange={(e) => setParent(e.target.value)}
          />
          <button className="notion-upload-btn" onClick={start} disabled={busy}>
            {busy ? "업로드 중…" : "업로드 시작"}
          </button>
          {log && (
            <div style={{ fontSize: 12.5, color: "var(--nt-text-light)" }}>{log}</div>
          )}
          {result && (
            <div style={{ fontSize: 13 }}>
              <div>✅ 생성 {result.created}개 · 건너뜀(DB) {result.skipped}개</div>
              {result.errors.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ color: "var(--nt-red)", cursor: "pointer" }}>
                    실패 {result.errors.length}건
                  </summary>
                  <div style={{ maxHeight: 140, overflowY: "auto", marginTop: 4 }}>
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
        </div>
      </div>
    </div>
  );
}
