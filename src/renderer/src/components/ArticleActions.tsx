import { useState, type KeyboardEvent } from 'react'
import type { DigestArticle, FeedbackReason } from '@shared/contract'
import type { ArticleActionHandlers } from '@renderer/hooks/useArticleActions'
import { ReasonPicker } from './ReasonPicker'

interface ActionButtonProps {
  icon: string
  label: string
  accessibleLabel: string
  isActive?: boolean
  isToggle?: boolean
  showLabel: boolean
  onClick: () => void
}

function ActionButton({ icon, label, accessibleLabel, isActive = false, isToggle = true, showLabel, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      aria-pressed={isToggle ? isActive : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm transition-colors ${
        isActive
          ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
          : 'border-transparent text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {showLabel && <span>{label}</span>}
    </button>
  )
}

interface ArticleActionsProps {
  article: DigestArticle
  actions: ArticleActionHandlers
  isCompact: boolean
}

export function ArticleActions({ article, actions, isCompact }: ArticleActionsProps) {
  const [isReasonPickerOpen, setIsReasonPickerOpen] = useState(false)
  const showLabel = !isCompact

  const handleLikeClick = (): void => {
    setIsReasonPickerOpen(false)
    actions.toggleLike(article)
  }

  const handleDislikeClick = (): void => {
    if (article.rating === 'dislike') {
      setIsReasonPickerOpen(false)
      actions.clearRating(article)
      return
    }
    setIsReasonPickerOpen((isOpen) => !isOpen)
  }

  const handleReasonChosen = (reason: FeedbackReason | null): void => {
    setIsReasonPickerOpen(false)
    actions.dislike(article, reason)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && isReasonPickerOpen) {
      event.stopPropagation()
      setIsReasonPickerOpen(false)
    }
  }

  return (
    <div onKeyDown={handleKeyDown}>
      <div className="flex flex-wrap items-center gap-1">
        <ActionButton
          icon="👍"
          label="J’aime"
          accessibleLabel={article.rating === 'like' ? 'Retirer le « J’aime »' : 'J’aime'}
          isActive={article.rating === 'like'}
          showLabel={showLabel}
          onClick={handleLikeClick}
        />
        <ActionButton
          icon="👎"
          label="Pas pour moi"
          accessibleLabel={article.rating === 'dislike' ? 'Retirer le « Pas pour moi »' : 'Pas pour moi'}
          isActive={article.rating === 'dislike' || isReasonPickerOpen}
          showLabel={showLabel}
          onClick={handleDislikeClick}
        />
        <ActionButton
          icon="⭐"
          label="Favori"
          accessibleLabel={article.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          isActive={article.isFavorite}
          showLabel={showLabel}
          onClick={() => actions.toggleFavorite(article)}
        />
        <ActionButton
          icon="🕒"
          label="Plus tard"
          accessibleLabel={article.isReadLater ? 'Retirer de « Plus tard »' : 'Lire plus tard'}
          isActive={article.isReadLater}
          showLabel={showLabel}
          onClick={() => actions.toggleReadLater(article)}
        />
        <ActionButton
          icon="↗"
          label="Ouvrir dans le navigateur"
          accessibleLabel="Ouvrir dans le navigateur"
          isToggle={false}
          showLabel={showLabel}
          onClick={() => actions.openInBrowser(article)}
        />
      </div>
      {isReasonPickerOpen && (
        <ReasonPicker onChoose={handleReasonChosen} onCancel={() => setIsReasonPickerOpen(false)} />
      )}
    </div>
  )
}
