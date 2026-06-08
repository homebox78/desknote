/* D-Note — root app: state, routing, settings, desktop sticky notes */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "tone": "graphite",
  "density": "comfortable",
  "sidebarWidth": 256,
  "fullWidth": true,
  "fontScale": 100,
  "autoLock": "15",
  "autoBackup": true,
  "dataPath": "%APPDATA%\\com.desknote.app\\",
  "backupPath": "%APPDATA%\\com.desknote.app\\backups\\"
}/*EDITMODE-END*/;

const TONES = {
  ink: { light: "#161618", dark: "#dcdde1" },
  graphite: { light: "#2b2d31", dark: "#cdced2" },
  steel: { light: "#44474e", dark: "#bbbdc3" },
};

const LS = { stickies: "dnote_stickies_v1", memos: "dnote_memopages_v1", notes: "dnote_notes_v1" };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

function plainText(p) {
  if (p.note != null) return p.note;
  return (p.blocks || []).filter((b) => ["p", "li", "h1", "h2", "quote"].includes(b.t)).map((b) => b.text.replace(/\*\*/g, "")).join("\n");
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [phase, setPhase] = React.useState("onboarding");
  const [activeId, setActiveId] = React.useState("p-flow");
  const [modal, setModal] = React.useState(null);
  const [pinned, setPinned] = React.useState(true);

  // pages = base mock + restored memo pages, with restored notes applied
  const [pages, setPages] = React.useState(() => {
    const memos = load(LS.memos, []);
    const notes = load(LS.notes, {});
    const base = PAGES.concat(memos.filter((m) => !PAGES.some((p) => p.id === m.id)));
    return base.map((p) => (notes[p.id] != null ? { ...p, note: notes[p.id] } : p));
  });
  const [stickies, setStickies] = React.useState(() => load(LS.stickies, []));
  const zRef = React.useRef(stickies.reduce((m, s) => Math.max(m, s.z || 0), 0) + 1);

  const dark = t.theme === "dark";
  const onSettings = activeId === "settings";
  const active = onSettings ? null : pages.find((p) => p.id === activeId) || null;
  const titleText = onSettings ? "설정" : active ? active.title : "D-Note";
  const stickyPageIds = stickies.map((s) => s.pageId);
  const pagesById = React.useMemo(() => Object.fromEntries(pages.map((p) => [p.id, p])), [pages]);

  const lastPageRef = React.useRef("p-flow");
  if (!onSettings) lastPageRef.current = activeId;
  const toggleSettings = () => setActiveId(onSettings ? lastPageRef.current : "settings");

  // persist
  React.useEffect(() => { save(LS.stickies, stickies); }, [stickies]);
  React.useEffect(() => {
    save(LS.memos, pages.filter((p) => p.kind === "memo"));
    const notes = {};
    pages.forEach((p) => { if (p.note != null) notes[p.id] = p.note; });
    save(LS.notes, notes);
  }, [pages]);

  // theme + accent
  React.useEffect(() => {
    const el = document.getElementById("dn-window");
    if (!el) return;
    el.dataset.theme = dark ? "dark" : "light";
    const tone = TONES[t.tone] || TONES.graphite;
    el.style.setProperty("--accent", dark ? tone.dark : tone.light);
    el.style.setProperty("--fs", (t.fontScale / 100).toFixed(3));
  }, [dark, t.tone, t.fontScale]);

  React.useEffect(() => { window.__nav = { phase: setPhase, page: setActiveId, modal: setModal }; }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (phase === "app") setModal((m) => (m === "search" ? null : "search")); }
      if (e.key === "Escape") { if (modal) setModal(null); else if (phase === "app") setPhase("locked"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, modal]);

  // ---- sticky handlers ----
  const stickyPos = () => {
    const n = stickies.length;
    const baseX = Math.max(40, Math.min(window.innerWidth - 320, window.innerWidth * 0.58));
    return { x: baseX + (n % 4) * 30, y: 84 + (n % 4) * 30 };
  };
  const updateNote = (pageId, text) => setPages((ps) => ps.map((p) => p.id === pageId ? { ...p, note: text, title: p.kind === "memo" ? (text.trim().split("\n")[0] || "새 메모") : p.title } : p));
  const raiseSticky = (id) => setStickies((ss) => ss.map((s) => s.id === id ? { ...s, z: zRef.current++ } : s));
  const moveSticky = (id, x, y) => setStickies((ss) => ss.map((s) => s.id === id ? { ...s, x, y } : s));
  const colorSticky = (id, color) => setStickies((ss) => ss.map((s) => s.id === id ? { ...s, color } : s));
  const togglePinSticky = (id) => setStickies((ss) => ss.map((s) => s.id === id ? { ...s, pinned: !s.pinned } : s));
  const closeSticky = (id) => setStickies((ss) => ss.filter((s) => s.id !== id));

  const newSticky = () => {
    const id = "memo-" + Date.now().toString(36);
    const page = { id, type: "doc", kind: "memo", title: "새 메모", icon: "note", note: "" };
    setPages((ps) => [...ps, page]);
    const pos = stickyPos();
    setStickies((ss) => [...ss, { id: "stk-" + id, pageId: id, color: "yellow", pinned: true, x: pos.x, y: pos.y, z: zRef.current++ }]);
  };
  const pinPage = (pageId) => {
    if (stickyPageIds.includes(pageId)) { setStickies((ss) => ss.map((s) => s.pageId === pageId ? { ...s, z: zRef.current++ } : s)); return; }
    const pg = pages.find((p) => p.id === pageId);
    if (pg && pg.note == null) setPages((ps) => ps.map((p) => p.id === pageId ? { ...p, note: plainText(pg) } : p));
    const pos = stickyPos();
    setStickies((ss) => [...ss, { id: "stk-" + pageId + "-" + Date.now().toString(36), pageId, color: "yellow", pinned: true, x: pos.x, y: pos.y, z: zRef.current++ }]);
  };
  const openInApp = (pageId) => { setPhase("app"); setActiveId(pageId); };

  const locked = phase !== "app";

  return (
    <div className="dn-desktop">
      <div id="dn-window" className="dn-window" data-theme={dark ? "dark" : "light"}
        style={{ "--side-w": t.sidebarWidth + "px", "--fs": (t.fontScale / 100).toFixed(3) }}>
        <Titlebar title={locked ? "D-Note" : titleText} pinned={pinned} onPin={() => setPinned((p) => !p)}
          settingsActive={onSettings} onOpenSettings={toggleSettings} locked={locked} dark={dark} />

        {phase === "onboarding" ? (
          <Onboarding t={t} set={setTweak} onComplete={() => setPhase("app")} />
        ) : phase === "locked" ? (
          <LockScreen onUnlock={() => setPhase("app")} dark={dark} />
        ) : (
          <div className="dn-body">
            <Sidebar pages={pages} activeId={activeId} onSelect={setActiveId}
              onOpenSearch={() => setModal("search")} onOpenTrash={() => setModal("trash")}
              onOpenNotion={() => setModal("notion")} onNewSticky={newSticky} onPinPage={pinPage}
              stickyPageIds={stickyPageIds} density={t.density} />
            <main className="dn-main">
              {onSettings ? (
                <SettingsPage t={t} set={setTweak} />
              ) : !active ? (
                <EmptyState />
              ) : active.kind === "memo" ? (
                <MemoPage page={active} fullWidth={t.fullWidth} onNote={(v) => updateNote(active.id, v)}
                  isSticky={stickyPageIds.includes(active.id)} onPin={() => pinPage(active.id)} />
              ) : active.type === "db" ? (
                <DatabasePage page={active} fullWidth={t.fullWidth} />
              ) : (
                <DocPage page={active} fullWidth={t.fullWidth} onHistory={() => setModal("version")}
                  onPin={() => pinPage(active.id)} />
              )}
            </main>
          </div>
        )}

        {modal === "search" && <SearchModal pages={pages} onClose={() => setModal(null)} onSelect={setActiveId} />}
        {modal === "trash" && <TrashModal onClose={() => setModal(null)} />}
        {modal === "notion" && <NotionModal onClose={() => setModal(null)} />}
        {modal === "version" && <VersionModal onClose={() => setModal(null)} />}
      </div>

      {phase === "app" && stickies.length > 0 && (
        <div className="dn-sticky-layer">
          {stickies.map((s) => (
            <StickyNote key={s.id} sticky={s} page={pagesById[s.pageId]} z={s.z}
              onNote={(v) => updateNote(s.pageId, v)} onMove={(x, y) => moveSticky(s.id, x, y)}
              onClose={() => closeSticky(s.id)} onColor={(c) => colorSticky(s.id, c)}
              onTogglePin={() => togglePinSticky(s.id)} onOpenInApp={() => openInApp(s.pageId)}
              onRaise={() => raiseSticky(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
