import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { netStatus, type NetState } from "../lib/net";
import { Icon } from "./icons";

/**
 * Trust indicator: shows the cumulative number of outbound network requests the
 * app has ever made. The WebView is sealed by CSP `connect-src 'none'`, so the
 * count stays 0 unless the user opts into Notion upload. Clicking opens the full
 * transparency log. This proves the offline claim instead of merely asserting it.
 */
export function NetBadge() {
  const [state, setState] = useState<NetState>({ count: 0, entries: [] });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    netStatus().then(setState).catch(() => {});
    const un = listen<NetState>("net-changed", (e) => setState(e.payload));
    return () => {
      un.then((f) => f());
    };
  }, []);

  const clear = state.count === 0;

  return (
    <>
      <button
        className={`sb-net ${clear ? "sb-net--ok" : "sb-net--warn"}`}
        onClick={() => setOpen(true)}
        title="외부 통신 기록 보기"
      >
        <Icon.shield size={14} />
        <span className="sb-net-label">
          {clear ? "외부 통신 0건 · 차단됨" : `외부 통신 ${state.count}건`}
        </span>
      </button>

      {open && (
        <div className="dn-overlay dn-overlay--top" onMouseDown={() => setOpen(false)}>
          <div className="dn-overlay-inner" onMouseDown={(e) => e.stopPropagation()}>
            <div className="dn-trash">
              <div className="dn-trash-head">
                <span className="dn-trash-title">
                  <Icon.shield size={18} /> 외부 통신 기록
                </span>
                <span className="dn-trash-count">누적 {state.count}건</span>
              </div>
              <div className="dn-net-note">
                웹뷰는 CSP <code>connect-src 'none'</code> 로 외부 연결이 원천 차단됩니다.
                아래는 옵트인 기능(노션 업로드)이 실제로 보낸 요청의 전체 기록입니다.
              </div>
              <div className="dn-trash-body">
                {state.entries.length === 0 && (
                  <div className="dn-search-hint">
                    기록 없음 — 지금까지 단 한 건의 외부 통신도 없었습니다.
                  </div>
                )}
                {[...state.entries].reverse().map((e, i) => (
                  <div key={i} className="dn-trash-item">
                    <span className="dn-trash-item-ic">
                      <Icon.link size={16} />
                    </span>
                    <span className="dn-trash-item-title">
                      {e.host} <span className="dn-net-detail">{e.detail}</span>
                    </span>
                    <span className="dn-net-time">
                      {new Date(e.ts).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
