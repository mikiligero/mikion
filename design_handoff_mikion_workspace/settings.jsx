/* ============================================================
   MIKION — Settings (account, members, plans, API, offline…)
   ============================================================ */
const { useState: useSet } = React;

const SET_SECTIONS = [
  { group: "Cuenta", items: [
    { id: "account", name: "Mi cuenta", icon: "smile" },
    { id: "prefs", name: "Preferencias", icon: "settings" },
  ]},
  { group: "Espacio de trabajo", items: [
    { id: "members", name: "Miembros y roles", icon: "users" },
    { id: "teamspaces", name: "Espacios de equipo", icon: "grid" },
  ]},
  { group: "Avanzado", items: [
    { id: "api", name: "API y desarrolladores", icon: "code" },
  ]},
];

function Settings({ section, setSection, onClose }) {
  const st = useStore();
  return (
    <div className="set-backdrop" onClick={onClose}>
      <div className="set-modal" onClick={(e) => e.stopPropagation()}>
        <div className="set-rail">
          <div className="set-ws">
            <span className="ws-logo" style={{ width: 30, height: 30 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V6l8 7 8-7v13" /></svg>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 14 }}>Estudio Mikion</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Plan Free · 5 miembros</div>
            </div>
          </div>
          {SET_SECTIONS.map(g => (
            <div key={g.group} className="set-group">
              <div className="set-group-label">{g.group}</div>
              {g.items.map(it => (
                <div key={it.id} className={"set-navrow" + (section === it.id ? " active" : "")} onClick={() => setSection(it.id)}>
                  <Icon name={it.icon} size={16} /> {it.name}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="set-panel">
          <button className="set-close" onClick={onClose}><Icon name="x" size={18} /></button>
          {section === "account" && <AccountPanel st={st} />}
          {section === "prefs" && <PrefsPanel st={st} />}
          {section === "members" && <MembersPanel />}
          {section === "teamspaces" && <TeamspacesPanel />}
          {section === "api" && <ApiPanel />}
        </div>
      </div>
    </div>
  );
}

function PanelHead({ title, desc }) {
  return <div className="set-head"><h2>{title}</h2>{desc && <p>{desc}</p>}</div>;
}
function Toggle({ on, onChange }) {
  return <span className={"switch" + (on ? " on" : "")} onClick={() => onChange(!on)}><span className="knob"></span></span>;
}
function Row({ title, desc, children }) {
  return (
    <div className="set-row">
      <div style={{ flex: 1 }}><div className="sr-title">{title}</div>{desc && <div className="sr-desc">{desc}</div>}</div>
      {children}
    </div>
  );
}

/* ---- Account ---- */
function AccountPanel({ st }) {
  return (
    <div>
      <PanelHead title="Mi cuenta" />
      <div className="acct-card">
        <span className="avatar" style={{ width: 64, height: 64, fontSize: 26, background: "var(--accent)" }}>TÚ</span>
        <div>
          <button className="btn-soft" style={{ marginBottom: 6 }}>Cambiar foto</button>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>JPG o PNG. Máx 4 MB.</div>
        </div>
      </div>
      <Row title="Nombre preferido"><input className="set-input" defaultValue="Tú" /></Row>
      <Row title="Correo electrónico" desc="tu@estudiomikion.com"><button className="btn-soft">Cambiar correo</button></Row>
      <Row title="Verificación en dos pasos" desc="Añade una capa extra de seguridad"><Toggle on={false} onChange={() => {}} /></Row>
      <div className="set-sep"></div>
      <Row title="Cerrar todas las sesiones" desc="Cierra la sesión en todos los dispositivos"><button className="btn-soft danger">Cerrar sesiones</button></Row>
      <Row title="Eliminar cuenta" desc="Borra permanentemente tu cuenta y datos"><button className="btn-soft danger">Eliminar cuenta</button></Row>
    </div>
  );
}

/* ---- Preferences ---- */
function PrefsPanel({ st }) {
  const [font, setFont] = useSet("default");
  const [width, setWidth] = useSet(true);
  return (
    <div>
      <PanelHead title="Preferencias" />
      <Row title="Apariencia" desc="Tema claro u oscuro">
        <div className="seg">
          {[["light", "Claro"], ["dark", "Oscuro"]].map(([k, l]) => <button key={k} className={"seg-btn" + (st.theme === k ? " on" : "")} onClick={() => Store.setTheme(k)}>{l}</button>)}
        </div>
      </Row>
      <Row title="Fuente predeterminada" desc="Se aplica a las páginas nuevas">
        <div className="seg">
          {[["default", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(([k, l]) => <button key={k} className={"seg-btn" + (font === k ? " on" : "")} onClick={() => setFont(k)}>{l}</button>)}
        </div>
      </Row>
      <Row title="Ancho de página completo"><Toggle on={width} onChange={setWidth} /></Row>
      <Row title="Tamaño del texto" desc="Ajusta el tamaño del contenido de las páginas">
        <div className="seg">
          {[["0.9", "A", "Pequeño"], ["1", "A", "Normal"], ["1.15", "A", "Grande"], ["1.3", "A", "Enorme"]].map(([k, l, t], i) => (
            <button key={k} title={t} className={"seg-btn" + (String(st.textScale || 1) === k ? " on" : "")} onClick={() => Store.setTextScale(Number(k))} style={{ fontSize: 12 + i * 2 + "px", fontWeight: 600 }}>{l}</button>
          ))}
        </div>
      </Row>
      <Row title="Idioma"><select className="set-input" style={{ width: 160 }} defaultValue="es"><option value="es">Español</option><option value="en">English</option><option value="fr">Français</option></select></Row>
      <Row title="Abrir al iniciar"><select className="set-input" style={{ width: 160 }} defaultValue="home"><option value="home">Inicio</option><option value="last">Última página</option></select></Row>
    </div>
  );
}

/* ---- Members & roles ---- */
const ROLES = ["Propietario", "Administrador", "Miembro", "Invitado"];
function MembersPanel() {
  const people = window.MIKION_DATA.people.filter(p => p.id !== "u1");
  const me = window.MIKION_DATA.peopleById.u1;
  const [roles, setRoles] = useSet({ u1: "Propietario", u2: "Administrador", u3: "Miembro", u4: "Miembro", u5: "Invitado" });
  const all = [me, ...people];
  return (
    <div>
      <PanelHead title="Miembros y roles" desc="5 miembros · 1 invitado · Roles personalizados disponibles en Enterprise" />
      <div className="invite-row">
        <input className="set-input" placeholder="Correo electrónico para invitar…" style={{ flex: 1 }} />
        <button className="btn-primary">Invitar</button>
      </div>
      <div className="member-list">
        {all.map(p => (
          <div key={p.id} className="member-row">
            <Avatar id={p.id} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sr-title">{p.name}{p.id === "u1" && " (tú)"}</div>
              <div className="sr-desc">{p.name.toLowerCase().replace(/ /g, ".").replace(/[áéí]/g, "")}@estudiomikion.com</div>
            </div>
            <select className="set-input role-sel" value={roles[p.id]} onChange={e => setRoles(r => ({ ...r, [p.id]: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="upsell">
        <Icon name="star" size={17} /> <div style={{ flex: 1 }}><b>Roles personalizados</b> y SCIM/SSO disponibles en el plan Enterprise.</div>
        <button className="btn-soft">Ver Enterprise</button>
      </div>
    </div>
  );
}

/* ---- Teamspaces ---- */
function TeamspacesPanel() {
  const data = [
    { name: "Producto", emoji: "🚀", members: 5, vis: "Abierto", t: "var(--t-green)" },
    { name: "Diseño", emoji: "🎨", members: 3, vis: "Abierto", t: "var(--t-purple)" },
    { name: "Ingeniería", emoji: "🧪", members: 4, vis: "Cerrado", t: "var(--t-blue)" },
    { name: "Marketing", emoji: "📣", members: 2, vis: "Privado", t: "var(--t-teal)" },
  ];
  return (
    <div>
      <PanelHead title="Espacios de equipo" desc="Agrupa páginas y miembros con permisos propios" />
      <div style={{ textAlign: "right", marginBottom: 12 }}><button className="btn-primary"><Icon name="plus" size={15} /> Nuevo espacio</button></div>
      <div className="ts-list">
        {data.map(t => (
          <div key={t.name} className="ts-row">
            <span className="ts-ico" style={{ background: "color-mix(in srgb, " + t.t + " 16%, transparent)" }}>{t.emoji}</span>
            <div style={{ flex: 1 }}><div className="sr-title">{t.name}</div><div className="sr-desc">{t.members} miembros</div></div>
            <span className="vis-pill"><Icon name={t.vis === "Privado" ? "settings" : t.vis === "Cerrado" ? "users" : "grid"} size={12} /> {t.vis}</span>
            <button className="icon-btn"><Icon name="more" size={17} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Plans ---- */
function PlansPanel() {
  const [annual, setAnnual] = useSet(true);
  const plans = [
    { name: "Free", price: 0, blurb: "Para empezar tú solo", feats: ["Páginas y bloques ilimitados", "Bloques de IA limitados", "Hasta 10 invitados", "Sincronización en 2 dispositivos"], cur: true },
    { name: "Plus", price: annual ? 8 : 10, blurb: "Para equipos pequeños", feats: ["Todo lo de Free", "Invitados ilimitados", "Historial de 30 días", "Subidas de archivo sin límite"] },
    { name: "Business", price: annual ? 15 : 18, blurb: "Para empresas", feats: ["Todo lo de Plus", "SSO con SAML", "Espacios de equipo privados", "Historial de 90 días", "IA avanzada incluida"], pop: true },
    { name: "Enterprise", price: null, blurb: "Para organizaciones", feats: ["Todo lo de Business", "Roles personalizados", "SCIM y auditoría", "Gestión centralizada"] },
  ];
  return (
    <div>
      <PanelHead title="Planes y facturación" />
      <div className="bill-toggle">
        <span>Facturación</span>
        <div className="seg">
          <button className={"seg-btn" + (!annual ? " on" : "")} onClick={() => setAnnual(false)}>Mensual</button>
          <button className={"seg-btn" + (annual ? " on" : "")} onClick={() => setAnnual(true)}>Anual <span className="save-badge">-20%</span></button>
        </div>
      </div>
      <div className="plan-grid">
        {plans.map(p => (
          <div key={p.name} className={"plan-card" + (p.pop ? " pop" : "") + (p.cur ? " cur" : "")}>
            {p.pop && <span className="plan-badge">Recomendado</span>}
            <div className="plan-name">{p.name}</div>
            <div className="plan-price">{p.price === null ? "A medida" : p.price === 0 ? "Gratis" : <>{p.price}€<span>/usuario/mes</span></>}</div>
            <div className="plan-blurb">{p.blurb}</div>
            <button className={p.cur ? "btn-soft" : "btn-primary"} style={{ width: "100%", marginBottom: 14 }} disabled={p.cur}>{p.cur ? "Plan actual" : p.price === null ? "Contactar ventas" : "Mejorar"}</button>
            <div className="plan-feats">{p.feats.map(f => <div key={f} className="plan-feat"><Icon name="checkSmall" size={14} stroke={2.4} /> {f}</div>)}</div>
          </div>
        ))}
      </div>
      <div className="upsell" style={{ marginTop: 18 }}>
        <span className="ai-spark" style={{ width: 28, height: 28 }}><Icon name="sparkles" size={15} /></span>
        <div style={{ flex: 1 }}><b>Mikion AI</b> — complemento de {annual ? 8 : 10}€/usuario/mes sobre cualquier plan. Incluye respuestas gratuitas de prueba.</div>
        <button className="btn-soft">Añadir IA</button>
      </div>
    </div>
  );
}

/* ---- AI & agents ---- */
function AIPanel() {
  const [ai, setAi] = useSet(true);
  const [workers, setWorkers] = useSet(false);
  const agents = [
    { name: "Asistente de producto", emoji: "🧭", desc: "Resume reuniones y crea tareas", on: true },
    { name: "Clasificador de bandeja", emoji: "📥", desc: "Etiqueta y prioriza lo que llega", on: true },
    { name: "Redactor de notas", emoji: "✍️", desc: "Convierte ideas en documentos", on: false },
  ];
  return (
    <div>
      <PanelHead title="IA y agentes" desc="Escritura asistida, preguntas sobre tu workspace y agentes autónomos" />
      <Row title="Mikion AI" desc="Activa la IA en toda la app (Espacio o ⌘J)"><Toggle on={ai} onChange={setAi} /></Row>
      <Row title="Notas de reunión automáticas" desc="Transcribe y resume reuniones"><Toggle on={true} onChange={() => {}} /></Row>
      <Row title="Autocompletado de propiedades" desc="Rellena campos de bases de datos con IA"><Toggle on={true} onChange={() => {}} /></Row>
      <div className="set-sep"></div>
      <div className="sr-title" style={{ marginBottom: 10 }}>Agentes personalizados</div>
      <div className="agent-list">
        {agents.map(a => (
          <div key={a.name} className="agent-row">
            <span className="ts-ico">{a.emoji}</span>
            <div style={{ flex: 1 }}><div className="sr-title">{a.name}</div><div className="sr-desc">{a.desc}</div></div>
            <span className="pill-soft">Modo plan</span>
            <Toggle on={a.on} onChange={() => {}} />
          </div>
        ))}
        <button className="btn-soft" style={{ marginTop: 6 }}><Icon name="plus" size={15} /> Crear agente</button>
      </div>
      <div className="set-sep"></div>
      <Row title={<>Workers <span className="beta">Beta</span></>} desc="Ejecuta JS/TS controlado para cálculos exactos sobre tus datos"><Toggle on={workers} onChange={setWorkers} /></Row>
    </div>
  );
}

/* ---- Connections ---- */
function ConnectionsPanel() {
  const conns = [
    { n: "Slack", c: "#4a154b", on: true }, { n: "Google Drive", c: "#2f6bb0", on: true },
    { n: "Google Calendar", c: "#2f7d56", on: false }, { n: "Gmail", c: "#d44638", on: false },
    { n: "GitHub", c: "#24292e", on: true }, { n: "Jira", c: "#2f6bb0", on: false },
    { n: "Figma", c: "#a259ff", on: true }, { n: "Linear", c: "#5e6ad2", on: false },
    { n: "Zoom", c: "#2D8CFF", on: false }, { n: "Loom", c: "#625df5", on: false },
    { n: "Notion Calendar", c: "var(--accent)", on: true }, { n: "Trello", c: "#0079bf", on: false },
  ];
  return (
    <div>
      <PanelHead title="Conexiones" desc="Conecta herramientas para incrustar contenido y que la IA las use como fuente" />
      <div className="conn-grid">
        {conns.map(c => (
          <div key={c.n} className="conn-card">
            <span className="conn-logo" style={{ background: c.c }}>{c.n[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="sr-title" style={{ fontSize: 13.5 }}>{c.n}</div></div>
            <button className={c.on ? "btn-soft sm" : "btn-primary sm"}>{c.on ? "Conectado" : "Conectar"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- API ---- */
function ApiPanel() {
  const [reveal, setReveal] = useSet(false);
  const [copied, setCopied] = useSet(false);
  const key = "mk_live_8f2a91d4c7e30b6a5f1029e84b7c3d6f";
  const sample = `curl https://api.mikion.com/v1/pages \\
  -H "Authorization: Bearer mk_live_••••" \\
  -H "Mikion-Version: 2026-06-01" \\
  -d '{ "parent": "db_proyectos",
        "properties": { "Nombre": "Nuevo proyecto" } }'`;
  return (
    <div>
      <PanelHead title="API y desarrolladores" desc="Crea integraciones propias o conéctate con Zapier, Make o n8n" />
      <div className="sr-title" style={{ marginBottom: 8 }}>Claves de API</div>
      <div className="api-key">
        <Icon name="code" size={16} style={{ color: "var(--ink-faint)" }} />
        <code style={{ flex: 1 }}>{reveal ? key : "mk_live_" + "•".repeat(24)}</code>
        <button className="btn-soft sm" onClick={() => setReveal(r => !r)}>{reveal ? "Ocultar" : "Mostrar"}</button>
        <button className="btn-soft sm" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Icon name="copy" size={14} /> {copied ? "Copiado" : "Copiar"}</button>
      </div>
      <button className="btn-soft" style={{ marginTop: 10 }}><Icon name="sync" size={14} /> Regenerar clave</button>
      <div className="set-sep"></div>
      <div className="sr-title" style={{ marginBottom: 8 }}>Ejemplo (REST)</div>
      <pre className="api-sample">{sample}</pre>
      <div className="set-sep"></div>
      <Row title="Webhooks" desc="https://hooks.estudiomikion.com/mikion"><span className="pill-soft on">Activo</span></Row>
      <Row title="SDK de JavaScript" desc="npm i @mikion/sdk · construye agentes externos"><button className="btn-soft">Ver docs</button></Row>
      <Row title="Sincronización de bases de datos externas"><Toggle on={true} onChange={() => {}} /></Row>
    </div>
  );
}

/* ---- Offline ---- */
function OfflinePanel({ st }) {
  const ids = ["d-bienvenida", "d-okr", "d-prd", "d-notas", "d-viaje"];
  const [on, setOn] = useSet({ "d-okr": true, "d-notas": true });
  return (
    <div>
      <PanelHead title="Sin conexión" desc="Elige qué páginas estarán disponibles sin internet" />
      <Row title="Descarga automática" desc="Guarda las páginas que visitas para uso offline"><Toggle on={true} onChange={() => {}} /></Row>
      <div className="storage-bar"><div className="sb-fill" style={{ width: "34%" }}></div></div>
      <div className="sr-desc" style={{ marginBottom: 16 }}>34 MB de 1 GB usados en este dispositivo</div>
      <div className="sr-title" style={{ marginBottom: 8 }}>Páginas disponibles sin conexión</div>
      <div className="offline-list">
        {ids.filter(id => st.docs[id]).map(id => (
          <div key={id} className="offline-row">
            <span className="nav-emoji" style={{ fontSize: 17 }}>{st.docs[id].emoji}</span>
            <div style={{ flex: 1 }}><div className="sr-title">{st.docs[id].title}</div><div className="sr-desc">{on[id] ? "Sincronizado hace 2 min" : "No descargada"}</div></div>
            {on[id] && <Icon name="checkSmall" size={16} style={{ color: "var(--t-green)" }} />}
            <Toggle on={!!on[id]} onChange={(v) => setOn(o => ({ ...o, [id]: v }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

window.Settings = Settings;
