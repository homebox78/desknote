/* D-Note — modals: search (⌘K), trash, notion upload */

function Overlay({ onClose, children, align = "top" }) {
  return (
    <div className={`dn-overlay dn-overlay--${align}`} onMouseDown={onClose}>
      <div className="dn-overlay-inner" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function SearchModal({ pages, onClose, onSelect }) {
  const [q, setQ] = React.useState("");
  const results = q.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))
    : [];
  return (
    <Overlay onClose={onClose} align="top">
      <div className="dn-search">
        <div className="dn-search-head">
          <Icon.search size={18} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="페이지 검색…"
          />
          <span className="dn-kbd">ESC</span>
        </div>
        <div className="dn-search-body">
          {q.trim() === "" ? (
            <div className="dn-search-hint">제목이나 내용을 검색하세요</div>
          ) : results.length === 0 ? (
            <div className="dn-search-hint">검색 결과가 없습니다</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                className="dn-search-item"
                onClick={() => {
                  onSelect(p.id);
                  onClose();
                }}
              >
                <span className="dn-search-item-ic">
                  {p.type === "db" ? <Icon.database size={16} /> : <Icon.doc size={16} />}
                </span>
                <span className="dn-search-item-title">{p.title}</span>
                <span className="dn-search-item-type">{p.type === "db" ? "데이터베이스" : "페이지"}</span>
              </button>
            ))
          )}
        </div>
        <div className="dn-search-foot">
          <span><span className="dn-kbd">↑↓</span> 이동</span>
          <span><span className="dn-kbd">↵</span> 열기</span>
          <span className="dn-search-foot-note"><Icon.shield size={13} /> 로컬 FTS5 · 오프라인 검색</span>
        </div>
      </div>
    </Overlay>
  );
}

function TrashModal({ onClose }) {
  return (
    <Overlay onClose={onClose} align="top">
      <div className="dn-trash">
        <div className="dn-trash-head">
          <span className="dn-trash-title"><Icon.trash size={18} /> 휴지통</span>
          <span className="dn-trash-count">{TRASH.length}개 항목</span>
        </div>
        <div className="dn-trash-body">
          {TRASH.map((t, i) => (
            <div className="dn-trash-item" key={i}>
              <span className="dn-trash-item-ic">
                {t.icon === "database" ? <Icon.database size={16} /> : <Icon.doc size={16} />}
              </span>
              <span className="dn-trash-item-title">{t.title}</span>
              <div className="dn-trash-actions">
                <button className="dn-textbtn">복원</button>
                <button className="dn-textbtn dn-textbtn--danger">영구 삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

function NotionModal({ onClose }) {
  return (
    <Overlay onClose={onClose} align="center">
      <div className="dn-notion">
        <div className="dn-notion-head">
          <span className="dn-notion-title"><Icon.link size={18} /> 노션에 직접 업로드</span>
          <button className="dn-iconbtn" onClick={onClose}><Icon.close size={16} /></button>
        </div>
        <ol className="dn-notion-steps">
          <li>notion.so/my-integrations 에서 <b>내부 통합</b>을 만들고 시크릿 토큰(<code>ntn_…</code> / <code>secret_…</code>)을 복사하세요.</li>
          <li>노션에서 대상(부모) 페이지를 열고 우측 상단 ⋯ → <b>연결</b>에 통합을 추가한 뒤, 페이지 URL을 붙여넣으세요.</li>
        </ol>
        <div className="dn-notion-fields">
          <input placeholder="노션 통합 토큰 (ntn_… / secret_…)" />
          <input placeholder="대상 페이지 URL 또는 ID" />
        </div>
        <button className="dn-btn-primary dn-notion-go">업로드 시작</button>
        <div className="dn-notion-foot">
          <Icon.shield size={14} />
          <span>외부 통신은 이 작업에서만, <b>api.notion.com</b> 도메인으로만 발생합니다.</span>
        </div>
      </div>
    </Overlay>
  );
}

Object.assign(window, { SearchModal, TrashModal, NotionModal, VersionModal, FolderPicker, Overlay });

const QUICK_DIRS = [
  { label: "앱 데이터", path: "%APPDATA%\\com.desknote.app\\" },
  { label: "백업 폴더", path: "%APPDATA%\\com.desknote.app\\backups\\" },
  { label: "문서", path: "%USERPROFILE%\\Documents\\D-Note\\" },
  { label: "바탕화면", path: "%USERPROFILE%\\Desktop\\D-Note\\" },
  { label: "D 드라이브", path: "D:\\D-Note\\" },
];

function FolderPicker({ title, value, onClose, onConfirm }) {
  const [path, setPath] = React.useState(value || "");
  return (
    <Overlay onClose={onClose} align="center">
      <div className="dn-picker">
        <div className="dn-picker-head">
          <span className="dn-picker-title"><Icon.database size={18} /> {title}</span>
          <button className="dn-iconbtn" onClick={onClose}><Icon.close size={16} /></button>
        </div>
        <div className="dn-picker-quick">
          {QUICK_DIRS.map((d) => (
            <button
              key={d.path}
              className={`dn-picker-item ${path === d.path ? "is-sel" : ""}`}
              onClick={() => setPath(d.path)}
            >
              <span className="dn-picker-item-ic"><Icon.database size={16} /></span>
              <span className="dn-picker-item-text">
                <span className="dn-picker-item-label">{d.label}</span>
                <span className="dn-picker-item-path">{d.path}</span>
              </span>
              {path === d.path && <Icon.check size={16} />}
            </button>
          ))}
        </div>
        <div className="dn-picker-field">
          <label>경로 직접 입력</label>
          <input value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} placeholder="C:\\..." />
        </div>
        <div className="dn-picker-foot">
          <button className="dn-chip" onClick={onClose}>취소</button>
          <button className="dn-btn-primary dn-picker-go" disabled={!path.trim()} onClick={() => onConfirm(path.trim())}>
            이 폴더 선택
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function VersionModal({ onClose }) {
  const [sel, setSel] = React.useState(0);
  return (
    <Overlay onClose={onClose} align="center">
      <div className="dn-version">
        <div className="dn-version-list">
          <div className="dn-version-head"><Icon.history size={17} /> 버전 기록</div>
          <div className="dn-version-scroll">
            {VERSIONS.map((v, i) => (
              <button
                key={i}
                className={`dn-version-item ${i === sel ? "is-sel" : ""}`}
                onClick={() => setSel(i)}
              >
                <span className="dn-version-time">{v.time}</span>
                <span className="dn-version-label">
                  {v.label}
                  {v.current && <em className="dn-version-now">현재</em>}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="dn-version-preview">
          <div className="dn-version-pv-head">
            <span>{VERSIONS[sel].time} · {VERSIONS[sel].label}</span>
            <div className="dn-version-actions">
              <button className="dn-chip" onClick={onClose}>닫기</button>
              <button className="dn-btn-primary dn-version-restore" disabled={VERSIONS[sel].current}>
                이 버전 복원
              </button>
            </div>
          </div>
          <div className="dn-version-pv-body">
            <div className="dn-pv-line dn-pv-h" />
            <div className="dn-pv-line" style={{ width: "92%" }} />
            <div className="dn-pv-line" style={{ width: "80%" }} />
            <div className="dn-pv-line" style={{ width: "88%" }} />
            <div className="dn-pv-line dn-pv-gap" style={{ width: "60%" }} />
            <div className="dn-pv-line" style={{ width: "95%" }} />
            <div className="dn-pv-line" style={{ width: "70%" }} />
            <div className="dn-version-watermark">스냅샷 미리보기</div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
