import type { DailyDigest, DigestArticle } from '@shared/contract'
import type { ApplyArticlePatch } from '@renderer/hooks/useArticlePatches'
import { summarizeCollectionReport } from '@renderer/lib/collectionReport'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleListView } from './ArticleListView'

interface TodayViewProps {
  digest: DailyDigest
  patchedArticlesOf: (articles: DigestArticle[]) => DigestArticle[]
  applyArticlePatch: ApplyArticlePatch
  onRefresh: () => void
}

export function TodayView({ digest, patchedArticlesOf, applyArticlePatch, onRefresh }: TodayViewProps) {
  const articles = patchedArticlesOf(digest.articles)

  return (
    <ArticleListView
      articles={articles}
      applyArticlePatch={applyArticlePatch}
      emptyMessage="Aucun article dans le fil du jour."
      header={
        <ArticleListHeader
          title="Fil du jour"
          articleCount={articles.length}
          collectionSummary={digest.collectionReport ? summarizeCollectionReport(digest.collectionReport) : null}
          action={
            <button
              type="button"
              onClick={onRefresh}
              title="Remplacer le fil par de nouveaux articles, en tenant compte de vos derniers 👍 / 👎"
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Actualiser les articles
            </button>
          }
        />
      }
    />
  )
}
