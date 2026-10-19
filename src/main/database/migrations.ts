import type Database from 'better-sqlite3'

export const MIGRATIONS: string[] = [
  `
  CREATE TABLE sources (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    feed_url TEXT NOT NULL UNIQUE,
    site_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('web', 'software', 'general')),
    is_enabled INTEGER NOT NULL DEFAULT 1,
    last_fetched_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    source_name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT,
    published_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    digest_date TEXT,
    read_at TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_read_later INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX articles_published_at_index ON articles(published_at);
  CREATE INDEX articles_digest_date_index ON articles(digest_date);

  CREATE TABLE feedback (
    article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('like', 'dislike')),
    reason TEXT CHECK (reason IN ('off-topic', 'too-basic', 'already-seen', 'bad-source')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE article_embeddings (
    article_id INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    vector BLOB NOT NULL
  );

  CREATE TABLE topic_embeddings (
    topic_id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    vector BLOB NOT NULL
  );

  CREATE TABLE topic_preferences (
    topic_id TEXT PRIMARY KEY,
    preference TEXT NOT NULL CHECK (preference IN ('followed', 'muted'))
  );

  ALTER TABLE articles ADD COLUMN digest_rank INTEGER;
  ALTER TABLE articles ADD COLUMN is_exploration INTEGER NOT NULL DEFAULT 0;
  `
]

export function applyMigrations(database: Database.Database): void {
  const currentVersion = database.pragma('user_version', { simple: true }) as number
  const pendingMigrations = MIGRATIONS.slice(currentVersion)

  for (const [pendingIndex, migrationSql] of pendingMigrations.entries()) {
    database.transaction(() => {
      database.exec(migrationSql)
      database.pragma(`user_version = ${currentVersion + pendingIndex + 1}`)
    })()
  }
}
