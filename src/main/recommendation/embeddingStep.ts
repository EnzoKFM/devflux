import type Database from 'better-sqlite3'
import { TOPIC_CATALOG } from '../profile/topicCatalog'
import type { DigestCandidate } from '../repositories/articleRepository'
import {
  loadArticleVectors,
  loadTopicVectors,
  saveArticleEmbeddings,
  saveTopicEmbeddings
} from '../repositories/embeddingRepository'
import type { RatedArticle } from '../repositories/feedbackRepository'
import { EMBEDDING_MODEL_ID, type EmbeddingProvider } from './embeddingProvider'
import { classifyContentSignal } from './signals'

export interface EmbeddingStepCallbacks {
  onModelDownloadRequired: () => void
  onAnalysisStarted: () => void
}

interface ArticleToEmbed {
  articleId: number
  title: string
  summary: string | null
}

export function resolveEmbeddingModelId(embeddingProvider: EmbeddingProvider | undefined): string {
  return embeddingProvider?.modelId ?? EMBEDDING_MODEL_ID
}

export function buildArticleText(title: string, summary: string | null): string {
  return summary ? `${title}\n${summary}` : title
}

export async function ensureEmbeddings(
  database: Database.Database,
  embeddingProvider: EmbeddingProvider | undefined,
  candidates: DigestCandidate[],
  ratedArticles: RatedArticle[],
  callbacks: EmbeddingStepCallbacks
): Promise<void> {
  const modelId = resolveEmbeddingModelId(embeddingProvider)
  const embeddedArticleVectors = loadArticleVectors(database, modelId)
  const embeddedTopicVectors = loadTopicVectors(database, modelId)

  const articlesToEmbed = new Map<number, ArticleToEmbed>()
  for (const candidate of candidates) {
    if (!embeddedArticleVectors.has(candidate.id)) {
      articlesToEmbed.set(candidate.id, { articleId: candidate.id, title: candidate.title, summary: candidate.summary })
    }
  }
  for (const ratedArticle of ratedArticles) {
    if (classifyContentSignal(ratedArticle) !== 'none' && !embeddedArticleVectors.has(ratedArticle.articleId)) {
      articlesToEmbed.set(ratedArticle.articleId, {
        articleId: ratedArticle.articleId,
        title: ratedArticle.title,
        summary: ratedArticle.summary
      })
    }
  }
  const topicsToEmbed = TOPIC_CATALOG.filter((topic) => !embeddedTopicVectors.has(topic.id))

  if (articlesToEmbed.size === 0 && topicsToEmbed.length === 0) {
    callbacks.onAnalysisStarted()
    return
  }
  if (!embeddingProvider) {
    throw new Error("Aucun fournisseur d'embeddings n'est disponible.")
  }
  const isModelDownloadRequired = embeddingProvider.isModelDownloadRequired()
  if (isModelDownloadRequired) {
    callbacks.onModelDownloadRequired()
  } else {
    callbacks.onAnalysisStarted()
  }

  const articlesList = [...articlesToEmbed.values()]
  const texts = [
    ...topicsToEmbed.map((topic) => topic.embeddingText),
    ...articlesList.map((articleToEmbed) => buildArticleText(articleToEmbed.title, articleToEmbed.summary))
  ]
  const vectors = await embeddingProvider.embed(texts, {
    onModelReady: isModelDownloadRequired ? callbacks.onAnalysisStarted : undefined
  })
  if (vectors.length !== texts.length) {
    throw new Error(`Le fournisseur d'embeddings a renvoyé ${vectors.length} vecteurs pour ${texts.length} textes.`)
  }

  saveTopicEmbeddings(
    database,
    modelId,
    topicsToEmbed.map((topic, topicIndex) => ({ topicId: topic.id, vector: vectors[topicIndex] }))
  )
  saveArticleEmbeddings(
    database,
    modelId,
    articlesList.map((articleToEmbed, articleIndex) => ({
      articleId: articleToEmbed.articleId,
      vector: vectors[topicsToEmbed.length + articleIndex]
    }))
  )
}
