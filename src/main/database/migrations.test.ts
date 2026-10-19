import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../testing/testHelpers'
import { applyMigrations, MIGRATIONS } from './migrations'

function listTableNames(database: ReturnType<typeof createTestDatabase>): string[] {
  return (
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
  ).map((tableRow) => tableRow.name)
}

describe('applyMigrations', () => {
  it('crée le schéma attendu', () => {
    const database = createTestDatabase()

    expect(listTableNames(database)).toEqual([
      'app_settings',
      'article_embeddings',
      'articles',
      'feedback',
      'sources',
      'topic_embeddings',
      'topic_preferences'
    ])
    expect(database.pragma('user_version', { simple: true })).toBe(2)
  })

  it('est idempotente', () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO app_settings (key, value) VALUES ('cle', 'valeur')").run()

    applyMigrations(database)
    applyMigrations(database)

    expect(database.pragma('user_version', { simple: true })).toBe(2)
    expect(database.prepare('SELECT value FROM app_settings WHERE key = ?').get('cle')).toEqual({ value: 'valeur' })
  })

  it('migre une base en version 1 sans perdre ses données', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(MIGRATIONS[0])
    database.pragma('user_version = 1')
    database
      .prepare(
        `INSERT INTO articles (source_name, url, title, published_at, fetched_at, digest_date)
         VALUES ('Blog', 'https://blog.example.com/a', 'Article a', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z', '2026-10-18')`
      )
      .run()
    database
      .prepare("INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (1, 'like', NULL, '2026-10-18T00:00:00.000Z')")
      .run()

    applyMigrations(database)

    expect(database.pragma('user_version', { simple: true })).toBe(2)
    expect(database.prepare('SELECT title, digest_rank, is_exploration FROM articles').get()).toEqual({
      title: 'Article a',
      digest_rank: null,
      is_exploration: 0
    })
    expect(database.prepare('SELECT COUNT(*) AS feedbackCount FROM feedback').get()).toEqual({ feedbackCount: 1 })
  })

  it('refuse une préférence de sujet autre que suivi ou masqué', () => {
    const database = createTestDatabase()

    expect(() => database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('rust', 'neutral')").run()).toThrow()
    expect(() => database.prepare("INSERT INTO topic_preferences (topic_id, preference) VALUES ('rust', 'followed')").run()).not.toThrow()
  })

  it('supprime l embedding d un article avec l article', () => {
    const database = createTestDatabase()
    database
      .prepare(
        `INSERT INTO articles (id, source_name, url, title, published_at, fetched_at)
         VALUES (1, 'Blog', 'https://blog.example.com/a', 'Article a', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z')`
      )
      .run()
    database.prepare("INSERT INTO article_embeddings (article_id, model_id, vector) VALUES (1, 'modele', x'00')").run()

    database.prepare('DELETE FROM articles WHERE id = 1').run()

    expect(database.prepare('SELECT COUNT(*) AS embeddingCount FROM article_embeddings').get()).toEqual({ embeddingCount: 0 })
  })
})
