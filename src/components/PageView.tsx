import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { PartialBlock } from "@blocknote/core";
import * as db from "../lib/db";
import { uploadFile } from "../lib/upload";
import { exportMarkdown, exportHTML, exportPDF } from "../lib/export";
import { DatabaseView } from "./database/DatabaseView";

interface Props {
  page: db.Page;
  theme: "light" | "dark";
  onPatch: (id: string, patch: Partial<db.Page>) => void;
  refresh: () => void;
}

/**
 * Outer loader: fetches the saved blocks for the page, then mounts the editor
 * with them as `initialContent`. Keyed by page id in the parent, so switching
 * pages remounts and reloads cleanly.
 */
export function PageView({ page, theme, onPatch, refresh }: Props) {
  const isDb = page.type === "db";
  const [blocks, setBlocks] = useState<PartialBlock[] | null>(null);

  useEffect(() => {
    if (isDb) return;
    let alive = true;
    db.loadContent(page.id).then((json) => {
      let parsed: PartialBlock[] = [];
      try {
        parsed = JSON.parse(json);
      } catch {
        parsed = [];
      }
      if (alive) setBlocks(parsed);
    });
    return () => {
      alive = false;
    };
  }, [page.id, isDb]);

  const commitMeta = () => {
    db.updateMeta(page.id, page.title, page.icon).then(refresh);
  };

  const pickIcon = () => {
    const next = prompt("아이콘 이모지를 입력하세요", page.icon) ?? page.icon;
    const icon = next.trim() || page.icon;
    onPatch(page.id, { icon });
    db.updateMeta(page.id, page.title, icon).then(refresh);
  };

  return (
    <div className="page">
      <div className="page-icon" onClick={pickIcon} title="아이콘 변경">
        {page.icon || "📄"}
      </div>
      <input
        className="page-title"
        placeholder="제목 없음"
        value={page.title}
        onChange={(e) => onPatch(page.id, { title: e.target.value })}
        onBlur={commitMeta}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {isDb ? (
        <DatabaseView pageId={page.id} title={page.title} />
      ) : (
        blocks !== null && (
          <EditorBody
            key={page.id}
            pageId={page.id}
            title={page.title}
            theme={theme}
            initialBlocks={blocks}
          />
        )
      )}
    </div>
  );
}

/** Inner editor: owns the BlockNote instance and the export bar. */
function EditorBody({
  pageId,
  title,
  theme,
  initialBlocks,
}: {
  pageId: string;
  title: string;
  theme: "light" | "dark";
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
      /* editor may be torn down during unmount; ignore */
    }
  };

  const handleChange = () => {
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 600);
  };

  // Flush any pending edit when leaving the page.
  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      if (dirty.current) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doExport = async (kind: "md" | "html" | "pdf") => {
    const md = await editor.blocksToMarkdownLossy(editor.document);
    if (kind === "md") return exportMarkdown(title, md);
    if (kind === "pdf") return exportPDF(title, md);
    const html = await editor.blocksToFullHTML(editor.document);
    return exportHTML(title, html);
  };

  return (
    <>
      <div className="export-bar">
        <button onClick={() => doExport("md")}>Markdown</button>
        <button onClick={() => doExport("html")}>HTML</button>
        <button onClick={() => doExport("pdf")}>PDF</button>
      </div>
      <BlockNoteView editor={editor} theme={theme} onChange={handleChange} />
    </>
  );
}
