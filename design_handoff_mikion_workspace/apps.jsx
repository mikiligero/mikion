/* ============================================================
   MIKION — Standalone apps: Calendar & Mail
   ============================================================ */
const { useState: useApp } = React;

/* ---------------- Mikion Calendar ---------------- */
const CAL_ACCOUNTS = [
  { name: "Personal", color: "var(--accent)", on: true },
  { name: "Trabajo", color: "var(--t-blue)", on: true },
  { name: "Estudio Mikion", color: "var(--t-green)", on: true },
  { name: "Cumpleaños", color: "var(--t-purple)", on: false },
];
const WEEK_DAYS = [["Lun", 8], ["Mar", 9], ["Mié", 10], ["Jue", 11], ["Vie", 12], ["Sáb", 13], ["Dom", 14]];
const CAL_EVENTS = [
  { d: 0, s: 9, e: 10, t: "Daily de equipo", c: "var(--t-green)" },
  { d: 0, s: 11.5, e: 12.5, t: "1:1 con Lucía", c: "var(--t-blue)" },
  { d: 1, s: 10, e: 11, t: "Revisión de diseño", c: "var(--accent)" },
  { d: 1, s: 14, e: 15.5, t: "Taller de roadmap", c: "var(--t-blue)" },
  { d: 2, s: 9.5, e: 10.5, t: "Café con Marco", c: "var(--accent)" },
  { d: 2, s: 13, e: 14, t: "Comida", c: "var(--t-purple)" },
  { d: 3, s: 11, e: 12, t: "Demo de onboarding", c: "var(--t-green)" },
  { d: 4, s: 9, e: 10, t: "Planificación", c: "var(--t-blue)" },
  { d: 4, s: 15, e: 16, t: "Retro de sprint", c: "var(--t-green)" },
  { d: 5, s: 10, e: 12, t: "🚀 Lanzamiento beta", c: "var(--accent)" },
];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HOUR_H = 54;

function CalendarApp() {
  const [accs, setAccs] = useApp(CAL_ACCOUNTS.map(a => a.on));
  return (
    <div className="app-view">
      <div className="app-bar">
        <div className="app-bar-title"><span className="app-glyph cal"><Icon name="calendar" size={15} /></span> Mikion Calendar</div>
        <div className="seg" style={{ marginLeft: 14 }}>
          <button className="seg-btn">Día</button><button className="seg-btn on">Semana</button><button className="seg-btn">Mes</button>
        </div>
        <div style={{ flex: 1 }}></div>
        <button className="btn-soft sm"><Icon name="chevronRight" size={15} style={{ transform: "rotate(180deg)" }} /></button>
        <button className="btn-soft sm">Hoy</button>
        <button className="btn-soft sm"><Icon name="chevronRight" size={15} /></button>
        <button className="btn-primary sm" style={{ marginLeft: 6 }}><Icon name="plus" size={15} /> Evento</button>
      </div>
      <div className="cal-app-body">
        <div className="cal-side">
          <div className="mini-month">
            <div className="mm-head">junio 2026</div>
            <div className="mm-grid">
              {["L","M","X","J","V","S","D"].map((d,i) => <span key={i} className="mm-dow">{d}</span>)}
              {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                <span key={n} className={"mm-day" + (n === 13 ? " today" : "") + (n >= 8 && n <= 14 ? " inweek" : "")}>{n}</span>
              ))}
            </div>
          </div>
          <div className="cal-acc-title">Mis calendarios</div>
          {CAL_ACCOUNTS.map((a, i) => (
            <div key={a.name} className="cal-acc" onClick={() => setAccs(s => s.map((x, j) => j === i ? !x : x))}>
              <span className="cal-acc-box" style={{ background: accs[i] ? a.color : "transparent", borderColor: a.color }}>{accs[i] && <Icon name="checkSmall" size={11} stroke={3} />}</span>
              <span style={{ flex: 1 }}>{a.name}</span>
            </div>
          ))}
          <div className="avail-card">
            <div className="sr-title" style={{ fontSize: 13 }}><Icon name="clock" size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />Disponibilidad</div>
            <div className="sr-desc" style={{ marginTop: 4 }}>Comparte un enlace para que reserven contigo.</div>
            <button className="btn-soft sm" style={{ marginTop: 9 }}>Crear enlace de reserva</button>
          </div>
        </div>
        <div className="cal-week">
          <div className="cw-head">
            <div className="cw-gutter"></div>
            {WEEK_DAYS.map(([d, n]) => (
              <div key={n} className={"cw-day" + (n === 13 ? " today" : "")}><span className="cw-dow">{d}</span><span className="cw-num">{n}</span></div>
            ))}
          </div>
          <div className="cw-grid-wrap">
            <div className="cw-grid">
              <div className="cw-gutter">
                {HOURS.map(h => <div key={h} className="cw-hour"><span>{h}:00</span></div>)}
              </div>
              {WEEK_DAYS.map(([d, n], di) => (
                <div key={n} className="cw-col">
                  {HOURS.map(h => <div key={h} className="cw-slot"></div>)}
                  {n === 13 && <div className="cw-now" style={{ top: (13.2 - 8) * HOUR_H }}><span></span></div>}
                  {CAL_EVENTS.filter(e => e.d === di).map((e, i) => (
                    <div key={i} className="cw-event" style={{ top: (e.s - 8) * HOUR_H + 1, height: (e.e - e.s) * HOUR_H - 3, background: "color-mix(in srgb, " + e.c + " 16%, var(--surface))", borderLeft: "3px solid " + e.c }}>
                      <div className="cwe-title">{e.t}</div>
                      <div className="cwe-time">{e.s}:00–{e.e}:00</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mikion Mail ---------------- */
const MAIL_FOLDERS = [
  { id: "inbox", name: "Recibidos", icon: "inbox", count: 4 },
  { id: "starred", name: "Destacados", icon: "star" },
  { id: "sent", name: "Enviados", icon: "arrowRight" },
  { id: "drafts", name: "Borradores", icon: "pen", count: 2 },
  { id: "archive", name: "Archivados", icon: "fileText" },
];
const MAIL_CATS = [
  { name: "Equipo", color: "var(--t-green)" },
  { name: "Clientes", color: "var(--t-blue)" },
  { name: "Newsletters", color: "var(--t-purple)" },
];
const EMAILS = [
  { id: 1, who: "u2", from: "Lucía Fernández", subj: "Revisión final del editor", prev: "He dejado comentarios en el PRD, sobre todo en el flujo del menú «/». ¿Lo vemos mañana?", time: "9:24", unread: true, star: true, cat: "Equipo" },
  { id: 2, who: "u5", from: "Diego Pardo", subj: "Borrador de la nota de prensa", prev: "Adjunto el primer borrador para el lanzamiento. Necesito tu visto bueno antes del viernes.", time: "8:10", unread: true, cat: "Equipo" },
  { id: 3, who: "u3", from: "Marco Rivas", subj: "Panel de métricas — datos", prev: "Ya tenemos instrumentada la activación. Te paso el acceso al dashboard.", time: "Ayer", unread: true, cat: "Equipo" },
  { id: 4, who: "u4", from: "Ana Soto", subj: "Resultados de investigación", prev: "Resumen de las 8 entrevistas. Conclusión: el onboarding es el punto débil.", time: "Ayer", unread: true, star: true, cat: "Equipo" },
  { id: 5, who: "u2", from: "Beta de Mikion", subj: "500 usuarios activos 🎉", prev: "Has alcanzado el objetivo de la semana. Mira las métricas de activación.", time: "Mié", cat: "Newsletters" },
  { id: 6, who: "u5", from: "Soporte cliente", subj: "Re: integración con Slack", prev: "Gracias por la respuesta. Funcionó perfectamente, podéis cerrar el ticket.", time: "Mar", cat: "Clientes" },
];

function MailApp() {
  const [folder, setFolder] = useApp("inbox");
  const [sel, setSel] = useApp(1);
  const [summary, setSummary] = useApp("");
  const [loadingSum, setLoadingSum] = useApp(false);
  const email = EMAILS.find(e => e.id === sel);
  const p = window.MIKION_DATA.peopleById[email.who];

  const summarize = async () => {
    setLoadingSum(true); setSummary("");
    let out = "";
    try {
      if (window.claude && window.claude.complete) out = await window.claude.complete(`Resume en 2 frases breves en español este correo. Asunto: "${email.subj}". Cuerpo: "${email.prev}"`);
      else throw 0;
    } catch (e) { await new Promise(r => setTimeout(r, 600)); out = email.prev; }
    setSummary((out || "").trim()); setLoadingSum(false);
  };

  return (
    <div className="app-view">
      <div className="app-bar">
        <div className="app-bar-title"><span className="app-glyph mail"><Icon name="inbox" size={15} /></span> Mikion Mail</div>
        <div style={{ flex: 1 }}></div>
        <div className="mail-search"><Icon name="search" size={15} /><input placeholder="Buscar correo…" /></div>
        <button className="btn-primary sm" style={{ marginLeft: 10 }}><Icon name="pen" size={14} /> Redactar</button>
      </div>
      <div className="mail-body">
        <div className="mail-folders">
          {MAIL_FOLDERS.map(f => (
            <div key={f.id} className={"mail-folder" + (folder === f.id ? " active" : "")} onClick={() => setFolder(f.id)}>
              <Icon name={f.icon} size={16} /><span style={{ flex: 1 }}>{f.name}</span>{f.count && <span className="mf-count">{f.count}</span>}
            </div>
          ))}
          <div className="cal-acc-title" style={{ paddingLeft: 8 }}>Categorías</div>
          {MAIL_CATS.map(c => (
            <div key={c.name} className="mail-folder"><span className="cal-acc-box" style={{ borderColor: c.color, background: c.color }}></span><span style={{ flex: 1 }}>{c.name}</span></div>
          ))}
          <div className="ai-mini"><span className="ai-spark" style={{ width: 22, height: 22 }}><Icon name="sparkles" size={12} /></span> Organizado con IA</div>
        </div>
        <div className="mail-list">
          {EMAILS.map(e => {
            const pp = window.MIKION_DATA.peopleById[e.who];
            return (
              <div key={e.id} className={"mail-item" + (sel === e.id ? " active" : "") + (e.unread ? " unread" : "")} onClick={() => { setSel(e.id); setSummary(""); }}>
                <Avatar id={e.who} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mi-top"><span className="mi-from">{e.from}</span><span className="mi-time">{e.time}</span></div>
                  <div className="mi-subj">{e.star && <Icon name="star" size={12} style={{ color: "var(--accent)", verticalAlign: "-1px", marginRight: 4 }} />}{e.subj}</div>
                  <div className="mi-prev">{e.prev}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mail-read">
          <div className="mr-head">
            <h2>{email.subj}</h2>
            <div className="mr-from"><Avatar id={email.who} size={38} /><div style={{ flex: 1 }}><div className="sr-title">{p.name}</div><div className="sr-desc">para mí · {email.time}</div></div>
              <button className="icon-btn"><Icon name="star" size={17} /></button><button className="icon-btn"><Icon name="more" size={17} /></button></div>
          </div>
          <div className="mr-ai">
            {!summary && !loadingSum && <button className="ai-chip" onClick={summarize}><Icon name="sparkles" size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />Resumir con IA</button>}
            {loadingSum && <span className="ai-loading"><span className="ai-dot"></span><span className="ai-dot"></span><span className="ai-dot"></span> Resumiendo…</span>}
            {summary && <div className="mr-summary"><b>Resumen IA:</b> {summary}</div>}
          </div>
          <div className="mr-body">
            <p>Hola,</p>
            <p>{email.prev}</p>
            <p>Quedo atento a tus comentarios. Si te viene bien, lo vemos mañana a primera hora antes del daily.</p>
            <p>Un saludo,<br />{p.name}</p>
          </div>
          <div className="mr-actions">
            <button className="btn-primary sm"><Icon name="cornerDownLeft" size={14} /> Responder</button>
            <button className="btn-soft sm">Reenviar</button>
            <button className="btn-soft sm"><Icon name="sparkles" size={14} /> Responder con IA</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalendarApp, MailApp });
