import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Custom window title bar. Because the native caption can't host a WebView
 * element, we disable native decorations (tauri.conf.json) and draw our own
 * controls — pin · minimize · maximize/restore · close — in one row with a
 * consistent line-icon style. The bar itself is the drag region.
 */
export function Titlebar({
  icon,
  title,
  pinned,
  onTogglePin,
  onSettings,
  showPin = true,
}: {
  icon: string;
  title: string;
  pinned: boolean;
  onTogglePin: () => void;
  onSettings?: () => void;
  showPin?: boolean;
}) {
  const [maximized, setMaximized] = useState(false);
  const win = getCurrentWindow();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    win.isMaximized().then(setMaximized);
    win.onResized(() => win.isMaximized().then(setMaximized)).then((f) => {
      unlisten = f;
    });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="tb-left" data-tauri-drag-region>
        <span className="tb-icon">{icon}</span>
        <span className="tb-title">{title}</span>
      </div>
      <div className="tb-controls">
        {onSettings && (
          <button className="win-btn" title="설정" onClick={onSettings}>
            <Gear />
          </button>
        )}
        {showPin && (
          <button
            className={`win-btn pin ${pinned ? "on" : ""}`}
            title={pinned ? "항상 위 해제" : "항상 위에 고정"}
            onClick={onTogglePin}
          >
            <Pin />
          </button>
        )}
        <button className="win-btn" title="최소화" onClick={() => win.minimize()}>
          <Minimize />
        </button>
        <button
          className="win-btn"
          title={maximized ? "이전 크기로" : "최대화"}
          onClick={() => win.toggleMaximize()}
        >
          {maximized ? <Restore /> : <Maximize />}
        </button>
        <button className="win-btn close" title="닫기" onClick={() => win.close()}>
          <Close />
        </button>
      </div>
    </div>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Pin() {
  return (
    <svg className="ic-pin" viewBox="0 0 24 24" {...stroke} strokeWidth={1.7}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

function Gear() {
  return (
    <svg className="ic-pin" viewBox="0 0 24 24" {...stroke} strokeWidth={1.6}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function Minimize() {
  return (
    <svg className="ic-win" viewBox="0 0 10 10" {...stroke}>
      <line x1="1" y1="5" x2="9" y2="5" />
    </svg>
  );
}

function Maximize() {
  return (
    <svg className="ic-win" viewBox="0 0 10 10" {...stroke}>
      <rect x="1" y="1" width="8" height="8" rx="0.5" />
    </svg>
  );
}

function Restore() {
  return (
    <svg className="ic-win" viewBox="0 0 10 10" {...stroke}>
      <rect x="1" y="3" width="6" height="6" rx="0.5" />
      <path d="M3 3V1.5A.5.5 0 0 1 3.5 1H8.5A.5.5 0 0 1 9 1.5V6.5A.5.5 0 0 1 8.5 7H7" />
    </svg>
  );
}

function Close() {
  return (
    <svg className="ic-win" viewBox="0 0 10 10" {...stroke}>
      <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
      <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
    </svg>
  );
}
