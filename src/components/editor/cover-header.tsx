"use client";

import { useRef, useState, type PointerEvent } from "react";
import { MoveVertical, RefreshCw, X } from "lucide-react";
import { clampCoverPosition, coverBackground, isImageCover } from "@/lib/covers";
import { cn } from "@/lib/utils";
import { CoverPicker } from "./cover-picker";

/** Cabecera de portada reutilizable (páginas, filas de BD y BD).
 * Renderiza la imagen/gradiente a ancho completo con la barra flotante
 * (Reposicionar · Cambiar portada · Quitar) y el modo de reposición
 * (arrastrar la imagen → Guardar posición / Cancelar). Devuelve `null` si no
 * hay portada: el botón «Añadir portada» lo coloca cada host donde le encaja.
 * El componente padre es dueño de `cover`/`coverPosition`; aquí solo se
 * mantiene el estado efímero del arrastre. */
export function CoverHeader({
  cover,
  coverPosition,
  onCoverChange,
  onPositionChange,
  height = "h-[240px]",
}: {
  cover: string | null;
  coverPosition: number;
  /** Cambiar (o quitar con `null`) la portada. Debe resetear la posición. */
  onCoverChange: (next: string | null) => void;
  /** Persistir la posición vertical (0–100) tras «Guardar posición». */
  onPositionChange: (position: number) => void;
  /** Altura de la portada (clase Tailwind). Páginas 240, filas/BD 220. */
  height?: string;
}) {
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [draftPosition, setDraftPosition] = useState(coverPosition);
  const dragRef = useRef<{
    pointerId: number;
    startClientY: number;
    startPosition: number;
  } | null>(null);

  const coverIsImage = isImageCover(cover);
  const activePosition = isRepositioning ? draftPosition : coverPosition;
  const coverBg = coverBackground(cover, activePosition);
  if (!coverBg) return null;

  function beginReposition() {
    if (!coverIsImage) return;
    setDraftPosition(coverPosition);
    setIsRepositioning(true);
  }
  function savePosition() {
    setIsRepositioning(false);
    onPositionChange(clampCoverPosition(draftPosition));
  }
  function cancelReposition() {
    setDraftPosition(coverPosition);
    setIsRepositioning(false);
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
      style={{ background: coverBg }}
      onClick={() => {
        if (!isRepositioning) beginReposition();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
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
            <button
              onClick={savePosition}
              className="bg-surface/90 text-ink-soft hover:bg-surface flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium shadow-sm backdrop-blur"
            >
              Guardar posición
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
