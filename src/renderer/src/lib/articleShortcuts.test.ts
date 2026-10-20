import { describe, expect, it } from 'vitest'
import { resolveAdjacentArticleId, resolveArticleShortcut, type ShortcutKeyboardEvent } from './articleShortcuts'

function buildKeyEvent(overrides: Partial<ShortcutKeyboardEvent> = {}): ShortcutKeyboardEvent {
  return { key: 'j', ctrlKey: false, altKey: false, metaKey: false, target: { tagName: 'BODY' }, ...overrides }
}

describe('resolveArticleShortcut', () => {
  it('associe j, k, l et d à leur action', () => {
    expect(resolveArticleShortcut(buildKeyEvent({ key: 'j' }))).toBe('next')
    expect(resolveArticleShortcut(buildKeyEvent({ key: 'k' }))).toBe('previous')
    expect(resolveArticleShortcut(buildKeyEvent({ key: 'l' }))).toBe('like')
    expect(resolveArticleShortcut(buildKeyEvent({ key: 'd' }))).toBe('dislike')
  })

  it('ignore les autres touches', () => {
    for (const otherKey of ['a', 'J', 'Enter', 'ArrowDown', ' ']) {
      expect(resolveArticleShortcut(buildKeyEvent({ key: otherKey }))).toBeNull()
    }
  })

  it('ignore les raccourcis avec Ctrl, Alt ou Meta', () => {
    expect(resolveArticleShortcut(buildKeyEvent({ ctrlKey: true }))).toBeNull()
    expect(resolveArticleShortcut(buildKeyEvent({ altKey: true }))).toBeNull()
    expect(resolveArticleShortcut(buildKeyEvent({ metaKey: true }))).toBeNull()
  })

  it('ignore les raccourcis quand le focus est dans un champ de saisie', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'input']) {
      expect(resolveArticleShortcut(buildKeyEvent({ target: { tagName } }))).toBeNull()
    }
    expect(resolveArticleShortcut(buildKeyEvent({ target: { tagName: 'DIV', isContentEditable: true } }))).toBeNull()
  })

  it('accepte les raccourcis quand le focus est sur un bouton ou hors de tout élément', () => {
    expect(resolveArticleShortcut(buildKeyEvent({ target: { tagName: 'BUTTON' } }))).toBe('next')
    expect(resolveArticleShortcut(buildKeyEvent({ target: null }))).toBe('next')
  })
})

describe('resolveAdjacentArticleId', () => {
  const articleIds = [10, 20, 30]

  it('sélectionne le premier article quand rien n est sélectionné', () => {
    expect(resolveAdjacentArticleId(articleIds, null, 'next')).toBe(10)
  })

  it('ne remonte pas depuis une absence de sélection', () => {
    expect(resolveAdjacentArticleId(articleIds, null, 'previous')).toBeNull()
  })

  it('traite une sélection absente de la liste comme une absence de sélection', () => {
    expect(resolveAdjacentArticleId(articleIds, 99, 'next')).toBe(10)
    expect(resolveAdjacentArticleId(articleIds, 99, 'previous')).toBeNull()
  })

  it('avance et recule d un article', () => {
    expect(resolveAdjacentArticleId(articleIds, 10, 'next')).toBe(20)
    expect(resolveAdjacentArticleId(articleIds, 30, 'previous')).toBe(20)
  })

  it('reste sur place aux extrémités de la liste', () => {
    expect(resolveAdjacentArticleId(articleIds, 30, 'next')).toBeNull()
    expect(resolveAdjacentArticleId(articleIds, 10, 'previous')).toBeNull()
  })

  it('ne cible rien dans une liste vide', () => {
    expect(resolveAdjacentArticleId([], null, 'next')).toBeNull()
  })
})
