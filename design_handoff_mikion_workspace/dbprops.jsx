/* ============================================================
   MIKION — Database property editor (types, cells, headers)
   ============================================================ */
const { useState: useP, useRef: usePR } = React;

const PROP_TYPES = [
  { type: "text", name: "Texto", icon: "type", desc: "Texto libre" },
  { type: "number", name: "Número", icon: "sigma", desc: "Valor numérico" },
  { type: "select", name: "Selección", icon: "dot", desc: "Una opción de una lista" },
  { type: "multiselect", name: "Selección múltiple", icon: "list", desc: "Varias opciones" },
  { type: "status", name: "Estado", icon: "dot", desc: "Estado con colores" },
  { type: "person", name: "Persona", icon: "users", desc: "Asignar a alguien" },
  { type: "date", name: "Fecha", icon: "calendar", desc: "Día concreto" },
  { type: "checkbox", name: "Casilla", icon: "check", desc: "Verdadero / falso" },
  { type: "url", name: "URL", icon: "link", desc: "Enlace web" },
  { type: "formula", name: "Fórmula", icon: "sigma", desc: "Valor calculado" },
  { type: "relation", name: "Relación", icon: "arrowRight", desc: "Enlaza con páginas" },
  { type: "rollup", name: "Rollup", icon: "sync", desc: "Agrega desde una relación" },
];
const TYPE_BY = Object.fromEntries(PROP_TYPES.map(t => [t.type, t]));

const FORMULAS = [
  { key: "daysLeft", name: "Días hasta la entrega" },
  { key: "overdue", name: "¿Vencido?" },
  { key: "priorityScore", name: "Puntuación de prioridad" },
  { key: "done", name: "¿Completado?" },
];

function renderFormula(prop, row) {
  const f = prop.formula || "daysLeft";
  const today = new Date("2026-06-13T00:00:00");
  if (f === "daysLeft") { if (!row.due) return "—"; const d = Math.round((new Date(row.due + "T00:00:00") - today) / 86400000); const u = (n) => n === 1 ? " día" : " días"; return d > 0 ? d + u(d) : d === 0 ? "Hoy" : "hace " + (-d) + u(-d); }
  if (f === "overdue") { if (!row.due) return "—"; const over = new Date(row.due + "T00:00:00") < today && row.status !== "Hecho"; return <Tag label={over ? "Vencido" : "A tiempo"} />; }
  if (f === "priorityScore") { return ({ Alta: 3, Media: 2, Baja: 1 })[row.priority] || 0; }
  if (f === "done") { return <Tag label={row.status === "Hecho" ? "Completado" : "Pendiente"} />; }
  return "";
}
function renderRollup(prop, row) {
  if (!prop.relationProp) return <span style={{ color: "var(--ink-ghost)" }}>—</span>;
  const arr = row[prop.relationProp] || [];
  return <span className="rollup-count">{arr.length}</span>;
}

/* popover anchored to a DOM element */
function CellPop({ anchorRef, onClose, width = 248, children }) {
  const r = anchorRef.current ? anchorRef.current.getBoundingClientRect() : { left: 120, bottom: 120 };
  const left = Math.min(r.left, window.innerWidth - width - 12);
  const top = Math.min(r.bottom + 4, window.innerHeight - 280);
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 139 }} onClick={(e) => { e.stopPropagation(); onClose(); }}></div>
      <div className="popover menu" style={{ position: "fixed", left: Math.max(8, left), top, width, zIndex: 140, maxHeight: "62vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </>
  );
}

/* inline editable cell text */
function InlineText({ value, onCommit, className = "", ph = "Vacío", align = "left" }) {
  const ref = usePR(null);
  React.useEffect(() => { const el = ref.current; if (el && el.dataset.i !== "1") { el.textContent = value == null || value === "" ? "" : String(value); el.dataset.i = "1"; } }, []);
  return <div ref={ref} className={"pcell-edit ph " + className} data-ph={ph} style={{ textAlign: align }} contentEditable suppressContentEditableWarning
    onClick={(e) => e.stopPropagation()}
    onBlur={(e) => onCommit(e.currentTarget.textContent)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} />;
}

/* ---------------- Cell ---------------- */
function Cell({ row, prop, nav }) {
  const [open, setOpen] = useP(false);
  const ref = usePR(null);
  const val = row[prop.id];
  const set = (v) => Store.setCell(row.id, prop.id, v);
  const t = prop.type;

  if (t === "checkbox") return (
    <div className="cell"><span className={"todo-check" + (val ? " checked" : "")} style={{ margin: 0 }} onClick={() => set(!val)}>{val && <Icon name="checkSmall" size={13} stroke={2.6} />}</span></div>
  );
  if (t === "text") return <div className="cell"><InlineText value={val} onCommit={set} /></div>;
  if (t === "url") return <div className="cell">{val ? <a className="cell-url" href={val} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}><Icon name="link" size={12} /> {String(val).replace(/^https?:\/\//, "")}</a> : <InlineText value={val} ph="https://…" onCommit={set} />}</div>;
  if (t === "number") return <div className="cell"><InlineText value={val} ph="0" onCommit={(v) => set(v === "" ? "" : (Number(v) || 0))} /></div>;
  if (t === "formula") return <div className="cell formula-cell">{renderFormula(prop, row)}</div>;
  if (t === "rollup") return <div className="cell formula-cell">{renderRollup(prop, row)}</div>;

  // popover-edited types
  let display;
  if (t === "select" || t === "status") display = val ? <Tag label={val} /> : <span className="cell-empty">Vacío</span>;
  else if (t === "multiselect") display = (val && val.length) ? <span className="multi">{val.map(o => <Tag key={o} label={o} />)}</span> : <span className="cell-empty">Vacío</span>;
  else if (t === "person") display = val ? <Person id={val} /> : <span className="cell-empty">Sin asignar</span>;
  else if (t === "date") display = val ? <span style={{ color: "var(--ink-soft)" }}>{relDate(val)}</span> : <span className="cell-empty">Vacío</span>;
  else if (t === "relation") display = (val && val.length) ? <span className="multi">{val.map(id => <RelChip key={id} id={id} nav={nav} />)}</span> : <span className="cell-empty">Vacío</span>;
  else display = <span className="cell-empty">Vacío</span>;

  return (
    <div className="cell pcell" ref={ref} onClick={() => setOpen(true)}>
      {display}
      {open && <CellEditor type={t} prop={prop} val={val} set={set} onClose={() => setOpen(false)} anchorRef={ref} />}
    </div>
  );
}

function RelChip({ id, nav }) {
  const st = window.useStore();
  const d = st.docs[id];
  if (!d) return null;
  return <span className="rel-chip" onClick={(e) => { e.stopPropagation(); nav && nav(id); }}><span>{d.emoji}</span>{d.title}</span>;
}

/* ---------------- Cell editors ---------------- */
function CellEditor({ type, prop, val, set, onClose, anchorRef }) {
  const st = window.useStore();
  const [adding, setAdding] = useP("");

  if (type === "select" || type === "status") {
    const opts = prop.options || [];
    return (
      <CellPop anchorRef={anchorRef} onClose={onClose}>
        <div className="menu-label">{prop.name}</div>
        {val && <div className="menu-item" onClick={() => { set(""); onClose(); }}><span className="mi-ico"><Icon name="x" size={15} /></span> Vaciar</div>}
        {opts.map(o => (
          <div key={o} className="menu-item" onClick={() => { set(o); onClose(); }}>
            <Tag label={o} />{val === o && <span style={{ marginLeft: "auto" }}><Icon name="check" size={15} /></span>}
          </div>
        ))}
        <div className="menu-sep"></div>
        <div className="opt-add">
          <input className="opt-input" placeholder="Nueva opción…" value={adding} onChange={e => setAdding(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && adding.trim()) { Store.addSelectOption(prop.id, adding.trim()); set(adding.trim()); onClose(); } }} />
        </div>
      </CellPop>
    );
  }
  if (type === "multiselect") {
    const opts = prop.options || [];
    const arr = val || [];
    const toggle = (o) => set(arr.includes(o) ? arr.filter(x => x !== o) : [...arr, o]);
    return (
      <CellPop anchorRef={anchorRef} onClose={onClose}>
        <div className="menu-label">{prop.name}</div>
        {opts.map(o => (
          <div key={o} className="menu-check" onClick={() => toggle(o)}>
            <span className={"mc-box" + (arr.includes(o) ? " on" : "")}>{arr.includes(o) && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
            <span className="mc-flex"><Tag label={o} /></span>
          </div>
        ))}
        <div className="menu-sep"></div>
        <div className="opt-add">
          <input className="opt-input" placeholder="Nueva opción…" value={adding} onChange={e => setAdding(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && adding.trim()) { Store.addSelectOption(prop.id, adding.trim()); set([...arr, adding.trim()]); setAdding(""); } }} />
        </div>
      </CellPop>
    );
  }
  if (type === "person") {
    return (
      <CellPop anchorRef={anchorRef} onClose={onClose} width={220}>
        <div className="menu-label">Responsable</div>
        {val && <div className="menu-item" onClick={() => { set(null); onClose(); }}><span className="mi-ico"><Icon name="x" size={15} /></span> Quitar</div>}
        {window.MIKION_DATA.people.map(pp => (
          <div key={pp.id} className="menu-item" onClick={() => { set(pp.id); onClose(); }}>
            <Avatar id={pp.id} size={22} /> {pp.name}{val === pp.id && <span style={{ marginLeft: "auto" }}><Icon name="check" size={15} /></span>}
          </div>
        ))}
      </CellPop>
    );
  }
  if (type === "date") {
    return (
      <CellPop anchorRef={anchorRef} onClose={onClose} width={236}>
        <div className="menu-label">Fecha</div>
        <div style={{ padding: "4px 8px 8px" }}>
          <input type="date" className="opt-input" defaultValue={val || ""} onChange={e => { set(e.target.value); }} style={{ colorScheme: st.theme === "dark" ? "dark" : "light" }} />
        </div>
        <div className="menu-item" onClick={() => { set("2026-06-13"); onClose(); }}><span className="mi-ico"><Icon name="calendar" size={15} /></span> Hoy</div>
        {val && <div className="menu-item danger" onClick={() => { set(""); onClose(); }}><span className="mi-ico"><Icon name="x" size={15} /></span> Borrar fecha</div>}
      </CellPop>
    );
  }
  if (type === "relation") {
    const arr = val || [];
    const toggle = (id) => set(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
    return (
      <CellPop anchorRef={anchorRef} onClose={onClose} width={264}>
        <div className="menu-label">Enlazar páginas</div>
        {Object.entries(st.docs).map(([id, d]) => (
          <div key={id} className="menu-check" onClick={() => toggle(id)}>
            <span className={"mc-box" + (arr.includes(id) ? " on" : "")}>{arr.includes(id) && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
            <span className="mc-flex" style={{ display: "flex", alignItems: "center", gap: 7 }}><span>{d.emoji}</span>{d.title}</span>
          </div>
        ))}
      </CellPop>
    );
  }
  return null;
}

/* ---------------- Property header + menu ---------------- */
function PropHeader({ prop, canDelete = true }) {
  const [menu, setMenu] = useP(false);
  const [sub, setSub] = useP(null);
  const ref = usePR(null);
  const st = window.useStore();
  const typeInfo = TYPE_BY[prop.type] || { name: prop.type, icon: "type" };

  return (
    <div className="th-in prop-th" ref={ref} onClick={() => prop.type !== "title" && setMenu(m => !m)} style={{ cursor: prop.type === "title" ? "default" : "pointer" }}>
      <Icon name={prop.icon || typeInfo.icon} size={14} />
      <span className="prop-name">{prop.name}</span>
      {prop.type !== "title" && <Icon name="chevronDown" size={13} style={{ color: "var(--ink-ghost)" }} />}
      {menu && (
        <CellPop anchorRef={ref} onClose={() => { setMenu(false); setSub(null); }} width={244}>
          {!sub && (
            <>
              <div style={{ padding: "4px 8px 8px" }}>
                <input className="opt-input" defaultValue={prop.name} onClick={e => e.stopPropagation()}
                  onBlur={e => Store.updateProperty(prop.id, { name: e.target.value || prop.name })}
                  onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />
              </div>
              <div className="menu-item" onClick={() => setSub("type")}>
                <span className="mi-ico"><Icon name={typeInfo.icon} size={16} /></span>
                <span style={{ flex: 1 }}>Tipo</span>
                <span style={{ color: "var(--ink-faint)", fontSize: 12.5 }}>{typeInfo.name} ›</span>
              </div>
              {(prop.type === "select" || prop.type === "multiselect" || prop.type === "status") && (
                <div className="menu-item" onClick={() => setSub("options")}><span className="mi-ico"><Icon name="list" size={16} /></span> Editar opciones</div>
              )}
              {prop.type === "formula" && <div className="menu-item" onClick={() => setSub("formula")}><span className="mi-ico"><Icon name="sigma" size={16} /></span> Elegir fórmula</div>}
              {prop.type === "rollup" && <div className="menu-item" onClick={() => setSub("rollup")}><span className="mi-ico"><Icon name="sync" size={16} /></span> Configurar rollup</div>}
              {canDelete && <><div className="menu-sep"></div>
                <div className="menu-item danger" onClick={() => { Store.deleteProperty(prop.id); setMenu(false); }}><span className="mi-ico"><Icon name="trash" size={16} /></span> Eliminar propiedad</div></>}
            </>
          )}
          {sub === "type" && (
            <>
              <div className="menu-label" style={{ cursor: "pointer" }} onClick={() => setSub(null)}>‹ Tipo de propiedad</div>
              {PROP_TYPES.filter(t => t.type !== "title").map(t => (
                <div key={t.type} className="menu-item" onClick={() => { Store.updateProperty(prop.id, { type: t.type, icon: t.icon }); setSub(null); setMenu(false); }}>
                  <span className="mi-ico"><Icon name={t.icon} size={16} /></span>
                  <div style={{ flex: 1 }}><div>{t.name}</div><div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{t.desc}</div></div>
                  {prop.type === t.type && <Icon name="check" size={15} />}
                </div>
              ))}
            </>
          )}
          {sub === "options" && <OptionEditor prop={prop} onBack={() => setSub(null)} />}
          {sub === "formula" && (
            <>
              <div className="menu-label" style={{ cursor: "pointer" }} onClick={() => setSub(null)}>‹ Fórmula</div>
              {FORMULAS.map(f => (
                <div key={f.key} className="menu-item" onClick={() => { Store.updateProperty(prop.id, { formula: f.key }); setSub(null); setMenu(false); }}>
                  <span className="mi-ico"><Icon name="sigma" size={16} /></span><span style={{ flex: 1 }}>{f.name}</span>{prop.formula === f.key && <Icon name="check" size={15} />}
                </div>
              ))}
            </>
          )}
          {sub === "rollup" && (
            <>
              <div className="menu-label" style={{ cursor: "pointer" }} onClick={() => setSub(null)}>‹ Origen del rollup</div>
              {st.schema.filter(p => p.type === "relation").map(p => (
                <div key={p.id} className="menu-item" onClick={() => { Store.updateProperty(prop.id, { relationProp: p.id, agg: "count" }); setSub(null); setMenu(false); }}>
                  <span className="mi-ico"><Icon name="arrowRight" size={16} /></span><span style={{ flex: 1 }}>Contar «{p.name}»</span>{prop.relationProp === p.id && <Icon name="check" size={15} />}
                </div>
              ))}
              {st.schema.filter(p => p.type === "relation").length === 0 && <div style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--ink-faint)" }}>Crea primero una propiedad de tipo Relación.</div>}
            </>
          )}
        </CellPop>
      )}
    </div>
  );
}

function OptionEditor({ prop, onBack }) {
  const [adding, setAdding] = useP("");
  const opts = prop.options || [];
  return (
    <>
      <div className="menu-label" style={{ cursor: "pointer" }} onClick={onBack}>‹ Opciones</div>
      {opts.map(o => (
        <div key={o} className="menu-item" style={{ cursor: "default" }}>
          <Tag label={o} />
          <span style={{ marginLeft: "auto", cursor: "pointer", color: "var(--ink-faint)" }} onClick={() => Store.updateProperty(prop.id, { options: opts.filter(x => x !== o) })}><Icon name="x" size={14} /></span>
        </div>
      ))}
      <div className="opt-add">
        <input className="opt-input" placeholder="Nueva opción…" value={adding} onChange={e => setAdding(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && adding.trim()) { Store.addSelectOption(prop.id, adding.trim()); setAdding(""); } }} />
      </div>
    </>
  );
}

/* ---------------- Add property (+) ---------------- */
function AddPropCell() {
  const [menu, setMenu] = useP(false);
  const ref = usePR(null);
  const create = (t) => {
    const def = { name: t.name, type: t.type, icon: t.icon };
    if (t.type === "select" || t.type === "multiselect" || t.type === "status") def.options = [];
    if (t.type === "formula") def.formula = "daysLeft";
    if (t.type === "relation") def.target = "pages";
    if (t.type === "rollup") def.agg = "count";
    Store.addProperty(def);
    setMenu(false);
  };
  return (
    <div className="addprop" ref={ref} onClick={() => setMenu(m => !m)} title="Añadir propiedad">
      <Icon name="plus" size={15} />
      {menu && (
        <CellPop anchorRef={ref} onClose={() => setMenu(false)} width={250}>
          <div className="menu-label">Nueva propiedad</div>
          {PROP_TYPES.filter(t => t.type !== "title").map(t => (
            <div key={t.type} className="menu-item" onClick={() => create(t)}>
              <span className="mi-ico"><Icon name={t.icon} size={16} /></span>
              <div style={{ flex: 1 }}><div>{t.name}</div><div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{t.desc}</div></div>
            </div>
          ))}
        </CellPop>
      )}
    </div>
  );
}

function TitleCell({ row, onOpenRow }) {
  return (
    <div className="cell cell-title">
      <span className="ct-emoji">{row.emoji}</span>
      <InlineText value={row.title} className="title-edit" ph="Sin título" onCommit={(v) => Store.setCell(row.id, "title", v || "Sin título")} />
      <span className="row-open" onClick={(e) => { e.stopPropagation(); onOpenRow(row); }}><Icon name="arrowRight" size={13} /> Abrir</span>
    </div>
  );
}

Object.assign(window, { Cell, PropHeader, AddPropCell, TitleCell, PROP_TYPES, renderFormula });
