import type Database from 'better-sqlite3'
import type { FeedbackRating, FeedbackReason } from '@shared/contract'
import { SOURCE_KEY_SELECT } from './sourceKeySql'

export function saveFeedback(
  database: Database.Database,
  articleId: number,
  rating: FeedbackRating,
  reason: FeedbackReason | null,
  createdAt: string
): void {
  database
    .prepare(
      `INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(article_id) DO UPDATE SET rating = excluded.rating, reason = excluded.reason, created_at = excluded.created_at`
    )
    .run(articleId, rating, reason, createdAt)
}

export function deleteFeedback(database: Database.Database, articleId: number): void {
  database.prepare('DELETE FROM feedback WHERE article_id = ?').run(articleId)
}

export interface RatedArticle {
  articleId: number
  sourceKey: string
  sourceName: string
  rating: FeedbackRating
  reason: FeedbackReason | null
  title: string
  summary: string | null
  publishedAt: string
  digestDate: string | null
}

export function listRatedArticles(database: Database.Database): RatedArticle[] {
  const ratedRows = database
    .prepare(
      `SELECT articles.id, ${SOURCE_KEY_SELECT},
              articles.source_name, feedback.rating, feedback.reason, articles.title, articles.summary,
              articles.published_at, articles.digest_date
       FROM feedback
       JOIN articles ON articles.id = feedback.article_id
       ORDER BY feedback.created_at, articles.id`
    )
    .all() as {
    id: number
    source_key: string
    source_name: string
    rating: FeedbackRating
    reason: FeedbackReason | null
    title: string
    summary: string | null
    published_at: string
    digest_date: string | null
  }[]
  return ratedRows.map((ratedRow) => ({
    articleId: ratedRow.id,
    sourceKey: ratedRow.source_key,
    sourceName: ratedRow.source_name,
    rating: ratedRow.rating,
    reason: ratedRow.reason,
    title: ratedRow.title,
    summary: ratedRow.summary,
    publishedAt: ratedRow.published_at,
    digestDate: ratedRow.digest_date
  }))
}
