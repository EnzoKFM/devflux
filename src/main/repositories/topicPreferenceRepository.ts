import type Database from 'better-sqlite3'
import type { TopicPreference } from '@shared/contract'

export type StoredTopicPreference = Exclude<TopicPreference, 'neutral'>

export function listTopicPreferences(database: Database.Database): Map<string, StoredTopicPreference> {
  const preferenceRows = database.prepare('SELECT topic_id, preference FROM topic_preferences').all() as {
    topic_id: string
    preference: StoredTopicPreference
  }[]
  return new Map(preferenceRows.map((preferenceRow) => [preferenceRow.topic_id, preferenceRow.preference]))
}

export function saveTopicPreference(database: Database.Database, topicId: string, preference: TopicPreference): void {
  if (preference === 'neutral') {
    database.prepare('DELETE FROM topic_preferences WHERE topic_id = ?').run(topicId)
    return
  }
  database
    .prepare(
      `INSERT INTO topic_preferences (topic_id, preference) VALUES (?, ?)
       ON CONFLICT(topic_id) DO UPDATE SET preference = excluded.preference`
    )
    .run(topicId, preference)
}
