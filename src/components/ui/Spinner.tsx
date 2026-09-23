export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800 ${className}`}
      role="status"
      aria-label="Yükleniyor"
    />
  );
}

export function PageLoader({ label = "Yükleniyor..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  );
}
