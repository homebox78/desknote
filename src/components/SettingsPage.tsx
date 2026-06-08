import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { Icon, type IconProps } from "./icons";
import type { Prefs, Tone, Density, AutoLock } from "../lib/prefs";
import { TONE_COLORS } from "../lib/prefs";

type IconC = (p: IconProps) => ReactNode;

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="dn-seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={`dn-seg-btn ${value === o.value ? "is-on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`dn-switch ${on ? "is-on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="dn-switch-knob" />
    </button>
  );
}

function ToneSwatches({ value, onChange }: { value: Tone; onChange: (v: Tone) => void }) {
  const tones: { id: Tone; label: string }[] = [
    { id: "ink", label: "잉크" },
    { id: "graphite", label: "그래파이트" },
    { id: "steel", label: "스틸" },
  ];
  return (
    <div className="dn-tones">
      {tones.map((t) => (
        <button
          key={t.id}
          className={`dn-tone ${value === t.id ? "is-on" : ""}`}
          title={t.label}
          onClick={() => onChange(t.id)}
        >
          <span className="dn-tone-dot" style={{ background: TONE_COLORS[t.id] }} />
        </button>
      ))}
    </div>
  );
}

function NumStepper({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="dn-stepper">
      <button onClick={() => onChange(Math.max(min, value - step))}>
        <Icon.minus size={14} />
      </button>
      <span className="dn-stepper-val">
        {value}
        {unit}
      </span>
      <button onClick={() => onChange(Math.min(max, value + step))}>
        <Icon.plus size={14} />
      </button>
    </div>
  );
}

function Row({
  icon: I,
  title,
  desc,
  control,
  last,
}: {
  icon: IconC;
  title: string;
  desc?: string;
  control: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`dn-set-row ${last ? "is-last" : ""}`}>
      <span className="dn-set-row-ic">
        <I size={17} />
      </span>
      <div className="dn-set-row-text">
        <div className="dn-set-row-title">{title}</div>
        {desc && <div className="dn-set-row-desc">{desc}</div>}
      </div>
      <div className="dn-set-row-control">{control}</div>
    </div>
  );
}

function Card({ label, icon: I, children }: { label: string; icon: IconC; children: ReactNode }) {
  return (
    <section className="dn-set-card">
      <h2 className="dn-set-card-head">
        <I size={16} />
        {label}
      </h2>
      <div className="dn-set-card-body">{children}</div>
    </section>
  );
}

export function SettingsPage({
  theme,
  onTheme,
  prefs,
  setPref,
}: {
  theme: "light" | "dark";
  onTheme: (t: "light" | "dark") => void;
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}) {
  const [dataDir, setDataDir] = useState("");
  const lastBackup = localStorage.getItem("desknote-backup") || "—";

  useEffect(() => {
    invoke<string>("get_data_dir").then(setDataDir).catch(() => {});
  }, []);

  const backupDir = dataDir ? `${dataDir}\\backups` : "";

  const changeDataDir = async () => {
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
      }
    } catch (e) {
      alert("변경 실패: " + String(e));
    }
  };

  return (
    <div className="dn-doc-scroll">
      <div className="dn-settings">
        <div className="dn-set-header">
          <div className="dn-set-header-ic">
            <Icon.settings size={26} />
          </div>
          <div>
            <h1 className="dn-set-title">설정</h1>
            <p className="dn-set-sub">모양과 동작을 D-Note 안에서 직접 조정하세요</p>
          </div>
        </div>

        <Card label="모양" icon={Icon.monitor}>
          <Row
            icon={theme === "dark" ? Icon.moon : Icon.sun}
            title="테마"
            desc="라이트 또는 다크 모드"
            control={
              <Seg
                value={theme}
                options={[
                  { value: "light", label: "라이트" },
                  { value: "dark", label: "다크" },
                ]}
                onChange={onTheme}
              />
            }
          />
          <Row
            icon={Icon.hash}
            title="강조 톤"
            desc="버튼·강조에 쓰이는 무채색 잉크"
            control={<ToneSwatches value={prefs.tone} onChange={(v) => setPref("tone", v)} />}
          />
          <Row
            icon={Icon.panel}
            title="사이드바 밀도"
            desc="행 간격과 글자 크기"
            control={
              <Seg<Density>
                value={prefs.density}
                options={[
                  { value: "comfortable", label: "편안함" },
                  { value: "compact", label: "컴팩트" },
                ]}
                onChange={(v) => setPref("density", v)}
              />
            }
          />
          <Row
            icon={Icon.panel}
            title="사이드바 너비"
            control={
              <NumStepper
                value={prefs.sidebarWidth}
                min={216}
                max={328}
                step={8}
                unit="px"
                onChange={(v) => setPref("sidebarWidth", v)}
              />
            }
          />
          <Row
            icon={Icon.doc}
            title="전체폭 본문"
            desc="문서 본문을 넓게 펼쳐 표시"
            control={<Toggle on={prefs.fullWidth} onChange={(v) => setPref("fullWidth", v)} />}
          />
          <Row
            last
            icon={Icon.type}
            title="본문 글자 크기"
            control={
              <NumStepper
                value={prefs.fontScale}
                min={90}
                max={120}
                step={5}
                unit="%"
                onChange={(v) => setPref("fontScale", v)}
              />
            }
          />
        </Card>

        <Card label="보안" icon={Icon.shield}>
          <Row
            icon={Icon.key}
            title="마스터 비밀번호"
            desc="Stronghold + Argon2id 로 보호"
            control={
              <button
                className="dn-chip-btn"
                onClick={() => alert("비밀번호 변경은 준비 중입니다.")}
              >
                변경
              </button>
            }
          />
          <Row
            icon={Icon.lock}
            title="자동 잠금"
            desc="비활성 시 자동으로 잠급니다"
            control={
              <Seg<AutoLock>
                value={prefs.autoLock}
                options={[
                  { value: "off", label: "끔" },
                  { value: "5", label: "5분" },
                  { value: "15", label: "15분" },
                  { value: "30", label: "30분" },
                ]}
                onChange={(v) => setPref("autoLock", v)}
              />
            }
          />
          <Row
            last
            icon={Icon.shield}
            title="네트워크"
            desc="웹뷰는 외부로 어떤 요청도 보내지 않습니다"
            control={
              <span className="dn-status-ok">
                <span className="dn-dot" />
                차단됨 · CSP connect-src 'none'
              </span>
            }
          />
        </Card>

        <Card label="백업" icon={Icon.refresh}>
          <Row
            icon={Icon.refresh}
            title="자동 백업"
            desc="하루 1회 날짜별 DB 스냅샷"
            control={<Toggle on={prefs.autoBackup} onChange={(v) => setPref("autoBackup", v)} />}
          />
          <Row
            icon={Icon.database}
            title="백업 위치"
            desc="날짜별 DB 스냅샷이 저장되는 폴더"
            control={
              <div className="dn-pathctl">
                <code className="dn-path" title={backupDir}>
                  {backupDir || "…"}
                </code>
                <button
                  className="dn-chip-btn"
                  onClick={() => backupDir && openPath(backupDir).catch(() => {})}
                >
                  열기
                </button>
              </div>
            }
          />
          <Row
            last
            icon={Icon.history}
            title="마지막 백업"
            control={<span className="dn-set-meta">{lastBackup}</span>}
          />
        </Card>

        <Card label="정보" icon={Icon.info}>
          <Row icon={Icon.info} title="버전" control={<span className="dn-set-meta">D-Note 1.2.0</span>} />
          <Row
            icon={Icon.monitor}
            title="빌드"
            control={<span className="dn-set-meta">Tauri 2 · React 19 · SQLite</span>}
          />
          <Row
            last
            icon={Icon.database}
            title="데이터 위치"
            desc="페이지·데이터베이스 DB가 저장되는 폴더"
            control={
              <div className="dn-pathctl">
                <code className="dn-path" title={dataDir}>
                  {dataDir || "…"}
                </code>
                <button className="dn-chip-btn" onClick={changeDataDir}>
                  변경
                </button>
              </div>
            }
          />
        </Card>
      </div>
    </div>
  );
}
