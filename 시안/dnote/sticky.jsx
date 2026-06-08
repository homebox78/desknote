/* D-Note — desktop sticky notes (always-on-top, synced to a page) */

const STICKY_COLORS = {
  yellow: { paper: "#fdeb8b", edge: "#f3da66", text: "#4a4222", sub: "#8a7c43" },
  pink: { paper: "#fbc9d6", edge: "#f3aec1", text: "#4d2b36", sub: "#945f6e" },
  blue: { paper: "#bfe0f5", edge: "#a3d1ef", text: "#243f4d", sub: "#577a8c" },
  green: { paper: "#d0e9bd", edge: "#bbdfa3", text: "#2f4526", sub: "#5f7850" },
  gray: { paper: "#e7e7ea", edge: "#d6d6da", text: "#37383d", sub: "#797a80" },
};

function StickyNote({ sticky, page, z, onNote, onMove, onClose, onColor, onTogglePin, onOpenInApp, onRaise }) {
  const c = STICKY_COLORS[sticky.color] || STICKY_COLORS.yellow;
  const [palette, setPalette] = React.useState(false);
  const [synced, setSynced] = React.useState(true);

  const onHeaderDown = (e) => {
    if (e.target.closest("button")) return;
    onRaise();
    const sx = e.clientX, sy = e.clientY;
    const ox = sticky.x, oy = sticky.y;
    const move = (ev) => onMove(Math.max(4, ox + (ev.clientX - sx)), Math.max(4, oy + (ev.clientY - sy)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const note = page ? page.note || "" : "";
  const title = note.trim().split("\n")[0] || "새 메모";

  const handleNote = (v) => {
    onNote(v);
    setSynced(false);
    clearTimeout(window.__stkT && window.__stkT[sticky.id]);
    window.__stkT = window.__stkT || {};
    window.__stkT[sticky.id] = setTimeout(() => setSynced(true), 700);
  };

  return (
    <div
      className={`dn-sticky ${sticky.pinned ? "is-pinned" : ""}`}
      style={{ left: sticky.x, top: sticky.y, zIndex: z, background: c.paper, color: c.text }}
      onPointerDown={onRaise}
    >
      <div className="dn-sticky-bar" onPointerDown={onHeaderDown} style={{ background: c.edge }}>
        <button className="dn-sticky-btn dn-sticky-pin" title="항상 위에 고정" onClick={onTogglePin} style={{ opacity: sticky.pinned ? 1 : 0.4 }}>
          <Icon.pin size={13} />
        </button>
        <span className="dn-sticky-title">{title}</span>
        <div className="dn-sticky-actions">
          <button className="dn-sticky-btn" title="색 변경" onClick={() => setPalette((p) => !p)}><Icon.palette size={13} /></button>
          <button className="dn-sticky-btn" title="앱에서 열기" onClick={onOpenInApp}><Icon.expand size={13} /></button>
          <button className="dn-sticky-btn" title="닫기" onClick={onClose}><Icon.close size={13} /></button>
        </div>
        {palette && (
          <div className="dn-sticky-palette" onPointerDown={(e) => e.stopPropagation()}>
            {Object.keys(STICKY_COLORS).map((k) => (
              <button
                key={k}
                className={`dn-sticky-dot ${sticky.color === k ? "is-on" : ""}`}
                style={{ background: STICKY_COLORS[k].paper }}
                onClick={() => { onColor(k); setPalette(false); }}
              />
            ))}
          </div>
        )}
      </div>
      <textarea
        className="dn-sticky-body"
        value={note}
        onChange={(e) => handleNote(e.target.value)}
        placeholder="메모를 입력하세요…"
        spellCheck={false}
        style={{ color: c.text }}
      />
      <div className="dn-sticky-foot" style={{ color: c.sub }}>
        <span className="dn-sticky-sync">
          <span className={`dn-sticky-syncdot ${synced ? "" : "is-busy"}`} style={{ background: c.sub }} />
          {synced ? "D-Note · 동기화됨" : "동기화 중…"}
        </span>
        <span className="dn-sticky-open" onClick={onOpenInApp} style={{ color: c.sub }}>페이지 열기 ⤢</span>
      </div>
    </div>
  );
}

Object.assign(window, { StickyNote, STICKY_COLORS });
