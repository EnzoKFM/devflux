import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { FEEDBACK_REASONS } from '@shared/contract'
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
      'articles_fts',
      'articles_fts_config',
      'articles_fts_data',
      'articles_fts_docsize',
      'articles_fts_idx',
      'feedback',
      'sources',
      'topic_embeddings',
      'topic_preferences'
    ])
    expect(database.pragma('user_version', { simple: true })).toBe(5)
  })

  it('est idempotente', () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO app_settings (key, value) VALUES ('cle', 'valeur')").run()

    applyMigrations(database)
    applyMigrations(database)

    expect(database.pragma('user_version', { simple: true })).toBe(5)
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

    expect(database.pragma('user_version', { simple: true })).toBe(5)
    expect(database.prepare('SELECT title, digest_rank, is_exploration FROM articles').get()).toEqual({
      title: 'Article a',
      digest_rank: null,
      is_exploration: 0
    })
    expect(database.prepare('SELECT COUNT(*) AS feedbackCount FROM feedback').get()).toEqual({ feedbackCount: 1 })
  })

  it('supprime les sources anglophones de départ en conservant leurs articles et leurs notes', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(MIGRATIONS[0])
    database.exec(MIGRATIONS[1])
    database.pragma('user_version = 2')
    const insertSourceStatement = database.prepare(
      "INSERT INTO sources (name, feed_url, category, created_at) VALUES (?, ?, 'web', '2026-10-18T00:00:00.000Z')"
    )
    insertSourceStatement.run('Smashing Magazine', 'https://www.smashingmagazine.com/feed/')
    insertSourceStatement.run('Hacker News (150+ points)', 'https://hnrss.org/frontpage?points=150')
    insertSourceStatement.run('Grafikart', 'https://grafikart.fr/feed.rss')
    insertSourceStatement.run('Blog perso', 'https://perso.example.com/feed.xml')
    database
      .prepare(
        `INSERT INTO articles (source_id, source_name, url, title, published_at, fetched_at, digest_date)
         VALUES (1, 'Smashing Magazine', 'https://www.smashingmagazine.com/a', 'Article a', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z', '2026-10-18')`
      )
      .run()
    database
      .prepare("INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (1, 'like', NULL, '2026-10-18T00:00:00.000Z')")
      .run()

    applyMigrations(database)

    expect(database.prepare('SELECT name, is_enabled FROM sources ORDER BY name').all()).toEqual([
      { name: 'Blog perso', is_enabled: 1 },
      { name: 'Grafikart', is_enabled: 1 }
    ])
    expect(database.prepare('SELECT source_id, source_name FROM articles').get()).toEqual({
      source_id: null,
      source_name: 'Smashing Magazine'
    })
    expect(database.prepare('SELECT COUNT(*) AS feedbackCount FROM feedback').get()).toEqual({ feedbackCount: 1 })
  })

  it('indexe les articles existants et reprend la dernière collecte réussie des sources', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    for (const migrationSql of MIGRATIONS.slice(0, 3)) {
      database.exec(migrationSql)
    }
    database.pragma('user_version = 3')
    const insertSourceStatement = database.prepare(
      "INSERT INTO sources (name, feed_url, category, last_fetched_at, last_error, created_at) VALUES (?, ?, 'web', '2026-10-18T00:00:00.000Z', ?, '2026-10-01T00:00:00.000Z')"
    )
    insertSourceStatement.run('Blog sain', 'https://sain.example.com/feed.xml', null)
    insertSourceStatement.run('Blog en panne', 'https://panne.example.com/feed.xml', 'Réponse HTTP 500')
    database
      .prepare(
        `INSERT INTO articles (source_name, url, title, summary, published_at, fetched_at)
         VALUES ('Blog sain', 'https://sain.example.com/a', 'Découvrir les générateurs', 'Résumé', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z')`
      )
      .run()

    applyMigrations(database)

    expect(database.prepare('SELECT name, last_succeeded_at FROM sources ORDER BY name').all()).toEqual([
      { name: 'Blog en panne', last_succeeded_at: null },
      { name: 'Blog sain', last_succeeded_at: '2026-10-18T00:00:00.000Z' }
    ])
    expect(database.prepare("SELECT rowid FROM articles_fts WHERE articles_fts MATCH 'generateurs'").all()).toEqual([
      { rowid: 1 }
    ])
  })

  it('conserve les notes existantes et accepte les nouvelles raisons de 👎', () => {
    const database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    for (const migrationSql of MIGRATIONS.slice(0, 4)) {
      database.exec(migrationSql)
    }
    database.pragma('user_version = 4')
    const insertArticleStatement = database.prepare(
      `INSERT INTO articles (id, source_name, url, title, published_at, fetched_at, digest_date)
       VALUES (?, 'Blog', ?, 'Article', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z', '2026-10-18')`
    )
    insertArticleStatement.run(1, 'https://blog.example.com/a')
    insertArticleStatement.run(2, 'https://blog.example.com/b')
    database
      .prepare("INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (1, 'dislike', 'bad-source', '2026-10-18T00:00:00.000Z')")
      .run()

    applyMigrations(database)

    expect(database.prepare('SELECT article_id, rating, reason FROM feedback').all()).toEqual([
      { article_id: 1, rating: 'dislike', reason: 'bad-source' }
    ])
    expect(() =>
      database
        .prepare("INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (2, 'dislike', 'not-french', '2026-10-18T00:00:00.000Z')")
        .run()
    ).not.toThrow()
    expect(() =>
      database
        .prepare("UPDATE feedback SET reason = 'raison-inconnue' WHERE article_id = 2")
        .run()
    ).toThrow()
    expect(database.prepare('SELECT is_digest_replaced FROM articles ORDER BY id').all()).toEqual([
      { is_digest_replaced: 0 },
      { is_digest_replaced: 0 }
    ])
    database.prepare('DELETE FROM articles WHERE id = 1').run()
    expect(database.prepare('SELECT COUNT(*) AS feedbackCount FROM feedback WHERE article_id = 1').get()).toEqual({
      feedbackCount: 0
    })
  })

  it('accepte en base chaque raison de 👎 du contrat', () => {
    const database = createTestDatabase()
    const insertArticleStatement = database.prepare(
      `INSERT INTO articles (source_name, url, title, published_at, fetched_at)
       VALUES ('Blog', ?, 'Article', '2026-10-18T00:00:00.000Z', '2026-10-18T00:00:00.000Z')`
    )
    const insertFeedbackStatement = database.prepare(
      "INSERT INTO feedback (article_id, rating, reason, created_at) VALUES (?, 'dislike', ?, '2026-10-18T00:00:00.000Z')"
    )

    for (const feedbackReason of FEEDBACK_REASONS) {
      const articleId = Number(insertArticleStatement.run(`https://blog.example.com/${feedbackReason}`).lastInsertRowid)
      expect(() => insertFeedbackStatement.run(articleId, feedbackReason)).not.toThrow()
    }
  })

  it('n ajoute aucune source à une base jamais initialisée', () => {
    const database = createTestDatabase()

    expect(database.prepare('SELECT COUNT(*) AS sourceCount FROM sources').get()).toEqual({ sourceCount: 0 })
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
