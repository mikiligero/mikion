export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-paper flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-lg font-semibold shadow-sm">
          M
        </div>
        <span className="font-serif text-ink text-xl font-[560]">Mikion</span>
      </div>
      {children}
    </div>
  );
}
