import type Database from 'better-sqlite3'
import type { ProfileTopic, SourceAffinity, TopicPreference, UserProfile } from '@shared/contract'
import type { EmbeddingProvider } from '../recommendation/embeddingProvider'
import { resolveEmbeddingModelId } from '../recommendation/embeddingStep'
import {
  loadRecommendationSignals,
  resolveCurrentRecommendationMode
} from '../recommendation/recommendationService'
import { collectSourceVoteCounts, smoothSourceAffinity } from '../recommendation/scoring'
import { classifyContentSignal } from '../recommendation/signals'
import { cosineSimilarity, sumVectors } from '../recommendation/vectorMath'
import { loadArticleVectors, loadTopicVectors } from '../repositories/embeddingRepository'
import type { RatedArticle } from '../repositories/feedbackRepository'
import { getSetting, setSetting } from '../repositories/settingsRepository'
import { listTopicPreferences, saveTopicPreference } from '../repositories/topicPreferenceRepository'
import { TOPIC_CATALOG } from './topicCatalog'

const ONBOARDING_COMPLETED_SETTING_KEY = 'profile.onboardingCompletedAt'

function computeLikedArticlesCentroid(
  database: Database.Database,
  embeddingModelId: string,
  ratedArticles: RatedArticle[]
): Float32Array | null {
  const articleVectors = loadArticleVectors(database, embeddingModelId)
  const likedArticleVectors = ratedArticles
    .filter((ratedArticle) => classifyContentSignal(ratedArticle) === 'positive')
    .map((likedArticle) => articleVectors.get(likedArticle.articleId))
    .filter((likedArticleVector): likedArticleVector is Float32Array => likedArticleVector !== undefined)
  return sumVectors(likedArticleVectors)
}

function buildProfileTopics(
  database: Database.Database,
  embeddingModelId: string,
  ratedArticles: RatedArticle[]
): ProfileTopic[] {
  const topicPreferences = listTopicPreferences(database)
  const topicVectors = loadTopicVectors(database, embeddingModelId)
  const likedArticlesCentroid = computeLikedArticlesCentroid(database, embeddingModelId, ratedArticles)

  const profileTopics = TOPIC_CATALOG.map((topic): ProfileTopic => {
    const topicVector = topicVectors.get(topic.id)
    return {
      id: topic.id,
      label: topic.label,
      preference: topicPreferences.get(topic.id) ?? 'neutral',
      affinity: topicVector && likedArticlesCentroid ? cosineSimilarity(topicVector, likedArticlesCentroid) : null
    }
  })

  return profileTopics.sort((left, right) => {
    if (left.affinity === null || right.affinity === null) {
      return left.affinity === right.affinity ? left.label.localeCompare(right.label, 'fr') : left.affinity === null ? 1 : -1
    }
    return right.affinity - left.affinity || left.label.localeCompare(right.label, 'fr')
  })
}

function buildSourceAffinities(ratedArticles: RatedArticle[]): SourceAffinity[] {
  const sourceNameByKey = new Map<string, string>()
  for (const ratedArticle of ratedArticles) {
    sourceNameByKey.set(ratedArticle.sourceKey, ratedArticle.sourceName)
  }

  const sourceAffinities: SourceAffinity[] = []
  for (const [sourceKey, voteCounts] of collectSourceVoteCounts(ratedArticles)) {
    sourceAffinities.push({
      sourceKey,
      sourceName: sourceNameByKey.get(sourceKey) ?? sourceKey,
      likeCount: voteCounts.likeCount,
      dislikeCount: voteCounts.dislikeCount,
      affinity: smoothSourceAffinity(voteCounts.likeCount, voteCounts.dislikeCount)
    })
  }
  return sourceAffinities.sort(
    (left, right) => right.affinity - left.affinity || left.sourceName.localeCompare(right.sourceName, 'fr')
  )
}

export function getUserProfile(database: Database.Database, embeddingProvider?: EmbeddingProvider): UserProfile {
  const { ratedArticles } = loadRecommendationSignals(database)
  return {
    isOnboardingCompleted: getSetting(database, ONBOARDING_COMPLETED_SETTING_KEY) !== null,
    recommendationMode: resolveCurrentRecommendationMode(database),
    likeCount: ratedArticles.filter((ratedArticle) => ratedArticle.rating === 'like').length,
    dislikeCount: ratedArticles.filter((ratedArticle) => ratedArticle.rating === 'dislike').length,
    topics: buildProfileTopics(database, resolveEmbeddingModelId(embeddingProvider), ratedArticles),
    sourceAffinities: buildSourceAffinities(ratedArticles)
  }
}

export function completeOnboarding(
  database: Database.Database,
  followedTopicIds: string[],
  completedAt: string,
  embeddingProvider?: EmbeddingProvider
): UserProfile {
  database.transaction(() => {
    for (const followedTopicId of new Set(followedTopicIds)) {
      saveTopicPreference(database, followedTopicId, 'followed')
    }
    setSetting(database, ONBOARDING_COMPLETED_SETTING_KEY, completedAt)
  })()
  return getUserProfile(database, embeddingProvider)
}

export function setTopicPreference(
  database: Database.Database,
  topicId: string,
  preference: TopicPreference,
  embeddingProvider?: EmbeddingProvider
): UserProfile {
  saveTopicPreference(database, topicId, preference)
  return getUserProfile(database, embeddingProvider)
}
