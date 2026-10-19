import { useCallback, useState } from 'react'
import type { DigestArticle } from '@shared/contract'

export type ArticlePatch = Partial<
  Pick<DigestArticle, 'isRead' | 'isFavorite' | 'isReadLater' | 'rating' | 'feedbackReason'>
>

export type ApplyArticlePatch = (articleId: number, patch: ArticlePatch) => void

export function useArticlePatches() {
  const [patchesByArticleId, setPatchesByArticleId] = useState<Record<number, ArticlePatch>>({})

  const applyArticlePatch = useCallback<ApplyArticlePatch>((articleId, patch) => {
    setPatchesByArticleId((currentPatches) => ({
      ...currentPatches,
      [articleId]: { ...currentPatches[articleId], ...patch }
    }))
  }, [])

  const applyPatchesToArticles = useCallback(
    (articles: DigestArticle[]): DigestArticle[] =>
      articles.map((article) => {
        const articlePatch = patchesByArticleId[article.id]
        return articlePatch ? { ...article, ...articlePatch } : article
      }),
    [patchesByArticleId]
  )

  return { applyArticlePatch, applyPatchesToArticles }
}
