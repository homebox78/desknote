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
import "../styles.css";

/** A page rendered in a small always-on-top sticky window (mirrors the page). */
export function StickyApp({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<db.Page | null>(null);
  const [blocks, setBlocks] = useState<PartialBlock[] | null>(null);
  const [color, setColor] = useState(sticky.STICKY_COLORS[0]);

  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem("desknote-theme") || "light";
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
    void sticky.saveStickyColor(pageId, c);
  };

  const closeSticky = async () => {
    await sticky.markStickyClosed(pageId);
    await getCurrentWindow().close();
  };

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
        <input
          className="sticky-title"
          placeholder="제목 없음"
          defaultValue={page.title}
          onBlur={(e) => db.updateMeta(pageId, e.target.value, page.icon)}
        />
        <div className="sticky-colors">
          {sticky.STICKY_COLORS.map((c) => (
            <span
              key={c}
              className={`sticky-dot ${c === color ? "on" : ""}`}
              style={{ background: c }}
              title="색상"
              onClick={() => changeColor(c)}
            />
          ))}
        </div>
        <button className="sticky-btn" title="앱에서 열기" onClick={openInApp}>
          ⤢
        </button>
        <button className="sticky-btn" title="닫기" onClick={closeSticky}>
          ✕
        </button>
      </div>
      <div className="sticky-body">
        <StickyEditor pageId={pageId} initialBlocks={blocks} />
      </div>
    </div>
  );
}

function StickyEditor({
  pageId,
  initialBlocks,
}: {
  pageId: string;
  initialBlocks: PartialBlock[];
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
    } catch {
      /* ignore */
    }
  };

  const onChange = () => {
    dirty.current = true;
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

  const theme = (localStorage.getItem("desknote-theme") as "light" | "dark") || "light";
  return <BlockNoteView editor={editor} theme={theme} onChange={onChange} />;
}
