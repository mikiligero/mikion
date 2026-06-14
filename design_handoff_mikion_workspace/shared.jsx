/* ============================================================
   MIKION — Shared bits (Tag, Avatar, helpers)
   ============================================================ */
const { TAGS, peopleById } = window.MIKION_DATA;

const TAG_PALETTE = [
  { t: "var(--t-blue)", bg: "var(--bg-blue)" },
  { t: "var(--t-green)", bg: "var(--bg-green)" },
  { t: "var(--t-amber)", bg: "var(--bg-amber)" },
  { t: "var(--t-purple)", bg: "var(--bg-purple)" },
  { t: "var(--t-rose)", bg: "var(--bg-rose)" },
  { t: "var(--t-teal)", bg: "var(--bg-teal)" },
  { t: "var(--t-gray)", bg: "var(--bg-gray)" },
];
function tagColor(label) {
  if (TAGS[label]) return TAGS[label];
  let h = 0; const s = label || ""; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

function Tag({ label }) {
  if (!label) return <span style={{ color: "var(--ink-ghost)" }}>—</span>;
  const c = tagColor(label);
  return (
    <span className="tag" style={{ color: c.t, background: c.bg }}>
      <span className="dot" style={{ background: c.t }}></span>
      {label}
    </span>
  );
}

function StatusTag({ label }) {
  if (!label) return <span style={{ color: "var(--ink-ghost)" }}>—</span>;
  const c = tagColor(label);
  return <span className="tag" style={{ color: c.t, background: c.bg }}><span className="dot" style={{ background: c.t }}></span>{label}</span>;
}

function Avatar({ id, size = 22 }) {
  const p = peopleById[id];
  if (!p) return null;
  return (
    <span className="avatar" title={p.name}
      style={{ background: p.color, width: size, height: size, fontSize: size * 0.46 }}>
      {p.initials}
    </span>
  );
}

function Person({ id }) {
  const p = peopleById[id];
  if (!p) return <span style={{ color: "var(--ink-ghost)" }}>—</span>;
  return <span className="person"><Avatar id={id} size={20} /><span>{p.name}</span></span>;
}

const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DOW = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function relDate(iso) {
  if (!iso) return "—";
  const today = new Date("2026-06-13T00:00:00");
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) return `En ${diff} días`;
  if (diff < 0) return `Hace ${-diff} días`;
  return fmtDate(iso);
}

function useStore() {
  return React.useSyncExternalStore(window.MikionStore.subscribe, window.MikionStore.get);
}
const Store = window.MikionStore;

Object.assign(window, { Tag, StatusTag, Avatar, Person, fmtDate, relDate, MONTHS, MONTHS_SHORT, DOW, useStore, Store, tagColor });
