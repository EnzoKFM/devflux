import { describe, expect, it } from 'vitest'
import { addTestSource, createKeywordEmbeddingProvider, createTestDatabase, daysBefore, FIXED_NOW, insertTestArticle } from '../testing/testHelpers'
import { prepareDailyDigest } from '../digest/dailyDigestService'
import { completeOnboarding, getUserProfile, setTopicPreference } from './profileService'
import { TOPIC_CATALOG } from './topicCatalog'

describe('getUserProfile', () => {
  it('décrit un profil vierge en démarrage à froid', () => {
    const database = createTestDatabase()

    const userProfile = getUserProfile(database)

    expect(userProfile).toMatchObject({
      isOnboardingCompleted: false,
      recommendationMode: 'cold-start',
      likeCount: 0,
      dislikeCount: 0,
      sourceAffinities: []
    })
    expect(userProfile.topics).toHaveLength(TOPIC_CATALOG.length)
    expect(userProfile.topics.every((topic) => topic.preference === 'neutral' && topic.affinity === null)).toBe(true)
  })

  it('compte les notes et calcule l affinité lissée des sources', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    insertTestArticle(database, { sourceId, slug: 'a', publishedAt: daysBefore(FIXED_NOW, 1), rating: 'like' })
    insertTestArticle(database, { sourceId, slug: 'b', publishedAt: daysBefore(FIXED_NOW, 1), rating: 'like' })
    insertTestArticle(database, { sourceId, slug: 'c', publishedAt: daysBefore(FIXED_NOW, 1), rating: 'dislike', reason: 'off-topic' })

    const userProfile = getUserProfile(database)

    expect(userProfile).toMatchObject({ likeCount: 2, dislikeCount: 1, recommendationMode: 'similarity' })
    expect(userProfile.sourceAffinities).toHaveLength(1)
    expect(userProfile.sourceAffinities[0]).toMatchObject({ likeCount: 2, dislikeCount: 1 })
    expect(userProfile.sourceAffinities[0].affinity).toBeCloseTo(1 / 5, 5)
  })

  it('n écarte pas du profil le motif déjà vu pour la source', () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    insertTestArticle(database, { sourceId, slug: 'a', publishedAt: daysBefore(FIXED_NOW, 1), rating: 'dislike', reason: 'already-seen' })

    const userProfile = getUserProfile(database)

    expect(userProfile.dislikeCount).toBe(1)
    expect(userProfile.sourceAffinities).toEqual([])
  })
})

describe('completeOnboarding', () => {
  it('enregistre les sujets suivis, marque l intégration comme terminée et quitte le démarrage à froid', () => {
    const database = createTestDatabase()

    const userProfile = completeOnboarding(database, ['rust', 'rust', 'security'], FIXED_NOW.toISOString())

    expect(userProfile.isOnboardingCompleted).toBe(true)
    expect(userProfile.recommendationMode).toBe('similarity')
    expect(
      userProfile.topics.filter((topic) => topic.preference === 'followed').map((topic) => topic.id).sort()
    ).toEqual(['rust', 'security'])
  })

  it('reste en démarrage à froid quand aucun sujet n est choisi', () => {
    const database = createTestDatabase()

    const userProfile = completeOnboarding(database, [], FIXED_NOW.toISOString())

    expect(userProfile.isOnboardingCompleted).toBe(true)
    expect(userProfile.recommendationMode).toBe('cold-start')
  })
})

describe('setTopicPreference', () => {
  it('suit, masque puis rétablit un sujet', () => {
    const database = createTestDatabase()
    const preferenceOf = (userProfile: ReturnType<typeof getUserProfile>) =>
      userProfile.topics.find((topic) => topic.id === 'rust')?.preference

    expect(preferenceOf(setTopicPreference(database, 'rust', 'followed'))).toBe('followed')
    expect(preferenceOf(setTopicPreference(database, 'rust', 'muted'))).toBe('muted')
    expect(preferenceOf(setTopicPreference(database, 'rust', 'neutral'))).toBe('neutral')
  })
})

describe('affinité des sujets', () => {
  it('classe les sujets par proximité avec les articles aimés une fois les embeddings calculés', async () => {
    const database = createTestDatabase()
    const sourceId = addTestSource(database, 'Blog Un')
    insertTestArticle(database, { sourceId, slug: 'rust-a', publishedAt: daysBefore(FIXED_NOW, 1), rating: 'like' })
    const embeddingProvider = createKeywordEmbeddingProvider(['rust'])

    await prepareDailyDigest(database, { fetchFeed: async () => ({ entries: [] }), now: () => FIXED_NOW, embeddingProvider })
    const userProfile = getUserProfile(database, embeddingProvider)

    const rustTopic = userProfile.topics.find((topic) => topic.id === 'rust')
    const pythonTopic = userProfile.topics.find((topic) => topic.id === 'python')
    expect(userProfile.topics[0].id).toBe('rust')
    expect(rustTopic?.affinity).toBeGreaterThan(pythonTopic?.affinity ?? 1)
  })
})
