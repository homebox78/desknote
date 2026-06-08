/* D-Note — block editor (document page view) */

function renderInline(text) {
  // minimal **bold** support
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((seg, i) =>
    seg.startsWith("**") && seg.endsWith("**") ? (
      <strong key={i}>{seg.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{seg}</React.Fragment>
    )
  );
}

function Block({ b }) {
  const handle = (
    <span className="dn-block-handle">
      <Icon.plus size={15} />
      <Icon.drag size={15} />
    </span>
  );
  switch (b.t) {
    case "h1":
      return <div className="dn-block dn-h1">{handle}<h1>{renderInline(b.text)}</h1></div>;
    case "h2":
      return <div className="dn-block dn-h2">{handle}<h2>{renderInline(b.text)}</h2></div>;
    case "li":
      return (
        <div className="dn-block dn-li">
          {handle}
          <div className="dn-li-row"><span className="dn-bullet" /><p>{renderInline(b.text)}</p></div>
        </div>
      );
    case "quote":
      return <div className="dn-block dn-quote">{handle}<blockquote>{renderInline(b.text)}</blockquote></div>;
    case "code":
      return <div className="dn-block dn-codeblock">{handle}<pre>{b.text}</pre></div>;
    default:
      return <div className="dn-block dn-p">{handle}<p>{renderInline(b.text)}</p></div>;
  }
}

function ExportBar({ onHistory, onPin }) {
  return (
    <div className="dn-exportbar">
      <button className="dn-chip">Markdown</button>
      <button className="dn-chip">HTML</button>
      <button className="dn-chip">PDF</button>
      <button className="dn-chip dn-chip--ic" onClick={onHistory}><Icon.history size={15} /> 기록</button>
      {onPin && <button className="dn-chip dn-chip--ic" onClick={onPin}><Icon.note size={15} /> 포스트잇</button>}
    </div>
  );
}

function DocPage({ page, fullWidth, onHistory, onPin }) {
  const empty = !page.blocks || page.blocks.length === 0;
  return (
    <div className="dn-doc-scroll">
      <div className={`dn-doc ${fullWidth ? "dn-doc--wide" : ""}`}>
        <div className="dn-doc-iconwrap">
          <div className="dn-doc-icon"><Icon.doc size={34} /></div>
        </div>
        <h1 className={`dn-doc-title ${empty ? "is-placeholder" : ""}`}>
          {empty ? "제목 없음" : page.title}
        </h1>
        <ExportBar onHistory={onHistory} onPin={onPin} />
        {empty ? (
          <p className="dn-doc-empty">Enter text or type '/' for commands</p>
        ) : (
          <div className="dn-blocks">
            {page.blocks.map((b, i) => (
              <Block key={i} b={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="dn-empty">
      <p>왼쪽에서 페이지를 선택하거나 새로 만드세요 <span className="dn-kbd dn-kbd--inline">⌘K</span>로 검색</p>
    </div>
  );
}

Object.assign(window, { DocPage, MemoPage, EmptyState, Block, renderInline });

function MemoPage({ page, fullWidth, onNote, isSticky, onPin }) {
  const title = (page.note || "").trim().split("\n")[0] || "새 메모";
  return (
    <div className="dn-doc-scroll">
      <div className={`dn-doc ${fullWidth ? "dn-doc--wide" : ""}`}>
        <div className="dn-doc-iconwrap">
          <div className="dn-doc-icon dn-memo-icon"><Icon.note size={32} /></div>
        </div>
        <h1 className={`dn-doc-title ${page.note ? "" : "is-placeholder"}`}>{title}</h1>
        <div className="dn-memo-meta">
          <span className="dn-memo-badge"><Icon.note size={13} /> 포스트잇 메모</span>
          {isSticky ? (
            <span className="dn-memo-sync"><span className="dn-memo-syncdot" /> 데스크탑 포스트잇과 동기화 중</span>
          ) : (
            <button className="dn-chip dn-chip--ic" onClick={onPin}><Icon.note size={14} /> 포스트잇으로 띄우기</button>
          )}
        </div>
        <textarea
          className="dn-memo-editor"
          value={page.note || ""}
          onChange={(e) => onNote(e.target.value)}
          placeholder="메모를 입력하세요…"
          spellCheck={false}
          autoFocus
        />
      </div>
    </div>
  );
}
