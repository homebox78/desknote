import { useState } from "react";
import type { ViewProps } from "./DatabaseView";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function CalendarView(p: ViewProps) {
  const dateCol = p.columns.find((c) => c.type === "date");
  const titleCol = p.columns[0];
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  if (!dateCol) {
    return (
      <div className="db-empty-note">
        캘린더 뷰는 <b>'날짜'</b> 속성이 필요합니다. 표 뷰에서 날짜 속성을 추가하세요.
      </div>
    );
  }

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(1 - startOffset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const byDate = new Map<string, typeof p.rows>();
  for (const r of p.rows) {
    const key = r.data[dateCol.id];
    if (typeof key === "string" && key) {
      const arr = byDate.get(key) ?? [];
      arr.push(r);
      byDate.set(key, arr);
    }
  }

  const todayKey = ymd(today);

  return (
    <div className="db-calendar">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          ‹
        </button>
        <span className="cal-title">
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </span>
        <button className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          ›
        </button>
        <button className="cal-today" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
          오늘
        </button>
      </div>
      <div className="cal-grid cal-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="cal-grid cal-body">
        {cells.map((d, i) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month.getMonth();
          const items = byDate.get(key) ?? [];
          return (
            <div key={i} className={`cal-cell ${inMonth ? "" : "out"} ${key === todayKey ? "today" : ""}`}>
              <div className="cal-day">{d.getDate()}</div>
              {items.map((row) => (
                <div key={row.id} className="cal-chip" title={String(row.data[titleCol?.id ?? ""] ?? "")}>
                  {titleCol ? String(row.data[titleCol.id] ?? "") || "제목 없음" : "제목 없음"}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
