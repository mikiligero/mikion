/* ============================================================
   MIKION — App shell + routing
   ============================================================ */
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

function rowToDoc(r) {
  const p = window.MIKION_DATA.peopleById[r.assignee] || { name: "Sin asignar" };
  return {
    emoji: r.emoji, title: r.title, cover: r.cover,
    blocks: [
      { type: "callout", emoji: "🗂️", text: `Área: ${r.area}  ·  Estado: ${r.status}  ·  Prioridad: ${r.priority}  ·  Responsable: ${p.name}  ·  Entrega: ${window.fmtDate(r.due)}` },
      { type: "h2", text: "Resumen" },
      { type: "text", text: "Describe aquí el objetivo del proyecto, su alcance y por qué importa ahora." },
      { type: "h2", text: "Tareas" },
      { type: "todo", text: "Definir el alcance y los entregables", checked: true },
      { type: "todo", text: "Asignar responsables por área", checked: true },
      { type: "todo", text: "Primera revisión con el equipo", checked: false },
      { type: "todo", text: "Entrega final", checked: false },
      { type: "h2", text: "Notas" },
      { type: "text", text: "Añade aquí los detalles, decisiones y enlaces relevantes." },
    ],
  };
}

const CRUMB_ROOTS = {
  home: ["Inicio"],
  inbox: ["Bandeja de entrada"],
  "db-proyectos": ["Espacio de equipo", "Proyectos"],
  "cal-equipo": ["Espacio de equipo", "Calendario del equipo"],
};

function App() {
  const st = useStore();
  const [view, setView] = useStateA("home");
  const [rowDoc, setRowDoc] = useStateA(null);
  const [collapsed, setCollapsed] = useStateA(window.innerWidth < 720);
  const [cmdk, setCmdk] = useStateA(false);
  const [settings, setSettings] = useStateA(null);
  const [moreMenu, setMoreMenu] = useStateA(false);
  const [versions, setVersions] = useStateA(false);
  const [gallery, setGallery] = useStateA(false);
  const [hintShown, setHintShown] = useStateA(false);

  const isMobile = () => window.innerWidth < 720;
  const histRef = useRefA([]);
  const backRef = useRefA(false);

  // apply persisted theme
  useEffectA(() => { document.documentElement.classList.toggle("dark", st.theme === "dark"); }, [st.theme]);

  // apply persisted text size
  useEffectA(() => { document.documentElement.style.setProperty("--text-scale", st.textScale || 1); }, [st.textScale]);

  useEffectA(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); setCmdk(c => !c); }
      else if ((e.metaKey || e.ctrlKey) && k === "n") { e.preventDefault(); const id = Store.createPage(null); navigate(id); }
      else if ((e.metaKey || e.ctrlKey) && e.key === "[") { e.preventDefault(); goBack(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffectA(() => {
    const t = setTimeout(() => setHintShown(true), 1200);
    const t2 = setTimeout(() => setHintShown(false), 6000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const navigate = (id) => {
    if (id && id.startsWith("row:")) return;
    if (id === "settings") { setSettings("account"); return; }
    if (!backRef.current && id !== view) histRef.current.push(rowDoc ? "row" : view);
    backRef.current = false;
    setRowDoc(null);
    setView(id);
    if (isMobile()) setCollapsed(true);
  };
  const goBack = () => { const h = histRef.current; if (!h.length) return; const prev = h.pop(); backRef.current = true; setRowDoc(null); setView(prev); };
  const openRow = (r) => { setRowDoc(r); setView("row"); if (isMobile()) setCollapsed(true); };
  const newPage = (parentId) => { const id = Store.createPage(parentId); navigate(id); };
  const createFromTemplate = (tpl) => { const id = Store.createPage(null, tpl); setGallery(false); navigate(id); };

  const isAppView = view === "app-calendar" || view === "app-mail";
  const docs = st.docs;
  const isDoc = !!docs[view];
  const isFav = isDoc && st.favorites.includes(view);
  let crumbs;
  if (view === "row" && rowDoc) crumbs = ["Espacio de equipo", "Proyectos", rowDoc.title];
  else if (CRUMB_ROOTS[view]) crumbs = CRUMB_ROOTS[view];
  else if (docs[view]) {
    if (view === "d-notas" || view === "d-prd") crumbs = ["Espacio de equipo", "OKRs · Q3 2026", docs[view].title];
    else if (["d-viaje","d-recetas","d-lecturas"].includes(view) || view.startsWith("doc-")) crumbs = ["Privado", docs[view].title];
    else crumbs = ["Espacio de equipo", docs[view].title];
  } else crumbs = ["Mikion"];

  let content;
  if (view === "home") content = <Home onNavigate={navigate} onOpenRow={openRow} />;
  else if (view === "inbox") content = <Inbox />;
  else if (view === "db-proyectos") content = <DatabaseView onOpenRow={openRow} onNavigate={navigate} />;
  else if (view === "cal-equipo") content = <TeamCalendar onOpenRow={openRow} />;
  else if (view === "row" && rowDoc) {
    const override = st.rowDocs[rowDoc.id];
    const rd = rowToDoc(rowDoc);
    if (override) Object.assign(rd, override);
    content = <Editor key={"row-" + rowDoc.id} docId={"row-" + rowDoc.id} doc={rd} onNavigate={navigate} onCreatePage={(pid) => Store.createPage(pid)} onOpenRow={openRow} crumbs={crumbs} />;
  }
  else if (docs[view]) content = <Editor key={view} docId={view} doc={docs[view]} onNavigate={navigate} onCreatePage={(pid) => Store.createPage(pid)} onOpenRow={openRow} crumbs={crumbs} />;
  else content = <Home onNavigate={navigate} onOpenRow={openRow} />;

  return (
    <div className="app">
      <div className={"scrim" + (!collapsed && isMobile() ? " show" : "")} onClick={() => setCollapsed(true)}></div>
      <Sidebar current={view} onNavigate={navigate} onOpenSearch={() => setCmdk(true)} collapsed={collapsed} onCollapse={() => setCollapsed(true)} onNewPage={newPage} />
      <div className="main">
        {isAppView ? (
          <>
            {collapsed && <button className="icon-btn" title="Abrir barra lateral" onClick={() => setCollapsed(false)} style={{ position: "absolute", top: 11, left: 12, zIndex: 8 }}><Icon name="panelLeftOpen" size={18} /></button>}
            {view === "app-calendar" ? <CalendarApp /> : <MailApp />}
          </>
        ) : (
        <>
        <div className="topbar">
          {collapsed && (
            <button className="icon-btn" title="Abrir barra lateral" onClick={() => setCollapsed(false)}><Icon name="panelLeftOpen" size={18} /></button>
          )}
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="crumb-sep">/</span>}
              <span className={"crumb" + (i < crumbs.length - 1 ? " clickable" : "")} onClick={() => { if (i === 0 && view !== "home") navigate("home"); }}>{c}</span>
            </React.Fragment>
          ))}
          <div className="topbar-spacer"></div>
          <button className="topbar-btn" onClick={() => setCmdk(true)}><Icon name="search" size={16} /> Buscar</button>
          {isDoc && (
            <button className={"icon-btn" + (isFav ? " fav-on" : "")} title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={() => Store.toggleFavorite(view)}>
              <Icon name="star" size={17} style={isFav ? { fill: "currentColor" } : {}} />
            </button>
          )}
          <button className="icon-btn" title={st.theme === "dark" ? "Modo claro" : "Modo oscuro"} onClick={() => Store.toggleTheme()}>
            <Icon name={st.theme === "dark" ? "smile" : "moon"} size={17} />
          </button>
          <button className="icon-btn" title="Notificaciones" onClick={() => navigate("inbox")}><Icon name="bell" size={17} /></button>
          <button className="topbar-btn" style={{ fontWeight: 600 }}><Icon name="users" size={15} /> Compartir</button>
          <button className="icon-btn" title="Más" onClick={() => setMoreMenu(m => !m)}><Icon name="more" size={18} /></button>
          {moreMenu && (<>
            <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setMoreMenu(false)}></div>
            <div className="popover menu" style={{ position: "absolute", right: 12, top: 46, width: 230, zIndex: 100 }}>
              <div className="menu-item" onClick={() => { setGallery(true); setMoreMenu(false); }}><span className="mi-ico"><Icon name="grid" size={16} /></span> Plantillas</div>
              {isDoc && <div className="menu-item" onClick={() => { setVersions(true); setMoreMenu(false); }}><span className="mi-ico"><Icon name="clock" size={16} /></span> Historial de versiones</div>}
              <div className="menu-item" onClick={() => setMoreMenu(false)}><span className="mi-ico"><Icon name="copy" size={16} /></span> Duplicar página</div>
              <div className="menu-item" onClick={() => setMoreMenu(false)}><span className="mi-ico"><Icon name="link" size={16} /></span> Copiar enlace</div>
              <div className="menu-sep"></div>
              <div className="menu-item danger" onClick={() => setMoreMenu(false)}><span className="mi-ico"><Icon name="trash" size={16} /></span> Mover a la papelera</div>
            </div>
          </>)}
        </div>
        <div className="content-scroll">{content}</div>
        </>
        )}
      </div>

      {settings && <Settings section={settings} setSection={setSettings} onClose={() => setSettings(null)} />}
      {versions && <VersionHistoryModal onClose={() => setVersions(false)} />}
      {gallery && <TemplatesGallery onClose={() => setGallery(false)} onPick={createFromTemplate} />}
      {cmdk && <CommandPalette onClose={() => setCmdk(false)} onNavigate={navigate} />}

      <div className={"fab-hint" + (hintShown && !cmdk ? " show" : "")}>
        Pulsa <span className="kbd">⌘</span><span className="kbd">K</span> para buscar, o escribe <span className="kbd">/</span> en cualquier línea
      </div>
    </div>
  );
}

/* ---- Inbox ---- */
function Inbox() {
  const items = [
    { who: "u2", emoji: "💬", text: "Lucía te mencionó en PRD · Editor de bloques", time: "Hace 20 min" },
    { who: "u3", emoji: "✅", text: "Marco completó «Suite de tests E2E»", time: "Hace 1 h" },
    { who: "u4", emoji: "📎", text: "Ana adjuntó un archivo en Investigación de usuarios", time: "Hace 3 h" },
  ];
  return (
    <div className="home-wrap">
      <div className="home-greet" style={{ fontSize: 28 }}>Bandeja de entrada</div>
      <div className="home-sub">Menciones, actualizaciones y recordatorios.</div>
      {items.map((it, i) => (
        <div key={i} className="task-line" style={{ padding: "14px 6px" }}>
          <Avatar id={it.who} size={30} />
          <span className="tl-title"><span style={{ marginRight: 6 }}>{it.emoji}</span>{it.text}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{it.time}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- Team calendar (full page) ---- */
function TeamCalendar({ onOpenRow }) {
  const st = useStore();
  const [calView, setCalView] = useStateA("month");
  return (
    <div className="db-wrap">
      <div className="db-head">
        <div className="db-title"><span>📅</span> Calendario del equipo</div>
        <div className="db-desc">Reuniones, entregas e hitos del trimestre.</div>
        <div className="view-tabs">
          <button className={"view-tab" + (calView === "month" ? " active" : "")} onClick={() => setCalView("month")}><span className="vt-ico"><Icon name="calDays" size={16} /></span>Mes</button>
          <button className={"view-tab" + (calView === "list" ? " active" : "")} onClick={() => setCalView("list")}><span className="vt-ico"><Icon name="list" size={16} /></span>Lista</button>
          <div className="db-toolbar">
            <button className="topbar-btn"><Icon name="filter" size={15} /> Filtrar</button>
            <button className="topbar-btn" style={{ background: "var(--accent)", color: "#fff", fontWeight: 600 }}><Icon name="plusSmall" size={16} /> Evento</button>
          </div>
        </div>
      </div>
      {calView === "month"
        ? <CalendarView rows={st.rows} onOpenRow={onOpenRow} />
        : <CalendarAgendaView rows={st.rows} onOpenRow={onOpenRow} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
