/* ============================================================
   MIKION — Block editor
   ============================================================ */
const { useState: useStateE, useRef: useRefE, useEffect: useEffectE, useCallback } = React;

/* ---- caret helpers (single text node blocks) ---- */
function caretOffset(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}
function setCaret(el, pos) {
  if (!el) return;
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  const node = el.firstChild;
  if (!node) { range.setStart(el, 0); range.collapse(true); }
  else {
    const len = node.textContent.length;
    range.setStart(node, Math.min(pos, len));
    range.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function escapeHtml(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function splitAtCaret(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return { beforeHtml: el.innerHTML, afterHtml: "", afterText: "" };
  const r = sel.getRangeAt(0); r.deleteContents();
  const after = document.createRange(); after.selectNodeContents(el); after.setStart(r.endContainer, r.endOffset);
  const frag = after.extractContents();
  const d = document.createElement("div"); d.appendChild(frag);
  return { beforeHtml: el.innerHTML, afterHtml: d.innerHTML, afterText: d.textContent };
}
const HEAD_LV = { h1: 1, h2: 2, h3: 3 };
const PAGE_EMOJIS = ["📄", "📝", "📋", "📘", "📓", "📈", "🎯", "🚀", "💡", "✅", "🔥", "⭐", "🌟", "📌", "📅", "🗂️", "🧩", "🎨", "🧪", "🔍", "📣", "💰", "🎉", "✈️", "🍳", "📚", "🏠", "🌱", "🧠", "❤️", "👋", "🎯"];
const COVER_KEYS = ["clay", "sage", "dusk", "sand", "slate", "rose", "teal", "night"];

const SLASH_ITEMS = [
  // Básico
  { type: "text", icon: "type", title: "Texto", desc: "Texto plano", kw: "texto parrafo paragraph", cat: "Básico" },
  { type: "page", icon: "page", title: "Página", desc: "Crea una subpágina", kw: "pagina page subpagina nueva", cat: "Básico" },
  { type: "h1", icon: "h1", title: "Título 1", desc: "Sección grande", kw: "titulo heading h1 grande", cat: "Básico" },
  { type: "h2", icon: "h2", title: "Título 2", desc: "Sección mediana", kw: "titulo heading h2", cat: "Básico" },
  { type: "h3", icon: "h3", title: "Título 3", desc: "Sección pequeña", kw: "titulo heading h3", cat: "Básico" },
  { type: "todo", icon: "todo", title: "Lista de tareas", desc: "Con casillas", kw: "tarea todo checkbox casilla pendiente", cat: "Básico" },
  { type: "bullet", icon: "list", title: "Lista con viñetas", desc: "Lista simple", kw: "lista vineta bullet punto", cat: "Básico" },
  { type: "num", icon: "listOrdered", title: "Lista numerada", desc: "Lista ordenada", kw: "lista numero ordenada numerada", cat: "Básico" },
  { type: "toggle", icon: "toggle", title: "Lista desplegable", desc: "Contenido que se expande", kw: "desplegable toggle expandir plegar", cat: "Básico" },
  { type: "quote", icon: "quote", title: "Cita", desc: "Resalta una frase", kw: "cita quote frase", cat: "Básico" },
  { type: "callout", icon: "callout", title: "Llamada", desc: "Recuadro destacado", kw: "llamada callout aviso nota destacado", cat: "Básico" },
  { type: "divider", icon: "minus", title: "Divisor", desc: "Separa secciones", kw: "divisor linea separador divider", cat: "Básico" },
  { type: "toc", icon: "list", title: "Tabla de contenidos", desc: "Índice automático", kw: "tabla contenidos indice toc", cat: "Básico" },
  { type: "breadcrumb", icon: "arrowRight", title: "Ruta de navegación", desc: "Migas de pan", kw: "ruta breadcrumb migas navegacion", cat: "Básico" },
  // Multimedia
  { type: "image", icon: "image", title: "Imagen", desc: "Sube o incrusta una imagen", kw: "imagen foto image picture", cat: "Multimedia" },
  { type: "video", icon: "video", title: "Vídeo", desc: "Incrusta un vídeo de YouTube", kw: "video youtube clip", cat: "Multimedia" },
  { type: "audio", icon: "play", title: "Audio", desc: "Reproductor de audio", kw: "audio sonido musica voz", cat: "Multimedia" },
  { type: "file", icon: "attach", title: "Archivo", desc: "Adjunta un archivo", kw: "archivo file adjunto", cat: "Multimedia" },
  { type: "pdf", icon: "fileText", title: "PDF", desc: "Incrusta un PDF", kw: "pdf documento", cat: "Multimedia" },
  { type: "bookmark", icon: "bookmark", title: "Marcador web", desc: "Vista previa de un enlace", kw: "marcador bookmark enlace web link", cat: "Multimedia" },
  { type: "embed", icon: "embed", title: "Insertar (embed)", desc: "YouTube, Spotify, Figma, Maps…", kw: "embed insertar incrustar youtube spotify figma maps github loom miro", cat: "Multimedia" },
  // Bases de datos
  { type: "inlinedb", props: { view: "table" }, icon: "table", title: "Base de datos · Tabla", desc: "Tabla en línea", kw: "base datos database tabla table", cat: "Bases de datos" },
  { type: "inlinedb", props: { view: "board" }, icon: "kanban", title: "Base de datos · Tablero", desc: "Kanban en línea", kw: "base datos kanban tablero board", cat: "Bases de datos" },
  { type: "inlinedb", props: { view: "gallery" }, icon: "grid", title: "Base de datos · Galería", desc: "Galería en línea", kw: "base datos galeria gallery tarjetas", cat: "Bases de datos" },
  { type: "simpletable", icon: "table", title: "Tabla simple", desc: "Tabla editable básica", kw: "tabla simple table grid celdas", cat: "Bases de datos" },
  // Código y fórmulas
  { type: "code", icon: "code", title: "Código", desc: "Fragmento de código", kw: "codigo code mono programar", cat: "Código y fórmulas" },
  { type: "equation", icon: "sigma", title: "Ecuación", desc: "Bloque de fórmula (LaTeX)", kw: "ecuacion formula latex matematicas equation", cat: "Código y fórmulas" },
  { type: "mention", icon: "at", title: "Mención", desc: "Menciona a una persona", kw: "mencion mention persona arroba", cat: "Código y fórmulas" },
  { type: "date", icon: "calendar", title: "Fecha", desc: "Inserta una fecha", kw: "fecha date dia", cat: "Código y fórmulas" },
  { type: "reminder", icon: "bell", title: "Recordatorio", desc: "Fecha con aviso", kw: "recordatorio reminder aviso alarma", cat: "Código y fórmulas" },
  // Organización
  { type: "pagelink", icon: "link", title: "Enlace a página", desc: "Enlaza una página existente", kw: "enlace link pagina referencia", cat: "Organización" },
  { type: "button", icon: "zap", title: "Botón", desc: "Botón con acción", kw: "boton button accion", cat: "Organización" },
  { type: "templatebutton", icon: "plus", title: "Botón de plantilla", desc: "Inserta bloques predefinidos", kw: "plantilla template boton", cat: "Organización" },
  { type: "synced", icon: "sync", title: "Bloque sincronizado", desc: "Contenido reutilizable", kw: "sincronizado synced reutilizar", cat: "Organización" },
  // Diseño
  { type: "columns", props: { count: 2, cols: ["", ""] }, icon: "columns", title: "2 columnas", desc: "Diseño de dos columnas", kw: "columnas columns dos 2 diseno", cat: "Diseño" },
  { type: "columns", props: { count: 3, cols: ["", "", ""] }, icon: "columns", title: "3 columnas", desc: "Diseño de tres columnas", kw: "columnas columns tres 3 diseno", cat: "Diseño" },
  // Propiedades
  { type: "status", icon: "dot", title: "Estado", desc: "Selector de estado", kw: "estado status propiedad", cat: "Propiedades" },
  { type: "people", icon: "users", title: "Personas", desc: "Asignar personas", kw: "personas people asignar responsable", cat: "Propiedades" },
  { type: "createdtime", icon: "clock", title: "Hora de creación", desc: "Fecha de creación", kw: "creacion created hora fecha", cat: "Propiedades" },
  { type: "lastedited", icon: "clock", title: "Última edición", desc: "Fecha de última edición", kw: "edicion edited ultima hora", cat: "Propiedades" },
  // IA
  { type: "ai", props: { mode: "ai" }, icon: "sparkles", title: "Preguntar a la IA", desc: "Genera texto con IA", kw: "ia ai inteligencia generar pregunta", cat: "IA" },
  { type: "ai", props: { mode: "summarize" }, icon: "fileText", title: "Resumir", desc: "Resume el documento", kw: "resumir summarize resumen ia", cat: "IA" },
  { type: "ai", props: { mode: "translate" }, icon: "type", title: "Traducir", desc: "Traduce el texto", kw: "traducir translate idioma ia", cat: "IA" },
  { type: "ai", props: { mode: "improve" }, icon: "pen", title: "Mejorar redacción", desc: "Reescribe con más claridad", kw: "mejorar improve redaccion escritura ia", cat: "IA" },
  { type: "ai", props: { mode: "continue" }, icon: "arrowRight", title: "Continuar escribiendo", desc: "La IA sigue el texto", kw: "continuar continue escribir ia", cat: "IA" },
  { type: "ai", props: { mode: "brainstorm" }, icon: "callout", title: "Lluvia de ideas", desc: "Genera ideas", kw: "lluvia ideas brainstorm ia", cat: "IA" },
];

const CAT_ORDER = ["Básico", "Multimedia", "Bases de datos", "Código y fórmulas", "Organización", "Diseño", "Propiedades", "IA"];

function defaultProps(type) {
  switch (type) {
    case "toggle": return { open: true };
    case "simpletable": return { headers: ["Columna 1", "Columna 2", "Columna 3"], rows: [["", "", ""], ["", "", ""]] };
    case "columns": return { count: 2, cols: ["", ""] };
    case "inlinedb": return { view: "board" };
    case "button": return { label: "Marcar como hecho", toast: "✓ ¡Hecho!" };
    case "templatebutton": return { label: "Insertar notas de reunión", template: [{ type: "h3", text: "Notas de reunión" }, { type: "text", text: "" }, { type: "todo", text: "Punto de la agenda" }, { type: "todo", text: "Acción a seguir" }] };
    case "ai": return { mode: "ai" };
    case "status": return { value: "En curso" };
    default: return {};
  }
}

let _bid = 1000;
const newBlock = (type = "text", text = "") => ({ id: "b" + (_bid++), type, text, checked: false, emoji: "💡" });

function Editor({ doc, docId, onNavigate, onCreatePage, onOpenRow, crumbs }) {
  const [blocks, setBlocks] = useStateE(() => doc.blocks.map((b, i) => ({ id: "b" + i, checked: false, emoji: "💡", text: "", ...b })));
  const [slash, setSlash] = useStateE(null); // {id, query, x, y, idx}
  const [drag, setDrag] = useStateE({ id: null, overId: null, pos: null });
  const [toast, setToast] = useStateE(null);
  const [fmt, setFmt] = useStateE(null);
  const [collapsed, setCollapsed] = useStateE(() => new Set());
  const [pageMenu, setPageMenu] = useStateE(null); // 'emoji' | 'cover' | 'settings'
  const [comments, setComments] = useStateE(null);
  const els = useRefE({});
  const rowsRef = useRefE({});
  const focusReq = useRefE(null);
  const firstRun = useRefE(true);

  // selection → format toolbar
  useEffectE(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setFmt(null); return; }
      let node = sel.anchorNode; node = node && (node.nodeType === 1 ? node : node.parentElement);
      const ce = node && node.closest && node.closest(".block[contenteditable], .rich-editable, .tog-title, .tog-body, .column, .st-cell");
      if (!ce) { setFmt(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r.width && !r.height) { setFmt(null); return; }
      setFmt({ x: r.left + r.width / 2, y: r.top });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const commitActive = () => {
    const sel = window.getSelection(); if (!sel.rangeCount) return;
    let node = sel.anchorNode; node = node && (node.nodeType === 1 ? node : node.parentElement);
    const ce = node && node.closest && node.closest("[data-bid]");
    if (ce) { const id = ce.dataset.bid; setBlocks(bs => bs.map(b => b.id === id ? { ...b, text: ce.textContent, html: ce.innerHTML } : b)); }
  };
  const fmtCmd = (cmd, val) => { if (cmd === "foreColor" || cmd === "hiliteColor") document.execCommand("styleWithCSS", false, true); document.execCommand(cmd, false, val); commitActive(); };
  const fmtCode = () => { const sel = window.getSelection(); const t = sel.toString(); if (!t) return; document.execCommand("insertHTML", false, '<code class="ic">' + escapeHtml(t) + "</code>"); commitActive(); };
  const fmtLink = () => { const url = prompt("URL del enlace:", "https://"); if (url) { document.execCommand("createLink", false, url); commitActive(); } };
  const fmtClear = () => { document.execCommand("removeFormat"); commitActive(); };
  const toggleCollapse = (id) => setCollapsed(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // persist block changes (skip initial mount)
  useEffectE(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (docId) Store.persistDoc(docId, { blocks: blocks.map(({ id, ...r }) => r) });
  }, [blocks]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const insertAfter = (id, arr) => setBlocks(bs => {
    const copy = [...bs]; const at = copy.findIndex(x => x.id === id);
    const mapped = arr.map(x => ({ id: "b" + (_bid++), checked: false, emoji: "💡", text: "", ...x }));
    copy.splice(at + 1, 0, ...mapped); return copy;
  });
  const scrollToBlock = (blockId) => {
    const row = rowsRef.current[blockId];
    if (!row) return;
    const sc = row.closest(".content-scroll");
    if (sc) sc.scrollTo({ top: row.offsetTop - 70, behavior: "smooth" });
  };
  const api = {
    updateBlock: (id, patch) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b)),
    navigate: onNavigate || (() => {}),
    crumbs: crumbs || ["Mikion"],
    allBlocks: blocks,
    scrollToBlock, insertAfter,
    openRow: onOpenRow || (() => {}),
    toast: showToast,
    getDocText: () => blocks.map(b => b.text).filter(Boolean).join("\n"),
    openComments: (blockId) => setComments({ block: blockId || null }),
  };

  useEffectE(() => {
    if (focusReq.current) {
      const { id, pos } = focusReq.current;
      const el = els.current[id];
      if (el) setCaret(el, pos == null ? (el.textContent || "").length : pos);
      focusReq.current = null;
    }
  });

  const commit = (id) => {
    const el = els.current[id];
    if (!el) return;
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, text: el.textContent, html: el.innerHTML } : b));
  };
  const duplicateBlock = (id) => setBlocks(bs => {
    const at = bs.findIndex(x => x.id === id); if (at < 0) return bs;
    const copy = [...bs]; copy.splice(at + 1, 0, { ...JSON.parse(JSON.stringify(bs[at])), id: "b" + (_bid++) }); return copy;
  });

  const filtered = slash ? SLASH_ITEMS.filter(it => {
    const q = slash.query.toLowerCase().trim();
    if (!q) return true;
    return it.title.toLowerCase().includes(q) || it.kw.includes(q);
  }) : [];

  const applyType = (id, typeOrItem) => {
    const it = typeof typeOrItem === "string" ? (SLASH_ITEMS.find(x => x.type === typeOrItem) || { type: typeOrItem }) : typeOrItem;
    const type = it.type;
    const el = els.current[id];
    if (el) el.innerText = "";
    setSlash(null);

    // /page → create subpage and turn this block into a page link
    if (type === "page") {
      const newId = onCreatePage ? onCreatePage(docId) : null;
      setBlocks(bs => bs.map(b => b.id === id ? { ...b, type: "pagelink", text: "", props: { targetId: newId } } : b));
      return;
    }

    if (RICH_TYPES.has(type)) {
      const props = it.props ? { ...it.props } : defaultProps(type);
      const nb = newBlock("text", "");
      setBlocks(bs => {
        const copy = bs.map(b => b.id === id ? { ...b, type, text: "", props } : b);
        const at = copy.findIndex(x => x.id === id);
        copy.splice(at + 1, 0, nb);
        return copy;
      });
      focusReq.current = { id: nb.id, pos: 0 };
      return;
    }

    // plain text-style type
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, type, text: "" } : b));
    focusReq.current = { id, pos: 0 };
  };

  const onInput = (id, e) => {
    const el = e.currentTarget;
    const txt = el.innerText;
    el.dataset.empty = txt.length === 0 ? "true" : "false";
    if (txt === "---" || txt === "—-") {
      el.innerText = "";
      const nb = newBlock("text", "");
      setBlocks(bs => { const copy = bs.map(x => x.id === id ? { ...x, type: "divider", text: "", html: "" } : x); const at = copy.findIndex(x => x.id === id); copy.splice(at + 1, 0, nb); return copy; });
      focusReq.current = { id: nb.id, pos: 0 };
      setSlash(null);
      return;
    }
    if (txt.startsWith("/")) {
      const rect = el.getBoundingClientRect();
      setSlash({ id, query: txt.slice(1), x: rect.left, y: rect.bottom + 4, idx: 0 });
    } else if (slash && slash.id === id) {
      setSlash(null);
    }
  };

  const onKeyDown = (id, idx, e) => {
    const el = e.currentTarget;
    // slash menu navigation
    if (slash && slash.id === id) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlash(s => ({ ...s, idx: Math.min(s.idx + 1, filtered.length - 1) })); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlash(s => ({ ...s, idx: Math.max(s.idx - 1, 0) })); return; }
      if (e.key === "Enter") { e.preventDefault(); if (filtered[slash.idx]) applyType(id, filtered[slash.idx]); return; }
      if (e.key === "Escape") { e.preventDefault(); setSlash(null); return; }
    }
    const b = blocks[idx];
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); commit(id); duplicateBlock(id); return; }
    if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
      e.preventDefault();
      const isEmpty = el.textContent.length === 0;
      if (["bullet", "num", "todo"].includes(b.type) && isEmpty) {
        setBlocks(bs => bs.map(x => x.id === id ? { ...x, type: "text", text: "", html: "" } : x));
        return;
      }
      const { beforeHtml, afterHtml, afterText } = splitAtCaret(el);
      el.innerHTML = beforeHtml;
      el.dataset.empty = el.textContent.length ? "false" : "true";
      const nextType = ["bullet", "num", "todo"].includes(b.type) ? b.type : "text";
      const nb = newBlock(nextType, afterText); nb.html = afterHtml;
      setBlocks(bs => {
        const copy = bs.map(x => x.id === id ? { ...x, text: el.textContent, html: beforeHtml } : x);
        const at = copy.findIndex(x => x.id === id);
        copy.splice(at + 1, 0, nb);
        return copy;
      });
      focusReq.current = { id: nb.id, pos: 0 };
      return;
    }
    if (e.key === "Backspace") {
      const pos = caretOffset(el);
      if (pos === 0) {
        if (idx === 0) return;
        e.preventDefault();
        const prev = blocks[idx - 1];
        const prevEl = els.current[prev.id];
        const prevLen = prevEl ? prevEl.textContent.length : 0;
        const canMerge = prevEl && ["text", "h1", "h2", "h3", "bullet", "num", "todo", "quote"].includes(prev.type);
        if (canMerge) {
          prevEl.innerHTML = prevEl.innerHTML + el.innerHTML;
          prevEl.dataset.empty = prevEl.textContent.length ? "false" : "true";
        }
        setBlocks(bs => bs.filter(x => x.id !== id).map(x => (x.id === prev.id && prevEl) ? { ...x, text: prevEl.textContent, html: prevEl.innerHTML } : x));
        focusReq.current = { id: prev.id, pos: prevLen };
        return;
      }
    }
    if (e.key === "ArrowUp" && idx > 0) {
      const pos = caretOffset(el);
      if (pos === 0) { e.preventDefault(); const p = blocks[idx - 1]; if (els.current[p.id]) setCaret(els.current[p.id], (els.current[p.id].innerText || "").length); }
    }
    if (e.key === "ArrowDown" && idx < blocks.length - 1) {
      const pos = caretOffset(el);
      if (pos >= el.innerText.length) { e.preventDefault(); const n = blocks[idx + 1]; if (els.current[n.id]) setCaret(els.current[n.id], 0); }
    }
  };

  const toggleTodo = (id) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, checked: !b.checked } : b));

  const addBlockAfter = (id) => {
    const nb = newBlock("text", "");
    setBlocks(bs => { const copy = [...bs]; const at = copy.findIndex(x => x.id === id); copy.splice(at + 1, 0, nb); return copy; });
    focusReq.current = { id: nb.id, pos: 0 };
  };
  const deleteBlock = (id) => setBlocks(bs => bs.length > 1 ? bs.filter(b => b.id !== id) : bs);

  // drag reorder
  const onDrop = () => {
    setDrag(d => {
      if (!d.id || !d.overId || d.id === d.overId) return { id: null, overId: null, pos: null };
      setBlocks(bs => {
        const copy = [...bs];
        const from = copy.findIndex(x => x.id === d.id);
        const item = copy.splice(from, 1)[0];
        let to = copy.findIndex(x => x.id === d.overId);
        if (d.pos === "bot") to += 1;
        copy.splice(to, 0, item);
        return copy;
      });
      return { id: null, overId: null, pos: null };
    });
  };

  const hidden = new Set();
  { let hideLvl = 0;
    for (const bk of blocks) {
      const lvl = HEAD_LV[bk.type] || 0;
      if (hideLvl) { if (lvl && lvl <= hideLvl) hideLvl = 0; else hidden.add(bk.id); }
      if (lvl && collapsed.has(bk.id) && !hidden.has(bk.id)) hideLvl = lvl;
    }
  }
  let numCounter = 0;
  const docFont = doc.font || "default";
  const wrapClass = "doc-wrap font-" + docFont + (doc.fullWidth ? " full" : "") + (doc.smallText ? " small" : "");
  const setMeta = (patch) => docId && Store.setDocMeta(docId, patch);

  return (
    <div className={wrapClass} onClick={() => { if (slash) setSlash(null); if (pageMenu) setPageMenu(null); }}>
      {doc.cover
        ? <div className="doc-cover has-cover" style={{ background: doc.cover }}>
            <div className="cover-controls" contentEditable={false}>
              <button className="cover-btn" onClick={(e) => { e.stopPropagation(); setPageMenu(pageMenu === "cover" ? null : "cover"); }}>Cambiar portada</button>
              <button className="cover-btn" onClick={(e) => { e.stopPropagation(); setMeta({ cover: null }); }}>Quitar</button>
            </div>
          </div>
        : <div className="no-cover"></div>}

      <div className="doc-head-tools" contentEditable={false}>
        {!doc.cover && <button className="dht-btn" onClick={(e) => { e.stopPropagation(); setPageMenu("cover"); }}><Icon name="image" size={15} /> Añadir portada</button>}
      </div>

      <div className="doc-icon-big" contentEditable={false} onClick={(e) => { e.stopPropagation(); setPageMenu(pageMenu === "emoji" ? null : "emoji"); }} title="Cambiar icono">{doc.emoji}</div>

      <h1
        className="doc-title"
        contentEditable suppressContentEditableWarning
        onBlur={(e) => { if (!docId) return; const t = e.currentTarget.innerText; if (docId.startsWith("row-")) Store.persistDoc(docId, { title: t }); else Store.renameDoc(docId, t); }}
        dangerouslySetInnerHTML={{ __html: doc.title }}
      ></h1>
      <div className="doc-meta">
        <span className="dm"><Icon name="clock" size={14} /> Editado hace 2 h</span>
        <span className="dm"><Avatar id="u1" size={18} /> Tú</span>
        <span className="dm"><Icon name="fileText" size={14} /> {blocks.length} bloques</span>
        <span className="dm dm-btn" onClick={(e) => { e.stopPropagation(); setComments({ block: null }); }}><Icon name="comment" size={14} /> Comentarios</span>
        <span className="dm dm-btn" onClick={(e) => { e.stopPropagation(); setPageMenu(pageMenu === "settings" ? null : "settings"); }}><Icon name="sliders" size={14} /> Estilo</span>
      </div>

      {pageMenu === "emoji" && (
        <div className="popover emoji-pop" contentEditable={false} onClick={(e) => e.stopPropagation()}>
          <div className="emoji-grid">
            {PAGE_EMOJIS.map((em, i) => <span key={i} className="emoji-cell" onClick={() => { setMeta({ emoji: em }); setPageMenu(null); }}>{em}</span>)}
          </div>
        </div>
      )}
      {pageMenu === "cover" && (
        <div className="popover cover-pop" contentEditable={false} onClick={(e) => e.stopPropagation()}>
          <div className="menu-label">Elige una portada</div>
          <div className="cover-grid">
            {COVER_KEYS.map(k => <span key={k} className="cover-swatch" style={{ background: window.MIKION_DATA.COVERS[k] }} onClick={() => { setMeta({ cover: window.MIKION_DATA.COVERS[k] }); setPageMenu(null); }}></span>)}
          </div>
        </div>
      )}
      {pageMenu === "settings" && (
        <div className="popover menu page-settings" contentEditable={false} onClick={(e) => e.stopPropagation()} style={{ width: 250 }}>
          <div className="menu-label">Estilo de página</div>
          <div className="set-row" style={{ padding: "8px 10px", borderBottom: "none" }}>
            <span style={{ flex: 1, fontSize: 13.5 }}>Fuente</span>
            <div className="seg">
              {[["default", "Sans"], ["serif", "Serif"], ["mono", "Mono"]].map(([k, l]) => <button key={k} className={"seg-btn" + (docFont === k ? " on" : "")} onClick={() => setMeta({ font: k })}>{l}</button>)}
            </div>
          </div>
          <div className="menu-check" onClick={() => setMeta({ fullWidth: !doc.fullWidth })}>
            <span className={"mc-box" + (doc.fullWidth ? " on" : "")}>{doc.fullWidth && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
            <span className="mc-flex">Ancho completo</span>
          </div>
          <div className="menu-check" onClick={() => setMeta({ smallText: !doc.smallText })}>
            <span className={"mc-box" + (doc.smallText ? " on" : "")}>{doc.smallText && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
            <span className="mc-flex">Texto pequeño</span>
          </div>
        </div>
      )}

      {blocks.map((b, idx) => {
        if (b.type === "num") numCounter += 1; else numCounter = 0;
        if (hidden.has(b.id)) return null;
        const num = numCounter;
        return (
          <BlockRow
            key={b.id}
            block={b} idx={idx} num={num}
            elsRef={els} rowsRef={rowsRef} api={api}
            onInput={onInput} onKeyDown={onKeyDown} onBlur={commit}
            onToggleTodo={toggleTodo}
            onAddAfter={addBlockAfter} onDelete={deleteBlock} onTurnInto={applyType}
            onDuplicate={duplicateBlock}
            isCollapsed={collapsed.has(b.id)} onToggleCollapse={toggleCollapse}
            drag={drag} setDrag={setDrag} onDrop={onDrop}
          />
        );
      })}

      <div className="empty-pad" onClick={() => { const last = blocks[blocks.length - 1]; if (last && els.current[last.id]) setCaret(els.current[last.id], 999); else if (last) addBlockAfter(last.id); }}></div>

      {slash && filtered.length > 0 && (
        <SlashMenu slash={slash} items={filtered} onPick={(it) => applyType(slash.id, it)} setSlash={setSlash} />
      )}

      {toast && <div className="fab-hint show" style={{ bottom: 24 }}>{toast}</div>}

      {fmt && <FormatBar pos={fmt} cmd={fmtCmd} code={fmtCode} link={fmtLink} clear={fmtClear} />}

      {comments && <CommentsPanel docId={docId} blocks={blocks} focusBlock={comments.block} onClose={() => setComments(null)} />}
    </div>
  );
}

function BlockRow({ block: b, idx, num, elsRef, rowsRef, api, onInput, onKeyDown, onBlur, onToggleTodo, onAddAfter, onDelete, onDuplicate, onTurnInto, isCollapsed, onToggleCollapse, drag, setDrag, onDrop }) {
  const [menu, setMenu] = useStateE(null);
  const overTop = drag.overId === b.id && drag.pos === "top";
  const overBot = drag.overId === b.id && drag.pos === "bot";
  const isHeading = !!HEAD_LV[b.type];

  const ref = (el) => { if (el) { elsRef.current[b.id] = el; el.dataset.bid = b.id; if (el.dataset.init !== "1") { el.innerHTML = b.html != null ? b.html : escapeHtml(b.text); el.dataset.init = "1"; el.dataset.empty = (b.text && b.text.length) ? "false" : "true"; } } };

  const editable = (extraClass = "", placeholder = "Escribe algo, o pulsa «/» para comandos") => (
    <div
      className={"block " + extraClass}
      contentEditable suppressContentEditableWarning
      ref={ref}
      data-placeholder={placeholder}
      onInput={(e) => onInput(b.id, e)}
      onKeyDown={(e) => onKeyDown(b.id, idx, e)}
      onBlur={(e) => { e.currentTarget.dataset.empty = "false"; onBlur(b.id); }}
      onFocus={(e) => { e.currentTarget.dataset.empty = e.currentTarget.innerText.length ? "false" : "true"; }}
    ></div>
  );

  let inner;
  if (RICH_TYPES.has(b.type)) inner = <RichBlock b={b} api={api} />;
  else if (b.type === "divider") inner = <div className="divider-block"><hr /></div>;
  else if (b.type === "image") inner = <div className="img-block" style={{ height: 200, background: window.MIKION_DATA.COVERS.sand }}></div>;
  else if (b.type === "todo") inner = (
    <>
      <span className={"todo-check" + (b.checked ? " checked" : "")} contentEditable={false} onClick={() => onToggleTodo(b.id)}>
        {b.checked && <Icon name="checkSmall" size={13} stroke={2.6} />}
      </span>
      {editable("todo" + (b.checked ? " todo-done" : ""), "Tarea pendiente")}
    </>
  );
  else if (b.type === "bullet") inner = (<><span className="bullet-mark" contentEditable={false}>•</span>{editable("", "Elemento de lista")}</>);
  else if (b.type === "num") inner = (<><span className="num-mark" contentEditable={false}>{num}.</span>{editable("", "Elemento de lista")}</>);
  else if (b.type === "callout") inner = (<div className="callout"><span className="callout-emoji" contentEditable={false}>{b.emoji}</span>{editable("", "Escribe una nota destacada")}</div>);
  else if (b.type === "code") inner = editable("code", "Código");
  else if (b.type === "quote") inner = editable("quote", "Cita");
  else if (b.type === "h1") inner = editable("h1", "Título 1");
  else if (b.type === "h2") inner = editable("h2", "Título 2");
  else if (b.type === "h3") inner = editable("h3", "Título 3");
  else inner = editable("", "Escribe algo, o pulsa «/» para comandos");

  return (
    <div
      ref={(el) => { if (el && rowsRef) rowsRef.current[b.id] = el; }}
      className={"block-row" + (overTop ? " drag-over-top" : "") + (overBot ? " drag-over-bot" : "") + (drag.id === b.id ? " dragging" : "")}
      onDragOver={(e) => { if (drag.id) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); const pos = (e.clientY - r.top) < r.height / 2 ? "top" : "bot"; if (drag.overId !== b.id || drag.pos !== pos) setDrag(d => ({ ...d, overId: b.id, pos })); } }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      <div className="block-gutter" contentEditable={false}>
        <span className="gutter-btn" title="Añadir bloque" onClick={() => onAddAfter(b.id)}><Icon name="plus" size={16} /></span>
        <span
          className="gutter-btn drag" title="Arrastra para mover · clic para opciones"
          draggable
          onDragStart={(e) => { setDrag({ id: b.id, overId: null, pos: null }); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", b.id); }}
          onDragEnd={() => setDrag({ id: null, overId: null, pos: null })}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom + 4 }); }}
        ><Icon name="grip" size={15} /></span>
      </div>
      {isHeading && <span className="head-collapse" contentEditable={false} onClick={() => onToggleCollapse(b.id)} title={isCollapsed ? "Mostrar" : "Plegar"}><Icon name="chevronRight" size={15} style={{ transform: isCollapsed ? "none" : "rotate(90deg)" }} /></span>}
      {inner}

      {menu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setMenu(null)}></div>
          <div className="popover menu" style={{ left: menu.x, top: menu.y, zIndex: 100 }}>
            <div className="menu-label">Convertir en</div>
            <div style={{ display: "flex", gap: 4, padding: "0 6px 6px", flexWrap: "wrap" }}>
              {["text","h1","h2","h3","todo","bullet"].map(t => (
                <span key={t} className="slash-ico" style={{ width: 34, height: 30, cursor: "pointer" }} title={t}
                  onClick={() => { onTurnInto(b.id, t); setMenu(null); }}>
                  <Icon name={t === "text" ? "type" : t === "bullet" ? "list" : t} size={16} />
                </span>
              ))}
            </div>
            <div className="menu-sep"></div>
            <div className="menu-item" onClick={() => { onAddAfter(b.id); setMenu(null); }}><span className="mi-ico"><Icon name="plus" size={16} /></span> Añadir debajo</div>
            <div className="menu-item" onClick={() => { api.openComments(b.id); setMenu(null); }}><span className="mi-ico"><Icon name="comment" size={16} /></span> Comentar</div>
            <div className="menu-item" onClick={() => { onDuplicate(b.id); setMenu(null); }}><span className="mi-ico"><Icon name="duplicate" size={16} /></span> Duplicar</div>
            <div className="menu-sep"></div>
            <div className="menu-item danger" onClick={() => { onDelete(b.id); setMenu(null); }}><span className="mi-ico"><Icon name="trash" size={16} /></span> Eliminar</div>
          </div>
        </>
      )}
    </div>
  );
}

function SlashMenu({ slash, items, onPick, setSlash }) {
  const y = Math.min(slash.y, window.innerHeight - 380);
  const x = Math.min(slash.x, window.innerWidth - 320);
  return (
    <div className="popover slash-menu" style={{ left: Math.max(8, x), top: y }} onMouseDown={(e) => e.preventDefault()}>
      {CAT_ORDER.map((cat) => {
        const inCat = items.filter(it => it.cat === cat);
        if (!inCat.length) return null;
        return (
          <div key={cat}>
            <div className="slash-cat">{cat}</div>
            {inCat.map((it) => {
              const globalIdx = items.indexOf(it);
              return (
                <div key={globalIdx} className={"slash-item" + (globalIdx === slash.idx ? " active" : "")}
                  onMouseEnter={() => setSlash(s => ({ ...s, idx: globalIdx }))}
                  onClick={() => onPick(it)}>
                  <span className="slash-ico"><Icon name={it.icon} size={18} /></span>
                  <div style={{ minWidth: 0 }}><div className="slash-tt">{it.title}</div><div className="slash-desc">{it.desc}</div></div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FormatBar({ pos, cmd, code, link, clear }) {
  const [colors, setColors] = useStateE(false);
  const left = Math.max(120, Math.min(pos.x, window.innerWidth - 120));
  const TEXT_COLORS = [["Por defecto", "inherit"], ["Terracota", "#c75c37"], ["Azul", "#2f6bb0"], ["Verde", "#2f7d56"], ["Morado", "#7a51c2"], ["Rosa", "#c14b73"]];
  const HL_COLORS = [["Ninguno", "transparent"], ["Amarillo", "#f7ecc9"], ["Verde", "#dcefe0"], ["Azul", "#dbe8f6"], ["Rosa", "#f8e0e8"], ["Naranja", "#f7e2d2"]];
  return (
    <div className="fmtbar" style={{ left, top: pos.y }} onMouseDown={(e) => e.preventDefault()}>
      <button className="fb-btn" title="Negrita (⌘B)" onClick={() => cmd("bold")} style={{ fontWeight: 800 }}>B</button>
      <button className="fb-btn" title="Cursiva (⌘I)" onClick={() => cmd("italic")} style={{ fontStyle: "italic", fontFamily: "var(--serif)" }}>i</button>
      <button className="fb-btn" title="Subrayado (⌘U)" onClick={() => cmd("underline")} style={{ textDecoration: "underline" }}>U</button>
      <button className="fb-btn" title="Tachado" onClick={() => cmd("strikeThrough")} style={{ textDecoration: "line-through" }}>S</button>
      <button className="fb-btn" title="Código en línea" onClick={code}><Icon name="code" size={15} /></button>
      <span className="fb-sep"></span>
      <button className="fb-btn" title="Enlace" onClick={link}><Icon name="link" size={15} /></button>
      <div className="fb-colorwrap">
        <button className="fb-btn" title="Color y resaltado" onClick={() => setColors(c => !c)}><span className="fb-A">A</span><Icon name="chevronDown" size={11} /></button>
        {colors && (
          <div className="fb-colors" onMouseDown={(e) => e.preventDefault()}>
            <div className="fb-col-label">Color de texto</div>
            <div className="fb-swatches">
              {TEXT_COLORS.map(([n, c]) => <span key={n} className="fb-sw" title={n} style={{ color: c === "inherit" ? "var(--ink)" : c }} onClick={() => { cmd("foreColor", c === "inherit" ? "#232019" : c); setColors(false); }}>A</span>)}
            </div>
            <div className="fb-col-label">Resaltado</div>
            <div className="fb-swatches">
              {HL_COLORS.map(([n, c]) => <span key={n} className="fb-sw hl" title={n} style={{ background: c === "transparent" ? "var(--surface)" : c, border: "1px solid var(--line)" }} onClick={() => { cmd("hiliteColor", c); setColors(false); }}></span>)}
            </div>
            <div className="fb-clear" onClick={() => { clear(); setColors(false); }}>Quitar formato</div>
          </div>
        )}
      </div>
    </div>
  );
}

window.Editor = Editor;
