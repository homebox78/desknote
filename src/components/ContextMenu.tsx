import { useEffect } from "react";

export interface MenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the menu on-screen near the right/bottom edges.
  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - items.length * 34 - 16);

  return (
    <div
      className="ctx-overlay"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="ctx-menu"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((it, i) => (
          <div
            key={i}
            className={`ctx-item ${it.danger ? "danger" : ""}`}
            onClick={() => {
              it.onClick();
              onClose();
            }}
          >
            <span>{it.icon}</span> {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}
