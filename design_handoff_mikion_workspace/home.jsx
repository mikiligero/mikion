/* ============================================================
   MIKION — Home / dashboard
   ============================================================ */
const { useState: useStateH } = React;

function Home({ onNavigate, onOpenRow }) {
  const st = useStore();
  const { docs, events } = window.MIKION_DATA;
  const sdocs = st.docs;
  const recents = ["d-okr", "d-prd", "d-notas", "d-viaje", "d-bienvenida"].filter(id => sdocs[id]).map(id => ({ id, ...sdocs[id] }));
  const recentMeta = ["Hace 2 h", "Ayer", "Hace 3 días", "La semana pasada", "Hace 2 semanas"];

  const tasks = st.homeTasks;
  const toggle = (i) => Store.setHomeTasks(ts => ts.map((x, j) => j === i ? { ...x, done: !x.done } : x));

  const pending = tasks.filter(t => !t.done).length;

  const upcoming = events.filter(e => e.date >= "2026-06-13").slice(0, 6);

  return (
    <div className="home-wrap">
      <div style={{ fontSize: 13.5, color: "var(--ink-faint)", textTransform: "capitalize" }}>Viernes, 13 de junio</div>
      <div className="home-greet">Buenas tardes 👋</div>
      <div className="home-sub">Tienes {pending} {pending === 1 ? "tarea" : "tareas"} pendientes y el lanzamiento de la beta en 5 días.</div>

      <div className="quick-row">
        <button className="quick-btn" onClick={() => onNavigate(Store.createPage(null))}><span className="qb-ico"><Icon name="pen" size={18} /></span> Página en blanco</button>
        <button className="quick-btn" onClick={() => onNavigate("db-proyectos")}><span className="qb-ico"><Icon name="database" size={18} /></span> Nueva base de datos</button>
        <button className="quick-btn" onClick={() => onNavigate("cal-equipo")}><span className="qb-ico"><Icon name="calendar" size={18} /></span> Ver calendario</button>
      </div>

      <div className="home-section-h"><Icon name="clock" size={15} /> Visitado recientemente</div>
      <div className="recent-grid">
        {recents.map((r, i) => (
          <div key={r.id} className="recent-card" onClick={() => onNavigate(r.id)}>
            <div className="rc-cover" style={{ background: r.cover }}></div>
            <div className="rc-body">
              <div className="rc-icon">{r.emoji}</div>
              <div className="rc-title">{r.title}</div>
              <div className="rc-meta">{recentMeta[i]}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="home-twocol" style={{ marginTop: 36 }}>
        <div>
          <div className="home-section-h" style={{ margin: "0 0 8px" }}><Icon name="todo" size={15} /> Mis tareas</div>
          {tasks.map((t, i) => (
            <div key={i} className={"task-line" + (t.done ? " done" : "")} onClick={() => toggle(i)}>
              <span className={"tl-check" + (t.done ? " checked" : "")}>{t.done && <Icon name="checkSmall" size={12} stroke={2.6} />}</span>
              <span className="tl-title">{t.t}</span>
              <Tag label={t.tag} />
            </div>
          ))}
        </div>
        <div>
          <div className="home-section-h" style={{ margin: "0 0 8px" }}><Icon name="calendar" size={15} /> Próximamente</div>
          {upcoming.map((e, i) => {
            const d = new Date(e.date + "T00:00:00");
            return (
              <div key={i} className="task-line" onClick={() => onNavigate("cal-equipo")}>
                <div style={{ width: 38, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase" }}>{MONTHS_SHORT[d.getMonth()]}</div>
                  <div style={{ fontSize: 18, fontWeight: 650, lineHeight: 1, fontFamily: "var(--serif)" }}>{d.getDate()}</div>
                </div>
                <span className="tl-title" style={{ borderLeft: "2px solid " + e.color, paddingLeft: 11 }}>{e.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.Home = Home;
