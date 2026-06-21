"use client";

import { useRef, useState, type PointerEvent } from "react";
import { MoveVertical, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  COVER_ZOOM_MAX,
  COVER_ZOOM_MIN,
  COVER_ZOOM_STEP,
  clampCoverPosition,
  clampCoverZoom,
  coverBackground,
  isImageCover,
} from "@/lib/covers";
import { cn } from "@/lib/utils";
import { CoverPicker } from "./cover-picker";

/** Cabecera de portada reutilizable (páginas, filas de BD y BD).
 * Renderiza la imagen/gradiente a ancho completo con la barra flotante
 * (Reposicionar · Cambiar portada · Quitar) y el modo de ajuste (arrastrar la
 * imagen para reposicionarla + zoom in/out → Guardar / Cancelar). Devuelve
 * `null` si no hay portada: el botón «Añadir portada» lo coloca cada host donde
 * le encaja. El componente padre es dueño de `cover`/`coverPosition`/`coverZoom`;
 * aquí solo se mantiene el estado efímero del ajuste. */
export function CoverHeader({
  cover,
  coverPosition,
  coverZoom = 100,
  onCoverChange,
  onAdjust,
  height = "h-[240px]",
}: {
  cover: string | null;
  coverPosition: number;
  /** Zoom (%) de la portada de imagen. 100 = sin ampliar. */
  coverZoom?: number;
  /** Cambiar (o quitar con `null`) la portada. Debe resetear posición y zoom. */
  onCoverChange: (next: string | null) => void;
  /** Persistir posición vertical (0–100) y zoom (%) tras «Guardar». */
  onAdjust: (position: number, zoom: number) => void;
  /** Altura de la portada (clase Tailwind). Páginas 240, filas/BD 220. */
  height?: string;
}) {
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [draftPosition, setDraftPosition] = useState(coverPosition);
  const [draftZoom, setDraftZoom] = useState(coverZoom);
  const dragRef = useRef<{
    pointerId: number;
    startClientY: number;
    startPosition: number;
  } | null>(null);

  const coverIsImage = isImageCover(cover);
  const activePosition = isRepositioning ? draftPosition : coverPosition;
  const activeZoom = isRepositioning ? draftZoom : coverZoom;
  const coverBg = coverBackground(cover, activePosition);
  if (!coverBg) return null;

  function beginReposition() {
    if (!coverIsImage) return;
    setDraftPosition(coverPosition);
    setDraftZoom(coverZoom);
    setIsRepositioning(true);
  }
  function saveAdjust() {
    setIsRepositioning(false);
    onAdjust(clampCoverPosition(draftPosition), clampCoverZoom(draftZoom));
  }
  function cancelReposition() {
    setDraftPosition(coverPosition);
    setDraftZoom(coverZoom);
    setIsRepositioning(false);
  }
  function changeZoom(delta: number) {
    setDraftZoom((z) => clampCoverZoom(z + delta));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isRepositioning || !coverIsImage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startPosition: draftPosition,
    };
  }
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const h = event.currentTarget.getBoundingClientRect().height || 220;
    const delta = ((event.clientY - drag.startClientY) / h) * 100;
    setDraftPosition(clampCoverPosition(drag.startPosition - delta));
  }
  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <div
      className={cn(
        "group/cover relative w-full overflow-hidden",
        height,
        coverIsImage && !isRepositioning && "cursor-pointer",
        isRepositioning &&
          "cursor-grab touch-none select-none active:cursor-grabbing"
      )}
      onClick={() => {
        if (!isRepositioning) beginReposition();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {/* Capa de imagen: el zoom es un scale sobre esta capa, recortado por el
          overflow-hidden del contenedor. La posición vertical sigue en
          background-position. */}
      <div
        className="absolute inset-0"
        style={{
          background: coverBg,
          transform: `scale(${activeZoom / 100})`,
          transformOrigin: "center",
        }}
      />
      {isRepositioning && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20">
          <p className="rounded-md bg-black/35 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
            Arrastra la imagen para reposicionarla
          </p>
        </div>
      )}
      <div
        className={cn(
          "absolute top-3 right-4 z-20 flex gap-1.5 transition-opacity",
          isRepositioning
            ? "opacity-100"
            : "opacity-0 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100"
        )}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isRepositioning ? (
          <>
            <div className="bg-surface/90 text-ink-soft flex items-center rounded-md shadow-sm backdrop-blur">
              <button
                onClick={() => changeZoom(-COVER_ZOOM_STEP)}
                disabled={draftZoom <= COVER_ZOOM_MIN}
                aria-label="Alejar"
                title="Alejar"
                className="hover:bg-surface flex size-8 items-center justify-center rounded-l-md disabled:opacity-40"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="w-11 text-center text-xs font-medium tabular-nums">
                {Math.round(draftZoom)}%
              </span>
              <button
                onClick={() => changeZoom(COVER_ZOOM_STEP)}
                disabled={draftZoom >= COVER_ZOOM_MAX}
                aria-label="Acercar"
                title="Acercar"
                className="hover:bg-surface flex size-8 items-center justify-center rounded-r-md disabled:opacity-40"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
            <button
              onClick={saveAdjust}
              className="bg-surface/90 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium shadow-sm backdrop-blur"
            >
              Guardar
            </button>
            <button
              onClick={cancelReposition}
              className="bg-surface/90 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium shadow-sm backdrop-blur"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            {coverIsImage && (
              <button
                onClick={beginReposition}
                className="bg-surface/85 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-sm backdrop-blur"
              >
                <MoveVertical className="size-3.5" /> Reposicionar
              </button>
            )}
            <CoverPicker onPick={onCoverChange}>
              <button className="bg-surface/85 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-sm backdrop-blur">
                <RefreshCw className="size-3.5" /> Cambiar portada
              </button>
            </CoverPicker>
            <button
              onClick={() => onCoverChange(null)}
              className="bg-surface/85 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium shadow-sm backdrop-blur"
            >
              <X className="size-3.5" /> Quitar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
