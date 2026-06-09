import { useState, type ReactNode } from "react";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import { openDb } from "../lib/db";
import { Icon, LogoMark, type IconProps } from "./icons";
import { TONE_COLORS, type Tone, type Prefs } from "../lib/prefs";

const CLIENT = "desknote";

const STEPS: { id: string; label: string; Ic: (p: IconProps) => ReactNode }[] = [
  { id: "welcome", label: "환영", Ic: Icon.sparkle },
  { id: "password", label: "비밀번호", Ic: Icon.key },
  { id: "appearance", label: "모양", Ic: Icon.monitor },
  { id: "done", label: "완료", Ic: Icon.checkCircle },
];

function PwField({
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="lock-field">
      <input
        type={show ? "text" : "password"}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="lock-eye" onClick={onToggle}>
        {show ? <Icon.eyeOff size={18} /> : <Icon.eye size={18} />}
      </button>
    </div>
  );
}

export function Onboarding({
  vaultPath,
  theme,
  setTheme,
  prefs,
  setPref,
  onComplete,
}: {
  vaultPath: string;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const strength = pw.length === 0 ? 0 : pw.length < 8 ? 1 : pw.length < 12 ? 2 : 3;
  const strengthLabel = ["", "약함", "보통", "강함"][strength];
  const pwValid = pw.length >= 8 && pw === pw2;

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const stronghold = await Stronghold.load(vaultPath, pw);
      try {
        await stronghold.loadClient(CLIENT);
      } catch {
        await stronghold.createClient(CLIENT);
      }
      await stronghold.save();
      // Create the encrypted SQLCipher database with this password.
      await openDb(pw);
      onComplete();
    } catch (e) {
      setErr("설정 실패: " + String(e));
      setBusy(false);
      setStep(1);
    }
  };

  return (
    <div className="dn-onb">
      <div className="dn-onb-steps">
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          const Ic = s.Ic;
          return (
            <div key={s.id} style={{ display: "contents" }}>
              {i > 0 && <span className={`dn-onb-line ${i <= step ? "is-fill" : ""}`} />}
              <div className={`dn-onb-step is-${state}`}>
                <span className="dn-onb-step-dot">
                  {state === "done" ? <Icon.check size={15} /> : <Ic size={15} />}
                </span>
                <span className="dn-onb-step-label">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dn-onb-stage" key={step}>
        {step === 0 && (
          <div className="dn-onb-panel">
            <div className="dn-onb-logo">
              <LogoMark size={68} radius={20} />
            </div>
            <h1 className="dn-onb-title">D-Note에 오신 것을 환영합니다</h1>
            <p className="dn-onb-sub">
              설치가 완료되었습니다.
              <br />
              모든 노트는 이 PC 안에만 저장되는 오프라인 전용 작업 공간입니다.
            </p>
            <div className="dn-onb-feats">
              <Feature icon={Icon.cloudOff} title="오프라인 전용" desc="외부 네트워크 통신 없음" />
              <Feature icon={Icon.shield} title="암호화 보관" desc="Argon2id 마스터 키" />
              <Feature icon={Icon.database} title="로컬 저장" desc="SQLite · 자동 백업" />
            </div>
            <button className="dn-btn-primary dn-onb-go" onClick={next}>
              시작하기 <Icon.arrowRight size={17} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="dn-onb-panel">
            <div className="dn-onb-head-ic">
              <Icon.key size={26} />
            </div>
            <h1 className="dn-onb-title">마스터 비밀번호 만들기</h1>
            <p className="dn-onb-sub">
              이 비밀번호로만 노트를 열 수 있습니다. 분실 시 복구가 불가능하니 안전하게
              보관하세요.
            </p>
            <div className="dn-onb-form">
              <PwField
                value={pw}
                onChange={setPw}
                placeholder="비밀번호 (8자 이상)"
                show={show}
                onToggle={() => setShow((s) => !s)}
                autoFocus
              />
              {pw.length > 0 && (
                <div className="dn-pw-strength">
                  <div className="dn-pw-bars">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`dn-pw-bar ${strength >= n ? "is-on" : ""}`} />
                    ))}
                  </div>
                  <span className="dn-pw-label">{strengthLabel}</span>
                </div>
              )}
              <PwField
                value={pw2}
                onChange={setPw2}
                placeholder="비밀번호 확인"
                show={show}
                onToggle={() => setShow((s) => !s)}
              />
              {pw2.length > 0 && pw !== pw2 && (
                <div className="dn-onb-err">비밀번호가 일치하지 않습니다</div>
              )}
              {err && <div className="dn-onb-err">{err}</div>}
            </div>
            <div className="dn-onb-nav">
              <button className="dn-chip dn-onb-back" onClick={back}>
                <Icon.chevronL size={15} /> 이전
              </button>
              <button className="dn-btn-primary dn-onb-go" disabled={!pwValid} onClick={next}>
                다음 <Icon.arrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="dn-onb-panel">
            <div className="dn-onb-head-ic">
              <Icon.monitor size={26} />
            </div>
            <h1 className="dn-onb-title">모양 선택</h1>
            <p className="dn-onb-sub">언제든지 설정에서 다시 바꿀 수 있어요.</p>
            <div className="dn-onb-form">
              <div className="dn-theme-cards">
                {(
                  [
                    { id: "light", label: "라이트", Ic: Icon.sun },
                    { id: "dark", label: "다크", Ic: Icon.moon },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    className={`dn-theme-card dn-theme-card--${c.id} ${theme === c.id ? "is-on" : ""}`}
                    onClick={() => setTheme(c.id)}
                  >
                    <span className="dn-theme-prev">
                      <span className="dn-theme-prev-side" />
                      <span className="dn-theme-prev-main">
                        <span className="dn-theme-prev-line" style={{ width: "70%" }} />
                        <span className="dn-theme-prev-line" style={{ width: "45%" }} />
                      </span>
                    </span>
                    <span className="dn-theme-card-foot">
                      <c.Ic size={16} /> {c.label}
                      {theme === c.id && (
                        <span className="dn-theme-check">
                          <Icon.checkCircle size={17} />
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <div className="dn-onb-tone">
                <span className="dn-onb-tone-label">강조 톤</span>
                <div className="dn-tones">
                  {(["ink", "graphite", "steel"] as Tone[]).map((id) => (
                    <button
                      key={id}
                      className={`dn-tone ${prefs.tone === id ? "is-on" : ""}`}
                      onClick={() => setPref("tone", id)}
                    >
                      <span className="dn-tone-dot" style={{ background: TONE_COLORS[id] }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="dn-onb-nav">
              <button className="dn-chip dn-onb-back" onClick={back}>
                <Icon.chevronL size={15} /> 이전
              </button>
              <button className="dn-btn-primary dn-onb-go" onClick={next}>
                다음 <Icon.arrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="dn-onb-panel">
            <div className="dn-onb-done-ic">
              <Icon.checkCircle size={40} />
            </div>
            <h1 className="dn-onb-title">설정을 마쳤어요</h1>
            <p className="dn-onb-sub">이제 D-Note를 사용할 준비가 되었습니다.</p>
            <div className="dn-onb-summary">
              <div className="dn-onb-sum-row">
                <Icon.lock size={16} /> 마스터 비밀번호 설정됨
              </div>
              <div className="dn-onb-sum-row">
                {theme === "dark" ? <Icon.moon size={16} /> : <Icon.sun size={16} />}{" "}
                {theme === "dark" ? "다크" : "라이트"} 테마
              </div>
              <div className="dn-onb-sum-row">
                <Icon.refresh size={16} /> 자동 백업 켜짐 (하루 1회)
              </div>
              <div className="dn-onb-sum-row">
                <Icon.shield size={16} /> 네트워크 차단 활성
              </div>
            </div>
            {err && <div className="dn-onb-err">{err}</div>}
            <button
              className="dn-btn-primary dn-onb-go dn-onb-finish"
              disabled={busy}
              onClick={finish}
            >
              D-Note 시작 <Icon.arrowRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Feature({
  icon: I,
  title,
  desc,
}: {
  icon: (p: IconProps) => ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="dn-onb-feat">
      <span className="dn-onb-feat-ic">
        <I size={20} />
      </span>
      <div className="dn-onb-feat-title">{title}</div>
      <div className="dn-onb-feat-desc">{desc}</div>
    </div>
  );
}
