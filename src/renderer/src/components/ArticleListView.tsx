import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import type { DigestArticle } from '@shared/contract'
import { useArticleActions } from '@renderer/hooks/useArticleActions'
import type { ApplyArticlePatch } from '@renderer/hooks/useArticlePatches'
import { ARTICLE_SHORTCUT_KEYS, resolveAdjacentArticleId, resolveArticleShortcut } from '@renderer/lib/articleShortcuts'
import type { ArticleRatingTriggers } from './ArticleActions'
import { ArticleCard } from './ArticleCard'
import { ArticleReader } from './ArticleReader'
import { ErrorBanner } from './ErrorBanner'

interface ArticleListViewProps {
  articles: DigestArticle[]
  header: ReactNode
  emptyMessage: string
  applyArticlePatch: ApplyArticlePatch
}

export function ArticleListView({ articles, header, emptyMessage, applyArticlePatch }: ArticleListViewProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)
  const actions = useArticleActions(applyArticlePatch, setActionErrorMessage)

  const selectedArticle = articles.find((article) => article.id === selectedArticleId) ?? null

  const readerRatingTriggersRef = useRef<ArticleRatingTriggers>(null)

  const selectArticle = (article: DigestArticle): void => {
    setSelectedArticleId(article.id)
    actions.markAsRead(article)
  }

  const handleShortcutKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    const shortcut = resolveArticleShortcut({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      target: event.target instanceof HTMLElement ? event.target : null
    })
    if (shortcut === null) {
      return
    }
    event.preventDefault()
    if (shortcut === 'like') {
      readerRatingTriggersRef.current?.like()
      return
    }
    if (shortcut === 'dislike') {
      readerRatingTriggersRef.current?.dislike()
      return
    }
    const adjacentArticleId = resolveAdjacentArticleId(
      articles.map((article) => article.id),
      selectedArticle?.id ?? null,
      shortcut
    )
    const adjacentArticle = articles.find((article) => article.id === adjacentArticleId)
    if (adjacentArticle) {
      selectArticle(adjacentArticle)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleShortcutKeyDown)
    return () => window.removeEventListener('keydown', handleShortcutKeyDown)
  }, [])

  return (
    <div className="flex h-full min-h-0">
      <section aria-label="Liste des articles" className="flex w-[26rem] shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {header}
        {actionErrorMessage && (
          <div className="px-3 pt-3">
            <ErrorBanner message={actionErrorMessage} onDismiss={() => setActionErrorMessage(null)} />
          </div>
        )}
        {articles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        ) : (
          <ul className="relative min-h-0 flex-1 overflow-y-auto">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isSelected={article.id === selectedArticleId}
                actions={actions}
                onSelect={selectArticle}
              />
            ))}
          </ul>
        )}
        <p className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          <kbd className="font-mono">{ARTICLE_SHORTCUT_KEYS.next}</kbd> / <kbd className="font-mono">{ARTICLE_SHORTCUT_KEYS.previous}</kbd>{' '}
          suivant / précédent · <kbd className="font-mono">{ARTICLE_SHORTCUT_KEYS.like}</kbd> 👍 ·{' '}
          <kbd className="font-mono">{ARTICLE_SHORTCUT_KEYS.dislike}</kbd> 👎
        </p>
      </section>
      <section aria-label="Lecteur" className="min-w-0 flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        {selectedArticle ? (
          <ArticleReader
            key={selectedArticle.id}
            article={selectedArticle}
            actions={actions}
            ratingTriggersRef={readerRatingTriggersRef}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-sm text-slate-500 dark:text-slate-400">
            Sélectionnez un article pour le lire.
          </div>
        )}
      </section>
    </div>
  )
}
