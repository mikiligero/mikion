/* ============================================================
   MIKION — Advanced block renderers
   ============================================================ */
const { useState: useS, useRef: useR, useEffect: useE } = React;
const MD = window.MIKION_DATA;

/* Reusable commit-on-blur editable (initialised once) */
function Editable({ value, onCommit, className = "", ph = "", tag = "div", style, oneLine = false }) {
  const ref = useR(null);
  useE(() => { const el = ref.current; if (el && el.dataset.i !== "1") { el.textContent = value || ""; el.dataset.i = "1"; } }, []);
  return React.createElement(tag, {
    ref, className: className + " ph", "data-ph": ph, style,
    contentEditable: true, suppressContentEditableWarning: true,
    onBlur: (e) => onCommit(e.currentTarget.textContent),
    onKeyDown: oneLine ? (e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } } : undefined,
  });
}

const setProps = (b, api, patch) => api.updateBlock(b.id, { props: { ...(b.props || {}), ...patch } });

/* ---------------- Toggle ---------------- */
function ToggleBlock({ b, api }) {
  const p = b.props || {};
  const open = !!p.open;
  return (
    <div className="tog">
      <div className="tog-head">
        <span className={"tog-arrow" + (open ? " open" : "")} contentEditable={false} onClick={() => setProps(b, api, { open: !open })}>
          <Icon name="chevronRight" size={15} />
        </span>
        <Editable className="tog-title" value={p.title} ph="Título desplegable" onCommit={(v) => setProps(b, api, { title: v })} />
      </div>
      {open && <Editable className="tog-body" value={p.body} ph="Contenido oculto…" onCommit={(v) => setProps(b, api, { body: v })} />}
    </div>
  );
}

/* ---------------- Table of contents ---------------- */
function TocBlock({ b, api }) {
  const heads = api.allBlocks.filter(x => ["h1", "h2", "h3"].includes(x.type) && (x.text || "").trim());
  return (
    <div className="toc" contentEditable={false}>
      <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-faint)", padding: "0 10px 4px" }}>Tabla de contenidos</div>
      {heads.length === 0 && <div className="toc-empty">Añade títulos (H1–H3) y aparecerán aquí.</div>}
      {heads.map(h => (
        <a key={h.id} className={"toc-item lvl" + h.type[1]} onClick={() => api.scrollToBlock(h.id)}>{h.text}</a>
      ))}
    </div>
  );
}

/* ---------------- Breadcrumb ---------------- */
function BreadcrumbBlock({ api }) {
  return (
    <div className="bcrumb" contentEditable={false}>
      {api.crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="bc-sep">/</span>}
          <span className="bc" onClick={() => i === 0 && api.navigate("home")}>{c}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------------- Page link ---------------- */
function PageLinkBlock({ b, api }) {
  const p = b.props || {};
  const [pick, setPick] = useS(false);
  const st = window.useStore();
  if (!p.targetId) {
    return (
      <div className="pagelink" contentEditable={false}>
        <span className="media-empty" style={{ display: "inline-flex" }} onClick={() => setPick(v => !v)}>
          <span className="me-ico"><Icon name="link" size={17} /></span> Enlazar una página…
        </span>
        {pick && (
          <div className="popover menu" style={{ position: "absolute", zIndex: 60, marginTop: 4, maxHeight: 280, overflowY: "auto" }}>
            <div className="menu-label">Enlazar a</div>
            {Object.entries(st.docs).map(([id, d]) => (
              <div key={id} className="menu-item" onClick={() => { setProps(b, api, { targetId: id, title: d.title, emoji: d.emoji }); setPick(false); }}>
                <span className="nav-emoji">{d.emoji}</span> {d.title}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  const d = st.docs[p.targetId];
  return (
    <div className="pagelink" contentEditable={false}>
      <span className="pagelink-in" onClick={() => api.navigate(p.targetId)}>
        <span className="pl-emoji">{(d && d.emoji) || p.emoji}</span>
        <span className="pl-title">{(d && d.title) || p.title}</span>
      </span>
    </div>
  );
}

/* ---------------- Media helpers ---------------- */
function ytId(url) { const m = (url || "").match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); return m ? m[1] : null; }
function UrlInput({ placeholder, onSet }) {
  const [v, setV] = useS("");
  return (
    <div className="media-input-row" contentEditable={false}>
      <input className="media-input" placeholder={placeholder} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && v.trim()) onSet(v.trim()); }} />
      <button className="media-go" onClick={() => v.trim() && onSet(v.trim())}>Insertar</button>
    </div>
  );
}

function VideoBlock({ b, api }) {
  const p = b.props || {};
  if (!p.url) return <div className="media"><UrlInput placeholder="Pega un enlace de YouTube…" onSet={u => setProps(b, api, { url: u })} /></div>;
  const id = ytId(p.url);
  return (
    <div className="media" contentEditable={false}>
      {id
        ? <div className="embed-frame"><iframe src={"https://www.youtube.com/embed/" + id} style={{ aspectRatio: "16/9" }} allowFullScreen></iframe></div>
        : <div className="file-chip"><span className="fc-ico" style={{ background: "var(--t-rose)" }}><Icon name="image" size={18} /></span><div><div className="fc-name">Vídeo</div><div className="fc-meta">{p.url}</div></div></div>}
    </div>
  );
}

const EMBED_KINDS = {
  youtube: { name: "YouTube", color: "#e23a3a" }, spotify: { name: "Spotify", color: "#1db954" },
  maps: { name: "Google Maps", color: "#2f7d56" }, figma: { name: "Figma", color: "#a259ff" },
  github: { name: "GitHub", color: "#2c2824" }, loom: { name: "Loom", color: "#625df5" },
  miro: { name: "Miro", color: "#ffd02f" }, drive: { name: "Google Drive", color: "#2f6bb0" },
  generic: { name: "Insertar", color: "var(--ink-soft)" },
};
function detectKind(url) {
  if (/youtu/.test(url)) return "youtube"; if (/spotify/.test(url)) return "spotify";
  if (/maps|google\.[a-z]+\/maps/.test(url)) return "maps"; if (/figma/.test(url)) return "figma";
  if (/github/.test(url)) return "github"; if (/loom/.test(url)) return "loom"; if (/miro/.test(url)) return "miro";
  if (/drive\.google/.test(url)) return "drive"; return "generic";
}
function EmbedBlock({ b, api }) {
  const p = b.props || {};
  if (!p.url) return <div className="media"><UrlInput placeholder="Pega un enlace para incrustar (YouTube, Spotify, Figma, Maps…)" onSet={u => setProps(b, api, { url: u, kind: detectKind(u) })} /></div>;
  const kind = p.kind || detectKind(p.url);
  if (kind === "youtube") { const id = ytId(p.url); if (id) return <div className="media" contentEditable={false}><div className="embed-frame"><iframe src={"https://www.youtube.com/embed/" + id} style={{ aspectRatio: "16/9" }} allowFullScreen></iframe></div></div>; }
  if (kind === "spotify") { const m = p.url.match(/(track|playlist|album|episode|show)\/([\w]+)/); if (m) return <div className="media" contentEditable={false}><div className="embed-frame" style={{ background: "transparent", border: "none" }}><iframe src={`https://open.spotify.com/embed/${m[1]}/${m[2]}`} style={{ height: 152, borderRadius: 12 }} allow="encrypted-media"></iframe></div></div>; }
  if (kind === "maps") return <div className="media" contentEditable={false}><div className="embed-frame"><iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(p.url.replace(/.*maps\/?/, ""))}&output=embed`} style={{ height: 300 }}></iframe></div></div>;
  const k = EMBED_KINDS[kind];
  return (
    <div className="media" contentEditable={false}>
      <a className="bookmark" href={p.url} target="_blank" rel="noopener" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="bk-body">
          <div className="bk-title">{k.name}</div>
          <div className="bk-desc">Contenido incrustado de {k.name}.</div>
          <div className="bk-url"><Icon name="link" size={12} /> {p.url}</div>
        </div>
        <div className="bk-thumb" style={{ background: k.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 22 }}>{k.name[0]}</div>
      </a>
    </div>
  );
}

function FileBlock({ b, api, kind }) {
  const p = b.props || {};
  const name = p.name || (kind === "pdf" ? "Documento.pdf" : "Archivo adjunto.zip");
  const color = kind === "pdf" ? "#c0392b" : "var(--t-blue)";
  return (
    <div className="media">
      <div className="file-chip" contentEditable={false}>
        <span className="fc-ico" style={{ background: color }}><Icon name={kind === "pdf" ? "fileText" : "fileText"} size={18} /></span>
        <div style={{ flex: 1 }}><div className="fc-name">{name}</div><div className="fc-meta">{kind === "pdf" ? "PDF · 248 KB" : "Archivo · 1.2 MB"} · Haz clic para descargar</div></div>
        <Icon name="arrowRight" size={16} style={{ color: "var(--ink-faint)" }} />
      </div>
    </div>
  );
}

function AudioBlock({ b }) {
  const [playing, setPlaying] = useS(false);
  return (
    <div className="media">
      <div className="audio-bar" contentEditable={false}>
        <span className="ab-play" onClick={() => setPlaying(p => !p)}><Icon name={playing ? "minus" : "arrowRight"} size={16} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 550, marginBottom: 6 }}>{(b.props && b.props.name) || "Grabación de voz.mp3"}</div>
          <div className="ab-track"></div>
        </div>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>1:24</span>
      </div>
    </div>
  );
}

function BookmarkBlock({ b, api }) {
  const p = b.props || {};
  if (!p.url) return <div className="media"><UrlInput placeholder="Pega un enlace para crear un marcador…" onSet={u => setProps(b, api, { url: u, title: u.replace(/^https?:\/\//, "").split("/")[0], desc: "Vista previa del enlace guardado." })} /></div>;
  return (
    <div className="media" contentEditable={false}>
      <a className="bookmark" href={p.url} target="_blank" rel="noopener" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="bk-body">
          <div className="bk-title">{p.title}</div>
          <div className="bk-desc">{p.desc}</div>
          <div className="bk-url"><Icon name="link" size={12} /> {p.url}</div>
        </div>
        <div className="bk-thumb" style={{ background: MD.COVERS.slate }}></div>
      </a>
    </div>
  );
}

/* ---------------- Equation ---------------- */
function prettyMath(s) {
  if (!s) return "";
  return s
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
    .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
    .replace(/\\sum/g, "∑").replace(/\\int/g, "∫").replace(/\\infty/g, "∞")
    .replace(/\\alpha/g, "α").replace(/\\beta/g, "β").replace(/\\theta/g, "θ")
    .replace(/\\leq/g, "≤").replace(/\\geq/g, "≥").replace(/\\neq/g, "≠")
    .replace(/\\approx/g, "≈").replace(/\\pm/g, "±").replace(/\*/g, "·");
}
function EquationBlock({ b, api }) {
  const p = b.props || {};
  const [editing, setEditing] = useS(!p.latex);
  if (editing) return <div className="media"><UrlInput placeholder="Escribe LaTeX:  E = mc^2  ·  \frac{a}{b}" onSet={v => { setProps(b, api, { latex: v }); setEditing(false); }} /></div>;
  return <div className="equation" contentEditable={false} onClick={() => setEditing(true)} title="Clic para editar" dangerouslySetInnerHTML={{ __html: prettyMath(p.latex).replace(/\^(\w+|\([^)]*\))/g, "<sup>$1</sup>").replace(/_(\w+|\([^)]*\))/g, "<sub>$1</sub>") }}></div>;
}

/* ---------------- Inline chips ---------------- */
function ChipBlock({ b, api }) {
  const p = b.props || {};
  const today = "13 jun 2026";
  if (b.type === "mention") {
    const [pick, setPick] = useS(false);
    const person = p.personId ? MD.peopleById[p.personId] : null;
    return (
      <div className="chip-block" contentEditable={false}>
        <span className="ichip mention" style={{ cursor: "pointer" }} onClick={() => setPick(v => !v)}>
          <Icon name="users" size={13} className="ic-ico" /> {person ? "@" + person.name : "@mencionar"}
        </span>
        {pick && (
          <div className="popover menu" style={{ position: "absolute", zIndex: 60, marginTop: 4 }}>
            {MD.people.map(pp => <div key={pp.id} className="menu-item" onClick={() => { setProps(b, api, { personId: pp.id }); setPick(false); }}><Avatar id={pp.id} size={20} /> {pp.name}</div>)}
          </div>
        )}
      </div>
    );
  }
  if (b.type === "status") {
    const opts = ["Por hacer", "En curso", "Hecho"]; const cur = p.value || "Por hacer";
    const [pick, setPick] = useS(false);
    return (
      <div className="chip-block" contentEditable={false}>
        <span style={{ cursor: "pointer" }} onClick={() => setPick(v => !v)}><StatusTag label={cur} /></span>
        {pick && <div className="popover menu" style={{ position: "absolute", zIndex: 60, marginTop: 4 }}>{opts.map(o => <div key={o} className="menu-item" onClick={() => { setProps(b, api, { value: o }); setPick(false); }}><StatusTag label={o} /></div>)}</div>}
      </div>
    );
  }
  if (b.type === "people") return <div className="chip-block" contentEditable={false}><span className="person"><Avatar id="u1" size={20} /> Tú</span></div>;
  if (b.type === "createdtime") return <div className="chip-block" contentEditable={false}><span className="ichip date"><Icon name="clock" size={13} className="ic-ico" /> Creado: {today}</span></div>;
  if (b.type === "lastedited") return <div className="chip-block" contentEditable={false}><span className="ichip date"><Icon name="clock" size={13} className="ic-ico" /> Última edición: {today}</span></div>;
  // date / reminder
  const isReminder = b.type === "reminder";
  return (
    <div className="chip-block" contentEditable={false}>
      <span className="ichip date">{isReminder ? <Icon name="bell" size={13} className="ic-ico" /> : <Icon name="calendar" size={13} className="ic-ico" />} {p.date || today}{isReminder ? " · Recordatorio" : ""}</span>
    </div>
  );
}

/* ---------------- Simple table ---------------- */
function SimpleTable({ b, api }) {
  const p = b.props || {};
  const headers = p.headers || ["Columna 1", "Columna 2", "Columna 3"];
  const rows = p.rows || [["", "", ""], ["", "", ""]];
  const setCell = (ri, ci, val) => { const nr = rows.map(r => [...r]); nr[ri][ci] = val; setProps(b, api, { rows: nr }); };
  const setHeader = (ci, val) => { const nh = [...headers]; nh[ci] = val; setProps(b, api, { headers: nh }); };
  const addRow = () => setProps(b, api, { rows: [...rows, headers.map(() => "")] });
  const addCol = () => setProps(b, api, { headers: [...headers, "Columna " + (headers.length + 1)], rows: rows.map(r => [...r, ""]) });
  return (
    <div className="simple-table">
      <table className="st-tbl">
        <thead><tr>{headers.map((h, ci) => <th key={ci}><Editable className="st-cell" value={h} ph="Encabezado" oneLine onCommit={v => setHeader(ci, v)} /></th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}><Editable className="st-cell" value={c} ph="" onCommit={v => setCell(ri, ci, v)} /></td>)}</tr>)}</tbody>
      </table>
      <div className="st-tools" contentEditable={false}>
        <span className="st-tool" onClick={addRow}><Icon name="plus" size={14} /> Fila</span>
        <span className="st-tool" onClick={addCol}><Icon name="plus" size={14} /> Columna</span>
      </div>
    </div>
  );
}

/* ---------------- Inline database ---------------- */
function InlineDB({ b, api }) {
  const p = b.props || {};
  const view = p.view || "board";
  const st = window.useStore();
  const rows = st.rows;
  const setView = (v) => setProps(b, api, { view: v });
  const VIEWS = [["table", "Tabla", "table"], ["board", "Tablero", "kanban"], ["gallery", "Galería", "image"]];
  return (
    <div className="inlinedb" contentEditable={false}>
      <div className="idb-head">
        <span className="idb-name"><span>🗂️</span> Proyectos</span>
        <span className="idb-views">{VIEWS.map(([k, label, ico]) => <span key={k} className={"idb-vtab" + (view === k ? " on" : "")} onClick={() => setView(k)}><Icon name={ico} size={13} />{label}</span>)}</span>
        <span className="idb-count">{rows.length} elementos</span>
      </div>
      {view === "table" && <div>{rows.slice(0, 6).map(r => <div key={r.id} className="idb-trow" onClick={() => api.openRow(r)}><span>{r.emoji}</span><span className="idb-tt">{r.title}</span><StatusTag label={r.status} /><Avatar id={r.assignee} size={20} /></div>)}</div>}
      {view === "board" && (
        <div className="idb-board">
          {MD.projects.statusOrder.slice(0, 4).map(s => { const c = MD.TAGS[s]; const cr = rows.filter(r => r.status === s); return (
            <div className="idb-col" key={s}>
              <div className="idb-col-h"><span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: c.t }}></span>{s} · {cr.length}</div>
              {cr.map(r => <div key={r.id} className="idb-card" onClick={() => api.openRow(r)}>{r.emoji} {r.title}</div>)}
            </div>
          ); })}
        </div>
      )}
      {view === "gallery" && <div className="idb-gallery">{rows.slice(0, 8).map(r => <div key={r.id} className="idb-gcard" onClick={() => api.openRow(r)}><div className="idb-gcover" style={{ background: r.cover }}></div><div className="idb-gbody"><div className="idb-gtitle">{r.emoji} {r.title}</div><div style={{ marginTop: 6 }}><StatusTag label={r.status} /></div></div></div>)}</div>}
    </div>
  );
}

/* ---------------- Buttons ---------------- */
function MkButton({ b, api }) {
  const p = b.props || {};
  const tmpl = p.template;
  const run = () => {
    if (tmpl) api.insertAfter(b.id, JSON.parse(JSON.stringify(tmpl)));
    else api.toast(p.toast || "✓ Acción ejecutada");
  };
  return (
    <div className="mk-btn-wrap">
      <button className={"mk-btn" + (tmpl ? " ghost tmpl-btn" : "")} contentEditable={false} onClick={run}>
        <Icon name={tmpl ? "plus" : "zap"} size={16} /> {p.label || (tmpl ? "Usar plantilla" : "Botón")}
      </button>
    </div>
  );
}

/* ---------------- Synced ---------------- */
function SyncedBlock({ b, api }) {
  const p = b.props || {};
  return (
    <div className="synced">
      <span className="synced-badge" contentEditable={false}><Icon name="link" size={11} /> Sincronizado</span>
      <Editable className="rich-editable" value={p.body} ph="Este contenido se mantendría sincronizado en todas sus copias…" onCommit={v => setProps(b, api, { body: v })} />
    </div>
  );
}

/* ---------------- Columns ---------------- */
function ColumnsBlock({ b, api }) {
  const p = b.props || {};
  const n = p.count || 2;
  const cols = p.cols || Array(n).fill("");
  const set = (i, v) => { const nc = [...cols]; nc[i] = v; setProps(b, api, { cols: nc }); };
  return (
    <div className={"columns c" + n}>
      {cols.map((c, i) => <Editable key={i} className="column" value={c} ph={"Columna " + (i + 1)} onCommit={v => set(i, v)} />)}
    </div>
  );
}

/* ---------------- AI block ---------------- */
const AI_MODES = {
  ai: { label: "Pregúntale a la IA", icon: "zap", ph: "Pregunta lo que quieras…" },
  summarize: { label: "Resumir", icon: "fileText", ph: "Pega o describe el texto a resumir…" },
  translate: { label: "Traducir", icon: "type", ph: "Texto a traducir (al inglés)…" },
  improve: { label: "Mejorar redacción", icon: "pen", ph: "Texto a mejorar…" },
  continue: { label: "Continuar escribiendo", icon: "arrowRight", ph: "Sobre qué continuar…" },
  brainstorm: { label: "Lluvia de ideas", icon: "callout", ph: "Tema para generar ideas…" },
};
function buildPrompt(mode, input, docText) {
  const ctx = docText ? `\n\nContexto del documento:\n"""${docText.slice(0, 1500)}"""` : "";
  switch (mode) {
    case "summarize": return `Resume en español, en 3-4 puntos breves, el siguiente texto:\n${input || docText}`;
    case "translate": return `Traduce al inglés de forma natural el siguiente texto. Devuelve solo la traducción:\n${input || docText}`;
    case "improve": return `Reescribe en español mejorando claridad y estilo, manteniendo el significado. Devuelve solo el texto mejorado:\n${input || docText}`;
    case "continue": return `Continúa escribiendo en español, con 2-3 frases coherentes, sobre: ${input}.${ctx}`;
    case "brainstorm": return `Genera 5 ideas creativas y concretas en español (lista con guiones) sobre: ${input}`;
    default: return `${input}${ctx}`;
  }
}
function AIBlock({ b, api }) {
  const p = b.props || {};
  const mode = p.mode || "ai";
  const M = AI_MODES[mode];
  const [input, setInput] = useS("");
  const [loading, setLoading] = useS(false);
  const [result, setResult] = useS("");
  const run = async (overrideMode) => {
    const m = overrideMode || mode;
    if (loading) return;
    setLoading(true); setResult("");
    const prompt = buildPrompt(m, input, api.getDocText());
    let out = "";
    try {
      if (window.claude && window.claude.complete) out = await window.claude.complete(prompt);
      else throw new Error("offline");
    } catch (e) {
      await new Promise(r => setTimeout(r, 700));
      out = "· (Demo sin conexión a la IA)\n· Esta función llamaría al modelo para " + (AI_MODES[m].label.toLowerCase()) + ".\n· Conéctala a tu API para respuestas reales.";
    }
    setResult((out || "").trim()); setLoading(false);
  };
  return (
    <div className="ai-block" contentEditable={false}>
      <div className="ai-head"><span className="ai-spark"><Icon name="zap" size={14} /></span><span className="ai-mode">{M.label}</span></div>
      <div className="ai-body">
        <div className="ai-input-row">
          <input className="ai-input" placeholder={M.ph} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") run(); }} />
          <button className="ai-send" disabled={loading} onClick={() => run()}>{loading ? "…" : "Generar"}</button>
        </div>
        {!result && !loading && (
          <div className="ai-chips">
            {["summarize", "improve", "continue", "brainstorm", "translate"].map(k => (
              <span key={k} className="ai-chip" onClick={() => { setProps(b, api, { mode: k }); run(k); }}><Icon name={AI_MODES[k].icon} size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />{AI_MODES[k].label}</span>
            ))}
          </div>
        )}
        {loading && <div style={{ marginTop: 12 }}><span className="ai-loading"><span className="ai-dot"></span><span className="ai-dot"></span><span className="ai-dot"></span> Pensando…</span></div>}
        {result && !loading && (
          <>
            <div className="ai-result" style={{ marginTop: 12 }}>{result}</div>
            <div className="ai-actions">
              <button className="mk-btn" onClick={() => { api.insertAfter(b.id, result.split(/\n+/).filter(Boolean).map(t => ({ type: "text", text: t.replace(/^[·\-*]\s*/, "") }))); }}><Icon name="check" size={15} /> Insertar debajo</button>
              <button className="mk-btn ghost" onClick={() => { setResult(""); setInput(""); }}>Descartar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Dispatcher ---------------- */
const RICH_TYPES = new Set([
  "toggle", "toc", "breadcrumb", "pagelink", "video", "embed", "file", "pdf", "audio", "bookmark",
  "equation", "mention", "date", "reminder", "status", "people", "createdtime", "lastedited",
  "simpletable", "inlinedb", "button", "templatebutton", "synced", "columns", "ai",
]);

function RichBlock({ b, api }) {
  switch (b.type) {
    case "toggle": return <ToggleBlock b={b} api={api} />;
    case "toc": return <TocBlock b={b} api={api} />;
    case "breadcrumb": return <BreadcrumbBlock api={api} />;
    case "pagelink": return <PageLinkBlock b={b} api={api} />;
    case "video": return <VideoBlock b={b} api={api} />;
    case "embed": return <EmbedBlock b={b} api={api} />;
    case "file": return <FileBlock b={b} api={api} kind="file" />;
    case "pdf": return <FileBlock b={b} api={api} kind="pdf" />;
    case "audio": return <AudioBlock b={b} />;
    case "bookmark": return <BookmarkBlock b={b} api={api} />;
    case "equation": return <EquationBlock b={b} api={api} />;
    case "mention": case "date": case "reminder": case "status": case "people": case "createdtime": case "lastedited":
      return <ChipBlock b={b} api={api} />;
    case "simpletable": return <SimpleTable b={b} api={api} />;
    case "inlinedb": return <InlineDB b={b} api={api} />;
    case "button": return <MkButton b={b} api={api} />;
    case "templatebutton": return <MkButton b={b} api={api} />;
    case "synced": return <SyncedBlock b={b} api={api} />;
    case "columns": return <ColumnsBlock b={b} api={api} />;
    case "ai": return <AIBlock b={b} api={api} />;
    default: return null;
  }
}

Object.assign(window, { RichBlock, RICH_TYPES });
