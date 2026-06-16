import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-ink-ghost text-[80px] font-[700] leading-none">404</p>
      <p className="text-ink text-lg font-medium">Página no encontrada</p>
      <p className="text-ink-soft text-sm">
        Esta página no existe o no tienes acceso a ella.
      </p>
      <Link
        href="/"
        className="bg-brand text-primary-foreground hover:bg-brand-deep mt-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
