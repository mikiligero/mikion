/* ============================================================
   MIKION — Database (table / kanban / calendar) + filter/sort
   ============================================================ */
const { useState: useStateD, useRef: useRefD } = React;

const PRIORITY_RANK = { "Alta": 0, "Media": 1, "Baja": 2 };

function DatabaseView({ onOpenRow, onNavigate }) {
  const meta = window.MIKION_DATA.projects;
  const st = useStore();
  const rows = st.rows;
  const [view, setView] = useStateD("table");
  const [filters, setFilters] = useStateD({ status: [], area: [] });
  const [sort, setSort] = useStateD({ field: null, dir: "asc" });
  const [menu, setMenu] = useStateD(null); // 'filter' | 'sort' | 'cols' | 'group' | 'new'
  const [groupBy, setGroupBy] = useStateD(null);
  const [auto, setAuto] = useStateD(false);
  const [hiddenCols, setHiddenCols] = useStateD([]);
  const [colOrder, setColOrder] = useStateD(null);
  const filterBtn = useRefD(null);
  const sortBtn = useRefD(null);
  const colBtn = useRefD(null);
  const groupBtn = useRefD(null);
  const newBtn = useRefD(null);

  const orderedSchema = (() => {
    let sc = st.schema;
    if (colOrder) { const map = Object.fromEntries(sc.map(p => [p.id, p])); sc = [...colOrder.map(id => map[id]).filter(Boolean), ...sc.filter(p => !colOrder.includes(p.id))]; }
    return sc;
  })();
  const visibleSchema = orderedSchema.filter(p => !hiddenCols.includes(p.id));
  const GROUPABLE = st.schema.filter(p => ["select", "status", "person"].includes(p.type));
  const moveCol = (id, dir) => { const ids = orderedSchema.map(p => p.id); const i = ids.indexOf(id); const j = i + dir; if (j < 1 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; setColOrder(ids); };

  const ROW_TEMPLATES = [
    { name: "En blanco", emoji: "📄", over: {}, blocks: null },
    { name: "Reunión semanal", emoji: "🗓️", over: { emoji: "🗓️", title: "Reunión semanal", area: "Producto", status: "Por hacer", priority: "Media" }, blocks: [{ type: "h3", text: "Orden del día" }, { type: "todo", text: "Repasar objetivos" }, { type: "todo", text: "Bloqueos" }, { type: "h3", text: "Acuerdos" }, { type: "bullet", text: "" }] },
    { name: "Bug", emoji: "🐞", over: { emoji: "🐞", title: "Nuevo bug", area: "Ingeniería", status: "Por hacer", priority: "Alta" }, blocks: [{ type: "callout", emoji: "🐞", text: "Pasos para reproducir" }, { type: "num", text: "" }, { type: "h3", text: "Resultado esperado" }, { type: "text", text: "" }] },
    { name: "Idea", emoji: "💡", over: { emoji: "💡", title: "Nueva idea", area: "Producto", status: "Por hacer", priority: "Baja" }, blocks: [{ type: "quote", text: "Resume la idea en una frase." }, { type: "h3", text: "¿Por qué importa?" }, { type: "text", text: "" }] },
  ];

  const ALL_AREAS = ["Producto", "Diseño", "Ingeniería", "Marketing", "Investigación"];

  const display = (() => {
    let r = rows.filter(x =>
      (filters.status.length === 0 || filters.status.includes(x.status)) &&
      (filters.area.length === 0 || filters.area.includes(x.area))
    );
    if (sort.field) {
      const mul = sort.dir === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => {
        let av, bv;
        if (sort.field === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
        else if (sort.field === "status") { av = meta.statusOrder.indexOf(a.status); bv = meta.statusOrder.indexOf(b.status); }
        else if (sort.field === "priority") { av = PRIORITY_RANK[a.priority]; bv = PRIORITY_RANK[b.priority]; }
        else if (sort.field === "due") { av = a.due; bv = b.due; }
        return av < bv ? -1 * mul : av > bv ? 1 * mul : 0;
      });
    }
    return r;
  })();

  const toggleFilter = (kind, val) => setFilters(f => ({ ...f, [kind]: f[kind].includes(val) ? f[kind].filter(x => x !== val) : [...f[kind], val] }));
  const activeChips = [
    ...filters.status.map(s => ({ kind: "status", val: s })),
    ...filters.area.map(s => ({ kind: "area", val: s })),
  ];

  const addRow = (status) => { const id = Store.addRow(status); };

  return (
    <div className="db-wrap">
      <div className="db-head">
        <div className="db-title"><span>{meta.emoji}</span> {meta.title}</div>
        <div className="db-desc">{meta.desc}</div>
        <div className="view-tabs">
          {[["table","Tabla","table"],["kanban","Tablero","kanban"],["calendar","Calendario","calDays"],["timeline","Cronograma","timeline"],["chart","Gráfico","grid"]].map(([k,label,ico]) => (
            <button key={k} className={"view-tab" + (view === k ? " active" : "")} onClick={() => setView(k)}>
              <span className="vt-ico"><Icon name={ico} size={16} /></span>{label}
            </button>
          ))}
          <div className="db-toolbar">
            <button ref={filterBtn} className={"topbar-btn" + (filters.status.length + filters.area.length ? " on" : "")} onClick={() => setMenu(m => m === "filter" ? null : "filter")}><Icon name="filter" size={15} /> Filtrar{activeChips.length ? ` · ${activeChips.length}` : ""}</button>
            <button ref={sortBtn} className={"topbar-btn" + (sort.field ? " on" : "")} onClick={() => setMenu(m => m === "sort" ? null : "sort")}><Icon name="sort" size={15} /> Ordenar</button>
            <button ref={groupBtn} className={"topbar-btn" + (groupBy ? " on" : "")} onClick={() => setMenu(m => m === "group" ? null : "group")}><Icon name="grid" size={15} /> Agrupar</button>
            {view === "table" && <button ref={colBtn} className={"topbar-btn" + (hiddenCols.length ? " on" : "")} onClick={() => setMenu(m => m === "cols" ? null : "cols")}><Icon name="sliders" size={15} /> Propiedades</button>}
            <button className="topbar-btn" onClick={() => setAuto(true)}><Icon name="zap" size={15} /> Automatizar</button>
            <button ref={newBtn} className="topbar-btn" style={{ background: "var(--accent)", color: "#fff", fontWeight: 600 }} onClick={() => setMenu(m => m === "new" ? null : "new")}><Icon name="plusSmall" size={16} /> Nuevo <Icon name="chevronDown" size={13} /></button>
          </div>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="filter-bar">
          {activeChips.map((c, i) => (
            <span key={i} className="fchip">{c.val}<span className="fchip-x" onClick={() => toggleFilter(c.kind, c.val)}><Icon name="x" size={13} /></span></span>
          ))}
          <span className="fchip-clear" onClick={() => setFilters({ status: [], area: [] })}>Limpiar todo</span>
        </div>
      )}

      {menu === "filter" && (
        <Popover anchor={filterBtn.current} onClose={() => setMenu(null)} width={230}>
          <div className="menu-label">Estado</div>
          {meta.statusOrder.map(s => (
            <div key={s} className="menu-check" onClick={() => toggleFilter("status", s)}>
              <span className={"mc-box" + (filters.status.includes(s) ? " on" : "")}>{filters.status.includes(s) && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
              <span className="mc-flex"><StatusTag label={s} /></span>
            </div>
          ))}
          <div className="menu-sep"></div>
          <div className="menu-label">Área</div>
          {ALL_AREAS.map(s => (
            <div key={s} className="menu-check" onClick={() => toggleFilter("area", s)}>
              <span className={"mc-box" + (filters.area.includes(s) ? " on" : "")}>{filters.area.includes(s) && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
              <span className="mc-flex"><Tag label={s} /></span>
            </div>
          ))}
        </Popover>
      )}

      {menu === "sort" && (
        <Popover anchor={sortBtn.current} onClose={() => setMenu(null)} width={220}>
          <div className="menu-label">Ordenar por</div>
          {[["title","Nombre"],["status","Estado"],["priority","Prioridad"],["due","Entrega"]].map(([f, label]) => (
            <div key={f} className="menu-item" onClick={() => setSort(s => s.field === f ? { field: f, dir: s.dir === "asc" ? "desc" : "asc" } : { field: f, dir: "asc" })}>
              <span className="mi-ico"><Icon name={sort.field === f ? (sort.dir === "asc" ? "arrowUp" : "arrowUp") : "dot"} size={15} style={sort.field === f && sort.dir === "desc" ? { transform: "rotate(180deg)" } : {}} /></span>
              <span style={{ flex: 1 }}>{label}</span>
              {sort.field === f && <span className="sort-dir" style={{ fontSize: 12 }}>{sort.dir === "asc" ? "A→Z" : "Z→A"}</span>}
            </div>
          ))}
          {sort.field && <><div className="menu-sep"></div><div className="menu-item danger" onClick={() => { setSort({ field: null, dir: "asc" }); setMenu(null); }}><span className="mi-ico"><Icon name="x" size={15} /></span> Quitar orden</div></>}
        </Popover>
      )}

      {menu === "group" && (
        <Popover anchor={groupBtn.current} onClose={() => setMenu(null)} width={220}>
          <div className="menu-label">Agrupar por</div>
          <div className="menu-item" onClick={() => { setGroupBy(null); setMenu(null); }}><span className="mi-ico"><Icon name="x" size={15} /></span><span style={{ flex: 1 }}>Sin agrupar</span>{!groupBy && <Icon name="check" size={15} />}</div>
          {GROUPABLE.map(p => (
            <div key={p.id} className="menu-item" onClick={() => { setGroupBy(p.id); setMenu(null); }}>
              <span className="mi-ico"><Icon name={p.icon} size={15} /></span><span style={{ flex: 1 }}>{p.name}</span>{groupBy === p.id && <Icon name="check" size={15} />}
            </div>
          ))}
        </Popover>
      )}

      {menu === "cols" && (
        <Popover anchor={colBtn.current} onClose={() => setMenu(null)} width={250}>
          <div className="menu-label">Propiedades</div>
          {orderedSchema.map(p => (
            <div key={p.id} className="menu-item" style={{ cursor: "default" }}>
              <span className="mi-ico"><Icon name={p.icon} size={15} /></span>
              <span style={{ flex: 1 }}>{p.name}</span>
              {p.type !== "title" && <>
                <span className="col-move" onClick={() => moveCol(p.id, -1)}><Icon name="arrowUp" size={13} /></span>
                <span className="col-move" onClick={() => moveCol(p.id, 1)}><Icon name="arrowUp" size={13} style={{ transform: "rotate(180deg)" }} /></span>
                <span className="col-eye" onClick={() => setHiddenCols(h => h.includes(p.id) ? h.filter(x => x !== p.id) : [...h, p.id])}><Icon name={hiddenCols.includes(p.id) ? "x" : "check"} size={14} /></span>
              </>}
            </div>
          ))}
        </Popover>
      )}

      {menu === "new" && (
        <Popover anchor={newBtn.current} onClose={() => setMenu(null)} width={236}>
          <div className="menu-label">Nuevo a partir de…</div>
          {ROW_TEMPLATES.map(t => (
            <div key={t.name} className="menu-item" onClick={() => { const id = Store.addRowWith(t.over, t.blocks); setMenu(null); onOpenRow(Store.get().rows.find(r => r.id === id)); }}>
              <span className="nav-emoji">{t.emoji}</span> {t.name}
            </div>
          ))}
        </Popover>
      )}

      {view === "table" && <TableView rows={display} schema={visibleSchema} groupBy={groupBy} groupProp={st.schema.find(p => p.id === groupBy)} onOpenRow={onOpenRow} onAdd={() => Store.addRow()} nav={onNavigate} />}
      {view === "kanban" && <KanbanView rows={display} groupBy={groupBy || "status"} groupProp={st.schema.find(p => p.id === (groupBy || "status"))} onOpenRow={onOpenRow} />}
      {view === "calendar" && <CalendarView rows={display} onOpenRow={onOpenRow} />}
      {view === "timeline" && <TimelineView rows={display} onOpenRow={onOpenRow} />}
      {view === "chart" && <ChartView rows={display} />}
      {auto && <AutomationsModal onClose={() => setAuto(false)} />}
    </div>
  );
}

/* ---- Popover anchored under a button ---- */
function Popover({ anchor, onClose, children, width = 220 }) {
  const r = anchor ? anchor.getBoundingClientRect() : { left: 100, bottom: 100, right: 300 };
  const left = Math.min(r.right - width, window.innerWidth - width - 12);
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 119 }} onClick={onClose}></div>
      <div className="popover menu" style={{ left: Math.max(12, left), top: r.bottom + 6, width, zIndex: 120, maxHeight: "70vh", overflowY: "auto" }}>
        {children}
      </div>
    </>
  );
}

/* ---------------- Table ---------------- */
function TableView({ rows, schema, groupBy, groupProp, onOpenRow, onAdd, nav }) {
  const cols = schema || useStore().schema;
  const renderRow = (r) => (
    <tr key={r.id}>
      {cols.map(prop => prop.type === "title"
        ? <td key={prop.id}><TitleCell row={r} onOpenRow={onOpenRow} /></td>
        : <td key={prop.id}><Cell row={r} prop={prop} nav={nav} /></td>)}
      <td></td>
    </tr>
  );
  let groups = null;
  if (groupBy) {
    const map = {};
    rows.forEach(r => { const k = r[groupBy] != null && r[groupBy] !== "" ? r[groupBy] : "—"; (map[k] = map[k] || []).push(r); });
    groups = Object.entries(map);
  }
  const isPerson = groupProp && groupProp.type === "person";
  return (
    <div className="db-body db-table-scroll">
      <table className="tbl">
        <thead>
          <tr>
            {cols.map(prop => (
              <th key={prop.id} style={prop.type === "title" ? { minWidth: 240 } : { minWidth: 148 }}>
                <PropHeader prop={prop} canDelete={prop.id !== "title"} />
              </th>
            ))}
            <th style={{ width: 46 }}><AddPropCell /></th>
          </tr>
        </thead>
        <tbody>
          {!groupBy && rows.map(renderRow)}
          {groupBy && groups.map(([k, rs]) => (
            <React.Fragment key={k}>
              <tr className="group-row"><td colSpan={cols.length + 1}><div className="group-head">{isPerson ? <Person id={k} /> : <Tag label={k === "—" ? "" : k} />}<span className="group-count">{rs.length}</span></div></td></tr>
              {rs.map(renderRow)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="db-addrow" onClick={onAdd}><Icon name="plus" size={15} /> Nueva fila</div>
    </div>
  );
}

/* ---------------- Kanban ---------------- */
function KanbanView({ rows, groupBy, groupProp, onOpenRow }) {
  const [dragId, setDragId] = useStateD(null);
  const [overCol, setOverCol] = useStateD(null);
  const gb = groupBy || "status";
  const isPerson = groupProp && groupProp.type === "person";
  const cols = isPerson ? window.MIKION_DATA.people.map(p => p.id)
    : (groupProp && groupProp.options ? groupProp.options : [...new Set(rows.map(r => r[gb]).filter(Boolean))]);

  const moveTo = (val) => {
    if (!dragId) return;
    Store.setRows(rs => rs.map(r => r.id === dragId ? { ...r, [gb]: val } : r));
    setDragId(null); setOverCol(null);
  };

  return (
    <div className="kanban">
      {cols.map(val => {
        const colRows = rows.filter(r => r[gb] === val);
        const c = !isPerson ? window.MIKION_DATA.TAGS[val] || window.tagColor(val) : null;
        return (
          <div className="kcol" key={val}>
            <div className="kcol-head">
              {isPerson ? <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13.5 }}><Avatar id={val} size={20} />{window.MIKION_DATA.peopleById[val].name}</span>
                : <span className="tag" style={{ color: c.t, background: c.bg }}><span className="dot" style={{ background: c.t }}></span>{val}</span>}
              <span className="kcol-count">{colRows.length}</span>
              <span className="kcol-add" style={{ cursor: "pointer" }} onClick={() => Store.addRowWith({ [gb]: val })}><Icon name="plusSmall" size={16} /></span>
            </div>
            <div
              className={"kcol-body" + (overCol === val ? " drop-active" : "")}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); if (overCol !== val) setOverCol(val); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(o => o === val ? null : o); }}
              onDrop={(e) => { e.preventDefault(); moveTo(val); }}
            >
              {colRows.map(r => (
                <div
                  key={r.id}
                  className={"kcard" + (dragId === r.id ? " dragging" : "")}
                  draggable
                  onDragStart={(e) => { setDragId(r.id); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  onClick={() => onOpenRow(r)}
                >
                  <div className="kcard-cover" style={{ background: r.cover }}></div>
                  <div className="kcard-title">{r.emoji} {r.title}</div>
                  <div className="kcard-tags"><Tag label={r.priority} /><Tag label={r.area} /></div>
                  <div className="kcard-foot">
                    <span><Icon name="calendar" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />{relDate(r.due)}</span>
                    <span className="spacer"></span>
                    <Avatar id={r.assignee} size={22} />
                  </div>
                </div>
              ))}
              <div className="db-addrow" style={{ padding: "8px 6px" }} onClick={() => Store.addRowWith({ [gb]: val })}><Icon name="plus" size={15} /> Añadir</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Calendar ---------------- */
function CalendarView({ rows, onOpenRow }) {
  const [month, setMonth] = useStateD(5); // June (0-indexed)
  const year = 2026;
  const events = window.MIKION_DATA.events;
  const rowEvents = rows.filter(r => r.due).map(r => ({ date: r.due, title: `${r.emoji} ${r.title}`, color: window.MIKION_DATA.TAGS[r.status].t, row: r }));
  const allEvents = [...events.map(e => ({ ...e })), ...rowEvents];

  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPrev = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: daysPrev - startDow + 1 + i, dim: true, m: month - 1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dim: false, m: month });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - startDow - daysInMonth + 1, dim: true, m: month + 1 });

  const evFor = (m, day) => {
    if (m !== month) return [];
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allEvents.filter(e => e.date === iso);
  };

  return (
    <div className="cal">
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0 14px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 560, textTransform: "capitalize", whiteSpace: "nowrap" }}>{MONTHS[month]} {year}</div>
        <button className="icon-btn" onClick={() => setMonth(m => Math.max(0, m - 1))}><Icon name="chevronRight" size={17} style={{ transform: "rotate(180deg)" }} /></button>
        <button className="icon-btn" onClick={() => setMonth(m => Math.min(11, m + 1))}><Icon name="chevronRight" size={17} /></button>
        <button className="topbar-btn" onClick={() => setMonth(5)} style={{ border: "1px solid var(--line)" }}>Hoy</button>
      </div>
      <div className="cal-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((c, i) => {
          const isToday = !c.dim && c.day === 13 && month === 5;
          const evs = evFor(c.m, c.day);
          return (
            <div key={i} className={"cal-cell" + (c.dim ? " dim" : "") + (isToday ? " today" : "")}>
              <span className="cal-daynum">{c.day}</span>
              {evs.slice(0, 3).map((e, j) => (
                <div key={j} className="cal-event" style={{ background: "color-mix(in srgb, " + e.color + " 14%, transparent)", color: e.color }}
                  onClick={() => e.row && onOpenRow(e.row)}>
                  <span className="ce-dot" style={{ background: e.color }}></span>{e.title}
                </div>
              ))}
              {evs.length > 3 && <div style={{ fontSize: 11.5, color: "var(--ink-faint)", paddingLeft: 4 }}>+{evs.length - 3} más</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { DatabaseView, CalendarView, CalendarAgendaView });

/* ---------------- Calendar — agenda / list view ---------------- */
function CalendarAgendaView({ rows, onOpenRow }) {
  const events = window.MIKION_DATA.events;
  const rowEvents = rows.filter(r => r.due).map(r => ({ date: r.due, title: `${r.emoji} ${r.title}`, color: window.MIKION_DATA.TAGS[r.status].t, row: r, kind: r.status }));
  const allEvents = [...events.map(e => ({ ...e })), ...rowEvents].sort((a, b) => a.date.localeCompare(b.date));

  // group by date
  const groups = [];
  const byDate = {};
  allEvents.forEach(e => {
    if (!byDate[e.date]) { byDate[e.date] = []; groups.push(e.date); }
    byDate[e.date].push(e);
  });

  const today = "2026-06-13";
  const dayLabel = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = DOW[(dt.getDay() + 6) % 7];
    return { dow, dnum: d, month: MONTHS_SHORT[m - 1], past: iso < today, isToday: iso === today };
  };

  if (!groups.length) {
    return <div className="cal"><div className="agenda-empty">No hay eventos programados.</div></div>;
  }

  return (
    <div className="cal">
      <div className="cal-agenda">
        {groups.map(date => {
          const L = dayLabel(date);
          return (
            <div key={date} className={"agenda-day" + (L.past ? " past" : "")}>
              <div className={"agenda-date" + (L.isToday ? " today" : "")}>
                <span className="ad-dow">{L.dow}</span>
                <span className="ad-num">{L.dnum}</span>
                <span className="ad-month">{L.month}{L.isToday ? " · Hoy" : ""}</span>
              </div>
              <div className="agenda-events">
                {byDate[date].map((e, j) => (
                  <div key={j} className={"agenda-event" + (e.row ? " clickable" : "")} onClick={() => e.row && onOpenRow(e.row)}>
                    <span className="ae-bar" style={{ background: e.color }}></span>
                    <span className="ae-title">{e.title}</span>
                    {e.kind && <span className="tag" style={{ background: "color-mix(in srgb, " + e.color + " 14%, transparent)", color: e.color }}>{e.kind}</span>}
                    {e.row && <Icon name="chevronRight" size={15} style={{ color: "var(--ink-faint)", marginLeft: "auto" }} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
