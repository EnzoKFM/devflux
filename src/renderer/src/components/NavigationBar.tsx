import { NAVIGATION_ITEMS, type ViewId } from '@renderer/lib/labels'

interface NavigationBarProps {
  currentViewId: ViewId
  onNavigate: (viewId: ViewId) => void
}

export function NavigationBar({ currentViewId, onNavigate }: NavigationBarProps) {
  return (
    <nav aria-label="Navigation principale" className="flex w-52 shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="px-5 py-5 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">DevFlux</div>
      <ul className="flex flex-col gap-1 px-3">
        {NAVIGATION_ITEMS.map((navigationItem) => {
          const isCurrent = navigationItem.viewId === currentViewId
          return (
            <li key={navigationItem.viewId}>
              <button
                type="button"
                onClick={() => onNavigate(navigationItem.viewId)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isCurrent ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {navigationItem.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
