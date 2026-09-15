export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="max-w-md text-sm text-slate-500 dark:text-slate-400">{children}</div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex animate-pulse items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="w-12 bg-slate-100 dark:bg-slate-800" />
      <div className="flex w-12 items-center justify-center border-r border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="flex grow flex-col justify-center gap-2 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  )
}
