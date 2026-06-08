import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import type { PartialBlock } from "@blocknote/core";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import * as db from "../lib/db";
import { uploadFile } from "../lib/upload";
import { exportMarkdown, exportHTML, exportPDF } from "../lib/export";
import { getVersionContent } from "../lib/version";
import { markStickyOpen, getSticky } from "../lib/sticky";
import { openStickyWindow } from "../lib/stickyWindow";
import { DatabaseView } from "./database/DatabaseView";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { ContextMenu, MenuItem } from "./ContextMenu";
import { Icon } from "./icons";

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
  const [showHistory, setShowHistory] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);

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

  // Restore a snapshot in place (replaceBlocks → persist), avoiding a remount race.
  const restoreVersion = async (versionId: string) => {
    const content = await getVersionContent(versionId);
    let blocks: PartialBlock[] = [];
    try {
      blocks = JSON.parse(content);
    } catch {
      blocks = [];
    }
    editor.replaceBlocks(
      editor.document,
      (blocks.length ? blocks : [{ type: "paragraph", content: "" }]) as PartialBlock[]
    );
    await save();
  };

  // Attach a local file/image: copy into assets, insert a block at the cursor.
  const insertAttachment = async (kind: "image" | "file") => {
    const sel = await open({
      multiple: false,
      filters:
        kind === "image"
          ? [{ name: "이미지", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }]
          : [],
    });
    if (!sel || typeof sel !== "string") return;
    const name = sel.split(/[\\/]/).pop() ?? "file";
    const bytes = await invoke<number[]>("read_file_bytes", { path: sel });
    const savedPath = await invoke<string>("save_asset", { name, bytes });
    const url = convertFileSrc(savedPath);
    try {
      const ref = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [
          kind === "image"
            ? { type: "image", props: { url } }
            : { type: "file", props: { url, name } },
        ] as PartialBlock[],
        ref,
        "after"
      );
    } catch {
      const ref = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [{ type: "paragraph", content: [{ type: "link", href: url, content: name }] }] as PartialBlock[],
        ref,
        "after"
      );
    }
    handleChange();
  };

  const toggle = (style: "bold" | "italic" | "underline" | "strike" | "code") => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.toggleStyles({ [style]: true } as any);
    handleChange();
  };

  const menuItems: MenuItem[] = [
    { label: "굵게", icon: "𝐁", onClick: () => toggle("bold") },
    { label: "기울임", icon: "𝑰", onClick: () => toggle("italic") },
    { label: "밑줄", icon: "U̲", onClick: () => toggle("underline") },
    { label: "취소선", icon: "S̶", onClick: () => toggle("strike") },
    { label: "인라인 코드", icon: "</>", onClick: () => toggle("code") },
    { label: "이미지 첨부", icon: "🖼️", onClick: () => insertAttachment("image") },
    { label: "파일 첨부", icon: "📎", onClick: () => insertAttachment("file") },
  ];

  const onCtx = (e: ReactMouseEvent) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY });
  };

  const openAsSticky = async () => {
    await markStickyOpen(pageId);
    const s = await getSticky(pageId);
    await openStickyWindow(pageId, s ?? undefined);
  };

  return (
    <>
      <div className="export-bar">
        <button className="dn-chip" onClick={() => doExport("md")}>
          <Icon.download size={14} /> Markdown
        </button>
        <button className="dn-chip" onClick={() => doExport("html")}>
          <Icon.download size={14} /> HTML
        </button>
        <button className="dn-chip" onClick={() => doExport("pdf")}>
          <Icon.download size={14} /> PDF
        </button>
        <button className="dn-chip" onClick={() => setShowHistory(true)}>
          <Icon.history size={14} /> 기록
        </button>
        <button className="dn-chip" onClick={openAsSticky}>
          <Icon.note size={14} /> 포스트잇
        </button>
      </div>
      <div onContextMenu={onCtx}>
        <BlockNoteView editor={editor} theme={theme} onChange={handleChange} />
      </div>
      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} items={menuItems} onClose={() => setCtx(null)} />
      )}
      {showHistory && (
        <VersionHistoryModal
          pageId={pageId}
          onClose={() => setShowHistory(false)}
          onRestore={restoreVersion}
        />
      )}
    </>
  );
}
