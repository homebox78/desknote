import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as db from "./lib/db";
import { createDatabasePage } from "./lib/dbviews";
import { importFile } from "./lib/import";
import { Lock } from "./components/Lock";
import { Titlebar } from "./components/Titlebar";
import { Sidebar } from "./components/Sidebar";
import { PageView } from "./components/PageView";
import { SearchModal } from "./components/SearchModal";
import { TrashModal } from "./components/TrashModal";
import { ContextMenu, MenuItem } from "./components/ContextMenu";
import "./styles.css";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <Lock onUnlock={() => setUnlocked(true)} />;
  return <Workspace />;
}

function Workspace() {
  const [pages, setPages] = useState<db.Page[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("desknote-theme") as "light" | "dark") || "light"
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("desknote-theme", theme);
  }, [theme]);

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

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

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
        icon={cur ? cur.icon || "📄" : "🗒️"}
        title={cur ? cur.title || "제목 없음" : "DeskNote"}
        pinned={pinned}
        onTogglePin={togglePin}
      />
      <div className="app">
        <Sidebar
          pages={pages}
          current={current}
          expanded={expanded}
          theme={theme}
          onSelect={setCurrent}
          onToggle={toggleExpand}
          onAdd={addPage}
          onAddDatabase={addDatabase}
          onImport={doImport}
          onMenu={openMenu}
          onSearch={() => setShowSearch(true)}
          onTrash={() => setShowTrash(true)}
          onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
        />

        <main className="main">
          {cur ? (
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
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </div>
  );
}
