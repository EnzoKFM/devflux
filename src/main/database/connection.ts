import Database from 'better-sqlite3'
import { applyMigrations } from './migrations'

export function openDatabase(databasePath: string): Database.Database {
  const database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  applyMigrations(database)
  return database
}
