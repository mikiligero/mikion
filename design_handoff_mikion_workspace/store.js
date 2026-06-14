/* ============================================================
   MIKION — Central store with localStorage persistence
   ============================================================ */
(function () {
  const KEY = "mikion_v2";
  const D = window.MIKION_DATA;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function defaults() {
    return {
      theme: "light",
      textScale: 1,
      docs: clone(D.docs),
      rowDocs: {},                    // overrides for project-detail pages, by row id
      rows: clone(D.projects.rows),   // database rows
      tree: clone(D.tree),            // team space tree
      privateTree: clone(D.privateTree),
      schema: [
        { id: "title", name: "Nombre", type: "title", icon: "fileText" },
        { id: "status", name: "Estado", type: "status", icon: "dot", options: ["Por hacer", "En curso", "En revisión", "Hecho", "Pausado"] },
        { id: "priority", name: "Prioridad", type: "select", icon: "flag", options: ["Alta", "Media", "Baja"] },
        { id: "area", name: "Área", type: "select", icon: "zap", options: ["Producto", "Diseño", "Ingeniería", "Marketing", "Investigación"] },
        { id: "assignee", name: "Responsable", type: "person", icon: "users" },
        { id: "due", name: "Entrega", type: "date", icon: "calendar" },
        { id: "daysleft", name: "Días restantes", type: "formula", icon: "sigma", formula: "daysLeft" },
      ],
      homeTasks: [
        { t: "Revisar feedback de la beta", done: false, tag: "Producto" },
        { t: "Aprobar el rediseño del editor", done: false, tag: "Diseño" },
        { t: "Preparar la demo del viernes", done: true, tag: "Producto" },
        { t: "Responder a la entrevista de prensa", done: false, tag: "Marketing" },
        { t: "Cerrar el panel de métricas", done: false, tag: "Ingeniería" },
      ],
      favorites: [],
      comments: {
        "d-okr": [
          { id: "c-seed1", blockId: null, author: "u2", text: "¿Confirmamos la fecha de la beta antes del lunes?", time: "Hace 1 h", resolved: false, replies: [{ author: "u1", text: "Sí, el 18 de junio.", time: "Hace 40 min" }] },
        ],
      },
      seq: 1,
    };
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? Object.assign(defaults(), JSON.parse(raw)) : defaults();
  } catch (e) { state = defaults(); }

  const subs = new Set();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function set(up) {
    state = typeof up === "function" ? up(state) : Object.assign({}, state, up);
    save();
    subs.forEach((f) => f());
  }

  // ---- tree helpers ----
  function walkUpdate(nodes, id, patch) {
    let found = false;
    const out = nodes.map((n) => {
      if (n.id === id) { found = true; return { ...n, ...patch }; }
      if (n.children) {
        const r = walkUpdate(n.children, id, patch);
        if (r.found) { found = true; return { ...n, children: r.nodes }; }
      }
      return n;
    });
    return { nodes: out, found };
  }
  function addChildTo(nodes, parentId, child) {
    let found = false;
    const out = nodes.map((n) => {
      if (n.id === parentId) { found = true; return { ...n, children: [...(n.children || []), child] }; }
      if (n.children) {
        const r = addChildTo(n.children, parentId, child);
        if (r.found) { found = true; return { ...n, children: r.nodes }; }
      }
      return n;
    });
    return { nodes: out, found };
  }

  window.MikionStore = {
    get: () => state,
    set,
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} state = defaults(); subs.forEach((f) => f()); },

    // ---- domain actions ----
    setTheme(theme) { set((s) => ({ ...s, theme })); },
    toggleTheme() { set((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" })); },
    setTextScale(textScale) { set((s) => ({ ...s, textScale })); },

    persistDoc(docId, patch) {
      set((s) => {
        if (docId.startsWith("row-")) {
          const rid = docId.slice(4);
          return { ...s, rowDocs: { ...s.rowDocs, [rid]: { ...(s.rowDocs[rid] || {}), ...patch } } };
        }
        return { ...s, docs: { ...s.docs, [docId]: { ...s.docs[docId], ...patch } } };
      });
    },

    renameDoc(docId, title) {
      set((s) => {
        const docs = { ...s.docs, [docId]: { ...s.docs[docId], title } };
        const t = walkUpdate(s.tree, docId, { title });
        const p = walkUpdate(s.privateTree, docId, { title });
        return { ...s, docs, tree: t.nodes, privateTree: p.nodes };
      });
    },

    setDocMeta(docId, patch) {
      set((s) => {
        if (docId.startsWith("row-")) {
          const rid = docId.slice(4);
          return { ...s, rowDocs: { ...s.rowDocs, [rid]: { ...(s.rowDocs[rid] || {}), ...patch } } };
        }
        const docs = { ...s.docs, [docId]: { ...s.docs[docId], ...patch } };
        let tree = s.tree, priv = s.privateTree;
        if (patch.emoji) { tree = walkUpdate(s.tree, docId, { emoji: patch.emoji }).nodes; priv = walkUpdate(s.privateTree, docId, { emoji: patch.emoji }).nodes; }
        return { ...s, docs, tree, privateTree: priv };
      });
    },

    createPage(parentId, tpl) {
      const id = "doc-" + (Date.now().toString(36)) + Math.floor(Math.random() * 1e3).toString(36);
      const covers = Object.values(D.COVERS);
      const cover = tpl && tpl.cover ? (D.COVERS[tpl.cover] || tpl.cover) : covers[Math.floor(Math.random() * covers.length)];
      const emoji = tpl ? tpl.emoji : "📄";
      const title = tpl ? tpl.name : "Página sin título";
      const blocks = tpl ? JSON.parse(JSON.stringify(tpl.blocks)) : [{ type: "text", text: "" }];
      set((s) => {
        const newDoc = { emoji, title, cover, blocks };
        const node = { id, emoji, title };
        let tree = s.tree, priv = s.privateTree;
        if (parentId) {
          const t = addChildTo(s.tree, parentId, node);
          if (t.found) tree = t.nodes;
          else { const p = addChildTo(s.privateTree, parentId, node); if (p.found) priv = p.nodes; else priv = [...s.privateTree, node]; }
        } else {
          priv = [...s.privateTree, node];
        }
        return { ...s, docs: { ...s.docs, [id]: newDoc }, tree, privateTree: priv };
      });
      return id;
    },

    setRows(updater) { set((s) => ({ ...s, rows: typeof updater === "function" ? updater(s.rows) : updater })); },

    addComment(docId, blockId, text) {
      const th = { id: "c" + Date.now().toString(36), blockId, author: "u1", text, time: "ahora", resolved: false, replies: [] };
      set((s) => ({ ...s, comments: { ...s.comments, [docId]: [...((s.comments || {})[docId] || []), th] } }));
    },
    addReply(docId, threadId, text) {
      set((s) => ({ ...s, comments: { ...s.comments, [docId]: ((s.comments || {})[docId] || []).map((t) => t.id === threadId ? { ...t, replies: [...t.replies, { author: "u1", text, time: "ahora" }] } : t) } }));
    },
    resolveComment(docId, threadId) {
      set((s) => ({ ...s, comments: { ...s.comments, [docId]: ((s.comments || {})[docId] || []).map((t) => t.id === threadId ? { ...t, resolved: !t.resolved } : t) } }));
    },

    setCell(rowId, propId, value) { set((s) => ({ ...s, rows: s.rows.map((r) => r.id === rowId ? { ...r, [propId]: value } : r) })); },
    addProperty(prop) {
      const id = prop.id || ("prop" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36));
      set((s) => ({ ...s, schema: [...s.schema, { ...prop, id }] }));
      return id;
    },
    updateProperty(id, patch) { set((s) => ({ ...s, schema: s.schema.map((p) => p.id === id ? { ...p, ...patch } : p) })); },
    deleteProperty(id) { set((s) => ({ ...s, schema: s.schema.filter((p) => p.id !== id) })); },
    addSelectOption(propId, opt) { set((s) => ({ ...s, schema: s.schema.map((p) => p.id === propId ? { ...p, options: [...(p.options || []), opt] } : p) })); },

    addRow(status) {
      const id = "p" + Date.now().toString(36);
      const covers = Object.values(D.COVERS);
      const row = {
        id, emoji: "📌", title: "Nuevo proyecto",
        status: status || "Por hacer", priority: "Media", area: "Producto",
        assignee: "u1", due: "2026-06-30", cover: covers[Math.floor(Math.random() * covers.length)],
      };
      set((s) => ({ ...s, rows: [...s.rows, row] }));
      return id;
    },

    addRowWith(over, blocks) {
      const id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);
      const covers = Object.values(D.COVERS);
      const row = Object.assign({ id, emoji: "📌", title: "Sin título", status: "Por hacer", priority: "Media", area: "Producto", assignee: "u1", due: "2026-06-30", cover: covers[Math.floor(Math.random() * covers.length)] }, over || {});
      set((s) => {
        const rowDocs = blocks ? { ...s.rowDocs, [id]: { blocks } } : s.rowDocs;
        return { ...s, rows: [...s.rows, row], rowDocs };
      });
      return id;
    },

    setHomeTasks(updater) { set((s) => ({ ...s, homeTasks: typeof updater === "function" ? updater(s.homeTasks) : updater })); },

    toggleFavorite(id) {
      set((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }));
    },
  };
})();
