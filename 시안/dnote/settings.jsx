/* D-Note — Settings page (모양/보안/백업/정보) + reusable setting controls */

function Seg({ value, options, onChange }) {
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

function SettingRow({ icon: I, title, desc, control, last }) {
  return (
    <div className={`dn-set-row ${last ? "is-last" : ""}`}>
      {I && <span className="dn-set-row-ic"><I size={17} /></span>}
      <div className="dn-set-row-text">
        <div className="dn-set-row-title">{title}</div>
        {desc && <div className="dn-set-row-desc">{desc}</div>}
      </div>
      <div className="dn-set-row-control">{control}</div>
    </div>
  );
}

function SettingCard({ label, icon: I, children }) {
  return (
    <section className="dn-set-card">
      <h2 className="dn-set-card-head">{I && <I size={16} />}{label}</h2>
      <div className="dn-set-card-body">{children}</div>
    </section>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button className={`dn-switch ${on ? "is-on" : ""}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="dn-switch-knob" />
    </button>
  );
}

function ToneSwatches({ value, onChange }) {
  const tones = [
    { id: "ink", label: "잉크", c: "#161618" },
    { id: "graphite", label: "그래파이트", c: "#33353a" },
    { id: "steel", label: "스틸", c: "#54565c" },
  ];
  return (
    <div className="dn-tones">
      {tones.map((t) => (
        <button
          key={t.id}
          className={`dn-tone ${value === t.id ? "is-on" : ""}`}
          onClick={() => onChange(t.id)}
          title={t.label}
        >
          <span className="dn-tone-dot" style={{ background: t.c }} />
        </button>
      ))}
    </div>
  );
}

function NumStepper({ value, min, max, step, unit, onChange }) {
  return (
    <div className="dn-stepper">
      <button onClick={() => onChange(Math.max(min, value - step))}><Icon.minus size={14} /></button>
      <span className="dn-stepper-val">{value}{unit}</span>
      <button onClick={() => onChange(Math.min(max, value + step))}><Icon.plus size={14} /></button>
    </div>
  );
}

function SettingsPage({ t, set }) {
  const [picker, setPicker] = React.useState(null);
  const pathCtl = (key, title) => (
    <div className="dn-pathctl">
      <code className="dn-path" title={t[key]}>{t[key]}</code>
      <button className="dn-chip" onClick={() => setPicker({ key, title })}>변경</button>
    </div>
  );
  return (
    <div className="dn-doc-scroll">
      <div className="dn-settings">
        <div className="dn-set-header">
          <div className="dn-set-header-ic"><Icon.settings size={26} /></div>
          <div>
            <h1 className="dn-set-title">설정</h1>
            <p className="dn-set-sub">모양과 동작을 D-Note 안에서 직접 조정하세요</p>
          </div>
        </div>

        <SettingCard label="모양" icon={Icon.monitor}>
          <SettingRow
            icon={t.theme === "dark" ? Icon.moon : Icon.sun}
            title="테마"
            desc="라이트 또는 다크 모드"
            control={
              <Seg
                value={t.theme}
                options={[{ value: "light", label: "라이트" }, { value: "dark", label: "다크" }]}
                onChange={(v) => set("theme", v)}
              />
            }
          />
          <SettingRow
            icon={Icon.hash}
            title="강조 톤"
            desc="버튼·강조에 쓰이는 무채색 잉크"
            control={<ToneSwatches value={t.tone} onChange={(v) => set("tone", v)} />}
          />
          <SettingRow
            icon={Icon.panel}
            title="사이드바 밀도"
            desc="행 간격과 글자 크기"
            control={
              <Seg
                value={t.density}
                options={[{ value: "comfortable", label: "편안함" }, { value: "compact", label: "컴팩트" }]}
                onChange={(v) => set("density", v)}
              />
            }
          />
          <SettingRow
            icon={Icon.panel}
            title="사이드바 너비"
            control={<NumStepper value={t.sidebarWidth} min={216} max={328} step={8} unit="px" onChange={(v) => set("sidebarWidth", v)} />}
          />
          <SettingRow
            icon={Icon.doc}
            title="전체폭 본문"
            desc="문서 본문을 넓게 펼쳐 표시"
            control={<Toggle on={t.fullWidth} onChange={(v) => set("fullWidth", v)} />}
          />
          <SettingRow
            last
            icon={Icon.type}
            title="본문 글자 크기"
            control={<NumStepper value={t.fontScale} min={90} max={120} step={5} unit="%" onChange={(v) => set("fontScale", v)} />}
          />
        </SettingCard>

        <SettingCard label="보안" icon={Icon.shield}>
          <SettingRow
            icon={Icon.key}
            title="마스터 비밀번호"
            desc="Stronghold + Argon2id 로 보호"
            control={<button className="dn-chip">변경</button>}
          />
          <SettingRow
            icon={Icon.lock}
            title="자동 잠금"
            desc="비활성 시 자동으로 잠급니다"
            control={
              <Seg
                value={t.autoLock}
                options={[{ value: "off", label: "끔" }, { value: "5", label: "5분" }, { value: "15", label: "15분" }, { value: "30", label: "30분" }]}
                onChange={(v) => set("autoLock", v)}
              />
            }
          />
          <SettingRow
            last
            icon={Icon.shield}
            title="네트워크"
            desc="웹뷰는 외부로 어떤 요청도 보내지 않습니다"
            control={<span className="dn-status-ok"><span className="dn-dot" />차단됨 · CSP connect-src 'none'</span>}
          />
        </SettingCard>

        <SettingCard label="백업" icon={Icon.refresh}>
          <SettingRow
            icon={Icon.refresh}
            title="자동 백업"
            desc="하루 1회 날짜별 DB 스냅샷"
            control={<Toggle on={t.autoBackup} onChange={(v) => set("autoBackup", v)} />}
          />
          <SettingRow
            icon={Icon.database}
            title="백업 위치"
            desc="날짜별 DB 스냅샷이 저장되는 폴더"
            control={pathCtl("backupPath", "백업 위치 선택")}
          />
          <SettingRow
            last
            icon={Icon.history}
            title="마지막 백업"
            control={<span className="dn-set-meta">2026-06-08 09:12</span>}
          />
        </SettingCard>

        <SettingCard label="정보" icon={Icon.info}>
          <SettingRow icon={Icon.info} title="버전" control={<span className="dn-set-meta">D-Note 1.2.0</span>} />
          <SettingRow icon={Icon.monitor} title="빌드" control={<span className="dn-set-meta">Tauri 2 · React 19 · SQLite</span>} />
          <SettingRow
            last
            icon={Icon.database}
            title="데이터 위치"
            desc="페이지·데이터베이스 DB가 저장되는 폴더"
            control={pathCtl("dataPath", "데이터 위치 선택")}
          />
        </SettingCard>
      </div>

      {picker && (
        <FolderPicker
          title={picker.title}
          value={t[picker.key]}
          onClose={() => setPicker(null)}
          onConfirm={(p) => { set(picker.key, p); setPicker(null); }}
        />
      )}
    </div>
  );
}

Object.assign(window, { SettingsPage, Seg, Toggle, ToneSwatches });
