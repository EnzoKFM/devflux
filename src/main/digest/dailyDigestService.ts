import type Database from 'better-sqlite3'
import { DAILY_DIGEST_SIZE, type DailyDigest, type PreparationProgress, type RecommendationMode } from '@shared/contract'
import { computeOldestAllowedPublicationDate } from '../collector/articleAge'
import { collectFeeds } from '../collector/feedCollector'
import type { FeedFetcher } from '../collector/feedFetcher'
import type { PageFetcher } from '../reader/articleExtractor'
import type { EmbeddingProvider } from '../recommendation/embeddingProvider'
import { resolveEmbeddingModelId } from '../recommendation/embeddingStep'
import { isFrenchArticle } from '../recommendation/languageDetection'
import {
  analyzeForRecommendation,
  recordLastDigestMode
} from '../recommendation/recommendationService'
import { selectByRecommendation, type RecommendedSelectionOptions } from '../recommendation/recommendedSelection'
import { MAX_DIGEST_ARTICLES_PER_SOURCE } from '../recommendation/selection'
import {
  assignDigestSelections,
  listArticlesByDigestDate,
  listDigestCandidates,
  markDigestAsReplaced,
  purgeArticlesPublishedBefore,
  type DigestCandidate,
  type DigestSelection
} from '../repositories/articleRepository'
import { listEnabledSources } from '../repositories/sourceRepository'

export interface PrepareDailyDigestOptions {
  fetchFeed?: FeedFetcher
  fetchPage?: PageFetcher
  embeddingProvider?: EmbeddingProvider
  random?: () => number
  now?: () => Date
  onProgress?: (progress: PreparationProgress) => void
}

export function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function purgeExpiredArticles(database: Database.Database, now: Date): number {
  return purgeArticlesPublishedBefore(database, computeOldestAllowedPublicationDate(now))
}

function selectByRoundRobin(candidates: DigestCandidate[], roundRobinMode: RecommendationMode): DigestSelection[] {
  const selectedArticleIds = new Set<number>()

  for (
    let selectionRound = 1;
    selectionRound <= MAX_DIGEST_ARTICLES_PER_SOURCE && selectedArticleIds.size < DAILY_DIGEST_SIZE;
    selectionRound += 1
  ) {
    const sourceKeysSelectedThisRound = new Set<string>()
    for (const candidate of candidates) {
      if (selectedArticleIds.size >= DAILY_DIGEST_SIZE) {
        break
      }
      if (selectedArticleIds.has(candidate.id) || sourceKeysSelectedThisRound.has(candidate.sourceKey)) {
        continue
      }
      sourceKeysSelectedThisRound.add(candidate.sourceKey)
      selectedArticleIds.add(candidate.id)
    }
  }

  return [...selectedArticleIds].map((articleId) => ({
    articleId,
    rank: null,
    isExploration: false,
    recommendationReason: { mode: roundRobinMode, closestTopicId: null, dominantSignal: 'recency' }
  }))
}

export function buildDigest(
  database: Database.Database,
  now: Date,
  digestDate: string,
  candidates: DigestCandidate[],
  recommendation: Omit<RecommendedSelectionOptions, 'database' | 'candidates' | 'now'> | null = null,
  roundRobinMode: RecommendationMode = 'cold-start',
  shouldReplaceCurrentDigest = false
): void {
  const digestSelections = recommendation
    ? selectByRecommendation({ ...recommendation, database, candidates, now })
    : selectByRoundRobin(candidates, roundRobinMode)

  database.transaction(() => {
    if (shouldReplaceCurrentDigest && digestSelections.length > 0) {
      markDigestAsReplaced(database, digestDate)
    }
    assignDigestSelections(database, digestSelections, digestDate)
  })()
}

export async function prepareDailyDigest(
  database: Database.Database,
  options: PrepareDailyDigestOptions = {}
): Promise<DailyDigest> {
  const now = options.now ?? (() => new Date())
  const digestDate = formatLocalDate(now())
  const existingArticles = listArticlesByDigestDate(database, digestDate)

  if (existingArticles.length > 0) {
    return { digestDate, articles: existingArticles, collectionReport: null }
  }

  return collectAndBuildDigest(database, now, digestDate, options, false)
}

export async function refreshDailyDigest(
  database: Database.Database,
  options: PrepareDailyDigestOptions = {}
): Promise<DailyDigest> {
  const now = options.now ?? (() => new Date())
  return collectAndBuildDigest(database, now, formatLocalDate(now()), options, true)
}

async function collectAndBuildDigest(
  database: Database.Database,
  now: () => Date,
  digestDate: string,
  options: PrepareDailyDigestOptions,
  shouldReplaceCurrentDigest: boolean
): Promise<DailyDigest> {
  const totalSourceCount = listEnabledSources(database).length
  const reportProgress = (step: PreparationProgress['step'], completedSourceCount: number): void =>
    options.onProgress?.({ step, completedSourceCount, totalSourceCount })

  reportProgress('purging', 0)
  const purgedArticleCount = purgeExpiredArticles(database, now())

  reportProgress('collecting', 0)
  const collectionResult = await collectFeeds(database, {
    fetchFeed: options.fetchFeed,
    fetchPage: options.fetchPage,
    now,
    onSourceProcessed: (completedSourceCount) => reportProgress('collecting', completedSourceCount)
  })

  const candidates = listDigestCandidates(database, computeOldestAllowedPublicationDate(now())).filter((candidate) =>
    isFrenchArticle(candidate.title, candidate.summary)
  )
  const recommendationAnalysis = await analyzeForRecommendation(database, candidates, options.embeddingProvider, {
    onAnalysisStarted: () => reportProgress('analyzing', totalSourceCount),
    onModelDownloadRequired: () => reportProgress('downloading-model', totalSourceCount)
  })

  reportProgress('building-digest', totalSourceCount)
  buildDigest(
    database,
    now(),
    digestDate,
    candidates,
    recommendationAnalysis.mode === 'similarity' || recommendationAnalysis.mode === 'trained'
      ? {
          recommendationSignals: recommendationAnalysis.recommendationSignals,
          isTrainedMode: recommendationAnalysis.mode === 'trained',
          modelId: resolveEmbeddingModelId(options.embeddingProvider),
          random: options.random ?? Math.random
        }
      : null,
    recommendationAnalysis.mode,
    shouldReplaceCurrentDigest
  )
  recordLastDigestMode(database, recommendationAnalysis.mode)

  reportProgress('done', totalSourceCount)
  return {
    digestDate,
    articles: listArticlesByDigestDate(database, digestDate),
    collectionReport: {
      succeededSourceCount: collectionResult.succeededSourceCount,
      failedSourceCount: collectionResult.failedSourceCount,
      newArticleCount: collectionResult.newArticleCount,
      purgedArticleCount
    }
  }
}
