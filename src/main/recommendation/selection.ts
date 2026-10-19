import { DAILY_DIGEST_SIZE } from '@shared/contract'
import type { DigestSelection } from '../repositories/articleRepository'
import { cosineSimilarity } from './vectorMath'

export const MAX_DIGEST_ARTICLES_PER_SOURCE = 4
export const EXPLORATION_ARTICLE_COUNT = 2
export const NEAR_DUPLICATE_SIMILARITY_THRESHOLD = 0.9
export const EXPLORATION_DISPLAY_POSITIONS: readonly number[] = [7, 14]

export interface RankedCandidate {
  id: number
  sourceKey: string
  score: number
  positiveSimilarity: number
  negativeSimilarity: number
  sourceAffinity: number
  vector: Float32Array | null
}

export interface SelectionInputs {
  rankedCandidates: RankedCandidate[]
  hasNegativeProfile: boolean
  random: () => number
}

interface SelectionState {
  retainedCandidates: RankedCandidate[]
  retainedCountBySourceKey: Map<string, number>
}

function canRetain(selectionState: SelectionState, candidate: RankedCandidate): boolean {
  if ((selectionState.retainedCountBySourceKey.get(candidate.sourceKey) ?? 0) >= MAX_DIGEST_ARTICLES_PER_SOURCE) {
    return false
  }
  const candidateVector = candidate.vector
  if (!candidateVector) {
    return true
  }
  return !selectionState.retainedCandidates.some(
    (retainedCandidate) =>
      retainedCandidate.vector !== null &&
      cosineSimilarity(candidateVector, retainedCandidate.vector) > NEAR_DUPLICATE_SIMILARITY_THRESHOLD
  )
}

function retain(selectionState: SelectionState, candidate: RankedCandidate): void {
  selectionState.retainedCandidates.push(candidate)
  selectionState.retainedCountBySourceKey.set(
    candidate.sourceKey,
    (selectionState.retainedCountBySourceKey.get(candidate.sourceKey) ?? 0) + 1
  )
}

function isExplorationEligible(candidate: RankedCandidate, hasNegativeProfile: boolean): boolean {
  const isCloseToDislikes = hasNegativeProfile && candidate.negativeSimilarity >= candidate.positiveSimilarity
  return !isCloseToDislikes && candidate.sourceAffinity >= 0
}

function drawExplorationCandidates(
  selectionState: SelectionState,
  remainingCandidates: RankedCandidate[],
  hasNegativeProfile: boolean,
  random: () => number
): RankedCandidate[] {
  const explorationPool = remainingCandidates.filter((remainingCandidate) =>
    isExplorationEligible(remainingCandidate, hasNegativeProfile)
  )
  const drawnCandidates: RankedCandidate[] = []
  while (drawnCandidates.length < EXPLORATION_ARTICLE_COUNT && explorationPool.length > 0) {
    const drawnIndex = Math.min(explorationPool.length - 1, Math.floor(random() * explorationPool.length))
    const [drawnCandidate] = explorationPool.splice(drawnIndex, 1)
    if (canRetain(selectionState, drawnCandidate)) {
      retain(selectionState, drawnCandidate)
      drawnCandidates.push(drawnCandidate)
    }
  }
  return drawnCandidates
}

function interleaveExploration(
  relevantCandidates: RankedCandidate[],
  explorationCandidates: RankedCandidate[]
): { candidate: RankedCandidate; isExploration: boolean }[] {
  const displayedArticles = relevantCandidates.map((candidate) => ({ candidate, isExploration: false }))
  explorationCandidates.forEach((explorationCandidate, explorationIndex) => {
    const displayPosition = EXPLORATION_DISPLAY_POSITIONS[explorationIndex] ?? displayedArticles.length + 1
    displayedArticles.splice(Math.min(displayPosition - 1, displayedArticles.length), 0, {
      candidate: explorationCandidate,
      isExploration: true
    })
  })
  return displayedArticles
}

export function selectRecommendedArticles(selectionInputs: SelectionInputs): DigestSelection[] {
  const sortedCandidates = selectionInputs.rankedCandidates
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .sort((left, right) => right.candidate.score - left.candidate.score || left.candidateIndex - right.candidateIndex)
    .map(({ candidate }) => candidate)

  const selectionState: SelectionState = { retainedCandidates: [], retainedCountBySourceKey: new Map() }
  const relevantCandidates: RankedCandidate[] = []
  const relevantTarget = DAILY_DIGEST_SIZE - EXPLORATION_ARTICLE_COUNT

  const unselectedCandidates: RankedCandidate[] = []
  for (const candidate of sortedCandidates) {
    if (relevantCandidates.length < relevantTarget && canRetain(selectionState, candidate)) {
      retain(selectionState, candidate)
      relevantCandidates.push(candidate)
    } else {
      unselectedCandidates.push(candidate)
    }
  }

  const explorationCandidates = drawExplorationCandidates(
    selectionState,
    unselectedCandidates,
    selectionInputs.hasNegativeProfile,
    selectionInputs.random
  )

  const drawnIds = new Set(explorationCandidates.map((explorationCandidate) => explorationCandidate.id))
  for (const candidate of unselectedCandidates) {
    if (relevantCandidates.length + explorationCandidates.length >= DAILY_DIGEST_SIZE) {
      break
    }
    if (!drawnIds.has(candidate.id) && canRetain(selectionState, candidate)) {
      retain(selectionState, candidate)
      relevantCandidates.push(candidate)
    }
  }

  return interleaveExploration(relevantCandidates, explorationCandidates).map(
    ({ candidate, isExploration }, displayIndex) => ({
      articleId: candidate.id,
      rank: displayIndex,
      isExploration
    })
  )
}
