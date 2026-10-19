import type Database from 'better-sqlite3'
import type { DigestArticle, FeedbackRating, FeedbackReason } from '@shared/contract'
import { SOURCE_KEY_SELECT } from './sourceKeySql'

interface ArticleRow {
  id: number
  source_id: number | null
  title: string
  url: string
  summary: string | null
  source_name: string
  published_at: string
  read_at: string | null
  is_favorite: number
  is_read_later: number
  is_exploration: number
  rating: FeedbackRating | null
  reason: FeedbackReason | null
}

export interface NewArticle {
  sourceId: number
  sourceName: string
  url: string
  title: string
  summary: string | null
  publishedAt: string
  fetchedAt: string
}

export interface DigestCandidate {
  id: number
  sourceKey: string
  title: string
  summary: string | null
  publishedAt: string
}

export interface DigestSelection {
  articleId: number
  rank: number | null
  isExploration: boolean
}

const ARTICLE_SELECT = `
  SELECT
    articles.id, articles.source_id, articles.title, articles.url, articles.summary, articles.source_name,
    articles.published_at, articles.read_at, articles.is_favorite, articles.is_read_later, articles.is_exploration,
    feedback.rating, feedback.reason
  FROM articles
  LEFT JOIN feedback ON feedback.article_id = articles.id
`

const ARTICLE_ORDER = 'ORDER BY articles.published_at DESC, articles.id DESC'

const DIGEST_ARTICLE_ORDER =
  'ORDER BY articles.digest_rank IS NULL, articles.digest_rank ASC, articles.published_at DESC, articles.id DESC'

function mapArticleRow(articleRow: ArticleRow): DigestArticle {
  return {
    id: articleRow.id,
    title: articleRow.title,
    url: articleRow.url,
    summary: articleRow.summary,
    sourceName: articleRow.source_name,
    publishedAt: articleRow.published_at,
    isRead: articleRow.read_at !== null,
    isFavorite: articleRow.is_favorite === 1,
    isReadLater: articleRow.is_read_later === 1,
    isExploration: articleRow.is_exploration === 1,
    rating: articleRow.rating,
    feedbackReason: articleRow.reason
  }
}

export function insertArticleIfNew(database: Database.Database, newArticle: NewArticle): boolean {
  const insertResult = database
    .prepare(
      `INSERT OR IGNORE INTO articles (source_id, source_name, url, title, summary, published_at, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      newArticle.sourceId,
      newArticle.sourceName,
      newArticle.url,
      newArticle.title,
      newArticle.summary,
      newArticle.publishedAt,
      newArticle.fetchedAt
    )
  return insertResult.changes > 0
}

export function findArticleById(database: Database.Database, articleId: number): DigestArticle | null {
  const articleRow = database.prepare(`${ARTICLE_SELECT} WHERE articles.id = ?`).get(articleId) as
    | ArticleRow
    | undefined
  return articleRow ? mapArticleRow(articleRow) : null
}

export function listArticlesByDigestDate(database: Database.Database, digestDate: string): DigestArticle[] {
  const articleRows = database
    .prepare(`${ARTICLE_SELECT} WHERE articles.digest_date = ? ${DIGEST_ARTICLE_ORDER}`)
    .all(digestDate) as ArticleRow[]
  return articleRows.map(mapArticleRow)
}

export function listReadLaterArticles(database: Database.Database): DigestArticle[] {
  const articleRows = database
    .prepare(`${ARTICLE_SELECT} WHERE articles.is_read_later = 1 ${ARTICLE_ORDER}`)
    .all() as ArticleRow[]
  return articleRows.map(mapArticleRow)
}

export function listFavoriteArticles(database: Database.Database): DigestArticle[] {
  const articleRows = database
    .prepare(`${ARTICLE_SELECT} WHERE articles.is_favorite = 1 ${ARTICLE_ORDER}`)
    .all() as ArticleRow[]
  return articleRows.map(mapArticleRow)
}

export function listDigestCandidates(database: Database.Database, publishedSince: string): DigestCandidate[] {
  const candidateRows = database
    .prepare(
      `SELECT articles.id, ${SOURCE_KEY_SELECT},
              articles.title, articles.summary, articles.published_at
       FROM articles
       WHERE articles.digest_date IS NULL
         AND articles.published_at >= ?
         AND NOT EXISTS (SELECT 1 FROM feedback WHERE feedback.article_id = articles.id)
       ORDER BY articles.published_at DESC, articles.id DESC`
    )
    .all(publishedSince) as {
    id: number
    source_key: string
    title: string
    summary: string | null
    published_at: string
  }[]
  return candidateRows.map((candidateRow) => ({
    id: candidateRow.id,
    sourceKey: candidateRow.source_key,
    title: candidateRow.title,
    summary: candidateRow.summary,
    publishedAt: candidateRow.published_at
  }))
}

export function assignDigestSelections(
  database: Database.Database,
  digestSelections: DigestSelection[],
  digestDate: string
): void {
  const assignStatement = database.prepare(
    'UPDATE articles SET digest_date = ?, digest_rank = ?, is_exploration = ? WHERE id = ?'
  )
  database.transaction(() => {
    for (const digestSelection of digestSelections) {
      assignStatement.run(
        digestDate,
        digestSelection.rank,
        digestSelection.isExploration ? 1 : 0,
        digestSelection.articleId
      )
    }
  })()
}

export function purgeArticlesPublishedBefore(database: Database.Database, publishedBefore: string): number {
  const deleteResult = database
    .prepare(
      `DELETE FROM articles
       WHERE published_at < ?
         AND is_favorite = 0
         AND is_read_later = 0
         AND NOT EXISTS (SELECT 1 FROM feedback WHERE feedback.article_id = articles.id)`
    )
    .run(publishedBefore)
  return deleteResult.changes
}

export function markArticleAsRead(database: Database.Database, articleId: number, readAt: string): void {
  database.prepare('UPDATE articles SET read_at = COALESCE(read_at, ?) WHERE id = ?').run(readAt, articleId)
}

export function setArticleFavorite(database: Database.Database, articleId: number, isFavorite: boolean): void {
  database.prepare('UPDATE articles SET is_favorite = ? WHERE id = ?').run(isFavorite ? 1 : 0, articleId)
}

export function setArticleReadLater(database: Database.Database, articleId: number, isReadLater: boolean): void {
  database.prepare('UPDATE articles SET is_read_later = ? WHERE id = ?').run(isReadLater ? 1 : 0, articleId)
}
