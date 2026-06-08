/* D-Note — database with table / board / gallery / calendar views */

const TAG_COLORS = {
  UX: "violet", FE: "blue", BE: "amber", 보안: "green", 릴리스: "blue", 패치: "amber",
};

function Tag({ label }) {
  return <span className={`dn-tag dn-tag--${TAG_COLORS[label] || "slate"}`}>{label}</span>;
}

function ViewTabs({ view, setView }) {
  const tabs = [
    { id: "table", label: "표", icon: Icon.table },
    { id: "board", label: "보드", icon: Icon.board },
    { id: "gallery", label: "갤러리", icon: Icon.gallery },
    { id: "calendar", label: "캘린더", icon: Icon.calendar },
  ];
  return (
    <div className="dn-viewtabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`dn-vtab ${view === t.id ? "is-active" : ""}`}
          onClick={() => setView(t.id)}
        >
          <t.icon size={15} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Table ---- */
function TableView({ rows }) {
  return (
    <div className="dn-table">
      <div className="dn-tr dn-tr-head">
        <div className="dn-td dn-td-name">이름</div>
        <div className="dn-td dn-td-status">상태</div>
        <div className="dn-td dn-td-date">날짜</div>
        <div className="dn-td dn-td-add"><Icon.plus size={14} /></div>
      </div>
      {rows.map((r) => (
        <div className="dn-tr" key={r.id}>
          <div className="dn-td dn-td-name">
            <span className="dn-cell-title">{r.name}</span>
          </div>
          <div className="dn-td dn-td-status"><StatusPill status={r.status} /></div>
          <div className="dn-td dn-td-date">
            <span className="dn-cell-date">{r.date}</span>
            <Icon.cal size={14} className="dn-date-ic" />
          </div>
          <div className="dn-td dn-td-add" />
        </div>
      ))}
      <button className="dn-table-add"><Icon.plus size={14} /> 새 행</button>
    </div>
  );
}

/* ---- Board (kanban) ---- */
function BoardView({ rows }) {
  const cols = DB_STATUS;
  return (
    <div className="dn-board">
      {cols.map((c) => {
        const items = rows.filter((r) => r.status === c.id);
        return (
          <div className="dn-bcol" key={c.id}>
            <div className="dn-bcol-head">
              <StatusPill status={c.id} />
              <span className="dn-bcol-count">{items.length}</span>
            </div>
            <div className="dn-bcol-body">
              {items.map((r) => (
                <div className="dn-bcard" key={r.id}>
                  <div className="dn-bcard-title">{r.name}</div>
                  {r.tags && (
                    <div className="dn-bcard-tags">
                      {r.tags.map((t) => <Tag key={t} label={t} />)}
                    </div>
                  )}
                  <div className="dn-bcard-date"><Icon.cal size={13} /> {r.date}</div>
                </div>
              ))}
              <button className="dn-bcol-add"><Icon.plus size={14} /> 추가</button>
            </div>
          </div>
        );
      })}
      <div className="dn-bcol dn-bcol--ghost">
        <button className="dn-bcol-newcol"><Icon.plus size={15} /> 그룹</button>
      </div>
    </div>
  );
}

/* ---- Gallery ---- */
function GalleryView({ rows }) {
  return (
    <div className="dn-gallery">
      {rows.map((r) => (
        <div className="dn-gcard" key={r.id}>
          <div className="dn-gcard-cover">
            <Icon.doc size={26} />
          </div>
          <div className="dn-gcard-body">
            <div className="dn-gcard-title">{r.name}</div>
            <div className="dn-gcard-meta">
              <StatusPill status={r.status} />
            </div>
          </div>
        </div>
      ))}
      <button className="dn-gcard dn-gcard--add"><Icon.plus size={20} /></button>
    </div>
  );
}

/* ---- Calendar ---- */
function CalendarView({ rows }) {
  // June 2026 — starts Mon? Korean cal starts Sunday. June 1 2026 is a Monday.
  const days = [];
  // leading from prev month: May 31 (Sun)
  days.push({ n: 31, out: true });
  for (let d = 1; d <= 30; d++) days.push({ n: d, out: false });
  // trailing to fill 5 weeks (35 cells): July 1-4
  for (let d = 1; d <= 4; d++) days.push({ n: d, out: true });

  const eventsByDay = {};
  rows.forEach((r) => {
    const d = parseInt(r.date.split("-")[2], 10);
    (eventsByDay[d] = eventsByDay[d] || []).push(r);
  });
  const today = 8;
  const dows = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="dn-cal">
      <div className="dn-cal-toolbar">
        <div className="dn-cal-nav">
          <button className="dn-iconbtn"><Icon.chevronL size={16} /></button>
          <span className="dn-cal-month">2026년 6월</span>
          <button className="dn-iconbtn"><Icon.chevron size={16} /></button>
        </div>
        <button className="dn-chip">오늘</button>
      </div>
      <div className="dn-cal-grid">
        {dows.map((d, i) => (
          <div key={d} className={`dn-cal-dow ${i === 0 ? "is-sun" : ""} ${i === 6 ? "is-sat" : ""}`}>{d}</div>
        ))}
        {days.map((day, i) => {
          const col = i % 7;
          const isToday = !day.out && day.n === today;
          const evs = !day.out ? eventsByDay[day.n] || [] : [];
          return (
            <div key={i} className={`dn-cal-cell ${day.out ? "is-out" : ""}`}>
              <span
                className={`dn-cal-num ${isToday ? "is-today" : ""} ${col === 0 ? "is-sun" : ""} ${col === 6 ? "is-sat" : ""}`}
              >
                {day.n}
              </span>
              <div className="dn-cal-events">
                {evs.map((e) => (
                  <div key={e.id} className={`dn-cal-ev dn-cal-ev--${e.status}`}>{e.name}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DatabasePage({ page, fullWidth }) {
  const [view, setView] = React.useState("table");
  const rows = page.rows || [];
  return (
    <div className="dn-doc-scroll">
      <div className={`dn-db ${fullWidth ? "dn-db--wide" : ""}`}>
        <div className="dn-doc-iconwrap">
          <div className="dn-db-icon"><Icon.database size={32} /></div>
        </div>
        <h1 className="dn-doc-title">{page.title}</h1>
        <div className="dn-db-bar">
          <ViewTabs view={view} setView={setView} />
          <div className="dn-db-bar-right">
            <span className="dn-db-count">{rows.length}개</span>
            <button className="dn-chip dn-chip--ic"><Icon.download size={15} /> CSV</button>
          </div>
        </div>
        <div className="dn-db-viewport">
          {view === "table" && <TableView rows={rows} />}
          {view === "board" && <BoardView rows={rows} />}
          {view === "gallery" && <GalleryView rows={rows} />}
          {view === "calendar" && <CalendarView rows={rows} />}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DatabasePage, TableView, BoardView, GalleryView, CalendarView, Tag });
