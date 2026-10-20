import { useEffect, useRef } from 'react'
import type { DigestArticle } from '@shared/contract'
import type { ArticleActionHandlers } from '@renderer/hooks/useArticleActions'
import { formatAbsoluteDate, formatRelativeDate } from '@renderer/lib/formatDate'
import { formatReadingTime } from '@renderer/lib/readingTime'
import { ArticleActions } from './ArticleActions'
import { ExplorationBadge } from './ExplorationBadge'
import { RecommendationReasonDetails } from './RecommendationReasonDetails'

interface ArticleCardProps {
  article: DigestArticle
  isSelected: boolean
  actions: ArticleActionHandlers
  onSelect: (article: DigestArticle) => void
}

export function ArticleCard({ article, isSelected, actions, onSelect }: ArticleCardProps) {
  const cardRef = useRef<HTMLLIElement>(null)
  const readingTime = formatReadingTime(article.wordCount)

  useEffect(() => {
    if (isSelected) {
      cardRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [isSelected])

  return (
    <li
      ref={cardRef}
      className={`border-b border-slate-200 dark:border-slate-700 ${
        isSelected
          ? 'bg-indigo-50 dark:bg-indigo-950'
          : article.isRead
            ? 'bg-slate-50 opacity-60 transition-opacity focus-within:opacity-100 hover:opacity-100 dark:bg-slate-950'
            : 'bg-white dark:bg-slate-900'
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
              article.isRead ? 'font-normal text-slate-600 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-slate-100'
            }`}
          >
            {article.title}
          </span>
        </span>
        <span className="mt-1 ml-4 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-400">{article.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt} title={formatAbsoluteDate(article.publishedAt)}>
            {formatRelativeDate(article.publishedAt)}
          </time>
          {readingTime && (
            <>
              <span aria-hidden="true">·</span>
              <span>{readingTime}</span>
            </>
          )}
          {article.isExploration && <ExplorationBadge />}
        </span>
        {article.summary && (
          <span className="mt-1.5 ml-4 line-clamp-3 block text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {article.summary}
          </span>
        )}
      </button>
      {article.recommendationReason && (
        <RecommendationReasonDetails
          recommendationReason={article.recommendationReason}
          detailsId={`recommendation-reason-${article.id}`}
        />
      )}
      <div className="px-3 pb-2 pl-3.5">
        <ArticleActions article={article} actions={actions} isCompact />
      </div>
    </li>
  )
}
