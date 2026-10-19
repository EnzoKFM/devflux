import { pluralize } from '@renderer/lib/pluralize'

interface ArticleListHeaderProps {
  title: string
  articleCount: number
  collectionSummary?: string | null
}

export function ArticleListHeader({ title, articleCount, collectionSummary = null }: ArticleListHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">
        {articleCount === 0 ? 'Aucun article' : pluralize(articleCount, 'article', 'articles')}
      </p>
      {collectionSummary && <p className="mt-0.5 text-xs text-slate-500">{collectionSummary}</p>}
    </header>
  )
}
