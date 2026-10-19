import type { DigestArticle, FeedbackReason } from '@shared/contract'
import { describeError } from '@renderer/lib/describeError'
import type { ApplyArticlePatch, ArticlePatch } from './useArticlePatches'

export interface ArticleActionHandlers {
  markAsRead: (article: DigestArticle) => void
  toggleLike: (article: DigestArticle) => void
  dislike: (article: DigestArticle, reason: FeedbackReason | null) => void
  clearRating: (article: DigestArticle) => void
  toggleFavorite: (article: DigestArticle) => void
  toggleReadLater: (article: DigestArticle) => void
  openInBrowser: (article: DigestArticle) => void
  openLink: (url: string) => void
}

function readFieldsToRestore(article: DigestArticle, patch: ArticlePatch): ArticlePatch {
  const fieldsToRestore: ArticlePatch = {}
  for (const patchedField of Object.keys(patch) as (keyof ArticlePatch)[]) {
    Object.assign(fieldsToRestore, { [patchedField]: article[patchedField] })
  }
  return fieldsToRestore
}

export function useArticleActions(
  applyArticlePatch: ApplyArticlePatch,
  reportFailure: (failureMessage: string) => void
): ArticleActionHandlers {
  const runOptimistically = async (
    article: DigestArticle,
    patch: ArticlePatch,
    sendRequest: () => Promise<void>,
    failureLabel: string
  ): Promise<void> => {
    const fieldsToRestore = readFieldsToRestore(article, patch)
    applyArticlePatch(article.id, patch)
    try {
      await sendRequest()
    } catch (error) {
      applyArticlePatch(article.id, fieldsToRestore)
      reportFailure(`${failureLabel} (${describeError(error)})`)
    }
  }

  const clearRating = (article: DigestArticle): void => {
    void runOptimistically(
      article,
      { rating: null, feedbackReason: null },
      () => window.devflux.clearArticleRating(article.id),
      'Impossible de retirer la note.'
    )
  }

  const openLink = async (url: string): Promise<void> => {
    try {
      await window.devflux.openExternalUrl(url)
    } catch (error) {
      reportFailure(`Impossible d’ouvrir le lien. (${describeError(error)})`)
    }
  }

  return {
    markAsRead: (article) => {
      if (article.isRead) {
        return
      }
      void runOptimistically(
        article,
        { isRead: true },
        () => window.devflux.markArticleAsRead(article.id),
        'Impossible de marquer l’article comme lu.'
      )
    },
    toggleLike: (article) => {
      if (article.rating === 'like') {
        clearRating(article)
        return
      }
      void runOptimistically(
        article,
        { rating: 'like', feedbackReason: null },
        () => window.devflux.rateArticle(article.id, 'like', null),
        'Impossible d’enregistrer la note.'
      )
    },
    dislike: (article, reason) => {
      void runOptimistically(
        article,
        { rating: 'dislike', feedbackReason: reason },
        () => window.devflux.rateArticle(article.id, 'dislike', reason),
        'Impossible d’enregistrer la note.'
      )
    },
    clearRating,
    toggleFavorite: (article) => {
      const isFavorite = !article.isFavorite
      void runOptimistically(
        article,
        { isFavorite },
        () => window.devflux.setArticleFavorite(article.id, isFavorite),
        'Impossible de modifier les favoris.'
      )
    },
    toggleReadLater: (article) => {
      const isReadLater = !article.isReadLater
      void runOptimistically(
        article,
        { isReadLater },
        () => window.devflux.setArticleReadLater(article.id, isReadLater),
        'Impossible de modifier la liste « Plus tard ».'
      )
    },
    openInBrowser: (article) => {
      void openLink(article.url)
    },
    openLink: (url) => {
      void openLink(url)
    }
  }
}
