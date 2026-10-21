import type Database from 'better-sqlite3'
import { decodeVector, encodeVector } from '../recommendation/vectorMath'

export interface ArticleEmbedding {
  articleId: number
  vector: Float32Array
}

export interface TopicEmbedding {
  topicId: string
  vector: Float32Array
}

export function saveArticleEmbeddings(
  database: Database.Database,
  modelId: string,
  articleEmbeddings: ArticleEmbedding[]
): void {
  const saveStatement = database.prepare(
    `INSERT INTO article_embeddings (article_id, model_id, vector) VALUES (?, ?, ?)
     ON CONFLICT(article_id) DO UPDATE SET model_id = excluded.model_id, vector = excluded.vector`
  )
  database.transaction(() => {
    for (const articleEmbedding of articleEmbeddings) {
      saveStatement.run(articleEmbedding.articleId, modelId, encodeVector(articleEmbedding.vector))
    }
  })()
}

export function deleteArticleEmbedding(database: Database.Database, articleId: number): void {
  database.prepare('DELETE FROM article_embeddings WHERE article_id = ?').run(articleId)
}

export function loadArticleVectors(database: Database.Database, modelId: string): Map<number, Float32Array> {
  const vectorRows = database
    .prepare('SELECT article_id, vector FROM article_embeddings WHERE model_id = ?')
    .all(modelId) as { article_id: number; vector: Buffer }[]
  return new Map(vectorRows.map((vectorRow) => [vectorRow.article_id, decodeVector(vectorRow.vector)]))
}

export function saveTopicEmbeddings(
  database: Database.Database,
  modelId: string,
  topicEmbeddings: TopicEmbedding[]
): void {
  const saveStatement = database.prepare(
    `INSERT INTO topic_embeddings (topic_id, model_id, vector) VALUES (?, ?, ?)
     ON CONFLICT(topic_id) DO UPDATE SET model_id = excluded.model_id, vector = excluded.vector`
  )
  database.transaction(() => {
    for (const topicEmbedding of topicEmbeddings) {
      saveStatement.run(topicEmbedding.topicId, modelId, encodeVector(topicEmbedding.vector))
    }
  })()
}

export function loadTopicVectors(database: Database.Database, modelId: string): Map<string, Float32Array> {
  const vectorRows = database
    .prepare('SELECT topic_id, vector FROM topic_embeddings WHERE model_id = ?')
    .all(modelId) as { topic_id: string; vector: Buffer }[]
  return new Map(vectorRows.map((vectorRow) => [vectorRow.topic_id, decodeVector(vectorRow.vector)]))
}
