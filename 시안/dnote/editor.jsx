/* D-Note — block editor (inline-editable, right-click block menu) */

function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function htmlFromText(text) {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
const blockHtml = (b) => (b.html != null ? b.html : htmlFromText(b.text));
const htmlToText = (html) => (html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const WRAP_CLASS = { h1: "dn-h1", h2: "dn-h2", li: "dn-li", quote: "dn-quote", code: "dn-codeblock", p: "dn-p" };

function EditableBlock({ b, idx, onCommit, onContext }) {
  const ref = React.useRef(null);
  const common = {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    className: "dn-edit",
    "data-ph": "비어 있음",
    dangerouslySetInnerHTML: { __html: blockHtml(b) },
    onBlur: () => onCommit(idx, ref.current.innerHTML),
  };
  let inner;
  if (b.t === "li") inner = <div className="dn-li-row"><span className="dn-bullet" /><p {...common} /></div>;
  else if (b.t === "quote") inner = <blockquote {...common} />;
  else if (b.t === "code") inner = <pre {...common} />;
  else if (b.t === "h1") inner = <h1 {...common} />;
  else if (b.t === "h2") inner = <h2 {...common} />;
  else inner = <p {...common} />;
  return (
    <div className={`dn-block ${WRAP_CLASS[b.t] || "dn-p"}`} onContextMenu={(e) => onContext(e, idx)}>
      <span className="dn-block-handle" onClick={(e) => onContext(e, idx)}>
        <Icon.plus size={15} />
        <Icon.drag size={15} />
      </span>
      {inner}
    </div>
  );
}

function EditorMenu({ x, y, blockType, onFormat, onTurn, onAct }) {
  const keep = (e) => e.preventDefault(); // keep text selection / focus
  const turns = [
    { t: "p", label: "텍스트", icon: Icon.text },
    { t: "h1", label: "제목 1", icon: Icon.hash },
    { t: "h2", label: "제목 2", icon: Icon.hash },
    { t: "li", label: "글머리 기호 목록", icon: Icon.board },
    { t: "quote", label: "인용", icon: Icon.quote },
    { t: "code", label: "코드", icon: Icon.hash },
  ];
  return (
    <div className="dn-emenu" style={{ left: x, top: y }} onMouseDown={keep} onClick={(e) => e.stopPropagation()}>
      <div className="dn-emenu-fmt">
        <button onClick={() => onFormat("bold")} title="굵게"><b>B</b></button>
        <button onClick={() => onFormat("italic")} title="기울임"><i>I</i></button>
        <button onClick={() => onFormat("strikeThrough")} title="취소선"><s>S</s></button>
        <button onClick={() => onFormat("code")} title="인라인 코드" className="dn-emenu-code">&lt;/&gt;</button>
      </div>
      <div className="dn-emenu-sec">블록 전환</div>
      {turns.map((o) => (
        <button key={o.t} className={`dn-emenu-item ${blockType === o.t ? "is-on" : ""}`} onClick={() => onTurn(o.t)}>
          <o.icon size={15} /><span>{o.label}</span>
          {blockType === o.t && <Icon.check size={14} className="dn-emenu-chk" />}
        </button>
      ))}
      <div className="dn-emenu-div" />
      <button className="dn-emenu-item" onClick={() => onAct("add")}><Icon.plus size={15} /><span>아래에 블록 추가</span></button>
      <button className="dn-emenu-item" onClick={() => onAct("dup")}><Icon.doc size={15} /><span>복제</span></button>
      <button className="dn-emenu-item dn-emenu-danger" onClick={() => onAct("del")}><Icon.trash size={15} /><span>삭제</span></button>
    </div>
  );
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

function DocPage({ page, fullWidth, onHistory, onPin, onBlocks, onTitle }) {
  const blocks = page.blocks || [];
  const [menu, setMenu] = React.useState(null); // {x,y,idx}
  const editRef = React.useRef(null); // currently focused editable element

  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); };
  }, [menu]);

  const setBlocks = (nb) => onBlocks(nb.map((b) => ({ ...b, text: htmlToText(blockHtml(b)) })));
  const commit = (idx, html) => onBlocks(blocks.map((b, i) => (i === idx ? { ...b, html, text: htmlToText(html) } : b)));

  const openMenu = (e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget.closest(".dn-block");
    editRef.current = el ? el.querySelector("[contenteditable]") : document.activeElement;
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 240), y: Math.min(e.clientY, window.innerHeight - 380), idx });
  };
  const format = (cmd) => {
    const el = editRef.current;
    if (el && el.focus) el.focus();
    if (cmd === "code") {
      const sel = window.getSelection();
      const txt = sel && sel.toString();
      if (txt) document.execCommand("insertHTML", false, "<code>" + escapeHtml(txt) + "</code>");
    } else {
      document.execCommand(cmd, false, null);
    }
    if (el && menu) commit(menu.idx, el.innerHTML);
  };
  const turn = (t) => { onBlocks(blocks.map((b, i) => (i === menu.idx ? { ...b, t } : b))); setMenu(null); };
  const act = (a) => {
    const nb = blocks.slice();
    if (a === "add") nb.splice(menu.idx + 1, 0, { t: "p", text: "", html: "" });
    else if (a === "dup") nb.splice(menu.idx + 1, 0, { ...blocks[menu.idx] });
    else if (a === "del") nb.splice(menu.idx, 1);
    onBlocks(nb);
    setMenu(null);
  };
  const addFirst = () => onBlocks([{ t: "p", text: "", html: "" }]);

  const empty = blocks.length === 0;
  return (
    <div className="dn-doc-scroll">
      <div className={`dn-doc ${fullWidth ? "dn-doc--wide" : ""}`}>
        <div className="dn-doc-iconwrap">
          <div className="dn-doc-icon"><Icon.doc size={34} /></div>
        </div>
        <h1
          className="dn-doc-title dn-doc-title-edit"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-ph="제목 없음"
          onBlur={(e) => onTitle(e.currentTarget.textContent)}
        >{page.title}</h1>
        <ExportBar onHistory={onHistory} onPin={onPin} />
        {empty ? (
          <p className="dn-doc-empty" onClick={addFirst}>여기를 클릭해 입력하세요. 블록 위에서 우클릭하면 메뉴가 열립니다.</p>
        ) : (
          <div className="dn-blocks">
            {blocks.map((b, i) => (
              <EditableBlock key={i} b={b} idx={i} onCommit={commit} onContext={openMenu} />
            ))}
          </div>
        )}
      </div>
      {menu && (
        <EditorMenu x={menu.x} y={menu.y} blockType={blocks[menu.idx] && blocks[menu.idx].t}
          onFormat={format} onTurn={turn} onAct={act} />
      )}
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
        <textarea className="dn-memo-editor" value={page.note || ""} onChange={(e) => onNote(e.target.value)}
          placeholder="메모를 입력하세요…" spellCheck={false} autoFocus />
      </div>
    </div>
  );
}

Object.assign(window, { DocPage, MemoPage, EmptyState, EditableBlock, EditorMenu, htmlFromText });
