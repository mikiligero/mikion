/* ============================================================
   MIKION — Sidebar
   ============================================================ */
const { useState } = React;

function TreeNode({ node, depth, current, onNavigate, onNew, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const hasChildren = node.children && node.children.length > 0;
  const active = current === node.id;
  const icoName = node.kind === "database" ? "database" : node.kind === "calendar" ? "calendar" : null;

  return (
    <div>
      <div
        className={"nav-row" + (active ? " active" : "")}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onNavigate(node.id)}
      >
        <span
          className={"tree-toggle" + (hasChildren ? "" : " leaf") + (open ? " open" : "")}
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        >
          <Icon name="chevronRight" size={14} />
        </span>
        {icoName
          ? <span className="nav-ico"><Icon name={icoName} size={16} /></span>
          : <span className="nav-emoji">{node.emoji}</span>}
        <span className="nav-label">{node.title}</span>
        <span className="row-actions">
          <span className="row-action" title="Más" onClick={(e) => e.stopPropagation()}><Icon name="more" size={15} /></span>
          <span className="row-action" title="Nueva subpágina" onClick={(e) => { e.stopPropagation(); setOpen(true); onNew && onNew(node.id); }}><Icon name="plusSmall" size={15} /></span>
        </span>
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map(c => (
            <TreeNode key={c.id} node={c} depth={depth + 1} current={current} onNavigate={onNavigate} onNew={onNew} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({ ico, emoji, label, active, onClick, badge }) {
  return (
    <div className={"nav-row" + (active ? " active" : "")} onClick={onClick}>
      <span className="tree-toggle leaf"></span>
      {emoji ? <span className="nav-emoji">{emoji}</span> : <span className="nav-ico"><Icon name={ico} size={16} /></span>}
      <span className="nav-label">{label}</span>
      {badge != null && <span style={{ fontSize: 12, color: "var(--ink-faint)", fontWeight: 600 }}>{badge}</span>}
    </div>
  );
}

function Sidebar({ current, onNavigate, onOpenSearch, onCollapse, collapsed, onNewPage }) {
  const st = useStore();
  const { tree, privateTree, favorites, docs } = st;
  const [apps, setApps] = useState(false);

  const APP_ITEMS = [
    { id: "home", emoji: "📝", name: "Mikion", desc: "Notas y bases de datos" },
    { id: "app-calendar", emoji: "📅", name: "Mikion Calendar", desc: "Tu tiempo y reuniones" },
    { id: "app-mail", emoji: "✉️", name: "Mikion Mail", desc: "Correo con IA" },
  ];

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="workspace-head" onClick={() => setApps(a => !a)}>
        <span className="ws-logo">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V6l8 7 8-7v13" />
          </svg>
        </span>
        <span className="ws-name">Estudio Mikion</span>
        <span className="ws-chevron"><Icon name="chevronDown" size={15} /></span>
        <span className="icon-btn" title="Contraer barra" onClick={(e) => { e.stopPropagation(); onCollapse(); }} style={{ marginRight: -4 }}>
          <Icon name="chevronsLeft" size={17} />
        </span>
      </div>
      {apps && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setApps(false)}></div>
          <div className="popover menu" style={{ position: "absolute", left: 12, top: 50, width: 244, zIndex: 50 }}>
            <div className="menu-label">Apps de Mikion</div>
            {APP_ITEMS.map(a => (
              <div key={a.id} className="menu-item" onClick={() => { onNavigate(a.id); setApps(false); }}>
                <span className="nav-emoji">{a.emoji}</span>
                <div style={{ flex: 1 }}><div>{a.name}</div><div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{a.desc}</div></div>
                {(current === a.id || (a.id === "home" && !current.startsWith("app-"))) && <Icon name="check" size={15} />}
              </div>
            ))}
            <div className="menu-sep"></div>
            <div className="menu-item" onClick={() => { onNavigate("settings"); setApps(false); }}><span className="mi-ico"><Icon name="settings" size={16} /></span> Ajustes</div>
            <div className="menu-item" onClick={() => setApps(false)}><span className="mi-ico"><Icon name="users" size={16} /></span> Invitar miembros</div>
          </div>
        </>
      )}

      <div className="sidebar-scroll">
        <div style={{ padding: "2px 0 4px" }}>
          <div className="nav-row" onClick={onOpenSearch}>
            <span className="tree-toggle leaf"></span>
            <span className="nav-ico"><Icon name="search" size={16} /></span>
            <span className="nav-label">Buscar</span>
            <span className="kbd" style={{ fontSize: 10.5 }}>⌘K</span>
          </div>
          <NavItem ico="home" label="Inicio" active={current === "home"} onClick={() => onNavigate("home")} />
          <NavItem ico="inbox" label="Bandeja de entrada" active={current === "inbox"} onClick={() => onNavigate("inbox")} badge="3" />
        </div>

        {favorites.length > 0 && (
          <>
            <div className="nav-section-label">Favoritos</div>
            {favorites.filter(id => docs[id]).map(id => (
              <NavItem key={"fav-" + id} emoji={docs[id].emoji} label={docs[id].title} active={current === id} onClick={() => onNavigate(id)} />
            ))}
          </>
        )}

        <div className="nav-section-label">Espacio de equipo</div>
        {tree.map(n => (
          <TreeNode key={n.id} node={n} depth={0} current={current} onNavigate={onNavigate} onNew={onNewPage} defaultOpen={n.id === "d-okr"} />
        ))}

        <div className="nav-section-label">Privado</div>
        {privateTree.map(n => (
          <TreeNode key={n.id} node={n} depth={0} current={current} onNavigate={onNavigate} onNew={onNewPage} />
        ))}

        <div className="nav-row" style={{ marginTop: 8, color: "var(--ink-faint)" }} onClick={() => onNewPage && onNewPage(null)}>
          <span className="tree-toggle leaf"></span>
          <span className="nav-ico"><Icon name="plus" size={16} /></span>
          <span className="nav-label">Nueva página</span>
        </div>
      </div>

      <div className="sidebar-foot">
        <NavItem ico="settings" label="Ajustes" onClick={() => onNavigate("settings")} />
        <NavItem ico="trash" label="Papelera" onClick={() => {}} />
        <NavItem ico="help" label="Ayuda" onClick={() => {}} />
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
