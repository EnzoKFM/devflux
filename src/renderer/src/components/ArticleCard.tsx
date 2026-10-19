import type { DigestArticle } from '@shared/contract'
import type { ArticleActionHandlers } from '@renderer/hooks/useArticleActions'
import { formatAbsoluteDate, formatRelativeDate } from '@renderer/lib/formatDate'
import { ArticleActions } from './ArticleActions'
import { ExplorationBadge } from './ExplorationBadge'

interface ArticleCardProps {
  article: DigestArticle
  isSelected: boolean
  actions: ArticleActionHandlers
  onSelect: (article: DigestArticle) => void
}

export function ArticleCard({ article, isSelected, actions, onSelect }: ArticleCardProps) {
  return (
    <li
      className={`border-b border-slate-200 ${
        isSelected ? 'bg-indigo-50' : article.isRead ? 'bg-slate-50' : 'bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(article)}
        aria-current={isSelected ? 'true' : undefined}
        className="block w-full px-4 pt-3 pb-1 text-left"
      >
        <span className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${article.isRead ? 'bg-transparent' : 'bg-indigo-600'}`}
          />
          <span className="sr-only">{article.isRead ? 'Lu' : 'Non lu'}</span>
          <span
            className={`block text-[0.95rem] leading-snug ${
              article.isRead ? 'font-normal text-slate-600' : 'font-semibold text-slate-900'
            }`}
          >
            {article.title}
          </span>
        </span>
        <span className="mt-1 ml-4 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{article.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt} title={formatAbsoluteDate(article.publishedAt)}>
            {formatRelativeDate(article.publishedAt)}
          </time>
          {article.isExploration && <ExplorationBadge />}
        </span>
        {article.summary && (
          <span className="mt-1.5 ml-4 line-clamp-3 block text-sm leading-relaxed text-slate-600">
            {article.summary}
          </span>
        )}
      </button>
      <div className="px-3 pb-2 pl-3.5">
        <ArticleActions article={article} actions={actions} isCompact />
      </div>
    </li>
  )
}
