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
    <div className="flex flex-col items-center gap-1.5 rounded-[4px] border border-[#e5e7eb] bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="max-w-md text-sm text-slate-500 dark:text-slate-400">{children}</div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex animate-pulse items-stretch overflow-hidden rounded-[4px] border border-[#e5e7eb] bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="w-11 bg-[#f0f0f0] dark:bg-slate-800" />
      <div className="m-2 h-[68px] w-[68px] rounded-[3px] bg-[#ececec] dark:bg-slate-800" />
      <div className="flex grow flex-col justify-center gap-2 p-3">
        <div className="h-4 w-2/3 rounded-[2px] bg-[#ececec] dark:bg-slate-700" />
        <div className="h-3 w-1/3 rounded-[2px] bg-[#f0f0f0] dark:bg-slate-800" />
      </div>
    </div>
  )
}
