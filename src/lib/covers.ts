// Portadas de página: gradientes (sin imágenes), portados del prototipo.
export const COVERS = {
  clay: "linear-gradient(115deg, #d98a5e 0%, #c75c37 55%, #ab4a2a 100%)",
  sage: "linear-gradient(120deg, #aebf9a 0%, #7c9a6e 100%)",
  dusk: "linear-gradient(120deg, #9a8bbf 0%, #6f5f9e 100%)",
  sand: "linear-gradient(120deg, #e8d9bd 0%, #cdb487 100%)",
  slate: "linear-gradient(120deg, #8aa0ae 0%, #5d7383 100%)",
  rose: "linear-gradient(120deg, #e0a3b0 0%, #c46f86 100%)",
  teal: "linear-gradient(120deg, #8fc4be 0%, #4f998f 100%)",
  night: "linear-gradient(120deg, #4a4540 0%, #2c2824 100%)",
} as const;

export type CoverKey = keyof typeof COVERS;
export const COVER_KEYS = Object.keys(COVERS) as CoverKey[];

// Portadas de imagen predefinidas (SVG en /public/covers), seleccionables como
// los gradientes. El valor guardado en `cover` es la ruta (la sirve coverBackground).
export const IMAGE_COVERS: { label: string; url: string }[] = [
  { label: "Espacio", url: "/covers/fondo-espacio.webp" },
  { label: "Aurora", url: "/covers/portada-aurora.webp" },
  { label: "Olas", url: "/covers/portada-olas.webp" },
];

export function isImageCover(cover: string | null): boolean {
  return !!cover && /^(https?:\/\/|\/)/.test(cover);
}

export function clampCoverPosition(position: number | null | undefined): number {
  if (typeof position !== "number" || !Number.isFinite(position)) return 50;
  return Math.min(100, Math.max(0, Math.round(position)));
}

/** Zoom de la portada en %: 100 = «cover» (llena el área). Tope en 300 para no
 * degradar la imagen; por debajo de 100 la imagen se ve más pequeña dejando
 * margen alrededor (fondo de la página). */
export const COVER_ZOOM_MIN = 50;
export const COVER_ZOOM_MAX = 300;
export const COVER_ZOOM_STEP = 10;

export function clampCoverZoom(zoom: number | null | undefined): number {
  if (typeof zoom !== "number" || !Number.isFinite(zoom)) return 100;
  return Math.min(COVER_ZOOM_MAX, Math.max(COVER_ZOOM_MIN, Math.round(zoom)));
}

/** Resuelve el valor `cover` de un doc a un `background` CSS. Acepta:
 * - clave de gradiente conocida (clay…)
 * - una URL/ruta de imagen (http… o /uploads/…) → se envuelve como imagen
 * - un valor literal ya formateado (gradiente) */
export function coverBackground(
  cover: string | null,
  position: number | null | undefined = 50
): string | null {
  if (!cover) return null;
  if (cover in COVERS) return COVERS[cover as CoverKey];
  if (isImageCover(cover)) {
    return `url("${cover}") center ${clampCoverPosition(position)}% / cover no-repeat`;
  }
  return cover;
}
