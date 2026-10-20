import { pluralize } from '@renderer/lib/pluralize'

interface ArticleListHeaderProps {
  title: string
  articleCount: number
  collectionSummary?: string | null
}

export function ArticleListHeader({ title, articleCount, collectionSummary = null }: ArticleListHeaderProps) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {articleCount === 0 ? 'Aucun article' : pluralize(articleCount, 'article', 'articles')}
      </p>
      {collectionSummary && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{collectionSummary}</p>}
    </header>
  )
}
