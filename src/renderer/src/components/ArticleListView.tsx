import { useState, type ReactNode } from 'react'
import type { DigestArticle } from '@shared/contract'
import { useArticleActions } from '@renderer/hooks/useArticleActions'
import type { ApplyArticlePatch } from '@renderer/hooks/useArticlePatches'
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

  const selectArticle = (article: DigestArticle): void => {
    setSelectedArticleId(article.id)
    actions.markAsRead(article)
  }

  return (
    <div className="flex h-full min-h-0">
      <section aria-label="Liste des articles" className="flex w-[26rem] shrink-0 flex-col border-r border-slate-200 bg-white">
        {header}
        {actionErrorMessage && (
          <div className="px-3 pt-3">
            <ErrorBanner message={actionErrorMessage} onDismiss={() => setActionErrorMessage(null)} />
          </div>
        )}
        {articles.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
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
      </section>
      <section aria-label="Lecteur" className="min-w-0 flex-1 overflow-y-auto bg-white">
        {selectedArticle ? (
          <ArticleReader key={selectedArticle.id} article={selectedArticle} actions={actions} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-sm text-slate-500">
            Sélectionnez un article pour le lire.
          </div>
        )}
      </section>
    </div>
  )
}
