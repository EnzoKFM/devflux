import type Database from 'better-sqlite3'
import type { RecommendationMode } from '@shared/contract'
import type { DigestCandidate } from '../repositories/articleRepository'
import { listRatedArticles } from '../repositories/feedbackRepository'
import { getSetting, setSetting } from '../repositories/settingsRepository'
import { listTopicPreferences } from '../repositories/topicPreferenceRepository'
import type { EmbeddingProvider } from './embeddingProvider'
import { ensureEmbeddings, type EmbeddingStepCallbacks } from './embeddingStep'
import { determineRecommendationMode, type RecommendationSignals } from './signals'

const LAST_DIGEST_MODE_SETTING_KEY = 'recommendation.lastDigestMode'

export interface RecommendationAnalysis {
  mode: RecommendationMode
  recommendationSignals: RecommendationSignals
}

export function loadRecommendationSignals(database: Database.Database): RecommendationSignals {
  return { ratedArticles: listRatedArticles(database), topicPreferences: listTopicPreferences(database) }
}

export async function analyzeForRecommendation(
  database: Database.Database,
  candidates: DigestCandidate[],
  embeddingProvider: EmbeddingProvider | undefined,
  callbacks: EmbeddingStepCallbacks
): Promise<RecommendationAnalysis> {
  const recommendationSignals = loadRecommendationSignals(database)
  const mode = determineRecommendationMode(recommendationSignals)
  if (mode === 'cold-start') {
    return { mode, recommendationSignals }
  }

  try {
    await ensureEmbeddings(database, embeddingProvider, candidates, recommendationSignals.ratedArticles, callbacks)
    return { mode, recommendationSignals }
  } catch (embeddingError) {
    console.error("Échec du calcul des embeddings, repli sur la sélection sans personnalisation :", embeddingError)
    return { mode: 'unavailable', recommendationSignals }
  }
}

export function recordLastDigestMode(database: Database.Database, mode: RecommendationMode): void {
  setSetting(database, LAST_DIGEST_MODE_SETTING_KEY, mode)
}

export function resolveCurrentRecommendationMode(database: Database.Database): RecommendationMode {
  const modeFromSignals = determineRecommendationMode(loadRecommendationSignals(database))
  const hasLastDigestFailed = getSetting(database, LAST_DIGEST_MODE_SETTING_KEY) === 'unavailable'
  return modeFromSignals !== 'cold-start' && hasLastDigestFailed ? 'unavailable' : modeFromSignals
}
