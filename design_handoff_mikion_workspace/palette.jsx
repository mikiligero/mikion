/* ============================================================
   MIKION — Command palette (Cmd+K)
   ============================================================ */
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

function CommandPalette({ onClose, onNavigate }) {
  const st = useStore();
  const docs = st.docs;
  const projects = window.MIKION_DATA.projects;
  const isDark = st.theme === "dark";
  const [q, setQ] = useStateP("");
  const [idx, setIdx] = useStateP(0);
  const inputRef = useRefP(null);

  useEffectP(() => { inputRef.current && inputRef.current.focus(); }, []);

  const pages = [
    ...Object.entries(docs).map(([id, d]) => ({ id, emoji: d.emoji, title: d.title, sub: "Página" })),
    { id: "db-proyectos", emoji: "🗂️", title: "Proyectos", sub: "Base de datos" },
    { id: "cal-equipo", emoji: "📅", title: "Calendario del equipo", sub: "Calendario" },
  ];
  const projectRows = st.rows.map(r => ({ id: "db-proyectos", emoji: r.emoji, title: r.title, sub: "Proyecto · " + r.status }));

  const actions = [
    { id: "act-new", icon: "pen", title: "Nueva página", sub: "Crear", kbd: "N" },
    { id: "home", icon: "home", title: "Ir a Inicio", sub: "Saltar" },
    { id: "db-proyectos", icon: "database", title: "Ir a Proyectos", sub: "Saltar" },
    { id: "cal-equipo", icon: "calendar", title: "Ir al Calendario", sub: "Saltar" },
    { id: "app-calendar", icon: "calendar", title: "Abrir Mikion Calendar", sub: "App" },
    { id: "app-mail", icon: "inbox", title: "Abrir Mikion Mail", sub: "App" },
    { id: "settings", icon: "settings", title: "Abrir Ajustes", sub: "App" },
    { id: "act-theme", icon: "moon", title: isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro", sub: "Apariencia" },
  ];

  const ql = q.toLowerCase().trim();
  const match = (s) => s.toLowerCase().includes(ql);
  const fPages = ql ? pages.filter(p => match(p.title)) : pages.slice(0, 5);
  const fProjects = ql ? projectRows.filter(p => match(p.title)) : [];
  const fActions = ql ? actions.filter(a => match(a.title)) : actions.slice(0, 4);

  const flat = [
    ...fActions.map(a => ({ kind: "action", ...a })),
    ...fPages.map(p => ({ kind: "page", ...p })),
    ...fProjects.map(p => ({ kind: "project", ...p })),
  ];

  const go = (item) => {
    if (!item) return;
    if (item.id === "act-theme") { Store.toggleTheme(); onClose(); return; }
    if (item.id === "act-new") { onNavigate(Store.createPage(null)); onClose(); return; }
    onNavigate(item.id);
    onClose();
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(flat[idx]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  let counter = -1;
  const renderItem = (item) => {
    counter += 1;
    const myIdx = counter;
    return (
      <div key={item.kind + item.id + myIdx} className={"cmdk-item" + (myIdx === idx ? " active" : "")}
        onMouseEnter={() => setIdx(myIdx)} onClick={() => go(item)}>
        {item.kind === "action"
          ? <span className="ci-ico"><Icon name={item.icon} size={17} /></span>
          : <span className="ci-emoji">{item.emoji}</span>}
        <span className="ci-title">{item.title}</span>
        <span className="ci-sub">{item.sub}</span>
        {item.kbd && <span className="kbd">{item.kbd}</span>}
      </div>
    );
  };

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="cmdk-input-row">
          <Icon name="search" size={20} style={{ color: "var(--ink-faint)" }} />
          <input ref={inputRef} className="cmdk-input" placeholder="Buscar páginas o ejecutar un comando…"
            value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-list">
          {flat.length === 0 && <div style={{ padding: 28, textAlign: "center", color: "var(--ink-faint)" }}>Sin resultados para «{q}»</div>}
          {fActions.length > 0 && <div className="cmdk-cat">Acciones</div>}
          {fActions.map(a => renderItem({ kind: "action", ...a }))}
          {fPages.length > 0 && <div className="cmdk-cat">Páginas</div>}
          {fPages.map(p => renderItem({ kind: "page", ...p }))}
          {fProjects.length > 0 && <div className="cmdk-cat">Proyectos</div>}
          {fProjects.map(p => renderItem({ kind: "project", ...p }))}
        </div>
        <div className="cmdk-foot">
          <span className="ff"><span className="kbd">↑</span><span className="kbd">↓</span> navegar</span>
          <span className="ff"><span className="kbd">↵</span> abrir</span>
          <span className="ff"><span className="kbd">esc</span> cerrar</span>
        </div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
