import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon, LogoMark } from "./icons";

/**
 * Custom window title bar (native decorations are disabled). Controls use the
 * shared D-Note icon set: settings · pin · minimize · maximize · close.
 */
export function Titlebar({
  title,
  pinned,
  onTogglePin,
  onSettings,
  showPin = true,
}: {
  title: string;
  pinned: boolean;
  onTogglePin: () => void;
  onSettings?: () => void;
  showPin?: boolean;
}) {
  const win = getCurrentWindow();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="tb-left" data-tauri-drag-region>
        <LogoMark size={18} />
        <span className="tb-title">{title}</span>
      </div>
      <div className="tb-controls">
        {onSettings && (
          <>
            <button className="win-btn" title="설정" onClick={onSettings}>
              <Icon.settings size={16} />
            </button>
            <span className="tb-div" />
          </>
        )}
        {showPin && (
          <button
            className={`win-btn pin ${pinned ? "on" : ""}`}
            title={pinned ? "항상 위 해제" : "항상 위에 고정"}
            onClick={onTogglePin}
          >
            <Icon.pin size={15} />
          </button>
        )}
        <button className="win-btn" title="최소화" onClick={() => win.minimize()}>
          <Icon.minus size={15} />
        </button>
        <button className="win-btn" title="최대화" onClick={() => win.toggleMaximize()}>
          <Icon.square size={13} />
        </button>
        <button className="win-btn close" title="닫기" onClick={() => win.close()}>
          <Icon.close size={15} />
        </button>
      </div>
    </div>
  );
}
