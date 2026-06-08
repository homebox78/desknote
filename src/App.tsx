import { useCallback, useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as db from "./lib/db";
import { createDatabasePage } from "./lib/dbviews";
import { importFile, importPath } from "./lib/import";
import { exportToNotionZip } from "./lib/notion";
import { createStickyPage, markStickyOpen, getSticky, listOpenStickies } from "./lib/sticky";
import { openStickyWindow } from "./lib/stickyWindow";
import { Lock } from "./components/Lock";
import { Titlebar } from "./components/Titlebar";
import { Sidebar } from "./components/Sidebar";
import { PageView } from "./components/PageView";
import { SearchModal } from "./components/SearchModal";
import { TrashModal } from "./components/TrashModal";
import { NotionUploadModal } from "./components/NotionUploadModal";
import { SettingsPage } from "./components/SettingsPage";
import { Onboarding } from "./components/Onboarding";
import { ContextMenu, MenuItem } from "./components/ContextMenu";
import { loadPrefs, savePrefs, applyPrefs, type Prefs } from "./lib/prefs";
import "./styles.css";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [vault, setVault] = useState<{ path: string; exists: boolean } | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("desknote-theme") as "light" | "dark") || "light"
  );
  const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    applyPrefs(prefs);
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("desknote-theme", theme);
  }, [theme]);

  useEffect(() => {
    invoke<{ path: string; exists: boolean }>("vault_status")
      .then(setVault)
      .catch(() => setVault({ path: "", exists: true }));
  }, []);

  // Auto-lock after inactivity (returns to the lock screen).
  useEffect(() => {
    if (!unlocked || prefs.autoLock === "off") return;
    const ms = Number(prefs.autoLock) * 60000;
    let timer = window.setTimeout(() => setUnlocked(false), ms);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setUnlocked(false), ms);
    };
    const evs = ["mousemove", "keydown", "mousedown", "wheel"];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      evs.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked, prefs.autoLock]);

  if (!unlocked) {
    const chrome = (body: ReactNode) => (
      <div className="root-col">
        <Titlebar title="D-Note" showPin={false} pinned={false} onTogglePin={() => {}} />
        <div className="lock-wrap">{body}</div>
      </div>
    );
    if (!vault) return chrome(null);
    if (!vault.exists)
      return chrome(
        <Onboarding
          vaultPath={vault.path}
          theme={theme}
          setTheme={setTheme}
          prefs={prefs}
          setPref={setPref}
          onComplete={() => setUnlocked(true)}
        />
      );
    return chrome(<Lock onUnlock={() => setUnlocked(true)} />);
  }
  return <Workspace prefs={prefs} setPref={setPref} theme={theme} setTheme={setTheme} />;
}

function Workspace({
  prefs,
  setPref,
  theme,
  setTheme,
}: {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}) {
  const [pages, setPages] = useState<db.Page[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showNotion, setShowNotion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(
    null
  );
  const [pinned, setPinned] = useState(false);

  const togglePin = async () => {
    const next = !pinned;
    setPinned(next);
    await getCurrentWindow().setAlwaysOnTop(next);
  };

  const refresh = useCallback(async () => setPages(await db.listPages()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Daily automatic backup of the database (once per calendar day).
  useEffect(() => {
    if (!prefs.autoBackup) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("desknote-backup") !== today) {
      invoke<string>("backup_db", { label: today })
        .then(() => localStorage.setItem("desknote-backup", today))
        .catch(() => {});
    }
  }, [prefs.autoBackup]);

  // Import a file opened via Explorer "Send to D-Note" / CLI / a second launch.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const consume = async () => {
      try {
        const path = await invoke<string | null>("take_startup_file");
        if (path) {
          const id = await importPath(path);
          await refresh();
          setCurrent(id);
        }
      } catch {
        /* ignore non-importable files */
      }
    };
    consume();
    listen("open-file", () => consume()).then((f) => {
      unlisten = f;
    });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the Explorer "Send to D-Note" menu registered unless the user opted out.
  useEffect(() => {
    if (localStorage.getItem("desknote-shellmenu") !== "off") {
      invoke("register_shell_menu").catch(() => {});
    }
  }, []);

  // Reopen sticky-note windows that were open last session, and listen for a
  // sticky asking to navigate the main window to its page.
  useEffect(() => {
    listOpenStickies()
      .then((list) =>
        list.forEach((s) =>
          openStickyWindow(s.page_id, { x: s.x, y: s.y, w: s.w, h: s.h })
        )
      )
      .catch(() => {});
    let un: (() => void) | undefined;
    listen<string>("goto-page", (e) => {
      setCurrent(e.payload);
      setShowSettings(false);
    }).then((f) => {
      un = f;
    });
    return () => un?.();
  }, []);

  const newSticky = async () => {
    const id = await createStickyPage();
    await refresh();
    await openStickyWindow(id);
  };

  const openAsSticky = async (pageId: string) => {
    await markStickyOpen(pageId);
    const s = await getSticky(pageId);
    await openStickyWindow(pageId, s ?? undefined);
  };

  // ⌘K / Ctrl+K → search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const cur = pages.find((p) => p.id === current) ?? null;

  const patch = (id: string, p: Partial<db.Page>) =>
    setPages((prev) => prev.map((pg) => (pg.id === id ? { ...pg, ...p } : pg)));

  const addPage = async (parent: string | null) => {
    const id = await db.createPage(parent);
    if (parent) setExpanded((s) => new Set(s).add(parent));
    await refresh();
    setCurrent(id);
  };

  const addDatabase = async (parent: string | null) => {
    const id = await createDatabasePage(parent);
    if (parent) setExpanded((s) => new Set(s).add(parent));
    await refresh();
    setCurrent(id);
  };

  const doImport = async () => {
    try {
      const id = await importFile();
      if (id) {
        await refresh();
        setCurrent(id);
      }
    } catch (e) {
      alert("가져오기 실패: " + String(e));
    }
  };

  const doExportNotion = async () => {
    try {
      const n = await exportToNotionZip();
      if (n > 0) {
        alert(
          `${n}개 페이지를 ZIP으로 내보냈습니다.\n` +
            "노션에서 '설정 > 가져오기 > Markdown & CSV'로 이 ZIP을 업로드하세요."
        );
      }
    } catch (e) {
      alert("노션 내보내기 실패: " + String(e));
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleFav = async (id: string) => {
    const pg = pages.find((p) => p.id === id);
    await db.toggleFavorite(id, pg?.is_favorite ?? 0);
    refresh();
  };

  const openMenu = (e: MouseEvent, p: db.Page) => {
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: p.is_favorite ? "즐겨찾기 해제" : "즐겨찾기에 추가",
          icon: "⭐",
          onClick: async () => {
            await db.toggleFavorite(p.id, p.is_favorite);
            refresh();
          },
        },
        {
          label: "복제",
          icon: "📑",
          onClick: async () => {
            const id = await db.duplicatePage(p.id);
            await refresh();
            if (id) setCurrent(id);
          },
        },
        {
          label: "하위 페이지 추가",
          icon: "＋",
          onClick: () => addPage(p.id),
        },
        {
          label: "하위 데이터베이스 추가",
          icon: "🗃️",
          onClick: () => addDatabase(p.id),
        },
        {
          label: "포스트잇으로 열기",
          icon: "📌",
          onClick: () => openAsSticky(p.id),
        },
        {
          label: "삭제",
          icon: "🗑️",
          danger: true,
          onClick: async () => {
            await db.trashPage(p.id);
            if (current === p.id) setCurrent(null);
            refresh();
          },
        },
      ],
    });
  };

  return (
    <div className="root-col">
      <Titlebar
        title={cur ? cur.title || "제목 없음" : "D-Note"}
        pinned={pinned}
        onTogglePin={togglePin}
        onSettings={() => setShowSettings((s) => !s)}
      />
      <div className="app">
        <Sidebar
          pages={pages}
          current={current}
          expanded={expanded}
          onSelect={(id) => {
            setCurrent(id);
            setShowSettings(false);
          }}
          onToggle={toggleExpand}
          onAdd={addPage}
          onAddDatabase={addDatabase}
          onImport={doImport}
          onExportNotion={doExportNotion}
          onNotionUpload={() => setShowNotion(true)}
          onNewSticky={newSticky}
          onMenu={openMenu}
          onToggleFav={toggleFav}
          onSearch={() => setShowSearch(true)}
          onTrash={() => setShowTrash(true)}
        />

        <main className="main">
          {showSettings ? (
            <SettingsPage theme={theme} onTheme={setTheme} prefs={prefs} setPref={setPref} />
          ) : cur ? (
            <PageView
              key={cur.id}
              page={cur}
              theme={theme}
              onPatch={patch}
              refresh={refresh}
            />
          ) : (
            <div className="empty-state">
              왼쪽에서 페이지를 선택하거나 새로 만드세요 &nbsp;(⌘K로 검색)
            </div>
          )}
        </main>
      </div>

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onOpen={(id) => setCurrent(id)}
        />
      )}
      {showTrash && (
        <TrashModal
          onClose={() => setShowTrash(false)}
          onChanged={() => {
            refresh();
            if (current && !pages.some((p) => p.id === current)) setCurrent(null);
          }}
        />
      )}
      {showNotion && <NotionUploadModal onClose={() => setShowNotion(false)} />}
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
