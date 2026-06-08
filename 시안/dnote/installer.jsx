/* D-Note — Windows-style setup wizard (인스톨러). Runs before onboarding. */

const INSTALL_FILES = [
  "d-note.exe", "WebView2Loader.dll", "app.dll", "resources\\index.html",
  "resources\\assets\\app.js", "resources\\assets\\app.css", "sqlite3.dll",
  "locales\\ko-KR.pak", "locales\\en-US.pak", "argon2.dll", "uninstall.exe",
  "resources\\fonts\\Pretendard.woff2", "icudtl.dat", "vcruntime140.dll",
];

function InstWindow({ step, total, title, subtitle, children, footer, dark }) {
  return (
    <div className="dn-inst" data-theme={dark ? "dark" : "light"}>
      <div className="dn-inst-titlebar">
        <div className="dn-inst-tb-left"><LogoMark size={16} /> <span>D-Note 설치</span></div>
        <button className="dn-inst-tb-x"><Icon.close size={14} /></button>
      </div>
      <div className="dn-inst-header">
        <div className="dn-inst-header-text">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="dn-inst-header-ic"><Icon.package size={22} /></div>
      </div>
      <div className="dn-inst-body">{children}</div>
      <div className="dn-inst-footer">
        <div className="dn-inst-steps">{step + 1} / {total} 단계</div>
        <div className="dn-inst-btns">{footer}</div>
      </div>
    </div>
  );
}

function Installer({ onComplete, dark }) {
  const STEPS = ["welcome", "license", "location", "components", "installing", "done"];
  const [step, setStep] = React.useState(0);
  const [agree, setAgree] = React.useState(false);
  const [dir, setDir] = React.useState("C:\\Program Files\\D-Note");
  const [opts, setOpts] = React.useState({ desktop: true, startmenu: true, autostart: false, assoc: true });
  const [progress, setProgress] = React.useState(0);
  const [curFile, setCurFile] = React.useState("");
  const [launch, setLaunch] = React.useState(true);

  const id = STEPS[step];
  const go = (d) => setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d)));

  // run install progress
  React.useEffect(() => {
    if (id !== "installing") return;
    setProgress(0);
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(100, p + Math.random() * 7 + 2);
      setProgress(p);
      setCurFile(INSTALL_FILES[Math.min(INSTALL_FILES.length - 1, Math.floor((p / 100) * INSTALL_FILES.length))]);
      if (p >= 100) { clearInterval(tick); setTimeout(() => setStep(STEPS.length - 1), 550); }
    }, 230);
    return () => clearInterval(tick);
  }, [id]);

  const Btn = ({ children, primary, disabled, onClick, ghost }) => (
    <button className={`dn-inst-btn ${primary ? "is-primary" : ""} ${ghost ? "is-ghost" : ""}`} disabled={disabled} onClick={onClick}>{children}</button>
  );

  let title, subtitle, body, footer, total = STEPS.length;

  if (id === "welcome") {
    title = "D-Note 설치 마법사";
    subtitle = "설치를 시작하기 전 모든 프로그램을 닫는 것을 권장합니다.";
    body = (
      <div className="dn-inst-welcome">
        <div className="dn-inst-hero"><LogoMark size={66} radius={20} /></div>
        <h1>D-Note 설치를 시작합니다</h1>
        <p>오프라인 전용 노트 · 데이터베이스 · 포스트잇 작업 공간을 이 PC에 설치합니다. 계속하려면 "다음"을 누르세요.</p>
        <div className="dn-inst-ver">
          <span><Icon.package size={14} /> 버전 1.2.0 (x64)</span>
          <span><Icon.disk size={14} /> 약 248 MB 필요</span>
          <span><Icon.shield size={14} /> 디지털 서명됨</span>
        </div>
      </div>
    );
    footer = (<><Btn ghost disabled>뒤로</Btn><Btn primary onClick={() => go(1)}>다음 <Icon.chevron size={15} /></Btn></>);
  }

  if (id === "license") {
    title = "사용권 계약";
    subtitle = "계속하기 전에 다음 약관을 검토하세요.";
    body = (
      <div className="dn-inst-license-wrap">
        <div className="dn-inst-license">
          <p><b>D-Note 최종 사용자 사용권 계약 (EULA)</b></p>
          <p>본 계약은 귀하와 D-Note 개발자 간에 체결됩니다. 소프트웨어를 설치·사용함으로써 본 약관에 동의하게 됩니다.</p>
          <p><b>1. 라이선스 허여.</b> 개발자는 귀하에게 본 소프트웨어를 비독점적으로 사용할 권리를 부여합니다.</p>
          <p><b>2. 오프라인 동작.</b> 본 소프트웨어는 사용자의 명시적 동작(노션 업로드 등) 없이는 외부 네트워크와 통신하지 않습니다. 모든 데이터는 로컬에만 저장됩니다.</p>
          <p><b>3. 데이터 책임.</b> 마스터 비밀번호 분실 시 데이터 복구가 불가능하며, 개발자는 이에 대한 책임을 지지 않습니다.</p>
          <p><b>4. 보증의 부인.</b> 본 소프트웨어는 "있는 그대로" 제공됩니다.</p>
          <p><b>5. 오픈소스 고지.</b> 본 소프트웨어는 SQLite, Pretendard 등 제3자 구성요소를 포함하며 각 라이선스를 따릅니다.</p>
        </div>
        <label className="dn-inst-agree" onClick={() => setAgree((a) => !a)}>
          <span className={`dn-inst-check ${agree ? "is-on" : ""}`}>{agree && <Icon.check size={13} />}</span>
          사용권 계약에 동의합니다
        </label>
      </div>
    );
    footer = (<><Btn ghost onClick={() => go(-1)}>뒤로</Btn><Btn primary disabled={!agree} onClick={() => go(1)}>동의 및 다음 <Icon.chevron size={15} /></Btn></>);
  }

  if (id === "location") {
    title = "설치 위치 선택";
    subtitle = "D-Note를 설치할 폴더를 지정하세요.";
    body = (
      <div className="dn-inst-loc">
        <p className="dn-inst-loc-desc">아래 폴더에 설치됩니다. 다른 폴더를 사용하려면 "찾아보기"를 누르세요.</p>
        <div className="dn-inst-pathrow">
          <span className="dn-inst-folder-ic"><Icon.folder size={17} /></span>
          <input value={dir} onChange={(e) => setDir(e.target.value)} spellCheck={false} />
          <button className="dn-inst-browse" onClick={() => setDir((d) => d.endsWith("\\D-Note") ? "D:\\Programs\\D-Note" : "C:\\Program Files\\D-Note")}>찾아보기…</button>
        </div>
        <div className="dn-inst-disk">
          <div className="dn-inst-disk-row"><span>필요한 공간</span><b>248.4 MB</b></div>
          <div className="dn-inst-disk-row"><span>사용 가능한 공간 (C:)</span><b>184.2 GB</b></div>
        </div>
      </div>
    );
    footer = (<><Btn ghost onClick={() => go(-1)}>뒤로</Btn><Btn primary onClick={() => go(1)}>다음 <Icon.chevron size={15} /></Btn></>);
  }

  if (id === "components") {
    title = "추가 작업 선택";
    subtitle = "설치 중 수행할 추가 작업을 선택한 뒤 \"설치\"를 누르세요.";
    const Row = ({ k, icon: I, label, desc }) => (
      <label className="dn-inst-opt" onClick={() => setOpts((o) => ({ ...o, [k]: !o[k] }))}>
        <span className={`dn-inst-check ${opts[k] ? "is-on" : ""}`}>{opts[k] && <Icon.check size={13} />}</span>
        <span className="dn-inst-opt-ic"><I size={16} /></span>
        <span className="dn-inst-opt-text"><span className="dn-inst-opt-label">{label}</span><span className="dn-inst-opt-desc">{desc}</span></span>
      </label>
    );
    body = (
      <div className="dn-inst-opts">
        <Row k="desktop" icon={Icon.monitor} label="바탕화면 바로 가기 만들기" desc="데스크탑에 D-Note 아이콘 추가" />
        <Row k="startmenu" icon={Icon.folder} label="시작 메뉴에 등록" desc="시작 메뉴 프로그램 목록에 추가" />
        <Row k="autostart" icon={Icon.refresh} label="Windows 시작 시 자동 실행" desc="로그인할 때 백그라운드로 실행" />
        <Row k="assoc" icon={Icon.doc} label=".dnote 파일 연결" desc="노트 파일을 D-Note로 열기" />
      </div>
    );
    footer = (<><Btn ghost onClick={() => go(-1)}>뒤로</Btn><Btn primary onClick={() => go(1)}><Icon.download size={15} /> 설치</Btn></>);
  }

  if (id === "installing") {
    title = "설치 중";
    subtitle = "D-Note를 설치하는 동안 잠시 기다려 주세요.";
    body = (
      <div className="dn-inst-progress">
        <div className="dn-inst-spinner-row">
          <span className="dn-inst-cpu"><Icon.cpu size={18} /></span>
          <span className="dn-inst-prog-label">파일 복사 중…</span>
          <span className="dn-inst-prog-pct">{Math.floor(progress)}%</span>
        </div>
        <div className="dn-inst-bar"><div className="dn-inst-bar-fill" style={{ width: progress + "%" }} /></div>
        <div className="dn-inst-curfile"><Icon.doc size={13} /> {dir}\\{curFile}</div>
        <div className="dn-inst-loglist">
          {INSTALL_FILES.slice(0, Math.floor((progress / 100) * INSTALL_FILES.length)).slice(-5).map((f, i) => (
            <div key={i} className="dn-inst-logline"><Icon.check size={12} /> {f}</div>
          ))}
        </div>
      </div>
    );
    footer = (<><Btn ghost disabled>뒤로</Btn><Btn primary disabled>설치 중…</Btn></>);
  }

  if (id === "done") {
    title = "설치 완료";
    subtitle = "D-Note 설치 마법사를 완료했습니다.";
    body = (
      <div className="dn-inst-welcome dn-inst-done">
        <div className="dn-inst-done-ic"><Icon.checkCircle size={42} /></div>
        <h1>설치가 완료되었습니다</h1>
        <p>D-Note가 이 컴퓨터에 설치되었습니다. 아래 옵션을 선택하고 "마침"을 누르세요.</p>
        <div className="dn-inst-done-opts">
          <label className="dn-inst-opt dn-inst-opt--flat" onClick={() => setLaunch((v) => !v)}>
            <span className={`dn-inst-check ${launch ? "is-on" : ""}`}>{launch && <Icon.check size={13} />}</span>
            <span className="dn-inst-opt-text"><span className="dn-inst-opt-label">지금 D-Note 실행</span></span>
          </label>
          {opts.desktop && <div className="dn-inst-done-note"><Icon.check size={13} /> 바탕화면 바로 가기 생성됨</div>}
          {opts.startmenu && <div className="dn-inst-done-note"><Icon.check size={13} /> 시작 메뉴에 등록됨</div>}
        </div>
      </div>
    );
    footer = (<Btn primary onClick={onComplete}>마침 {launch && <Icon.arrowRight size={15} />}</Btn>);
  }

  return (
    <div className="dn-inst-stage">
      <InstWindow step={step} total={total} title={title} subtitle={subtitle} footer={footer} dark={dark}>
        {body}
      </InstWindow>
    </div>
  );
}

Object.assign(window, { Installer });
