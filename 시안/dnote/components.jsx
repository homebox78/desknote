/* D-Note — brand mark, window chrome, lock screen, sidebar */

function LogoMark({ size = 26, radius }) {
  const r = radius ?? size * 0.28;
  return (
    <div
      className="dn-logo"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 5.5h9a5.5 5.5 0 0 1 0 11H5z"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path d="M5 12h6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const STATUS_LABEL = { todo: "시작 전", doing: "진행 중", done: "완료" };

function StatusPill({ status, empty }) {
  if (!status || empty) return <span className="dn-pill-empty">비어 있음</span>;
  return <span className={`dn-pill dn-pill--${status}`}>{STATUS_LABEL[status]}</span>;
}

/* ---------- Window chrome ---------- */
function Titlebar({ title, pinned, onPin, settingsActive, onOpenSettings, locked, dark }) {
  return (
    <div className="dn-titlebar">
      <div className="dn-tb-left">
        <LogoMark size={18} />
        <span className="dn-tb-title">{title}</span>
      </div>
      <div className="dn-tb-controls">
        {!locked && (
          <React.Fragment>
            <button
              className={`dn-tb-btn ${settingsActive ? "is-on" : ""}`}
              onClick={onOpenSettings}
              title="설정"
            >
              <Icon.settings size={16} />
            </button>
            <span className="dn-tb-div" />
          </React.Fragment>
        )}
        <button
          className={`dn-tb-btn ${pinned ? "is-on" : ""}`}
          onClick={onPin}
          title="항상 위에 고정"
        >
          <Icon.pin size={15} />
        </button>
        <button className="dn-tb-btn" title="최소화"><Icon.minus size={15} /></button>
        <button className="dn-tb-btn" title="최대화"><Icon.square size={13} /></button>
        <button className="dn-tb-btn dn-tb-close" title="닫기"><Icon.close size={15} /></button>
      </div>
    </div>
  );
}

/* ---------- Lock screen ---------- */
function LockScreen({ onUnlock, dark }) {
  const [val, setVal] = React.useState("••••••••••");
  const [show, setShow] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const submit = (e) => {
    e && e.preventDefault();
    onUnlock();
  };
  return (
    <div className="dn-lock">
      <form className={`dn-lock-card ${shake ? "shake" : ""}`} onSubmit={submit}>
        <div className="dn-lock-badge">
          <LogoMark size={56} radius={18} />
        </div>
        <h1 className="dn-lock-title">D-Note 잠금 해제</h1>
        <p className="dn-lock-sub">마스터 비밀번호를 입력하세요</p>
        <div className="dn-lock-field">
          <input
            type={show ? "text" : "password"}
            value={val}
            autoFocus
            onChange={(e) => setVal(e.target.value)}
            placeholder="비밀번호"
          />
          <button type="button" className="dn-lock-eye" onClick={() => setShow((s) => !s)}>
            {show ? <Icon.eyeOff size={18} /> : <Icon.eye size={18} />}
          </button>
        </div>
        <button type="submit" className="dn-btn-primary dn-lock-btn">잠금 해제</button>
        <div className="dn-lock-foot">
          <Icon.shield size={14} />
          <span>오프라인 전용 · Argon2id 암호화 · 네트워크 차단</span>
        </div>
      </form>
    </div>
  );
}

/* ---------- Sidebar ---------- */
function SideRow({ icon: I, label, kbd, active, indent, muted, accent, onClick, onContext, fav, onFav, density }) {
  return (
    <button
      className={`dn-srow ${active ? "is-active" : ""} ${muted ? "is-muted" : ""} ${accent ? "is-accent" : ""}`}
      style={indent ? { paddingLeft: 14 + indent * 18 } : null}
      onClick={onClick}
      onContextMenu={onContext}
    >
      <span className="dn-srow-ic"><I size={density === "compact" ? 15 : 16} /></span>
      <span className="dn-srow-label">{label}</span>
      {onFav && (
        <span
          className={`dn-srow-fav ${fav ? "is-fav" : ""}`}
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          title={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <Icon.star size={14} />
        </span>
      )}
      {kbd && <span className="dn-kbd">{kbd}</span>}
    </button>
  );
}

function Sidebar({ pages, activeId, onSelect, onOpenSearch, onOpenTrash, onOpenNotion, onOpenSettings, onNewSticky, onPinPage, onToggleFav, stickyPageIds, density }) {
  const favs = pages.filter((p) => p.fav);
  const [menu, setMenu] = React.useState(null); // {x,y,pageId}
  const menuPage = menu ? pages.find((p) => p.id === menu.pageId) : null;
  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, [menu]);
  const openMenu = (e, id) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, pageId: id }); };
  return (
    <aside className={`dn-sidebar dn-density-${density}`}>
      <div className="dn-side-head">
        <LogoMark size={24} />
        <span className="dn-side-brand">D-Note</span>
      </div>

      <div className="dn-side-group">
        <SideRow icon={Icon.search} label="검색" kbd="⌘K" density={density} onClick={onOpenSearch} />
        <SideRow icon={Icon.trash} label="휴지통" density={density} onClick={onOpenTrash} />
      </div>

      {favs.length > 0 && (
        <React.Fragment>
          <div className="dn-side-section"><span>즐겨찾기</span></div>
          <div className="dn-side-group dn-side-tree">
            {favs.map((p) => (
              <SideRow
                key={"fav-" + p.id}
                icon={p.kind === "memo" ? Icon.note : p.type === "db" ? Icon.database : Icon.doc}
                label={p.title}
                indent={1}
                active={p.id === activeId}
                density={density}
                onClick={() => onSelect(p.id)}
                onContext={(e) => openMenu(e, p.id)}
                fav={true}
                onFav={() => onToggleFav(p.id)}
              />
            ))}
          </div>
        </React.Fragment>
      )}

      <div className="dn-side-section">
        <span>개인 페이지</span>
      </div>
      <div className="dn-side-group dn-side-tree">
        {pages.map((p) => (
          <SideRow
            key={p.id}
            icon={p.kind === "memo" ? Icon.note : p.type === "db" ? Icon.database : Icon.doc}
            label={p.title}
            indent={1}
            active={p.id === activeId}
            density={density}
            onClick={() => onSelect(p.id)}
            onContext={(e) => openMenu(e, p.id)}
            fav={p.fav}
            onFav={() => onToggleFav(p.id)}
          />
        ))}
        <SideRow icon={Icon.plus} label="새 페이지" indent={1} muted density={density} />
        <SideRow icon={Icon.note} label="새 포스트잇" indent={1} accent density={density} onClick={onNewSticky} />
      </div>

      <div className="dn-side-group dn-side-foot">
        <SideRow icon={Icon.database} label="새 데이터베이스" density={density} />
        <SideRow icon={Icon.import} label="가져오기 (MD/DOCX/CSV)" density={density} />
        <SideRow icon={Icon.export} label="노션으로 내보내기 (ZIP)" density={density} />
        <SideRow icon={Icon.link} label="노션에 직접 업로드 (API)" density={density} onClick={onOpenNotion} />
      </div>

      {menu && (
        <div className="dn-ctxmenu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button className="dn-ctxmenu-item" onClick={() => { onToggleFav(menu.pageId); setMenu(null); }}>
            <Icon.star size={15} /> {menuPage && menuPage.fav ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
          </button>
          <button
            className="dn-ctxmenu-item"
            onClick={() => { onPinPage(menu.pageId); setMenu(null); }}
            disabled={stickyPageIds && stickyPageIds.includes(menu.pageId)}
          >
            <Icon.note size={15} /> {stickyPageIds && stickyPageIds.includes(menu.pageId) ? "이미 포스트잇으로 열림" : "포스트잇으로 열기"}
          </button>
          <button className="dn-ctxmenu-item" onClick={() => { onSelect(menu.pageId); setMenu(null); }}>
            <Icon.expand size={15} /> 페이지 열기
          </button>
        </div>
      )}
    </aside>
  );
}

Object.assign(window, { LogoMark, Titlebar, LockScreen, Sidebar, StatusPill, SideRow, STATUS_LABEL });
