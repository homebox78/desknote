// Opens a small always-on-top sticky window that mirrors a page. The window
// loads the same bundle with ?sticky=<pageId>, which main.tsx routes to the
// StickyApp view.
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { Sticky } from "./sticky";

export function stickyLabel(pageId: string): string {
  return "sticky-" + pageId;
}

export async function openStickyWindow(
  pageId: string,
  geom?: Pick<Sticky, "x" | "y" | "w" | "h">
): Promise<void> {
  const label = stickyLabel(pageId);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }
  const pos =
    geom && geom.x != null && geom.y != null ? { x: geom.x, y: geom.y } : {};
  new WebviewWindow(label, {
    url: `index.html?sticky=${encodeURIComponent(pageId)}`,
    title: "포스트잇",
    width: geom?.w ?? 300,
    height: geom?.h ?? 340,
    minWidth: 200,
    minHeight: 180,
    alwaysOnTop: true,
    decorations: false,
    resizable: true,
    skipTaskbar: false,
    focus: true,
    ...pos,
  });
}
