// Construye un documento exportable (HTML / Markdown) que replica el aspecto de
// la página: portada, icono, título y —en filas de BD— la tabla de propiedades,
// seguido del contenido del editor. Pensado para HTML descargable, impresión a
// PDF (mismo HTML) y Markdown.

export type ExportMeta = {
  /** Id que debe coincidir con el evento `mikion:export` (docId o rowId). */
  id: string;
  title: string;
  emoji?: string | null;
  /** Valor `background` CSS ya resuelto (gradiente o `url(...)`). */
  coverBg?: string | null;
  /** Zoom (%) de la portada. 100 = sin ampliar. */
  coverZoom?: number | null;
  /** Propiedades a mostrar como tabla (filas de base de datos). */
  properties?: { name: string; value: string }[];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXPORT_CSS = `
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#37352f;line-height:1.55;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:760px;margin:0 auto}
.cover{position:relative;width:100%;overflow:hidden}
.cover-img{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;transform-origin:center}
.content{padding:0 32px 80px}
.emoji{font-size:66px;line-height:1;margin:24px 0 0}
.has-cover .emoji{margin-top:-44px}
.title{font-family:Georgia,"Times New Roman",serif;font-size:40px;font-weight:700;
  letter-spacing:-.01em;margin:6px 0 22px}
.props{border-collapse:collapse;width:100%;margin:0 0 26px;font-size:14px}
.props td{border:1px solid #ececea;padding:7px 12px;vertical-align:top}
.props .pk{color:#908f8b;width:210px;white-space:nowrap}
.body img{max-width:100%;height:auto}
.body table{border-collapse:collapse}
.body table td,.body table th{border:1px solid #ececea;padding:6px 10px}
.body pre{background:#f6f5f3;border-radius:6px;padding:12px;overflow:auto}
.body blockquote{border-left:3px solid #d9d8d4;margin:0;padding-left:14px;color:#605f5b}
@page{margin:18mm}
`;

/** Documento HTML autónomo con portada + icono + título + propiedades + cuerpo. */
export function buildExportHtml(meta: ExportMeta, bodyInnerHtml: string): string {
  const title = esc(meta.title?.trim() || "Sin título");
  // Mismo modelo que en la app: >100% amplía (banda fija); <100% la banda crece
  // de alto y la imagen queda a escala 1, mostrando más de la foto.
  const z = meta.coverZoom ?? 100;
  const imageScale = Math.max(z, 100) / 100;
  const bandHeight = Math.round((220 * 100) / Math.min(z, 100));
  const cover = meta.coverBg
    ? `<div class="cover" style="height:${bandHeight}px"><div class="cover-img" style="background:${meta.coverBg};transform:scale(${imageScale})"></div></div>`
    : "";
  const emoji = meta.emoji ? `<div class="emoji">${esc(meta.emoji)}</div>` : "";
  const props =
    meta.properties && meta.properties.length
      ? `<table class="props"><tbody>${meta.properties
          .map(
            (p) =>
              `<tr><td class="pk">${esc(p.name)}</td><td class="pv">${
                esc(p.value) || "—"
              }</td></tr>`
          )
          .join("")}</tbody></table>`
      : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${EXPORT_CSS}</style></head>
<body><main class="page${meta.coverBg ? " has-cover" : ""}">${cover}
<div class="content">${emoji}<h1 class="title">${title}</h1>${props}
<div class="body">${bodyInnerHtml}</div></div></main></body></html>`;
}

/** Markdown con encabezado + propiedades + cuerpo. */
export function buildExportMarkdown(meta: ExportMeta, bodyMd: string): string {
  const parts: string[] = [];
  parts.push(`# ${meta.emoji ? `${meta.emoji} ` : ""}${meta.title?.trim() || "Sin título"}`);
  if (meta.properties && meta.properties.length) {
    parts.push(
      meta.properties.map((p) => `**${p.name}:** ${p.value || "—"}`).join("  \n")
    );
  }
  parts.push(bodyMd.trim());
  return parts.filter(Boolean).join("\n\n") + "\n";
}
