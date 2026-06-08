import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { PartialBlock } from "@blocknote/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit } from "@tauri-apps/api/event";
import * as db from "../lib/db";
import { uploadFile } from "../lib/upload";
import * as sticky from "../lib/sticky";
import { Icon } from "./icons";

/** A page rendered in a small always-on-top sticky window (mirrors the page). */
export function StickyApp({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<db.Page | null>(null);
  const [blocks, setBlocks] = useState<PartialBlock[] | null>(null);
  const [color, setColor] = useState(sticky.STICKY_COLORS[0]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    db.getPage(pageId).then(setPage);
    db.loadContent(pageId).then((j) => {
      try {
        setBlocks(JSON.parse(j));
      } catch {
        setBlocks([]);
      }
    });
    sticky.getSticky(pageId).then((s) => {
      if (s?.color) setColor(s.color);
    });
  }, [pageId]);

  // Persist position/size (logical) when the window moves or resizes.
  useEffect(() => {
    const win = getCurrentWindow();
    let t: number | undefined;
    const saveGeom = () => {
      window.clearTimeout(t);
      t = window.setTimeout(async () => {
        try {
          const scale = await win.scaleFactor();
          const pos = await win.outerPosition();
          const size = await win.innerSize();
          await sticky.saveStickyGeom(
            pageId,
            pos.x / scale,
            pos.y / scale,
            size.width / scale,
            size.height / scale
          );
        } catch {
          /* ignore */
        }
      }, 400);
    };
    const un1 = win.onMoved(saveGeom);
    const un2 = win.onResized(saveGeom);
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
      window.clearTimeout(t);
    };
  }, [pageId]);

  const changeColor = (c: string) => {
    setColor(c);
    setPaletteOpen(false);
    void sticky.saveStickyColor(pageId, c);
  };

  const closeSticky = async () => {
    await sticky.markStickyClosed(pageId);
    await getCurrentWindow().close();
  };

  // Open this page inside the main D-Note window.
  const openInApp = async () => {
    await emit("goto-page", pageId);
    const main = await WebviewWindow.getByLabel("main");
    if (main) await main.setFocus();
  };

  if (blocks === null || !page) {
    return <div className="sticky-root" style={{ background: color }} />;
  }

  return (
    <div className="sticky-root" style={{ background: color }}>
      <div className="sticky-bar" data-tauri-drag-region>
        <span className="sticky-pin" data-tauri-drag-region>
          <Icon.pin size={13} />
        </span>
        <span className="sticky-title" data-tauri-drag-region>
          {page.title || "새 메모"}
        </span>
        <div className="sticky-actions">
          <button
            className={`sticky-btn ${paletteOpen ? "is-on" : ""}`}
            title="색상"
            onClick={() => setPaletteOpen((o) => !o)}
          >
            <Icon.palette size={14} />
          </button>
          <button className="sticky-btn" title="페이지 열기" onClick={openInApp}>
            <Icon.expand size={14} />
          </button>
          <button className="sticky-btn" title="닫기" onClick={closeSticky}>
            <Icon.close size={14} />
          </button>
        </div>
        {paletteOpen && (
          <div className="sticky-palette">
            {sticky.STICKY_COLORS.map((c) => (
              <span
                key={c}
                className={`sticky-dot ${c === color ? "is-on" : ""}`}
                style={{ background: c }}
                title="색상"
                onClick={() => changeColor(c)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sticky-body">
        <StickyEditor pageId={pageId} initialBlocks={blocks} onSync={setSyncing} />
      </div>

      <div className="sticky-foot">
        <span className="sticky-sync">
          <span className={`sticky-syncdot ${syncing ? "is-busy" : ""}`} />
          {syncing ? "동기화 중…" : "D-Note · 동기화됨"}
        </span>
        <span className="sticky-open" onClick={openInApp}>
          페이지 열기 <Icon.expand size={11} />
        </span>
      </div>
    </div>
  );
}

function StickyEditor({
  pageId,
  initialBlocks,
  onSync,
}: {
  pageId: string;
  initialBlocks: PartialBlock[];
  onSync: (busy: boolean) => void;
}) {
  const editor = useCreateBlockNote({
    initialContent: initialBlocks.length ? initialBlocks : undefined,
    uploadFile,
  });
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);

  const save = async () => {
    try {
      const json = JSON.stringify(editor.document);
      const md = await editor.blocksToMarkdownLossy(editor.document);
      await db.saveContent(pageId, json, md);
      dirty.current = false;
      onSync(false);
    } catch {
      /* ignore */
    }
  };

  const onChange = () => {
    dirty.current = true;
    onSync(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 600);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      if (dirty.current) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sticky paper is always a light pastel, so render the editor in light tone.
  return <BlockNoteView editor={editor} theme="light" onChange={onChange} />;
}
