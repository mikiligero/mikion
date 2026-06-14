/* ============================================================
   MIKION — Icon set (Lucide-style line icons)
   ============================================================ */
const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  plusSmall: '<path d="M12 6v12M6 12h12"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronsLeft: '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
  fileText: '<path d="M14 3v5h5"/><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M9 13h6M9 17h6"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkSmall: '<path d="M18 7 9.5 15.5 5 11"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  type: '<path d="M4 6.5V5h16v1.5M9 19h6M12 5v14"/>',
  h1: '<path d="M4 6v12M12 6v12M4 12h8"/><path d="M17 10.5 19.5 9V18"/>',
  h2: '<path d="M4 6v12M12 6v12M4 12h8"/><path d="M16.5 11a2 2 0 1 1 3.4 1.4L16.5 18H21"/>',
  h3: '<path d="M4 6v12M12 6v12M4 12h8"/><path d="M16.5 9.5h3.2l-2 3a2 2 0 1 1-1.6 3.2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.1"/><circle cx="3.5" cy="12" r="1.1"/><circle cx="3.5" cy="18" r="1.1"/>',
  listOrdered: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6V3.5L3 4M3 18h2.2M3 16.2c0-1 2-.8 2 .3 0 .6-1 1.2-2 1.5h2"/>',
  todo: '<rect x="3" y="4.5" width="7" height="7" rx="1.6"/><path d="m5 8 1.4 1.4L9 6.5"/><path d="M14 6.5h7M14 12h7M3 16h7M14 17.5h7"/>',
  quote: '<path d="M7 7c-2 0-3 1.5-3 3.5S5.2 14 7 14c0 2-1 3-3 3M18 7c-2 0-3 1.5-3 3.5S16.2 14 18 14c0 2-1 3-3 3"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  minus: '<path d="M5 12h14"/>',
  toggle: '<path d="m9 6 6 6-6 6"/>',
  callout: '<path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2V18h6v-2.5c0-.8.3-1.3 1-2A6 6 0 0 0 12 3Z"/><path d="M9.5 21h5"/>',
  command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
  star: '<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8L6.7 19l1-5.8L3.5 9.2l5.9-.9z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  inbox: '<path d="M3 12h5l1.5 2.5h5L16 12h5"/><path d="M5 6.5 3 12v5.5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V12l-2-5.5a1 1 0 0 0-.9-.5H5.9a1 1 0 0 0-.9.5Z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M16.5 14.4a5.5 5.5 0 0 1 4 5.1"/>',
  cornerDownLeft: '<path d="M9 10 4 15l5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  table: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 9.5h18M3 14.5h18M9 9.5V20M15 9.5V20"/>',
  kanban: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M9 4.5v15M15 4.5v15"/><path d="M6 8.5h0M12 8.5h0M18 8.5h0"/>',
  calDays: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13h0M12 13h0M16.5 13h0M7.5 17h0M12 17h0"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>',
  sort: '<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="15" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M9 15 15 9"/><path d="M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5a4 4 0 0 0 7 0"/><circle cx="9" cy="10" r="0.6"/><circle cx="15" cy="10" r="0.6"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  panelLeft: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M9.5 4.5v15"/>',
  panelLeftOpen: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M9.5 4.5v15"/><path d="m14 9 3 3-3 3"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  pen: '<path d="M16.5 4.5 19.5 7.5 8 19l-4 1 1-4z"/><path d="M14.5 6.5 17.5 9.5"/>',
  flag: '<path d="M5 21V4M5 4l8 1.5 6-1.5v9l-6 1.5L5 13"/>',
  page: '<path d="M14 3v5h5"/><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  moon: '<path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 1.8-2 3M12 16.5h0"/>',
  video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10 6-3.2v10.4l-6-3.2z"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5 16 12l-6 3.5z"/>',
  embed: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="m9.5 9-2.5 3 2.5 3M14.5 9l2.5 3-2.5 3"/>',
  columns: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M12 4.5v15"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  sigma: '<path d="M18 5H7.5l6 7-6 7H18"/>',
  at: '<circle cx="12" cy="12" r="3.8"/><path d="M15.8 8.2v5a2.9 2.9 0 0 0 5.8 0v-1.2a9.6 9.6 0 1 0-3.8 7.6"/>',
  bookmark: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-3.8L5.5 21V4.5a1 1 0 0 1 1-1z"/>',
  attach: '<path d="M20.5 11.5 12 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8"/>',
  sync: '<path d="M20.5 12a8.5 8.5 0 0 1-14.2 6.3L3.5 16M3.5 12a8.5 8.5 0 0 1 14.2-6.3L20.5 8"/><path d="M20.5 4v4h-4M3.5 20v-4h4"/>',
  sparkles: '<path d="M12 3.5 13.7 8 18 9.7 13.7 11.4 12 16l-1.7-4.6L6 9.7 10.3 8z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  timeline: '<path d="M3 6h11M3 12h16M3 18h7"/><circle cx="17.5" cy="6" r="1.6"/><circle cx="9.5" cy="18" r="1.6"/>',
  comment: '<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.9A8.5 8.5 0 1 1 21 11.5Z"/>',
};

function Icon({ name, size = 18, stroke = 1.75, className = "", style = {} }) {
  const p = ICON_PATHS[name];
  if (!p) return null;
  return (
    <svg
      className={className}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: p }}
    />
  );
}

window.Icon = Icon;
