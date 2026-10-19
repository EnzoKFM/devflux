import type { Ref } from 'react'
import type { DigestArticle } from '@shared/contract'
import { useAsyncResource } from '@renderer/hooks/useAsyncResource'
import type { ArticleActionHandlers } from '@renderer/hooks/useArticleActions'
import { formatAbsoluteDate, formatRelativeDate } from '@renderer/lib/formatDate'
import { ArticleActions, type ArticleRatingTriggers } from './ArticleActions'
import { ArticleContentBody } from './ArticleContentBody'
import { ExplorationBadge } from './ExplorationBadge'

interface ArticleReaderProps {
  article: DigestArticle
  actions: ArticleActionHandlers
  ratingTriggersRef: Ref<ArticleRatingTriggers>
}

interface OpenInBrowserButtonProps {
  onClick: () => void
}

function OpenInBrowserButton({ onClick }: OpenInBrowserButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
    >
      Ouvrir dans le navigateur
    </button>
  )
}

export function ArticleReader({ article, actions, ratingTriggersRef }: ArticleReaderProps) {
  const contentResource = useAsyncResource(() => window.devflux.getArticleContent(article.id), `article-${article.id}`)

  const renderBody = () => {
    if (contentResource.status === 'loading') {
      return (
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
          Chargement de l’article…
        </p>
      )
    }

    if (contentResource.status === 'error') {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            Impossible de charger l’article. {contentResource.errorMessage}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={contentResource.reload}
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Réessayer
            </button>
            <OpenInBrowserButton onClick={() => actions.openInBrowser(article)} />
          </div>
        </div>
      )
    }

    if (contentResource.value.contentHtml === null) {
      return (
        <div className="flex flex-col items-start gap-4">
          {article.summary && <p className="max-w-[70ch] text-[1.0625rem] leading-relaxed text-slate-800 dark:text-slate-200">{article.summary}</p>}
          <p className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            Lecture intégrée indisponible
          </p>
          <OpenInBrowserButton onClick={() => actions.openInBrowser(article)} />
        </div>
      )
    }

    return (
      <ArticleContentBody
        contentHtml={contentResource.value.contentHtml}
        baseUrl={article.url}
        onOpenLink={actions.openLink}
      />
    )
  }

  const byline = contentResource.status === 'success' ? contentResource.value.byline : null

  return (
    <article className="px-8 py-6" aria-label={article.title}>
      <header className="mb-6 max-w-[70ch] border-b border-slate-200 dark:border-slate-700 pb-4">
        <h1 className="text-2xl leading-tight font-bold text-slate-900 dark:text-slate-100">{article.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">{article.sourceName}</span>
          {byline && (
            <>
              <span aria-hidden="true">·</span>
              <span>{byline}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt} title={formatAbsoluteDate(article.publishedAt)}>
            {formatRelativeDate(article.publishedAt)}
          </time>
          {article.isExploration && <ExplorationBadge />}
        </p>
        <div className="mt-3">
          <ArticleActions
            key={article.id}
            article={article}
            actions={actions}
            isCompact={false}
            ratingTriggersRef={ratingTriggersRef}
          />
        </div>
      </header>
      {renderBody()}
    </article>
  )
}
