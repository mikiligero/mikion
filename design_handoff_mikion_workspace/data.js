/* ============================================================
   MIKION — Mock workspace data
   ============================================================ */
(function () {
  // Cover gradients (warm, editorial)
  const COVERS = {
    clay:   "linear-gradient(115deg, #d98a5e 0%, #c75c37 55%, #ab4a2a 100%)",
    sage:   "linear-gradient(120deg, #aebf9a 0%, #7c9a6e 100%)",
    dusk:   "linear-gradient(120deg, #9a8bbf 0%, #6f5f9e 100%)",
    sand:   "linear-gradient(120deg, #e8d9bd 0%, #cdb487 100%)",
    slate:  "linear-gradient(120deg, #8aa0ae 0%, #5d7383 100%)",
    rose:   "linear-gradient(120deg, #e0a3b0 0%, #c46f86 100%)",
    teal:   "linear-gradient(120deg, #8fc4be 0%, #4f998f 100%)",
    night:  "linear-gradient(120deg, #4a4540 0%, #2c2824 100%)",
  };

  const people = [
    { id: "u1", name: "Tú", initials: "TÚ", color: "#c75c37" },
    { id: "u2", name: "Lucía Fernández", initials: "LF", color: "#7a51c2" },
    { id: "u3", name: "Marco Rivas", initials: "MR", color: "#2f6bb0" },
    { id: "u4", name: "Ana Soto", initials: "AS", color: "#2f7d56" },
    { id: "u5", name: "Diego Pardo", initials: "DP", color: "#b9802a" },
  ];

  // Tag palettes map to CSS tints
  const TAGS = {
    "En curso":     { t: "var(--t-blue)", bg: "var(--bg-blue)" },
    "Por hacer":    { t: "var(--t-gray)", bg: "var(--bg-gray)" },
    "En revisión":  { t: "var(--t-amber)", bg: "var(--bg-amber)" },
    "Hecho":        { t: "var(--t-green)", bg: "var(--bg-green)" },
    "Pausado":      { t: "var(--t-rose)", bg: "var(--bg-rose)" },
    "Alta":         { t: "var(--t-rose)", bg: "var(--bg-rose)" },
    "Media":        { t: "var(--t-amber)", bg: "var(--bg-amber)" },
    "Baja":         { t: "var(--t-gray)", bg: "var(--bg-gray)" },
    "Diseño":       { t: "var(--t-purple)", bg: "var(--bg-purple)" },
    "Ingeniería":   { t: "var(--t-blue)", bg: "var(--bg-blue)" },
    "Marketing":    { t: "var(--t-teal)", bg: "var(--bg-teal)" },
    "Producto":     { t: "var(--t-green)", bg: "var(--bg-green)" },
    "Investigación":{ t: "var(--t-amber)", bg: "var(--bg-amber)" },
  };

  // ---- Documents ----
  const docs = {
    "d-okr": {
      emoji: "🎯", title: "OKRs · Q3 2026", cover: COVERS.clay,
      blocks: [
        { type: "callout", emoji: "📌", text: "Estos son los objetivos del trimestre. Revísalos cada lunes en la reunión de equipo." },
        { type: "h1", text: "Objetivo 1 — Lanzar la beta pública" },
        { type: "text", text: "Queremos abrir el producto a 500 usuarios seleccionados antes de fin de trimestre, con un onboarding pulido y métricas de activación medibles." },
        { type: "todo", text: "Cerrar el flujo de invitaciones", checked: true },
        { type: "todo", text: "Onboarding interactivo de 3 pasos", checked: true },
        { type: "todo", text: "Panel de métricas de activación", checked: false },
        { type: "todo", text: "Documentar el proceso de soporte", checked: false },
        { type: "h2", text: "Resultados clave" },
        { type: "bullet", text: "500 usuarios activos en la beta" },
        { type: "bullet", text: "40% de activación en la primera semana" },
        { type: "bullet", text: "NPS ≥ 40 entre los primeros usuarios" },
        { type: "h1", text: "Objetivo 2 — Solidez técnica" },
        { type: "quote", text: "Lo que no se mide, no se mejora. Instrumentemos antes de escalar." },
        { type: "todo", text: "Cobertura de tests al 70%", checked: false },
        { type: "todo", text: "Tiempo de carga inicial < 1.5s", checked: true },
        { type: "divider" },
        { type: "h3", text: "Notas de la última revisión" },
        { type: "text", text: "El equipo de diseño va por delante; ingeniería necesita una semana extra para el panel de métricas. Marco lo confirmará el viernes." },
      ],
    },
    "d-prd": {
      emoji: "📐", title: "PRD · Editor de bloques", cover: COVERS.dusk,
      blocks: [
        { type: "text", text: "Documento de requisitos para el nuevo editor. Estado: en revisión." },
        { type: "h1", text: "Contexto" },
        { type: "text", text: "El editor es el corazón del producto. Debe sentirse instantáneo, permitir bloques anidados y soportar el menú de inserción con «/»." },
        { type: "h2", text: "Requisitos funcionales" },
        { type: "num", text: "Escribir y editar texto enriquecido en bloques independientes" },
        { type: "num", text: "Insertar bloques con el menú «/»" },
        { type: "num", text: "Reordenar bloques arrastrando" },
        { type: "num", text: "Listas de tareas con casillas" },
        { type: "code", text: "function insertarBloque(tipo, indice) {\n  bloques.splice(indice + 1, 0, crearBloque(tipo));\n  enfocar(indice + 1);\n}" },
        { type: "callout", emoji: "⚠️", text: "Pendiente: definir el comportamiento del bloque de tabla embebida. Lucía lo revisa esta semana." },
        { type: "h2", text: "Fuera de alcance (v1)" },
        { type: "bullet", text: "Comentarios en línea" },
        { type: "bullet", text: "Colaboración en tiempo real" },
        { type: "bullet", text: "Historial de versiones" },
      ],
    },
    "d-notas": {
      emoji: "📝", title: "Notas de reunión", cover: COVERS.sage,
      blocks: [
        { type: "text", text: "Lunes, 8 de junio · Reunión semanal de producto" },
        { type: "h2", text: "Asistentes" },
        { type: "text", text: "Lucía, Marco, Ana, Diego y tú." },
        { type: "h2", text: "Temas" },
        { type: "todo", text: "Revisar feedback de la beta", checked: true },
        { type: "todo", text: "Priorizar el backlog de julio", checked: false },
        { type: "todo", text: "Decidir fecha de lanzamiento", checked: false },
        { type: "h3", text: "Decisiones" },
        { type: "bullet", text: "El lanzamiento se mueve al 15 de julio" },
        { type: "bullet", text: "Diego lidera la campaña de prensa" },
        { type: "quote", text: "Prefiero retrasar una semana que lanzar algo que no estamos orgullosos de mostrar." },
      ],
    },
    "d-bienvenida": {
      emoji: "👋", title: "Bienvenido a Mikion", cover: COVERS.teal,
      blocks: [
        { type: "text", text: "Mikion es tu espacio para pensar, escribir y organizar. Esta página te muestra lo básico." },
        { type: "h1", text: "Lo esencial" },
        { type: "text", text: "Escribe en cualquier parte. Pulsa «/» para insertar imágenes, listas, tareas y más." },
        { type: "todo", text: "Prueba a marcar esta casilla", checked: false },
        { type: "todo", text: "Pulsa «/» en una línea vacía", checked: false },
        { type: "todo", text: "Abre la búsqueda con ⌘K", checked: false },
        { type: "callout", emoji: "💡", text: "Pasa el cursor sobre cualquier bloque para arrastrarlo con el punto de la izquierda." },
        { type: "h2", text: "Organiza con bases de datos" },
        { type: "text", text: "Crea tablas que también puedes ver como tablero kanban o calendario. Mira «Proyectos» en la barra lateral." },
      ],
    },
    "d-viaje": {
      emoji: "✈️", title: "Viaje a Lisboa", cover: COVERS.sand,
      blocks: [
        { type: "text", text: "Escapada de fin de semana, 12–15 de septiembre." },
        { type: "h2", text: "Por hacer" },
        { type: "todo", text: "Reservar vuelos", checked: true },
        { type: "todo", text: "Reservar hotel en Alfama", checked: false },
        { type: "todo", text: "Lista de restaurantes", checked: false },
        { type: "h2", text: "Imprescindibles" },
        { type: "bullet", text: "Mirador de Santa Catarina al atardecer" },
        { type: "bullet", text: "Pastéis de Belém" },
        { type: "bullet", text: "Tranvía 28" },
      ],
    },
    "d-recetas": {
      emoji: "🍳", title: "Recetas favoritas", cover: COVERS.rose,
      blocks: [
        { type: "h2", text: "Pasta al limón" },
        { type: "text", text: "Rápida, para noches de entre semana." },
        { type: "bullet", text: "Espaguetis · 200g" },
        { type: "bullet", text: "Un limón · ralladura y zumo" },
        { type: "bullet", text: "Parmesano · un puñado" },
        { type: "quote", text: "El truco está en el agua de cocción: reserva una taza." },
      ],
    },
    "d-lecturas": {
      emoji: "📚", title: "Lista de lecturas", cover: COVERS.slate,
      blocks: [
        { type: "text", text: "Lo que quiero leer este año." },
        { type: "todo", text: "El infinito en un junco — Irene Vallejo", checked: true },
        { type: "todo", text: "Pensar rápido, pensar despacio", checked: false },
        { type: "todo", text: "La librería ambulante", checked: false },
      ],
    },
  };

  // ---- Sidebar tree ----
  const tree = [
    { id: "d-bienvenida", emoji: "👋", title: "Bienvenido a Mikion" },
    { id: "d-okr", emoji: "🎯", title: "OKRs · Q3 2026", children: [
        { id: "d-notas", emoji: "📝", title: "Notas de reunión" },
        { id: "d-prd", emoji: "📐", title: "PRD · Editor de bloques" },
    ]},
    { id: "db-proyectos", emoji: "🗂️", title: "Proyectos", kind: "database" },
    { id: "cal-equipo", emoji: "📅", title: "Calendario del equipo", kind: "calendar" },
  ];

  const privateTree = [
    { id: "d-viaje", emoji: "✈️", title: "Viaje a Lisboa" },
    { id: "d-recetas", emoji: "🍳", title: "Recetas favoritas" },
    { id: "d-lecturas", emoji: "📚", title: "Lista de lecturas" },
  ];

  // ---- Database: Proyectos ----
  const projects = {
    title: "Proyectos", emoji: "🗂️",
    desc: "Todo lo que el equipo está construyendo este trimestre.",
    rows: [
      { id: "p1", emoji: "🚀", title: "Lanzamiento beta pública", status: "En curso", priority: "Alta", area: "Producto", assignee: "u1", due: "2026-06-18", cover: COVERS.clay },
      { id: "p2", emoji: "🎨", title: "Rediseño del editor", status: "En curso", priority: "Alta", area: "Diseño", assignee: "u2", due: "2026-06-15", cover: COVERS.dusk },
      { id: "p3", emoji: "📊", title: "Panel de métricas", status: "Por hacer", priority: "Media", area: "Ingeniería", assignee: "u3", due: "2026-06-25", cover: COVERS.teal },
      { id: "p4", emoji: "🔍", title: "Investigación de usuarios", status: "En revisión", priority: "Media", area: "Investigación", assignee: "u4", due: "2026-06-12", cover: COVERS.sand },
      { id: "p5", emoji: "📣", title: "Campaña de prensa", status: "Por hacer", priority: "Baja", area: "Marketing", assignee: "u5", due: "2026-07-01", cover: COVERS.rose },
      { id: "p6", emoji: "🧪", title: "Suite de tests E2E", status: "En curso", priority: "Media", area: "Ingeniería", assignee: "u3", due: "2026-06-20", cover: COVERS.slate },
      { id: "p7", emoji: "📱", title: "App móvil — fase 1", status: "Pausado", priority: "Baja", area: "Producto", assignee: "u1", due: "2026-07-10", cover: COVERS.sage },
      { id: "p8", emoji: "🧭", title: "Onboarding interactivo", status: "Hecho", priority: "Alta", area: "Diseño", assignee: "u2", due: "2026-06-05", cover: COVERS.night },
      { id: "p9", emoji: "🔐", title: "Auditoría de seguridad", status: "Hecho", priority: "Media", area: "Ingeniería", assignee: "u3", due: "2026-06-02", cover: COVERS.slate },
    ],
    statusOrder: ["Por hacer", "En curso", "En revisión", "Hecho", "Pausado"],
  };

  // ---- Calendar events (June 2026) ----
  const events = [
    { date: "2026-06-02", title: "Auditoría de seguridad", color: "var(--t-blue)" },
    { date: "2026-06-05", title: "Demo de onboarding", color: "var(--t-purple)" },
    { date: "2026-06-08", title: "Reunión de producto", color: "var(--t-green)" },
    { date: "2026-06-10", title: "1:1 con Lucía", color: "var(--t-rose)" },
    { date: "2026-06-12", title: "Entrega: investigación", color: "var(--t-amber)" },
    { date: "2026-06-13", title: "Revisión de diseño", color: "var(--t-purple)" },
    { date: "2026-06-15", title: "Deadline: editor", color: "var(--t-rose)" },
    { date: "2026-06-15", title: "Comida de equipo", color: "var(--t-teal)" },
    { date: "2026-06-18", title: "🚀 Lanzamiento beta", color: "var(--t-blue)" },
    { date: "2026-06-20", title: "Retro de sprint", color: "var(--t-green)" },
    { date: "2026-06-22", title: "Planificación julio", color: "var(--t-amber)" },
    { date: "2026-06-25", title: "Entrega: métricas", color: "var(--t-blue)" },
    { date: "2026-06-29", title: "Llamada con prensa", color: "var(--t-teal)" },
  ];

  window.MIKION_DATA = { people, peopleById: Object.fromEntries(people.map(p => [p.id, p])), TAGS, COVERS, docs, tree, privateTree, projects, events };
})();
