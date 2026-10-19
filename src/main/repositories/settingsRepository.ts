import type Database from 'better-sqlite3'

export function getSetting(database: Database.Database, key: string): string | null {
  const row = database.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(database: Database.Database, key: string, value: string): void {
  database
    .prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}
