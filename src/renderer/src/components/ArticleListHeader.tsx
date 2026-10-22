import type { ReactNode } from 'react'
import { pluralize } from '@renderer/lib/pluralize'

interface ArticleListHeaderProps {
  title: string
  articleCount: number
  collectionSummary?: string | null
  action?: ReactNode
}

export function ArticleListHeader({ title, articleCount, collectionSummary = null, action = null }: ArticleListHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {articleCount === 0 ? 'Aucun article' : pluralize(articleCount, 'article', 'articles')}
        </p>
        {collectionSummary && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{collectionSummary}</p>}
      </div>
      {action}
    </header>
  )
}
