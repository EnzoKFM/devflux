export type ArticleShortcut = 'next' | 'previous' | 'like' | 'dislike'

export type ArticleNavigationDirection = 'next' | 'previous'

export interface ShortcutEventTarget {
  tagName?: string
  isContentEditable?: boolean
}

export interface ShortcutKeyboardEvent {
  key: string
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  target: ShortcutEventTarget | null
}

export const ARTICLE_SHORTCUT_KEYS: Record<ArticleShortcut, string> = {
  next: 'j',
  previous: 'k',
  like: 'l',
  dislike: 'd'
}

const TEXT_ENTRY_TAG_NAMES = ['INPUT', 'TEXTAREA', 'SELECT']

function isTextEntryTarget(target: ShortcutEventTarget | null): boolean {
  if (target === null) {
    return false
  }
  return target.isContentEditable === true || TEXT_ENTRY_TAG_NAMES.includes(target.tagName?.toUpperCase() ?? '')
}

export function resolveArticleShortcut(event: ShortcutKeyboardEvent): ArticleShortcut | null {
  if (event.ctrlKey || event.altKey || event.metaKey || isTextEntryTarget(event.target)) {
    return null
  }
  const matchingShortcut = (Object.keys(ARTICLE_SHORTCUT_KEYS) as ArticleShortcut[]).find(
    (shortcut) => ARTICLE_SHORTCUT_KEYS[shortcut] === event.key
  )
  return matchingShortcut ?? null
}

export function resolveAdjacentArticleId(
  articleIds: number[],
  selectedArticleId: number | null,
  direction: ArticleNavigationDirection
): number | null {
  const selectedIndex = selectedArticleId === null ? -1 : articleIds.indexOf(selectedArticleId)
  if (selectedIndex === -1) {
    return direction === 'next' ? (articleIds[0] ?? null) : null
  }
  const adjacentIndex = direction === 'next' ? selectedIndex + 1 : selectedIndex - 1
  return articleIds[adjacentIndex] ?? null
}
