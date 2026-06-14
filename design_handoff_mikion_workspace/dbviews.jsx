/* ============================================================
   MIKION — Extra DB views (Timeline / Chart) + modals
   ============================================================ */
const { useState: useV } = React;

/* ---------------- Timeline (Gantt) ---------------- */
function TimelineView({ rows, onOpenRow }) {
  const days = 30, month = 5, year = 2026; // June
  const span = (r) => ({ Alta: 7, Media: 5, Baja: 3 }[r.priority] || 4);
  const dayOf = (iso) => { const d = new Date(iso + "T00:00:00"); return d.getMonth() === month ? d.getDate() : (d < new Date(year, month, 1) ? 1 : days); };
  return (
    <div className="tl-wrap">
      <div className="tl-scroll">
        <div className="tl-axis">
          <div className="tl-name-col">Proyecto</div>
          {Array.from({ length: days }, (_, i) => i + 1).map(n => (
            <div key={n} className={"tl-day" + (n === 14 ? " today" : "") + ([6, 7, 13, 14, 20, 21, 27, 28].includes(n) ? " we" : "")}>{n}</div>
          ))}
        </div>
        {rows.map(r => {
          const end = dayOf(r.due); const start = Math.max(1, end - span(r));
          const c = window.MIKION_DATA.TAGS[r.status] || window.tagColor(r.status);
          return (
            <div key={r.id} className="tl-row" onClick={() => onOpenRow(r)}>
              <div className="tl-name-col"><span>{r.emoji}</span> <span className="tl-name">{r.title}</span></div>
              <div className="tl-track">
                <div className="tl-bar" style={{ left: ((start - 1) / days * 100) + "%", width: ((end - start + 1) / days * 100) + "%", background: "color-mix(in srgb," + c.t + " 22%, var(--surface))", borderLeft: "3px solid " + c.t }}>
                  <span className="tl-bar-label">{r.title}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Chart ---------------- */
function ChartView({ rows }) {
  const [by, setBy] = useV("status");
  const [kind, setKind] = useV("bar");
  const groups = {};
  rows.forEach(r => { const k = r[by] || "—"; groups[k] = (groups[k] || 0) + 1; });
  const entries = Object.entries(groups);
  const max = Math.max(1, ...entries.map(e => e[1]));
  const total = rows.length;
  return (
    <div className="chart-wrap">
      <div className="chart-toolbar">
        <div className="seg">{[["bar", "Barras"], ["donut", "Tarta"]].map(([k, l]) => <button key={k} className={"seg-btn" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>{l}</button>)}</div>
        <div className="seg">{[["status", "Estado"], ["priority", "Prioridad"], ["area", "Área"]].map(([k, l]) => <button key={k} className={"seg-btn" + (by === k ? " on" : "")} onClick={() => setBy(k)}>{l}</button>)}</div>
        <span style={{ marginLeft: "auto", color: "var(--ink-faint)", fontSize: 13 }}>{total} elementos</span>
      </div>
      {kind === "bar" ? (
        <div className="chart-bars">
          {entries.map(([k, v]) => { const c = window.tagColor(k); return (
            <div key={k} className="chart-bar-row">
              <div className="chart-bar-track"><div className="chart-bar" style={{ height: (v / max * 180) + "px", background: c.t }}><span>{v}</span></div></div>
              <div className="chart-bar-label"><Tag label={k} /></div>
            </div>
          ); })}
        </div>
      ) : (
        <div className="chart-donut-wrap">
          <Donut entries={entries} total={total} />
          <div className="chart-legend">{entries.map(([k, v]) => <div key={k} className="cl-row"><Tag label={k} /><span className="cl-val">{v} · {Math.round(v / total * 100)}%</span></div>)}</div>
        </div>
      )}
    </div>
  );
}
function Donut({ entries, total }) {
  let acc = 0; const R = 70, C = 2 * Math.PI * R;
  return (
    <svg width="190" height="190" viewBox="0 0 190 190">
      <circle cx="95" cy="95" r={R} fill="none" stroke="var(--line)" strokeWidth="26" />
      {entries.map(([k, v]) => {
        const frac = v / total; const c = window.tagColor(k);
        const dash = frac * C; const off = acc * C; acc += frac;
        return <circle key={k} cx="95" cy="95" r={R} fill="none" stroke={c.t} strokeWidth="26" strokeDasharray={dash + " " + (C - dash)} strokeDashoffset={-off} transform="rotate(-90 95 95)" />;
      })}
      <text x="95" y="90" textAnchor="middle" fontSize="30" fontWeight="600" fill="var(--ink)" fontFamily="var(--serif)">{total}</text>
      <text x="95" y="112" textAnchor="middle" fontSize="12" fill="var(--ink-faint)">total</text>
    </svg>
  );
}

window.TimelineView = TimelineView;
window.ChartView = ChartView;
