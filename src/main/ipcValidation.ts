import {
  THEME_PREFERENCES,
  type FeedbackRating,
  type FeedbackReason,
  type SourceCategory,
  type ThemePreference,
  type TopicPreference
} from '@shared/contract'
import { parseHttpUrl } from './httpUrl'
import { isTopicId, TOPIC_CATALOG } from './profile/topicCatalog'
import { isThemePreference } from './theme'

const FEEDBACK_RATINGS: readonly FeedbackRating[] = ['like', 'dislike']
const FEEDBACK_REASONS: readonly FeedbackReason[] = ['off-topic', 'too-basic', 'already-seen', 'bad-source']
const SOURCE_CATEGORIES: readonly SourceCategory[] = ['web', 'software', 'general']
const TOPIC_PREFERENCES: readonly TopicPreference[] = ['followed', 'neutral', 'muted']

export function parseIdentifier(value: unknown, argumentName: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Argument invalide : ${argumentName} doit être un entier strictement positif.`)
  }
  return value
}

export function parseBoolean(value: unknown, argumentName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Argument invalide : ${argumentName} doit être un booléen.`)
  }
  return value
}

export function parseRating(value: unknown): FeedbackRating {
  if (typeof value !== 'string' || !(FEEDBACK_RATINGS as readonly string[]).includes(value)) {
    throw new Error('Argument invalide : rating doit valoir "like" ou "dislike".')
  }
  return value as FeedbackRating
}

export function parseReason(value: unknown): FeedbackReason | null {
  if (value === null) {
    return null
  }
  if (typeof value !== 'string' || !(FEEDBACK_REASONS as readonly string[]).includes(value)) {
    throw new Error(`Argument invalide : reason doit être null ou l'une des valeurs ${FEEDBACK_REASONS.join(', ')}.`)
  }
  return value as FeedbackReason
}

export function parseCategory(value: unknown): SourceCategory {
  if (typeof value !== 'string' || !(SOURCE_CATEGORIES as readonly string[]).includes(value)) {
    throw new Error(`Argument invalide : category doit être l'une des valeurs ${SOURCE_CATEGORIES.join(', ')}.`)
  }
  return value as SourceCategory
}

export function parseHttpUrlArgument(value: unknown, argumentName: string): string {
  const parsedUrl = parseHttpUrl(value)
  if (!parsedUrl) {
    throw new Error(`Argument invalide : ${argumentName} doit être une URL http ou https.`)
  }
  return parsedUrl.href
}

export function parseTopicId(value: unknown, argumentName: string): string {
  if (!isTopicId(value)) {
    throw new Error(`Argument invalide : ${argumentName} doit être l'identifiant d'un sujet du catalogue.`)
  }
  return value
}

export function parseTopicIds(value: unknown, argumentName: string): string[] {
  if (!Array.isArray(value) || value.length > TOPIC_CATALOG.length) {
    throw new Error(
      `Argument invalide : ${argumentName} doit être un tableau d'au plus ${TOPIC_CATALOG.length} identifiants de sujets.`
    )
  }
  return value.map((topicId) => parseTopicId(topicId, argumentName))
}

export function parseTopicPreference(value: unknown): TopicPreference {
  if (typeof value !== 'string' || !(TOPIC_PREFERENCES as readonly string[]).includes(value)) {
    throw new Error(`Argument invalide : preference doit être l'une des valeurs ${TOPIC_PREFERENCES.join(', ')}.`)
  }
  return value as TopicPreference
}

export function parseThemePreference(value: unknown): ThemePreference {
  if (!isThemePreference(value)) {
    throw new Error(`Argument invalide : themePreference doit être l'une des valeurs ${THEME_PREFERENCES.join(', ')}.`)
  }
  return value
}
