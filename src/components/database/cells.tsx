import { useState } from "react";
import {
  Column,
  SelectOption,
  SELECT_COLORS,
} from "../../lib/dbviews";

const uuid = () => crypto.randomUUID();

/** Read-only rendering of a cell value (used by board / gallery / calendar). */
export function CellValue({ column, value }: { column: Column; value: unknown }) {
  switch (column.type) {
    case "checkbox":
      return <span>{value ? "☑" : "☐"}</span>;
    case "select": {
      const opt = column.config.options?.find((o) => o.id === value);
      return opt ? <Tag option={opt} /> : null;
    }
    case "multiselect": {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      const opts = (column.config.options ?? []).filter((o) => ids.includes(o.id));
      return (
        <span className="tag-row">
          {opts.map((o) => (
            <Tag key={o.id} option={o} />
          ))}
        </span>
      );
    }
    case "url":
      return value ? (
        <span className="cell-url">{String(value)}</span>
      ) : null;
    default:
      return <span>{value != null ? String(value) : ""}</span>;
  }
}

function Tag({ option, onRemove }: { option: SelectOption; onRemove?: () => void }) {
  return (
    <span className="db-tag" style={{ background: option.color }}>
      {option.name}
      {onRemove && (
        <span
          className="db-tag-x"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </span>
      )}
    </span>
  );
}

interface CellProps {
  column: Column;
  value: unknown;
  onChange: (value: unknown) => void;
  onColumnConfig: (config: Column["config"]) => void;
}

/** Editable cell for the table view. */
export function Cell({ column, value, onChange, onColumnConfig }: CellProps) {
  switch (column.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          className="cell-check"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "number":
      return (
        <input
          className="cell-input"
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );
    case "date":
      return (
        <input
          className="cell-input"
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "url":
      return (
        <input
          className="cell-input"
          type="url"
          placeholder="https://"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
    case "multiselect":
      return (
        <SelectCell
          column={column}
          value={value}
          onChange={onChange}
          onColumnConfig={onColumnConfig}
        />
      );
    default:
      return (
        <input
          className="cell-input"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function SelectCell({ column, value, onChange, onColumnConfig }: CellProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const multi = column.type === "multiselect";
  const options = column.config.options ?? [];
  const selectedIds: string[] = multi
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : typeof value === "string"
      ? [value]
      : [];

  const selectedOpts = options.filter((o) => selectedIds.includes(o.id));

  const toggle = (id: string) => {
    if (multi) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onChange(next);
    } else {
      onChange(selectedIds.includes(id) ? null : id);
      setOpen(false);
    }
  };

  const removeOne = (id: string) => {
    if (multi) onChange(selectedIds.filter((x) => x !== id));
    else onChange(null);
  };

  const createOption = () => {
    const name = q.trim();
    if (!name) return;
    const opt: SelectOption = {
      id: uuid(),
      name,
      color: SELECT_COLORS[options.length % SELECT_COLORS.length],
    };
    onColumnConfig({ ...column.config, options: [...options, opt] });
    if (multi) onChange([...selectedIds, opt.id]);
    else {
      onChange(opt.id);
      setOpen(false);
    }
    setQ("");
  };

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(q.toLowerCase())
  );
  const exact = options.some((o) => o.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="select-cell">
      <div className="select-display" onClick={() => setOpen(true)}>
        {selectedOpts.length ? (
          selectedOpts.map((o) => (
            <Tag key={o.id} option={o} onRemove={() => removeOne(o.id)} />
          ))
        ) : (
          <span className="cell-empty">비어 있음</span>
        )}
      </div>
      {open && (
        <>
          <div className="select-overlay" onClick={() => setOpen(false)} />
          <div className="select-pop">
            <input
              autoFocus
              className="select-search"
              placeholder="검색 또는 생성…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim() && !exact) createOption();
                if (e.key === "Escape") setOpen(false);
              }}
            />
            <div className="select-options">
              {filtered.map((o) => (
                <div key={o.id} className="select-option" onClick={() => toggle(o.id)}>
                  <Tag option={o} />
                  {selectedIds.includes(o.id) && <span className="select-check">✓</span>}
                </div>
              ))}
              {q.trim() && !exact && (
                <div className="select-option create" onClick={createOption}>
                  + "{q.trim()}" 생성
                </div>
              )}
              {!filtered.length && !q.trim() && (
                <div className="cell-empty" style={{ padding: "6px 8px" }}>
                  옵션 없음
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
