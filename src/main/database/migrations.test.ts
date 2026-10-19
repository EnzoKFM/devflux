import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../testing/testHelpers'
import { applyMigrations } from './migrations'

function listTableNames(database: ReturnType<typeof createTestDatabase>): string[] {
  return (
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
  ).map((tableRow) => tableRow.name)
}

describe('applyMigrations', () => {
  it('crée le schéma attendu', () => {
    const database = createTestDatabase()

    expect(listTableNames(database)).toEqual(['app_settings', 'articles', 'feedback', 'sources'])
    expect(database.pragma('user_version', { simple: true })).toBe(1)
  })

  it('est idempotente', () => {
    const database = createTestDatabase()
    database.prepare("INSERT INTO app_settings (key, value) VALUES ('cle', 'valeur')").run()

    applyMigrations(database)
    applyMigrations(database)

    expect(database.pragma('user_version', { simple: true })).toBe(1)
    expect(database.prepare('SELECT value FROM app_settings WHERE key = ?').get('cle')).toEqual({ value: 'valeur' })
  })
})
