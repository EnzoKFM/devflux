import type { DailyDigest, DigestArticle } from '@shared/contract'
import type { ApplyArticlePatch } from '@renderer/hooks/useArticlePatches'
import { summarizeCollectionReport } from '@renderer/lib/collectionReport'
import { ArticleListHeader } from './ArticleListHeader'
import { ArticleListView } from './ArticleListView'

interface TodayViewProps {
  digest: DailyDigest
  patchedArticlesOf: (articles: DigestArticle[]) => DigestArticle[]
  applyArticlePatch: ApplyArticlePatch
}

export function TodayView({ digest, patchedArticlesOf, applyArticlePatch }: TodayViewProps) {
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
        />
      }
    />
  )
}
