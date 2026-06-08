import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

export function SettingsModal({
  theme,
  onTheme,
  onClose,
}: {
  theme: "light" | "dark";
  onTheme: (t: "light" | "dark") => void;
  onClose: () => void;
}) {
  const [dataDir, setDataDir] = useState("");
  const [shellOn, setShellOn] = useState(
    localStorage.getItem("desknote-shellmenu") !== "off"
  );
  const [msg, setMsg] = useState("");

  useEffect(() => {
    invoke<string>("get_data_dir").then(setDataDir).catch(() => {});
  }, []);

  const toggleShell = async () => {
    const next = !shellOn;
    setShellOn(next);
    try {
      if (next) {
        await invoke("register_shell_menu");
        localStorage.setItem("desknote-shellmenu", "on");
        setMsg("탐색기 우클릭 메뉴 'D-Note로 보내기'를 추가했습니다.");
      } else {
        await invoke("unregister_shell_menu");
        localStorage.setItem("desknote-shellmenu", "off");
        setMsg("탐색기 우클릭 메뉴를 제거했습니다.");
      }
    } catch (e) {
      setMsg("실패: " + String(e));
      setShellOn(!next);
    }
  };

  const changeFolder = async () => {
    const dir = await open({ directory: true, multiple: false });
    if (!dir || typeof dir !== "string") return;
    try {
      await invoke("set_data_dir", { path: dir });
      if (
        confirm(
          `데이터 폴더를 다음으로 설정했습니다:\n${dir}\n\n적용하려면 재시작이 필요합니다. 지금 재시작할까요?`
        )
      ) {
        await invoke("restart_app");
      } else {
        setDataDir(dir);
        setMsg("다음 실행부터 적용됩니다.");
      }
    } catch (e) {
      setMsg("변경 실패: " + String(e));
    }
  };

  const resetFolder = async () => {
    if (!confirm("기본 폴더로 되돌립니다. 재시작이 필요합니다. 진행할까요?")) return;
    try {
      await invoke("reset_data_dir");
      await invoke("restart_app");
    } catch (e) {
      setMsg("실패: " + String(e));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-box" onClick={(e) => e.stopPropagation()}>
        <div className="trash-head">
          <span>⚙️ 설정</span>
        </div>
        <div className="settings-body">
          <section className="set-section">
            <div className="set-label">테마</div>
            <div className="set-seg">
              <button
                className={theme === "light" ? "on" : ""}
                onClick={() => onTheme("light")}
              >
                ☀️ 라이트
              </button>
              <button
                className={theme === "dark" ? "on" : ""}
                onClick={() => onTheme("dark")}
              >
                🌙 다크
              </button>
            </div>
          </section>

          <section className="set-section">
            <div className="set-label">탐색기 우클릭 메뉴</div>
            <label className="set-row">
              <input type="checkbox" checked={shellOn} onChange={toggleShell} />
              <span>파일 우클릭 → "D-Note로 보내기"로 내용 가져오기 (txt/md/Word/CSV/Excel)</span>
            </label>
          </section>

          <section className="set-section">
            <div className="set-label">데이터 저장 위치 (오프라인 DB)</div>
            <div className="set-path">{dataDir || "…"}</div>
            <div className="set-actions">
              <button onClick={changeFolder}>폴더 변경…</button>
              <button onClick={() => openPath(dataDir).catch(() => {})}>폴더 열기</button>
              <button onClick={resetFolder}>기본값으로</button>
            </div>
            <div className="set-hint">
              모든 노트·데이터베이스·이미지·백업이 이 폴더에 저장됩니다. 변경 시 기존
              데이터를 새 폴더로 복사하고 재시작합니다. (이미 데이터가 있는 폴더를 고르면
              그 데이터를 그대로 사용합니다.)
            </div>
          </section>

          {msg && <div className="set-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
