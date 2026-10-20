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
  `,
  `
  DELETE FROM sources WHERE feed_url IN (
    'https://www.smashingmagazine.com/feed/',
    'https://web.dev/feed.xml',
    'https://developer.chrome.com/static/blog/feed.xml',
    'https://webkit.org/feed/',
    'https://css-tricks.com/feed/',
    'https://react.dev/rss.xml',
    'https://nodejs.org/en/feed/blog.xml',
    'https://blog.angular.dev/feed',
    'https://astro.build/rss.xml',
    'https://laravel-news.com/feed',
    'https://feeds.feedburner.com/symfony/blog',
    'https://javascriptweekly.com/rss/',
    'https://frontendfoc.us/rss',
    'https://nodeweekly.com/rss/',
    'https://blog.rust-lang.org/feed.xml',
    'https://go.dev/blog/feed.atom',
    'https://blog.python.org/rss.xml',
    'https://github.blog/engineering/feed/',
    'https://martinfowler.com/feed.atom',
    'https://stackoverflow.blog/feed/',
    'https://feed.infoq.com/',
    'https://blog.pragmaticengineer.com/rss/',
    'https://simonwillison.net/atom/everything/',
    'https://jvns.ca/atom.xml',
    'https://hnrss.org/frontpage?points=150',
    'https://lobste.rs/rss',
    'https://changelog.com/feed',
    'https://dev.to/feed/tag/programming'
  );

  INSERT OR IGNORE INTO sources (name, feed_url, site_url, category, created_at)
  SELECT french_source.column1, french_source.column2, french_source.column3, french_source.column4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  FROM (VALUES
    ('Les-Tilleuls.coop', 'https://les-tilleuls.coop/feed.xml', 'https://les-tilleuls.coop/blog', 'web'),
    ('Eleven Labs', 'https://blog.eleven-labs.com/feed.xml', 'https://blog.eleven-labs.com', 'web'),
    ('Developpez.com', 'https://www.developpez.com/index/rss', 'https://www.developpez.com', 'software'),
    ('Programmez!', 'https://www.programmez.com/rss/rss_actu.php', 'https://www.programmez.com', 'software'),
    ('LinuxFr.org', 'https://linuxfr.org/news.atom', 'https://linuxfr.org', 'software'),
    ('Zeste de Savoir', 'https://zestedesavoir.com/articles/flux/rss/', 'https://zestedesavoir.com', 'software'),
    ('Human Coders News', 'https://news.humancoders.com/items/feed', 'https://news.humancoders.com', 'general'),
    ('DEV Community - Français', 'https://dev.to/feed/tag/french', 'https://dev.to/t/french', 'general'),
    ('Next', 'https://next.ink/feed/', 'https://next.ink', 'general'),
    ('ZATAZ', 'https://www.zataz.com/feed/', 'https://www.zataz.com', 'general'),
    ('IT-Connect', 'https://www.it-connect.fr/feed/', 'https://www.it-connect.fr', 'general'),
    ('Numerama Cyberguerre', 'https://www.numerama.com/cyberguerre/feed/', 'https://www.numerama.com/cyberguerre/', 'general'),
    ('Le Monde Informatique - Sécurité', 'https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml', 'https://www.lemondeinformatique.fr/securite', 'general'),
    ('ActuIA', 'https://www.actuia.com/feed/', 'https://www.actuia.com', 'general'),
    ('Blog du Modérateur - IA', 'https://www.blogdumoderateur.com/ia/feed/', 'https://www.blogdumoderateur.com/ia/', 'general')
  ) AS french_source
  WHERE EXISTS (SELECT 1 FROM app_settings WHERE key = 'sources_seeded');
  `,
  `
  ALTER TABLE sources ADD COLUMN last_succeeded_at TEXT;
  UPDATE sources SET last_succeeded_at = last_fetched_at WHERE last_error IS NULL;

  ALTER TABLE articles ADD COLUMN recommendation_mode TEXT;
  ALTER TABLE articles ADD COLUMN closest_topic_id TEXT;
  ALTER TABLE articles ADD COLUMN dominant_signal TEXT;
  ALTER TABLE articles ADD COLUMN word_count INTEGER;

  CREATE INDEX articles_source_fetched_at_index ON articles(source_id, fetched_at);

  CREATE VIRTUAL TABLE articles_fts USING fts5(
    title,
    summary,
    source_name,
    content = 'articles',
    content_rowid = 'id',
    tokenize = 'unicode61 remove_diacritics 2'
  );

  CREATE TRIGGER articles_fts_after_insert AFTER INSERT ON articles BEGIN
    INSERT INTO articles_fts (rowid, title, summary, source_name)
    VALUES (new.id, new.title, new.summary, new.source_name);
  END;

  CREATE TRIGGER articles_fts_after_delete AFTER DELETE ON articles BEGIN
    INSERT INTO articles_fts (articles_fts, rowid, title, summary, source_name)
    VALUES ('delete', old.id, old.title, old.summary, old.source_name);
  END;

  CREATE TRIGGER articles_fts_after_update AFTER UPDATE OF title, summary, source_name ON articles BEGIN
    INSERT INTO articles_fts (articles_fts, rowid, title, summary, source_name)
    VALUES ('delete', old.id, old.title, old.summary, old.source_name);
    INSERT INTO articles_fts (rowid, title, summary, source_name)
    VALUES (new.id, new.title, new.summary, new.source_name);
  END;

  INSERT INTO articles_fts (articles_fts) VALUES ('rebuild');
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
