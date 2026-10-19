import type Database from 'better-sqlite3'
import type { FeedbackRating, FeedbackReason } from '@shared/contract'

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
