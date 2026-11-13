type LoadingStateProps = {
  label?: string;
  compact?: boolean;
};

export function LoadingState({ label = "A carregar...", compact = false }: LoadingStateProps) {
  void compact;
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-white/75 px-6 py-8 text-center backdrop-blur-sm dark:bg-slate-950/75"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="football-loader" aria-label="A carregar" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Buscando dados</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
        </div>
      </div>
    </div>
  );
}
