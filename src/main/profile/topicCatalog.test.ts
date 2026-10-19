import { describe, expect, it } from 'vitest'
import { findTopicById, isTopicId, TOPIC_CATALOG } from './topicCatalog'

describe('catalogue de sujets', () => {
  it('compte une vingtaine de sujets aux identifiants stables en kebab-case et uniques', () => {
    const topicIds = TOPIC_CATALOG.map((topic) => topic.id)

    expect(topicIds.length).toBeGreaterThanOrEqual(20)
    expect(new Set(topicIds).size).toBe(topicIds.length)
    for (const topicId of topicIds) {
      expect(topicId).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('fournit un libellé et un texte d embedding pour chaque sujet', () => {
    for (const topic of TOPIC_CATALOG) {
      expect(topic.label.trim()).not.toBe('')
      expect(topic.embeddingText.length).toBeGreaterThan(40)
    }
  })

  it('retrouve un sujet par identifiant', () => {
    expect(findTopicById('rust')?.label).toBe('Rust')
    expect(findTopicById('inconnu')).toBeNull()
    expect(isTopicId('rust')).toBe(true)
    expect(isTopicId('inconnu')).toBe(false)
    expect(isTopicId(12)).toBe(false)
  })
})
