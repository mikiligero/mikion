/* ============================================================
   MIKION — Modals: Automations, Version history, Templates
   ============================================================ */
const { useState: useM } = React;

function ModalShell({ title, desc, onClose, children, width = 640 }) {
  return (
    <div className="set-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(" + width + "px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>
          <button className="set-close" style={{ position: "static" }} onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Automations ---------------- */
const AUTO_TRIGGERS = [
  "El estado cambia a «Hecho»",
  "Se añade un elemento",
  "La entrega es en 2 días",
  "Cambia la prioridad",
  "Se asigna un responsable",
  "Pasa la fecha de entrega",
];
const AUTO_ACTIONS = [
  "Marca la fecha de fin con hoy",
  "Asignarme como responsable",
  "Enviar recordatorio a Slack",
  "Cambiar el estado a «En revisión»",
  "Notificar al responsable",
  "Crear una subtarea de seguimiento",
];

function AutomationsModal({ onClose }) {
  const [autos, setAutos] = useM([
    { id: 1, on: true, when: "El estado cambia a «Hecho»", then: "Marca la fecha de fin con hoy" },
    { id: 2, on: true, when: "Se añade un elemento", then: "Asignarme como responsable" },
    { id: 3, on: false, when: "La entrega es en 2 días", then: "Enviar recordatorio a Slack" },
  ]);
  const [creating, setCreating] = useM(false);
  const [when, setWhen] = useM(AUTO_TRIGGERS[0]);
  const [then, setThen] = useM(AUTO_ACTIONS[0]);

  const create = () => {
    setAutos(s => [...s, { id: Date.now(), on: true, when, then }]);
    setCreating(false);
    setWhen(AUTO_TRIGGERS[0]);
    setThen(AUTO_ACTIONS[0]);
  };

  return (
    <ModalShell title="Automatizaciones" desc="Cuando ocurra algo, Mikion hará una acción por ti." onClose={onClose} width={620}>
      {autos.map(a => (
        <div key={a.id} className="auto-row">
          <span className="auto-ico"><Icon name="zap" size={16} /></span>
          <div style={{ flex: 1 }}>
            <div className="auto-when"><b>Cuando</b> {a.when}</div>
            <div className="auto-then"><b>Entonces</b> {a.then}</div>
          </div>
          <button className="icon-btn" title="Eliminar" onClick={() => setAutos(s => s.filter(x => x.id !== a.id))}><Icon name="trash" size={15} /></button>
          <span className={"switch" + (a.on ? " on" : "")} onClick={() => setAutos(s => s.map(x => x.id === a.id ? { ...x, on: !x.on } : x))}><span className="knob"></span></span>
        </div>
      ))}

      {creating ? (
        <div className="auto-new">
          <div className="auto-new-head">
            <span className="auto-ico"><Icon name="zap" size={16} /></span>
            <div className="sr-title">Nueva automatización</div>
          </div>
          <label className="auto-field">
            <span className="auto-label"><b>Cuando</b> ocurra…</span>
            <select className="set-input" value={when} onChange={e => setWhen(e.target.value)}>
              {AUTO_TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="auto-field">
            <span className="auto-label"><b>Entonces</b> haz…</span>
            <select className="set-input" value={then} onChange={e => setThen(e.target.value)}>
              {AUTO_ACTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div className="auto-new-foot">
            <button className="btn-soft" onClick={() => setCreating(false)}>Cancelar</button>
            <button className="btn-primary" onClick={create}><Icon name="checkSmall" size={15} stroke={2.4} /> Crear automatización</button>
          </div>
        </div>
      ) : (
        <button className="btn-soft" style={{ marginTop: 14 }} onClick={() => setCreating(true)}><Icon name="plus" size={15} /> Nueva automatización</button>
      )}
    </ModalShell>
  );
}

/* ---------------- Version history ---------------- */
function VersionHistoryModal({ onClose }) {
  const versions = [
    { who: "u1", t: "Hoy, 14:20", note: "Edición actual", cur: true },
    { who: "u2", t: "Hoy, 11:05", note: "Lucía añadió la sección de tareas" },
    { who: "u1", t: "Ayer, 18:42", note: "Reorganización de bloques" },
    { who: "u3", t: "12 jun, 09:30", note: "Marco actualizó las métricas" },
    { who: "u1", t: "10 jun, 16:10", note: "Versión inicial" },
  ];
  const [sel, setSel] = useM(0);
  return (
    <ModalShell title="Historial de versiones" desc="Consulta y restaura versiones anteriores de esta página." onClose={onClose} width={760}>
      <div className="vh-body">
        <div className="vh-list">
          {versions.map((v, i) => (
            <div key={i} className={"vh-item" + (sel === i ? " active" : "")} onClick={() => setSel(i)}>
              <Avatar id={v.who} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="vh-time">{v.t}{v.cur && <span className="pill-soft on" style={{ marginLeft: 6 }}>Actual</span>}</div><div className="vh-note">{v.note}</div></div>
            </div>
          ))}
        </div>
        <div className="vh-preview">
          <div className="vh-prev-head">{versions[sel].t} · {window.MIKION_DATA.peopleById[versions[sel].who].name}</div>
          <div className="vh-prev-body">
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 560, marginBottom: 10 }}>OKRs · Q3 2026</div>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>Vista previa del contenido en este punto del historial. {versions[sel].note}.</p>
            <div style={{ height: 8 }}></div>
            <div className="skel" style={{ width: "90%" }}></div>
            <div className="skel" style={{ width: "75%" }}></div>
            <div className="skel" style={{ width: "82%" }}></div>
          </div>
          {!versions[sel].cur && <div className="vh-actions"><button className="btn-primary"><Icon name="sync" size={15} /> Restaurar esta versión</button></div>}
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- Page templates gallery ---------------- */
const PAGE_TEMPLATES = [
  { id: "blank", name: "Página en blanco", emoji: "📄", cat: "Básico", cover: "sand", blocks: [{ type: "text", text: "" }] },
  { id: "notes", name: "Notas de reunión", emoji: "📝", cat: "Trabajo", cover: "sage", blocks: [{ type: "h2", text: "Notas de reunión" }, { type: "text", text: "Fecha · Asistentes" }, { type: "h3", text: "Agenda" }, { type: "todo", text: "Tema 1" }, { type: "h3", text: "Acuerdos" }, { type: "bullet", text: "" }] },
  { id: "prd", name: "Documento de producto (PRD)", emoji: "📐", cat: "Trabajo", cover: "dusk", blocks: [{ type: "h1", text: "PRD · Título" }, { type: "callout", emoji: "🎯", text: "Objetivo en una frase." }, { type: "h2", text: "Contexto" }, { type: "text", text: "" }, { type: "h2", text: "Requisitos" }, { type: "num", text: "" }] },
  { id: "wiki", name: "Wiki de equipo", emoji: "📚", cat: "Trabajo", cover: "teal", blocks: [{ type: "h1", text: "Wiki del equipo" }, { type: "toc" }, { type: "h2", text: "Cómo trabajamos" }, { type: "text", text: "" }] },
  { id: "weekly", name: "Planificador semanal", emoji: "🗓️", cat: "Personal", cover: "clay", blocks: [{ type: "h2", text: "Esta semana" }, { type: "todo", text: "Prioridad 1" }, { type: "todo", text: "Prioridad 2" }, { type: "h3", text: "Notas" }, { type: "text", text: "" }] },
  { id: "reading", name: "Lista de lecturas", emoji: "📖", cat: "Personal", cover: "rose", blocks: [{ type: "h2", text: "Por leer" }, { type: "todo", text: "" }, { type: "h2", text: "Leídos" }, { type: "todo", text: "", checked: true }] },
];
function TemplatesGallery({ onClose, onPick }) {
  const cats = ["Básico", "Trabajo", "Personal"];
  return (
    <ModalShell title="Plantillas" desc="Empieza más rápido con una plantilla de página." onClose={onClose} width={760}>
      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div className="tpl-cat">{cat}</div>
          <div className="tpl-grid">
            {PAGE_TEMPLATES.filter(t => t.cat === cat).map(t => (
              <div key={t.id} className="tpl-card" onClick={() => onPick(t)}>
                <div className="tpl-cover" style={{ background: window.MIKION_DATA.COVERS[t.cover] }}><span className="tpl-emoji">{t.emoji}</span></div>
                <div className="tpl-name">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </ModalShell>
  );
}

Object.assign(window, { AutomationsModal, VersionHistoryModal, TemplatesGallery, PAGE_TEMPLATES });

/* ---------------- Comments panel ---------------- */
function CommentsPanel({ docId, blocks, focusBlock, onClose }) {
  const st = useStore();
  const threads = (st.comments || {})[docId] || [];
  const [text, setText] = useM("");
  const [replyTo, setReplyTo] = useM(null);
  const [replyText, setReplyText] = useM(null);
  const blockText = (bid) => { const b = blocks.find(x => x.id === bid); return b ? (b.text || "").slice(0, 60) : null; };
  const open = threads.filter(t => !t.resolved), done = threads.filter(t => t.resolved);
  return (
    <div className="comments-panel" contentEditable={false}>
      <div className="cp-head"><b>Comentarios</b><button className="icon-btn" onClick={onClose}><Icon name="x" size={17} /></button></div>
      <div className="cp-body">
        <div className="cp-new">
          <Avatar id="u1" size={28} />
          <input className="cp-input" placeholder={focusBlock ? "Comentar en el bloque…" : "Comentar en la página…"} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && text.trim()) { Store.addComment(docId, focusBlock || null, text.trim()); setText(""); } }} />
          <button className="cp-send" disabled={!text.trim()} onClick={() => { if (text.trim()) { Store.addComment(docId, focusBlock || null, text.trim()); setText(""); } }}><Icon name="arrowUp" size={15} /></button>
        </div>
        {threads.length === 0 && <div className="cp-empty">Sin comentarios todavía. Empieza la conversación.</div>}
        {open.map(t => <Thread key={t.id} t={t} docId={docId} blockText={blockText} replyText={replyText} setReplyText={setReplyText} />)}
        {done.length > 0 && <div className="cp-resolved-label">{done.length} resuelto{done.length > 1 ? "s" : ""}</div>}
        {done.map(t => <Thread key={t.id} t={t} docId={docId} blockText={blockText} replyText={replyText} setReplyText={setReplyText} />)}
      </div>
    </div>
  );
}
function Thread({ t, docId, blockText, replyText, setReplyText }) {
  const bt = t.blockId ? blockText(t.blockId) : null;
  const r = replyText && replyText.id === t.id ? replyText.v : "";
  return (
    <div className={"cp-thread" + (t.resolved ? " resolved" : "")}>
      {bt != null && <div className="cp-anchor">“{bt || "bloque"}”</div>}
      <Comment author={t.author} text={t.text} time={t.time} />
      {t.replies.map((rp, i) => <Comment key={i} author={rp.author} text={rp.text} time={rp.time} />)}
      <div className="cp-thread-actions">
        <input className="cp-reply" placeholder="Responder…" value={r} onChange={e => setReplyText({ id: t.id, v: e.target.value })}
          onKeyDown={e => { if (e.key === "Enter" && r.trim()) { Store.addReply(docId, t.id, r.trim()); setReplyText(null); } }} />
        <button className="cp-resolve" onClick={() => Store.resolveComment(docId, t.id)} title={t.resolved ? "Reabrir" : "Resolver"}><Icon name={t.resolved ? "sync" : "checkSmall"} size={15} stroke={2.4} /></button>
      </div>
    </div>
  );
}
function Comment({ author, text, time }) {
  const p = window.MIKION_DATA.peopleById[author] || { name: "Tú" };
  return (
    <div className="cp-comment">
      <Avatar id={author} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cp-c-head"><b>{p.name}</b> <span className="cp-c-time">{time}</span></div>
        <div className="cp-c-text">{text}</div>
      </div>
    </div>
  );
}
window.CommentsPanel = CommentsPanel;
