import { describe, expect, it } from 'vitest'
import { DAILY_DIGEST_SIZE } from '@shared/contract'
import {
  EXPLORATION_ARTICLE_COUNT,
  MAX_DIGEST_ARTICLES_PER_SOURCE,
  selectRecommendedArticles,
  type RankedCandidate
} from './selection'

const VECTOR_DIMENSION = 64

function buildVector(axisIndex: number): Float32Array {
  const vector = new Float32Array(VECTOR_DIMENSION)
  vector[axisIndex % VECTOR_DIMENSION] = 1
  return vector
}

function buildCandidate(id: number, overrides: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    id,
    sourceKey: `source-${id}`,
    score: 1 - id / 1000,
    positiveSimilarity: 0.3,
    negativeSimilarity: 0,
    sourceAffinity: 0,
    vector: buildVector(id),
    ...overrides
  }
}

function buildCandidates(candidateCount: number): RankedCandidate[] {
  return Array.from({ length: candidateCount }, (_, candidateIndex) => buildCandidate(candidateIndex + 1))
}

describe('selectRecommendedArticles', () => {
  it('classe les articles par score décroissant', () => {
    const candidates = [
      buildCandidate(1, { score: 0.1 }),
      buildCandidate(2, { score: 0.9 }),
      buildCandidate(3, { score: 0.5 })
    ]

    const selections = selectRecommendedArticles({ rankedCandidates: candidates, hasNegativeProfile: false, random: () => 0 })

    expect(selections.map((selection) => selection.articleId)).toEqual([2, 3, 1])
    expect(selections.map((selection) => selection.rank)).toEqual([0, 1, 2])
    expect(selections.every((selection) => !selection.isExploration)).toBe(true)
  })

  it('plafonne le nombre d articles par source', () => {
    const candidates = Array.from({ length: 7 }, (_, candidateIndex) =>
      buildCandidate(candidateIndex + 1, { sourceKey: 'prolifique' })
    )
    candidates.push(buildCandidate(100, { score: 0.01 }))

    const selections = selectRecommendedArticles({ rankedCandidates: candidates, hasNegativeProfile: false, random: () => 0 })

    const prolificSelectionCount = selections.filter((selection) => selection.articleId < 100).length
    expect(prolificSelectionCount).toBe(MAX_DIGEST_ARTICLES_PER_SOURCE)
    expect(selections.map((selection) => selection.articleId)).toContain(100)
  })

  it('ignore les quasi-doublons d un article déjà retenu', () => {
    const duplicatedVector = buildVector(5)
    const nearDuplicateVector = new Float32Array(duplicatedVector)
    nearDuplicateVector[6] = 0.2
    const candidates = [
      buildCandidate(1, { score: 0.9, vector: duplicatedVector }),
      buildCandidate(2, { score: 0.8, vector: nearDuplicateVector }),
      buildCandidate(3, { score: 0.7, vector: buildVector(9) })
    ]

    const selections = selectRecommendedArticles({ rankedCandidates: candidates, hasNegativeProfile: false, random: () => 0 })

    expect(selections.map((selection) => selection.articleId)).toEqual([1, 3])
  })

  it(`réserve ${EXPLORATION_ARTICLE_COUNT} places à l exploration, intercalées aux positions 7 et 14`, () => {
    const selections = selectRecommendedArticles({
      rankedCandidates: buildCandidates(40),
      hasNegativeProfile: false,
      random: () => 0
    })

    expect(selections).toHaveLength(DAILY_DIGEST_SIZE)
    const explorationRanks = selections.filter((selection) => selection.isExploration).map((selection) => selection.rank)
    expect(explorationRanks).toEqual([6, 13])
    const relevantIds = selections.filter((selection) => !selection.isExploration).map((selection) => selection.articleId)
    expect(relevantIds).toEqual(Array.from({ length: DAILY_DIGEST_SIZE - EXPLORATION_ARTICLE_COUNT }, (_, index) => index + 1))
  })

  it('tire l exploration au hasard parmi les candidats restants', () => {
    const firstDraw = selectRecommendedArticles({
      rankedCandidates: buildCandidates(40),
      hasNegativeProfile: false,
      random: () => 0
    })
    const lastDraw = selectRecommendedArticles({
      rankedCandidates: buildCandidates(40),
      hasNegativeProfile: false,
      random: () => 0.999
    })

    const firstExplorationIds = firstDraw.filter((selection) => selection.isExploration).map((selection) => selection.articleId)
    const lastExplorationIds = lastDraw.filter((selection) => selection.isExploration).map((selection) => selection.articleId)
    expect(firstExplorationIds).toEqual([19, 20])
    expect(lastExplorationIds).toEqual([40, 39])
  })

  it('exclut de l exploration les articles proches des 👎 et les sources pénalisées', () => {
    const candidates = buildCandidates(40).map((candidate) => {
      if (candidate.id <= DAILY_DIGEST_SIZE - EXPLORATION_ARTICLE_COUNT) {
        return candidate
      }
      if (candidate.id <= 30) {
        return { ...candidate, positiveSimilarity: 0.1, negativeSimilarity: 0.4 }
      }
      if (candidate.id <= 35) {
        return { ...candidate, sourceAffinity: -0.3 }
      }
      return candidate
    })

    const selections = selectRecommendedArticles({ rankedCandidates: candidates, hasNegativeProfile: true, random: () => 0 })

    const explorationIds = selections.filter((selection) => selection.isExploration).map((selection) => selection.articleId)
    expect(explorationIds).toEqual([36, 37])
  })

  it('ne filtre pas sur la similarité négative sans profil négatif', () => {
    const candidates = buildCandidates(25).map((candidate) =>
      candidate.id > 18 ? { ...candidate, positiveSimilarity: 0, negativeSimilarity: 0.4 } : candidate
    )

    const selections = selectRecommendedArticles({ rankedCandidates: candidates, hasNegativeProfile: false, random: () => 0 })

    expect(selections.filter((selection) => selection.isExploration)).toHaveLength(2)
  })

  it('complète le fil avec les meilleurs restants quand l exploration manque de candidats', () => {
    const candidates = buildCandidates(19)

    const selections = selectRecommendedArticles({ rankedCandidates: candidates, hasNegativeProfile: false, random: () => 0 })

    expect(selections).toHaveLength(19)
    expect(selections.filter((selection) => selection.isExploration)).toHaveLength(1)
  })
})
